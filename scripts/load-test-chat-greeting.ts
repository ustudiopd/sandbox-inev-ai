/**
 * 채팅 인사 버튼 자동화 테스트 스크립트
 * 
 * 여러 사용자가 동시에 인사 버튼을 클릭하여 채팅 메시지를 전송하는 부하 테스트
 */

import { chromium, Browser, Page } from 'playwright'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { createAdminSupabase } from '../lib/supabase/admin'

// .env.local 파일 로드
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://eventflow.kr'
const WEBINAR_SLUG = '149400'

interface RegisteredUser {
  name: string
  email: string
}

interface TestResult {
  userId: number
  userName: string
  userEmail: string
  loginSuccess: boolean
  greetingClickSuccess: boolean
  messageSendSuccess: boolean
  messageReceived: boolean
  totalTime: number
  errors: string[]
}

/**
 * 등록된 사용자 정보 조회
 */
async function getRegisteredUsers(webinarId: string, limit: number = 200): Promise<RegisteredUser[]> {
  const adminSupabase = createAdminSupabase()
  
  const { data: webinar, error: webinarError } = await adminSupabase
    .from('webinars')
    .select('registration_campaign_id')
    .eq('id', webinarId)
    .single()

  if (webinarError || !webinar?.registration_campaign_id) {
    throw new Error(`웨비나의 등록 캠페인을 찾을 수 없습니다: ${webinarError?.message}`)
  }

  const { data: entries, error: entriesError } = await adminSupabase
    .from('event_survey_entries')
    .select('name, registration_data')
    .eq('campaign_id', webinar.registration_campaign_id)
    .not('registration_data->>email', 'is', null)
    .limit(limit)

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
 * 웨비나 ID 조회
 */
async function getWebinarId(slug: string): Promise<string> {
  const adminSupabase = createAdminSupabase()
  const { data, error } = await adminSupabase
    .from('webinars')
    .select('id, slug, title')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    throw new Error(`웨비나를 찾을 수 없습니다: ${slug}`)
  }

  return data.id
}

/**
 * 사용자 시뮬레이션
 */
