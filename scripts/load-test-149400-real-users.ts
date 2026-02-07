/**
 * 웨비나 149400 부하 테스트 스크립트 (실제 등록 사용자)
 * 
 * 목적:
 * - 실제 등록된 사용자 정보로 계정 생성 및 접속 테스트
 * - 동시 접속 시나리오 시뮬레이션
 * - 400/409 에러 모니터링
 * - Auth 호출량 확인
 * 
 * 실행 방법:
 * npx tsx scripts/load-test-149400-real-users.ts
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
const CONCURRENT_USERS = 200 // 동시 사용자 수 (S2 규모)
const REQUESTS_PER_USER = 1 // 사용자당 요청 수 (URL 접속만)
const REQUEST_INTERVAL_MS = 1000 // 요청 간격 (1초)
const USER_CREATION_DELAY_MS = 50 // 사용자 생성 간격 (rate limit 방지)

interface RegisteredUser {
  name: string
  email: string
}

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
 * 등록된 사용자 정보 조회 (모든 등록자)
 */
async function getRegisteredUsers(webinarId: string): Promise<RegisteredUser[]> {
  // 웨비나의 registration_campaign_id 조회
  const { data: webinar, error: webinarError } = await adminSupabase
    .from('webinars')
    .select('registration_campaign_id')
    .eq('id', webinarId)
    .single()

  if (webinarError || !webinar?.registration_campaign_id) {
    throw new Error(`웨비나의 등록 캠페인을 찾을 수 없습니다: ${webinarError?.message}`)
  }

  // 등록된 사용자 정보 조회 (limit 제거 - 모든 등록자)
  const { data: entries, error: entriesError } = await adminSupabase
    .from('event_survey_entries')
    .select('name, registration_data')
    .eq('campaign_id', webinar.registration_campaign_id)
    .not('registration_data->>email', 'is', null)

  if (entriesError) {
    throw new Error(`등록 정보 조회 실패: ${entriesError.message}`)
  }

  const users: RegisteredUser[] = []
  for (const entry of entries || []) {
    const regData = entry.registration_data as any
    const email = regData?.email?.toLowerCase()?.trim()
    const name = entry.name || regData?.name || regData?.firstName || '익명'

    if (email && email !== '') {
      users.push({ name, email })
    }
  }

  return users
}

/**
 * 웨비나 접속 URL 생성
 */
function createWebinarAccessUrl(webinarSlug: string, name: string, email: string): string {
  const encodedName = encodeURIComponent(name)
  const encodedEmail = encodeURIComponent(email)
  return `${BASE_URL}/webinar/${webinarSlug}?name=${encodedName}&email=${encodedEmail}`
}

/**
 * 웨비나 입장 페이지 접속 (쿼리 파라미터로 자동입장 시도)
 */
async function accessWebinarPage(webinarSlug: string, name: string, email: string): Promise<{ status: number; ok: boolean }> {
  try {
    const url = createWebinarAccessUrl(webinarSlug, name, email)
    
    // 웨비나 입장 페이지 접속 (쿼리 파라미터 포함)
    // 실제 사용자 플로우: 페이지 접속 → 자동입장 처리
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow', // 리다이렉트 따라가기
    })

    return { status: response.status, ok: response.ok }
  } catch (error: any) {
    console.error('웨비나 페이지 접속 실패:', error.message)
    return { status: 0, ok: false }
  }
}

/**
 * 웨비나 자동입장 API 호출 (실제 사용자 플로우)
 */
