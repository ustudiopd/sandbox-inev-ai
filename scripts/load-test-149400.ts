/**
 * 웨비나 149400 부하 테스트 스크립트
 * 
 * 목적:
 * - P0-PR1~3 배포 후 부하 테스트
 * - 동시 접속 시나리오 시뮬레이션
 * - 400/409 에러 모니터링
 * - Auth 호출량 확인
 * 
 * 실행 방법:
 * npx tsx scripts/load-test-149400.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { createAdminSupabase } from '../lib/supabase/admin'

// .env.local 파일 로드
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '설정됨' : '없음')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '없음')
  process.exit(1)
}

if (!supabaseServiceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
  console.error('웨비나 조회를 위해 Service Role Key가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const adminSupabase = createAdminSupabase()

// 웨비나 슬러그
const WEBINAR_SLUG = '149400'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://eventflow.kr'

// 테스트 설정
const CONCURRENT_USERS = 50 // 동시 사용자 수
const REQUESTS_PER_USER = 10 // 사용자당 요청 수
const REQUEST_INTERVAL_MS = 2000 // 요청 간격 (2초)

interface TestResult {
  success: number
  errorCounts: {
    '400': number
    '409': number
    '401': number
    '500': number
    other: number
  }
  totalRequests: number
  duration: number
  errors: Array<{ status: number; message: string; endpoint: string }>
}

/**
 * 랜덤 사용자 생성 (이름과 이메일)
 */
function generateRandomUser() {
  const id = Math.random().toString(36).substring(7)
  const timestamp = Date.now()
  return {
    email: `test-${timestamp}-${id}@loadtest.local`,
    name: `테스트사용자${id.substring(0, 4)}`,
  }
}

/**
 * 등록 정보 생성 (event_survey_entries에 등록)
 */
async function createRegistration(webinarId: string, name: string, email: string): Promise<void> {
  try {
    // 웨비나의 registration_campaign_id 조회
    const { data: webinar, error: webinarError } = await adminSupabase
      .from('webinars')
      .select('registration_campaign_id')
      .eq('id', webinarId)
      .single()

    if (webinarError || !webinar?.registration_campaign_id) {
      throw new Error(`웨비나의 등록 캠페인을 찾을 수 없습니다: ${webinarError?.message}`)
    }

    // 등록 정보 생성
    const { error: insertError } = await adminSupabase
      .from('event_survey_entries')
      .insert({
        campaign_id: webinar.registration_campaign_id,
        name: name,
        registration_data: {
          email: email.toLowerCase().trim(),
          name: name,
        },
      })

    if (insertError && !insertError.message.includes('duplicate')) {
      // 중복 에러는 무시 (이미 등록된 경우)
      throw insertError
    }
  } catch (error: any) {
    // 이미 등록된 경우는 무시
    if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
      console.error('등록 정보 생성 실패:', error.message)
      throw error
    }
  }
}

/**
 * 이름과 이메일로 계정 생성 및 로그인 (name_email_auth 방식)
 * 실제 사용자 플로우: 웨비나 페이지에 name과 email 쿼리 파라미터로 접속
 */
async function createAndLoginUserWithNameEmail(
  webinarSlug: string, // API 호출용 slug
  webinarId: string,   // 등록 정보 생성용 UUID
  name: string,
  email: string
) {
  try {
    // 1. 등록 확인 API 호출 (slug 사용 - 실제 사용자 플로우와 동일)
    const checkResponse = await fetch(`${BASE_URL}/api/webinars/${webinarSlug}/check-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        name: name.trim(),
      }),
    })

    const checkResult = await checkResponse.json()
    
    if (!checkResult.registered) {
      // 등록 정보가 없으면 생성 (등록 정보 생성은 UUID 필요)
      await createRegistration(webinarId, name, email)
    }

    // 2. 이메일 인증 계정 생성/로그인 API 호출 (slug 사용)
    const signupResponse = await fetch(`${BASE_URL}/api/auth/email-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        displayName: name.trim(),
        webinarId: webinarSlug, // slug 사용
      }),
    })

    const signupResult = await signupResponse.json()

    if (!signupResponse.ok) {
      throw new Error(signupResult.error || '계정 생성 실패')
    }

    // 3. 받은 비밀번호로 로그인
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: signupResult.password,
    })

    if (signInError) {
      throw signInError
    }

    // 새로운 클라이언트 인스턴스 생성 (세션 유지)
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey)
    await userSupabase.auth.setSession({
      access_token: signInData.session!.access_token,
      refresh_token: signInData.session!.refresh_token!,
    })

    return { user: signInData.user, supabase: userSupabase }
  } catch (error: any) {
    console.error('사용자 생성/로그인 실패:', error.message)
    throw error
  }
}

/**
 * 웨비나 ID 조회 (슬러그로)
 * Admin 클라이언트를 사용하여 RLS 우회
 */