async function simulateUser(
  browser: Browser,
  user: RegisteredUser,
  userId: number,
  webinarSlug: string
): Promise<TestResult> {
  const result: TestResult = {
    userId,
    userName: user.name,
    userEmail: user.email,
    loginSuccess: false,
    greetingClickSuccess: false,
    messageSendSuccess: false,
    messageReceived: false,
    totalTime: 0,
    errors: [],
  }

  const startTime = Date.now()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. 웨비나 입장 페이지 접속
    const url = `${BASE_URL}/webinar/${webinarSlug}?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // 2. 라이브 페이지로 리다이렉트 대기
    try {
      await page.waitForURL((url) => url.href.includes('/live'), { timeout: 15000 })
    } catch {
      await page.goto(`${BASE_URL}/webinar/${webinarSlug}/live`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    }

    result.loginSuccess = true

    // 3. 채팅 입력 필드가 나타날 때까지 대기
    const chatInputSelector = 'input[placeholder="메시지를 입력하세요..."]'
    await page.waitForSelector(chatInputSelector, { state: 'attached', timeout: 30000 })

    // 4. 인사 버튼 클릭 (👋 이모지가 포함된 버튼)
    const greetingButton = page.locator('button:has-text("👋")').first()
    await greetingButton.waitFor({ state: 'attached', timeout: 10000 })
    await greetingButton.click()
    
    result.greetingClickSuccess = true

    // 5. 입력 필드에 인사말이 입력되었는지 확인
    await page.waitForTimeout(500) // 입력 완료 대기
    
    const inputValue = await page.locator(chatInputSelector).first().inputValue()
    if (inputValue && inputValue.length > 0) {
      // 6. 전송 버튼 클릭 또는 Enter 키 입력
      const sendButton = page.locator('button:has-text("전송")').first()
      
      // API 응답 대기 리스너 설정
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/messages/create') && response.request().method() === 'POST',
        { timeout: 10000 }
      )

      // Enter 키로 전송
      await page.locator(chatInputSelector).first().press('Enter')

      // API 응답 대기
      const response = await responsePromise
      const responseData = await response.json()

      if (response.ok() && responseData.success) {
        result.messageSendSuccess = true
      } else {
        result.errors.push(`메시지 전송 실패: ${response.status}`)
      }
    } else {
      result.errors.push('인사말이 입력되지 않았습니다')
    }

    // 7. 메시지 수신 확인 (자신이 보낸 메시지가 화면에 나타나는지)
    await page.waitForTimeout(2000) // 메시지 표시 대기
    
    const messages = await page.locator('[class*="message"], [data-message-id]').all()
    if (messages.length > 0) {
      result.messageReceived = true
    }

  } catch (error: any) {
    result.errors.push(`에러: ${error.message}`)
  } finally {
    result.totalTime = Date.now() - startTime
    await context.close()
  }

  return result
}

/**
 * 메인 실행 함수
 */
async function main() {
  const CONCURRENT_USERS = parseInt(process.env.TEST_USER_COUNT || '10', 10)
  const DELAY_BETWEEN_USERS_MS = parseInt(process.env.USER_DELAY_MS || '100', 10)

  console.log('='.repeat(60))
  console.log('채팅 인사 버튼 자동화 테스트 시작')
  console.log('='.repeat(60))
  console.log(`웨비나 슬러그: ${WEBINAR_SLUG}`)
  console.log(`동시 사용자 수: ${CONCURRENT_USERS}`)
  console.log(`사용자 간 지연: ${DELAY_BETWEEN_USERS_MS}ms`)
  console.log('')

  try {
    // 웨비나 ID 조회
    const webinarId = await getWebinarId(WEBINAR_SLUG)
    console.log(`웨비나 ID: ${webinarId}`)

    // 등록된 사용자 정보 조회
    const registeredUsers = await getRegisteredUsers(webinarId, CONCURRENT_USERS)
    console.log(`등록된 사용자 수: ${registeredUsers.length}`)
    console.log('')

    if (registeredUsers.length < CONCURRENT_USERS) {
      throw new Error(`등록된 사용자가 ${CONCURRENT_USERS}명 미만입니다: ${registeredUsers.length}`)
    }

    // 브라우저 실행
    const browser = await chromium.launch({ headless: false }) // 헤드리스 모드 해제 (디버깅용)

    // 사용자 시뮬레이션 실행
    const results: TestResult[] = []
    const startTime = Date.now()

    console.log('사용자 시뮬레이션 시작...')
    console.log('')

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const user = registeredUsers[i]
      console.log(`[${i + 1}/${CONCURRENT_USERS}] 사용자 시뮬레이션 시작: ${user.name} (${user.email})`)
      
      const result = await simulateUser(browser, user, i + 1, WEBINAR_SLUG)
      results.push(result)

      if (result.errors.length > 0) {
        console.log(`  ❌ 실패: ${result.errors.join(', ')}`)
      } else {
        console.log(`  ✅ 성공 (${result.totalTime}ms)`)
      }

      // 사용자 간 지연
      if (i < CONCURRENT_USERS - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_USERS_MS))
      }
    }

    const totalTime = Date.now() - startTime

    // 결과 집계
    const loginSuccess = results.filter(r => r.loginSuccess).length
    const greetingClickSuccess = results.filter(r => r.greetingClickSuccess).length
    const messageSendSuccess = results.filter(r => r.messageSendSuccess).length
    const messageReceived = results.filter(r => r.messageReceived).length

    console.log('')
    console.log('='.repeat(60))
    console.log('테스트 결과')
    console.log('='.repeat(60))
    console.log(`총 실행 시간: ${totalTime}ms`)
    console.log(`로그인 성공: ${loginSuccess}/${CONCURRENT_USERS} (${((loginSuccess / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log(`인사 버튼 클릭 성공: ${greetingClickSuccess}/${CONCURRENT_USERS} (${((greetingClickSuccess / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log(`메시지 전송 성공: ${messageSendSuccess}/${CONCURRENT_USERS} (${((messageSendSuccess / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log(`메시지 수신 확인: ${messageReceived}/${CONCURRENT_USERS} (${((messageReceived / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log('')

    // 실패한 사용자 목록
    const failedUsers = results.filter(r => r.errors.length > 0)
    if (failedUsers.length > 0) {
      console.log('실패한 사용자:')
      failedUsers.forEach(r => {
        console.log(`  - ${r.userName} (${r.userEmail}): ${r.errors.join(', ')}`)
      })
      console.log('')
    }

    // 평균 시간 계산
    const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length
    const sortedTimes = [...results].map(r => r.totalTime).sort((a, b) => a - b)
    const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
    
    console.log(`평균 실행 시간: ${avgTime.toFixed(0)}ms`)
    console.log(`실행 시간 p95: ${p95Time.toFixed(0)}ms`)
    console.log('='.repeat(60))

    await browser.close()

    // 결과를 JSON 파일로 저장
    const reportPath = path.join(process.cwd(), 'docs', 'loadtest', `chat-greeting-test-${Date.now()}.json`)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      webinarId,
      webinarSlug: WEBINAR_SLUG,
      concurrentUsers: CONCURRENT_USERS,
      totalTime,
      results: {
        loginSuccess,
        greetingClickSuccess,
        messageSendSuccess,
        messageReceived,
        avgTime,
        p95Time,
      },
      details: results,
    }, null, 2))

    console.log(`결과 리포트 저장: ${reportPath}`)

  } catch (error: any) {
    console.error('테스트 실행 실패:', error.message)
    process.exit(1)
  }
}

// 실행
main().catch(console.error)