async function enterWebinarViaApi(webinarSlug: string, name: string, email: string): Promise<{ status: number; ok: boolean }> {
  try {
    const response = await fetch(`${BASE_URL}/api/webinars/${webinarSlug}/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email }),
    })

    return { status: response.status, ok: response.ok }
  } catch (error: any) {
    console.error('웨비나 입장 API 호출 실패:', error.message)
    return { status: 0, ok: false }
  }
}

/**
 * 사용자 계정 생성 및 로그인 (기존 방식 - 필요시 사용)
 */
async function createAndLoginUser(user: RegisteredUser): Promise<{ user: any; supabase: any }> {
  // 테스트용 비밀번호 생성 (일관성 있게)
  const password = `Test123!${user.email.split('@')[0]}`

  try {
    // 먼저 기존 사용자 확인
    const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`사용자 목록 조회 실패: ${listError.message}`)
    }

    const existingUser = usersData?.users.find(
      u => u.email?.toLowerCase() === user.email.toLowerCase()
    )

    if (existingUser) {
      // 기존 사용자가 있으면 비밀번호 재설정
      await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        user_metadata: {
          display_name: user.name,
        },
      })

      // 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
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
    }

    // 새 사용자 생성 (admin으로 직접 생성하여 이메일 확인 스킵)
    const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
      email: user.email,
      password: password,
      email_confirm: true, // 이메일 확인 없이 바로 활성화
      user_metadata: {
        display_name: user.name,
      },
    })

    if (createError) {
      // 이미 등록된 사용자인 경우 비밀번호 재설정 후 로그인 시도
      if (createError.message.includes('already') || createError.message.includes('registered')) {
        // admin으로 비밀번호 재설정
        const { data: usersData } = await adminSupabase.auth.admin.listUsers()
        const foundUser = usersData?.users.find(
          u => u.email?.toLowerCase() === user.email.toLowerCase()
        )
        
        if (foundUser) {
          await adminSupabase.auth.admin.updateUserById(foundUser.id, {
            password: password,
            user_metadata: {
              display_name: user.name,
            },
          })
          
          // 로그인 시도
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password,
          })

          if (signInError) {
            throw signInError
          }

          const userSupabase = createClient(supabaseUrl, supabaseAnonKey)
          await userSupabase.auth.setSession({
            access_token: signInData.session!.access_token,
            refresh_token: signInData.session!.refresh_token!,
          })

          return { user: signInData.user, supabase: userSupabase }
        } else {
          throw new Error(`사용자를 찾을 수 없습니다: ${user.email}`)
        }
      }
      throw createError
    }

    // 생성된 사용자로 로그인
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    })

    if (signInError) {
      throw signInError
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey)
    await userSupabase.auth.setSession({
      access_token: signInData.session!.access_token,
      refresh_token: signInData.session!.refresh_token!,
    })

    return { user: signInData.user, supabase: userSupabase }
  } catch (error: any) {
    // rate limit 에러인 경우 재시도
    if (error.message?.includes('rate limit')) {
      await new Promise(resolve => setTimeout(resolve, USER_CREATION_DELAY_MS * 10))
      // 재시도
      return createAndLoginUser(user)
    }
    console.error(`사용자 생성/로그인 실패 (${user.email}):`, error.message)
    throw error
  }
}

/**
 * 웨비나 ID 조회 (슬러그로)
 */
async function getWebinarId(slug: string): Promise<string> {
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
    throw new Error(`웨비나를 찾을 수 없습니다: ${slug}`)
  }

  console.log(`✅ 웨비나 찾음: ${data.title} (ID: ${data.id}, Slug: ${data.slug})`)
  return data.id
}

/**
 * 웨비나 입장 (이름, 이메일로)
 */
async function enterWebinar(webinarId: string, name: string, email: string, userSupabase: any): Promise<{ status: number; ok: boolean }> {
  try {
    const response = await fetch(`${BASE_URL}/api/webinars/${webinarId}/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await userSupabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ name, email }),
    })

    return { status: response.status, ok: response.ok }
  } catch (error: any) {
    console.error('웨비나 입장 실패:', error.message)
    return { status: 0, ok: false }
  }
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
 * 단일 사용자 시뮬레이션 (URL 접속 방식)
 */