async function getWebinarId(slug: string): Promise<string> {
  // slug를 문자열로 변환하여 조회
  const slugValue = String(slug)
  
  const { data, error } = await adminSupabase
    .from('webinars')
    .select('id, slug, title')
    .eq('slug', slugValue)
    .not('slug', 'is', null)
    .maybeSingle()

  if (error) {
    console.error('웨비나 조회 오류:', error)
    throw new Error(`웨비나 조회 실패: ${error.message}`)
  }

  if (!data) {
    // dashboard_code로도 시도
    const { data: dataByCode, error: errorByCode } = await adminSupabase
      .from('webinars')
      .select('id, slug, title, dashboard_code')
      .eq('dashboard_code', slugValue)
      .maybeSingle()
    
    if (errorByCode) {
      console.error('dashboard_code 조회 오류:', errorByCode)
    }
    
    if (dataByCode) {
      console.log(`⚠️  slug로 찾지 못했지만 dashboard_code로 찾았습니다:`)
      console.log(`   ID: ${dataByCode.id}`)
      console.log(`   Slug: ${dataByCode.slug || '-'}`)
      console.log(`   Dashboard Code: ${dataByCode.dashboard_code}`)
      console.log(`   Title: ${dataByCode.title}`)
      return dataByCode.id
    }
    
    throw new Error(`웨비나를 찾을 수 없습니다: ${slug} (slug 또는 dashboard_code로 조회 실패)`)
  }

  console.log(`✅ 웨비나 찾음: ${data.title} (ID: ${data.id}, Slug: ${data.slug})`)
  return data.id
}

/**
 * access/track 엔드포인트 호출
 */
async function callAccessTrack(webinarId: string, userSupabase: any): Promise<{ status: number; ok: boolean }> {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const response = await fetch(`${BASE_URL}/api/webinars/${webinarId}/access/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await userSupabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ sessionId }),
    })

    return { status: response.status, ok: response.ok }
  } catch (error: any) {
    console.error('access/track 호출 실패:', error.message)
    return { status: 0, ok: false }
  }
}

/**
 * presence/ping 엔드포인트 호출
 */
async function callPresencePing(webinarId: string, userSupabase: any): Promise<{ status: number; ok: boolean }> {
  try {
    const response = await fetch(`${BASE_URL}/api/webinars/${webinarId}/presence/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await userSupabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ session_id: `session_${Date.now()}` }),
    })

    return { status: response.status, ok: response.ok }
  } catch (error: any) {
    console.error('presence/ping 호출 실패:', error.message)
    return { status: 0, ok: false }
  }
}

/**
 * 단일 사용자 시뮬레이션
 */
async function simulateUser(webinarSlug: string, webinarId: string, userId: number): Promise<TestResult> {
  const result: TestResult = {
    success: 0,
    errorCounts: {
      '400': 0,
      '409': 0,
      '401': 0,
      '500': 0,
      other: 0,
    },
    totalRequests: 0,
    duration: 0,
    errors: [],
  }

  try {
    // 랜덤 사용자 생성
    const testUser = generateRandomUser()
    
    // 이름과 이메일로 계정 생성 및 로그인 (slug 사용 - 실제 사용자 플로우와 동일)
    const { user, supabase: userSupabase } = await createAndLoginUserWithNameEmail(
      webinarSlug, // slug 사용
      webinarId,   // 등록 정보 생성용 UUID
      testUser.name,
      testUser.email
    )
    console.log(`[사용자 ${userId}] 생성 완료: ${testUser.name} (${testUser.email})`)

    // access/track 호출 (등록 생성) - UUID 사용 (API가 UUID만 지원)
    const trackResult = await callAccessTrack(webinarId, userSupabase)
    result.totalRequests++
    if (trackResult.ok) {
      result.success++
    } else {
      const statusStr = trackResult.status.toString()
      if (statusStr in result.errorCounts) {
        result.errorCounts[statusStr as keyof typeof result.errorCounts]++
      } else {
        result.errorCounts.other++
      }
      result.errors.push({ status: trackResult.status, message: 'access/track 실패', endpoint: 'access/track' })
    }

    // presence/ping 반복 호출 - slug 사용 (API가 slug 지원)
    for (let i = 0; i < REQUESTS_PER_USER; i++) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL_MS))
      
      const pingResult = await callPresencePing(webinarSlug, userSupabase)
      result.totalRequests++
      
      if (pingResult.ok || pingResult.status === 204) {
        result.success++
      } else {
        const statusStr = pingResult.status.toString()
        if (statusStr in result.errorCounts) {
          result.errorCounts[statusStr as keyof typeof result.errorCounts]++
        } else {
          result.errorCounts.other++
        }
        result.errors.push({ status: pingResult.status, message: 'presence/ping 실패', endpoint: 'presence/ping' })
      }
    }

    console.log(`[사용자 ${userId}] 완료: 성공 ${result.success}/${result.totalRequests}`)
  } catch (error: any) {
    console.error(`[사용자 ${userId}] 오류:`, error.message)
    result.errorCounts.other++
    result.errors.push({ status: 0, message: error.message, endpoint: 'unknown' })
  }

  return result
}

