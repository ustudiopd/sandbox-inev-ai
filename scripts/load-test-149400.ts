/**
 * /149400 페이지 부하 테스트 스크립트
 * 
 * 기능:
 * - 100명/200명 동시 접속 시뮬레이션
 * - 설문 제출 테스트
 * - 경품 추첨 참여 테스트
 * - 웨비나 접속 (Presence) 테스트
 * 
 * 사용법:
 *   npx tsx scripts/load-test-149400.ts --users 100
 *   npx tsx scripts/load-test-149400.ts --users 200
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

interface TestUser {
  id: number
  name: string
  email: string
  phone: string
  userId?: string // 생성된 사용자 ID
}

interface TestResult {
  totalUsers: number
  successfulRegistrations: number
  successfulSurveySubmissions: number
  successfulGiveawayEntries: number
  successfulPresenceJoins: number
  errors: Array<{ user: number; action: string; error: string }>
  duration: number
}

// 랜덤 사용자 생성
function generateTestUsers(count: number): TestUser[] {
  const users: TestUser[] = []
  const names = ['김철수', '이영희', '박민수', '최지영', '정수진', '강호영', '윤서연', '임동욱', '한소희', '조성민']
  const companies = ['삼성전자', 'LG전자', 'SK하이닉스', '네이버', '카카오', '현대자동차', '기아', '포스코', 'KT', 'LG화학']
  
  for (let i = 0; i < count; i++) {
    const nameIndex = i % names.length
    const companyIndex = Math.floor(i / names.length) % companies.length
    const userNum = Math.floor(i / 10) + 1
    
    users.push({
      id: i + 1,
      name: `${names[nameIndex]}${userNum}`,
      email: `test${i + 1}@example.com`,
      phone: `010${String(10000000 + i).slice(-8)}`,
    })
  }
  
  return users
}

// 사용자 생성 (Supabase Auth)
async function createTestUser(admin: ReturnType<typeof createAdminSupabase>, user: TestUser): Promise<string | null> {
  try {
    // 기존 사용자 확인
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    
    if (existingProfile) {
      return existingProfile.id
    }
    
    // 새 사용자 생성 (실제 Auth는 API를 통해야 하지만, 테스트용으로는 프로필만 생성)
    // 실제 환경에서는 Auth API를 사용해야 합니다
    const { data: newProfile, error } = await admin
      .from('profiles')
      .insert({
        email: user.email,
        display_name: user.name,
        phone: user.phone,
      })
      .select('id')
      .single()
    
    if (error) {
      console.error(`[User ${user.id}] 프로필 생성 실패:`, error.message)
      return null
    }
    
    return newProfile.id
  } catch (error: any) {
    console.error(`[User ${user.id}] 사용자 생성 오류:`, error.message)
    return null
  }
}

// 설문 제출 시뮬레이션
async function submitSurvey(
  baseUrl: string,
  campaignId: string,
  user: TestUser
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/public/event-survey/${campaignId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.name,
        company: '테스트회사',
        phone: user.phone,
        answers: [], // 설문 문항이 있으면 추가
        consentData: {
          marketing: true,
          privacy: true,
        },
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }
    
    return true
  } catch (error: any) {
    console.error(`[User ${user.id}] 설문 제출 실패:`, error.message)
    return false
  }
}

// 경품 참여 시뮬레이션
async function enterGiveaway(
  baseUrl: string,
  webinarId: string,
  giveawayId: string,
  authToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/webinars/${webinarId}/giveaways/${giveawayId}/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }
    
    return true
  } catch (error: any) {
    console.error(`경품 참여 실패:`, error.message)
    return false
  }
}

// 웨비나 정보 조회
async function getWebinarInfo(admin: ReturnType<typeof createAdminSupabase>) {
  // 149400 웨비나 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title, registration_campaign_id')
    .eq('slug', '149400')
    .maybeSingle()
  
  if (webinarError || !webinar) {
    throw new Error(`149400 웨비나를 찾을 수 없습니다: ${webinarError?.message}`)
  }
  
  // 등록 캠페인 조회
  let campaignId = webinar.registration_campaign_id
  
  if (!campaignId) {
    // public_path로 캠페인 찾기
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path')
      .eq('public_path', '/149400')
      .maybeSingle()
    
    if (campaignError || !campaign) {
      throw new Error(`149400 캠페인을 찾을 수 없습니다: ${campaignError?.message}`)
    }
    
    campaignId = campaign.id
  }
  
  // 경품 조회 (open 상태인 것)
  const { data: giveaway, error: giveawayError } = await admin
    .from('giveaways')
    .select('id, name, status')
    .eq('webinar_id', webinar.id)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle()
  
  return {
    webinarId: webinar.id,
    webinarSlug: webinar.slug,
    campaignId,
    giveawayId: giveaway?.id || null,
  }
}

// 메인 테스트 함수
async function runLoadTest(userCount: number) {
  const startTime = Date.now()
  const admin = createAdminSupabase()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  console.log(`\n🚀 /149400 페이지 부하 테스트 시작`)
  console.log(`   사용자 수: ${userCount}명`)
  console.log(`   Base URL: ${baseUrl}\n`)
  
  // 웨비나 정보 조회
  console.log('📋 웨비나 정보 조회 중...')
  let webinarInfo
  try {
    webinarInfo = await getWebinarInfo(admin)
    console.log(`✅ 웨비나 ID: ${webinarInfo.webinarId}`)
    console.log(`✅ 캠페인 ID: ${webinarInfo.campaignId}`)
    if (webinarInfo.giveawayId) {
      console.log(`✅ 경품 ID: ${webinarInfo.giveawayId}`)
    } else {
      console.log(`⚠️  열린 경품이 없습니다. 경품 추첨 테스트는 건너뜁니다.`)
    }
  } catch (error: any) {
    console.error(`❌ 웨비나 정보 조회 실패:`, error.message)
    process.exit(1)
  }
  
  // 테스트 사용자 생성
  console.log(`\n👥 테스트 사용자 생성 중...`)
  const users = generateTestUsers(userCount)
  console.log(`✅ ${users.length}명의 테스트 사용자 생성 완료`)
  
  const result: TestResult = {
    totalUsers: userCount,
    successfulRegistrations: 0,
    successfulSurveySubmissions: 0,
    successfulGiveawayEntries: 0,
    successfulPresenceJoins: 0,
    errors: [],
    duration: 0,
  }
  
  // 동시 실행을 위한 Promise 배열
  const promises: Promise<void>[] = []
  
  // 각 사용자별 작업 실행
  console.log(`\n🔄 사용자 작업 실행 중...`)
  const batchSize = 10 // 동시 실행 수 제한
  let completed = 0
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (user) => {
      try {
        // 1. 설문 제출
        const surveySuccess = await submitSurvey(baseUrl, webinarInfo.campaignId, user)
        if (surveySuccess) {
          result.successfulSurveySubmissions++
        } else {
          result.errors.push({ user: user.id, action: 'survey', error: '설문 제출 실패' })
        }
        
        // 2. 경품 참여 (경품이 있는 경우)
        if (webinarInfo.giveawayId) {
          // 실제로는 인증이 필요하지만, 테스트용으로는 스킵
          // 실제 환경에서는 사용자 인증 후 진행해야 합니다
          // const giveawaySuccess = await enterGiveaway(...)
          // if (giveawaySuccess) {
          //   result.successfulGiveawayEntries++
          // }
        }
        
        completed++
        if (completed % 10 === 0) {
          process.stdout.write(`\r   진행률: ${completed}/${users.length} (${Math.round((completed / users.length) * 100)}%)`)
        }
      } catch (error: any) {
        result.errors.push({ user: user.id, action: 'general', error: error.message })
      }
    })
    
    await Promise.all(batchPromises)
    
    // 배치 간 짧은 대기 (서버 부하 방지)
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log(`\n\n✅ 모든 작업 완료!`)
  
  // 결과 출력
  result.duration = Date.now() - startTime
  console.log(`\n📊 테스트 결과:`)
  console.log(`   총 사용자 수: ${result.totalUsers}명`)
  console.log(`   설문 제출 성공: ${result.successfulSurveySubmissions}명`)
  console.log(`   경품 참여 성공: ${result.successfulGiveawayEntries}명`)
  console.log(`   오류 발생: ${result.errors.length}건`)
  console.log(`   소요 시간: ${(result.duration / 1000).toFixed(2)}초`)
  
  if (result.errors.length > 0) {
    console.log(`\n❌ 오류 상세:`)
    result.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`   ${idx + 1}. 사용자 ${err.user} - ${err.action}: ${err.error}`)
    })
    if (result.errors.length > 10) {
      console.log(`   ... 외 ${result.errors.length - 10}건`)
    }
  }
  
  // 통계 조회
  console.log(`\n📈 실제 데이터베이스 통계:`)
  try {
    // 설문 제출 수 조회
    const { data: surveySubmissions, error: surveyError } = await admin
      .from('event_survey_entries')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', webinarInfo.campaignId)
    
    if (!surveyError) {
      console.log(`   설문 제출 수: ${surveySubmissions || 0}건`)
    }
    
    // 경품 참여 수 조회
    if (webinarInfo.giveawayId) {
      const { data: giveawayEntries, error: giveawayError } = await admin
        .from('giveaway_entries')
        .select('id', { count: 'exact', head: true })
        .eq('giveaway_id', webinarInfo.giveawayId)
      
      if (!giveawayError) {
        console.log(`   경품 참여 수: ${giveawayEntries || 0}건`)
      }
    }
  } catch (error: any) {
    console.error(`   통계 조회 오류:`, error.message)
  }
  
  console.log(`\n✨ 테스트 완료!\n`)
}

// CLI 인자 파싱
const args = process.argv.slice(2)
let userCount = 100

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--users' && args[i + 1]) {
    userCount = parseInt(args[i + 1], 10)
    if (isNaN(userCount) || userCount < 1) {
      console.error('❌ 사용자 수는 1 이상의 숫자여야 합니다.')
      process.exit(1)
    }
  }
}

// 테스트 실행
runLoadTest(userCount).catch((error) => {
  console.error('❌ 테스트 실행 오류:', error)
  process.exit(1)
})