async function simulateUser(
  webinarSlug: string,
  registeredUser: RegisteredUser,
  userId: number
): Promise<TestResult> {
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
    console.log(`[사용자 ${userId}] 접속 시작: ${registeredUser.name} (${registeredUser.email})`)

    // 1. 웨비나 입장 페이지 접속 (쿼리 파라미터로 자동입장)
    const pageResult = await accessWebinarPage(webinarSlug, registeredUser.name, registeredUser.email)
    result.totalRequests++
    
    if (pageResult.ok) {
      result.success++
      console.log(`[사용자 ${userId}] 웨비나 페이지 접속 성공`)
    } else {
      const statusStr = pageResult.status.toString()
      if (statusStr in result.errorCounts) {
        result.errorCounts[statusStr as keyof typeof result.errorCounts]++
      } else {
        result.errorCounts.other++
      }
      result.errors.push({
        status: pageResult.status,
        message: '웨비나 페이지 접속 실패',
        endpoint: 'webinar-page',
      })
      console.log(`[사용자 ${userId}] 웨비나 페이지 접속 실패: ${pageResult.status}`)
    }

    // 2. 웨비나 자동입장 API 호출 (실제 사용자 플로우)
    const enterResult = await enterWebinarViaApi(webinarSlug, registeredUser.name, registeredUser.email)
    result.totalRequests++
    
    if (enterResult.ok) {
      result.success++
      console.log(`[사용자 ${userId}] 웨비나 입장 API 성공`)
    } else {
      const statusStr = enterResult.status.toString()
      if (statusStr in result.errorCounts) {
        result.errorCounts[statusStr as keyof typeof result.errorCounts]++
      } else {
        result.errorCounts.other++
      }
      result.errors.push({
        status: enterResult.status,
        message: '웨비나 입장 API 실패',
        endpoint: 'enter',
      })
      console.log(`[사용자 ${userId}] 웨비나 입장 API 실패: ${enterResult.status}`)
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
  console.log('웨비나 149400 부하 테스트 시작 (실제 등록 사용자)')
  console.log('='.repeat(60))
  console.log(`동시 사용자 수: ${CONCURRENT_USERS}`)
  console.log(`사용자당 요청 수: ${REQUESTS_PER_USER}`)
  console.log(`요청 간격: ${REQUEST_INTERVAL_MS}ms`)
  console.log('='.repeat(60))

  const startTime = Date.now()

  try {
    // 웨비나 ID 조회
    console.log(`웨비나 슬러그 "${WEBINAR_SLUG}"의 ID 조회 중...`)
    const webinarId = await getWebinarId(WEBINAR_SLUG)
    console.log(`웨비나 ID: ${webinarId}`)
    console.log('')

    // 등록된 사용자 정보 조회
    console.log('등록된 사용자 정보 조회 중...')
    const registeredUsers = await getRegisteredUsers(webinarId)
    console.log(`총 ${registeredUsers.length}명의 등록 사용자 발견`)
    console.log('')

    if (registeredUsers.length === 0) {
      throw new Error('등록된 사용자가 없습니다.')
    }

    // 사용할 사용자 선택 (최대 CONCURRENT_USERS명 또는 전체)
    const maxUsers = Math.min(CONCURRENT_USERS, registeredUsers.length)
    const usersToTest = registeredUsers.slice(0, maxUsers)
    console.log(`${usersToTest.length}명의 사용자로 테스트 시작...`)
    console.log('')

    // 웨비나 슬러그 가져오기
    const { data: webinarData } = await adminSupabase
      .from('webinars')
      .select('slug')
      .eq('id', webinarId)
      .single()
    
    const webinarSlug = webinarData?.slug || WEBINAR_SLUG
    console.log(`웨비나 슬러그: ${webinarSlug}`)
    console.log('')

    // 동시 사용자 시뮬레이션 (rate limit 방지를 위해 순차적으로 시작)
    const userPromises = usersToTest.map((user, index) => {
      // 각 사용자 접속 사이에 약간의 지연 추가
      return new Promise<TestResult>(resolve => {
        setTimeout(async () => {
          const result = await simulateUser(webinarSlug, user, index + 1)
          resolve(result)
        }, index * USER_CREATION_DELAY_MS)
      })
    })

    console.log(`${usersToTest.length}명의 사용자 시뮬레이션 시작...`)
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