/**
 * 메인 부하 테스트 실행
 */
async function runLoadTest() {
  console.log('='.repeat(60))
  console.log('웨비나 149400 부하 테스트 시작')
  console.log('='.repeat(60))
  console.log(`동시 사용자 수: ${CONCURRENT_USERS}`)
  console.log(`사용자당 요청 수: ${REQUESTS_PER_USER}`)
  console.log(`요청 간격: ${REQUEST_INTERVAL_MS}ms`)
  console.log('='.repeat(60))

  const startTime = Date.now()

  try {
    // 웨비나 ID 조회 (등록 정보 생성용)
    console.log(`웨비나 슬러그 "${WEBINAR_SLUG}"의 ID 조회 중...`)
    const webinarId = await getWebinarId(WEBINAR_SLUG)
    console.log(`웨비나 ID: ${webinarId}`)
    console.log('')

    // 동시 사용자 시뮬레이션 (slug 사용 - 실제 사용자 플로우와 동일)
    const userPromises = Array.from({ length: CONCURRENT_USERS }, (_, i) =>
      simulateUser(WEBINAR_SLUG, webinarId, i + 1)
    )

    console.log(`${CONCURRENT_USERS}명의 사용자 시뮬레이션 시작...`)
    const results = await Promise.all(userPromises)

    const endTime = Date.now()
    const duration = endTime - startTime

    // 결과 집계
    const aggregated: TestResult = {
      success: 0,
      errorCounts: {
        '400': 0,
        '409': 0,
        '401': 0,
        '500': 0,
        other: 0,
      },
      totalRequests: 0,
      duration,
      errors: [],
    }

    results.forEach(result => {
      aggregated.success += result.success
      aggregated.totalRequests += result.totalRequests
      aggregated.errorCounts['400'] += result.errorCounts['400']
      aggregated.errorCounts['409'] += result.errorCounts['409']
      aggregated.errorCounts['401'] += result.errorCounts['401']
      aggregated.errorCounts['500'] += result.errorCounts['500']
      aggregated.errorCounts.other += result.errorCounts.other
      aggregated.errors.push(...result.errors)
    })

    // 결과 출력
    console.log('')
    console.log('='.repeat(60))
    console.log('부하 테스트 결과')
    console.log('='.repeat(60))
    console.log(`총 요청 수: ${aggregated.totalRequests}`)
    console.log(`성공: ${aggregated.success} (${((aggregated.success / aggregated.totalRequests) * 100).toFixed(2)}%)`)
    console.log(`실패: ${aggregated.totalRequests - aggregated.success} (${(((aggregated.totalRequests - aggregated.success) / aggregated.totalRequests) * 100).toFixed(2)}%)`)
    console.log('')
    console.log('에러 분류:')
    console.log(`  400 (Bad Request): ${aggregated.errorCounts['400']}`)
    console.log(`  409 (Conflict): ${aggregated.errorCounts['409']}`)
    console.log(`  401 (Unauthorized): ${aggregated.errorCounts['401']}`)
    console.log(`  500 (Server Error): ${aggregated.errorCounts['500']}`)
    console.log(`  기타: ${aggregated.errorCounts.other}`)
    console.log('')
    console.log(`총 소요 시간: ${(duration / 1000).toFixed(2)}초`)
    console.log(`초당 요청 수: ${(aggregated.totalRequests / (duration / 1000)).toFixed(2)} req/s`)
    console.log('='.repeat(60))

    // 에러 상세 출력 (있는 경우)
    if (aggregated.errors.length > 0) {
      console.log('')
      console.log('에러 상세:')
      aggregated.errors.slice(0, 20).forEach((err, idx) => {
        console.log(`  ${idx + 1}. [${err.endpoint}] ${err.status}: ${err.message}`)
      })
      if (aggregated.errors.length > 20) {
        console.log(`  ... 외 ${aggregated.errors.length - 20}건`)
      }
    }

    // 판정
    console.log('')
    console.log('='.repeat(60))
    console.log('판정:')
    if (aggregated.errorCounts['400'] === 0 && aggregated.errorCounts['409'] < 5) {
      console.log('✅ PASS: 400 에러 없음, 409 에러 정상 범위')
    } else if (aggregated.errorCounts['400'] > 0) {
      console.log('❌ FAIL: 400 에러 발생 (registrations.id 관련 에러 가능성)')
    } else if (aggregated.errorCounts['409'] >= 5) {
      console.log('⚠️  WARNING: 409 에러 다수 발생 (경합 처리 확인 필요)')
    } else {
      console.log('✅ PASS: 에러 범위 내')
    }
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('부하 테스트 실패:', error.message)
    process.exit(1)
  }
}

// 실행
runLoadTest().catch(console.error)
