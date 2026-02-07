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
const TEST_RUN_ID = `TEST_${Date.now()}`

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
  receivedMessageIds: Set<string> // 수신한 메시지 ID (중복 체크용)
  receivedCount: number // 수신한 메시지 수
  expectedReceiveCount: number // 기대 수신 수 (전체 메시지 - 본인 메시지)
  duplicateReceiveCount: number // 중복 수신 수
  receiveLatencies: number[] // 전송→수신 지연 (밀리초)
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
  webinarSlug: string,
  totalUsers: number, // 전체 사용자 수 (기대 수신 수 계산용)
  webinarId: string // 웨비나 ID (Realtime 채널명용)
): Promise<TestResult> {
  const result: TestResult = {
    userId,
    userName: user.name,
    userEmail: user.email,
    loginSuccess: false,
    greetingClickSuccess: false,
    messageSendSuccess: false,
    messageReceived: false,
    receivedMessageIds: new Set(),
    receivedCount: 0,
    expectedReceiveCount: totalUsers - 1, // 본인 제외
    duplicateReceiveCount: 0,
    receiveLatencies: [],
    totalTime: 0,
    errors: [],
  }
  
  // 전송한 메시지 ID 추적 (본인 메시지 제외용)
  const sentMessageIds = new Set<string>()

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

    // 3. Realtime broadcast 이벤트 리스너 등록 (수신 검증용)
    // window 객체에 수신 통계 저장 (페이지 로드 전 초기화)
    await page.addInitScript(({ testRunId, userId }: { testRunId: string; userId: number }) => {
      (window as any).__testReceiveCount = 0
      ;(window as any).__testReceivedIds = new Set<string>()
      ;(window as any).__testReceiveLatencies = []
      ;(window as any).__testRunId = testRunId
      ;(window as any).__testUserId = userId
      ;(window as any).__testDuplicateCount = 0
      ;(window as any).__testRealtimeSubscribed = false
    }, { testRunId: TEST_RUN_ID, userId })

    // Playwright 콘솔 이벤트 리스너로 Realtime 메시지 감지
    page.on('console', async (msg) => {
      const text = msg.text()
      
      // Realtime 구독 상태 확인 (다양한 패턴 감지)
      if (text.includes('✅ 실시간 구독 성공') || 
          text.includes('SUBSCRIBED') || 
          text.includes('실시간 구독 성공') ||
          text.includes('실시간 Broadcast 이벤트:') ||
          text.includes('새 메시지 수신:')) {
        await page.evaluate(() => {
          (window as any).__testRealtimeSubscribed = true
        }).catch(() => {})
      }
      
      // "실시간 Broadcast 이벤트:" 또는 "새 메시지 수신:" 로그 감지
      if (text.includes('실시간 Broadcast 이벤트:') || text.includes('새 메시지 수신:')) {
        try {
          // 콘솔 메시지의 인자들을 가져와서 파싱
          const args = msg.args()
          const values: any[] = []
          
          for (const arg of args) {
            try {
              const value = await arg.jsonValue()
              values.push(value)
            } catch {
              // jsonValue() 실패 시 null 추가
              values.push(null)
            }
          }
          
          // 페이지 내부에서 메시지 처리
          await page.evaluate(({ testRunId, values: msgValues, text: msgText }) => {
            try {
              // values에서 메시지 객체 찾기
              let message: any = null
              let envelope: any = null
              
              // 첫 번째 인자는 이벤트 타입일 수 있음 (예: 'chat:new')
              // 두 번째 인자부터 envelope 또는 메시지 객체
              for (const val of msgValues) {
                if (val && typeof val === 'object') {
                  // Broadcast envelope 구조: { t: 'chat:new', payload: {...}, mid: '...' }
                  if (val.t && val.payload) {
                    envelope = val
                    message = val.payload
                    break
                  }
                  // 직접 메시지 객체
                  if (val.id || val.content) {
                    message = val
                    break
                  }
                }
              }
              
              // 텍스트에서 JSON 파싱 시도 (fallback)
              if (!message && !envelope) {
                const jsonMatch = msgText.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  try {
                    const parsed = JSON.parse(jsonMatch[0])
                    if (parsed.t && parsed.payload) {
                      envelope = parsed
                      message = parsed.payload
                    } else if (parsed.id || parsed.content) {
                      message = parsed
                    }
                  } catch (e) {
                    // 파싱 실패 무시
                  }
                }
              }
              
              // 테스트 메시지인지 확인 (TEST_RUN_ID 포함)
              if (message && message.content && typeof message.content === 'string' && message.content.includes(testRunId)) {
                const messageId = message.id?.toString() || message.client_msg_id || `${message.user_id}_${message.created_at}`
                if (messageId) {
                  const receiveTime = Date.now()
                  
                  // 중복 체크
                  if ((window as any).__testReceivedIds.has(messageId)) {
                    ;(window as any).__testDuplicateCount++
                  } else {
                    ;(window as any).__testReceivedIds.add(messageId)
                    ;(window as any).__testReceiveCount++
                    
                    // 전송 시간 추출 시도 (메시지 내용에서 ts: 타임스탬프)
                    const timeMatch = message.content.match(/ts:(\d+)/)
                    if (timeMatch) {
                      const sendTime = parseInt(timeMatch[1])
                      const latency = receiveTime - sendTime
                      ;(window as any).__testReceiveLatencies.push(latency)
                    }
                  }
                }
              }
            } catch (e) {
              // 에러 무시
            }
          }, { testRunId: TEST_RUN_ID, values, text }).catch(() => {})
        } catch (e) {
          // 파싱 실패 무시
        }
      }
    })
    
    // 페이지 로드 후 콘솔 로그 오버라이드 재설정 (더 확실한 방법)
    await page.waitForTimeout(2000) // React 컴포넌트 마운트 대기
    await page.evaluate(({ testRunId }: { testRunId: string }) => {
      // 기존 콘솔 로그 오버라이드가 있으면 제거하고 재설정
      const originalLog = console.log.bind(console)
      
      console.log = function(...args: any[]) {
        originalLog.apply(console, args)
        
        const text = args.map(a => {
          if (typeof a === 'object' && a !== null) {
            try {
              return JSON.stringify(a)
            } catch {
              return String(a)
            }
          }
          return String(a)
        }).join(' ')
        
        // "실시간 Broadcast 이벤트:" 또는 "새 메시지 수신:" 로그에서 메시지 추출
        if (text.includes('실시간 Broadcast 이벤트:') || text.includes('새 메시지 수신:')) {
          try {
            // args에서 객체 찾기
            let message: any = null
            let envelope: any = null
            
            for (const arg of args) {
              if (typeof arg === 'object' && arg !== null) {
                // Broadcast envelope 구조
                if (arg.t && arg.payload) {
                  envelope = arg
                  message = arg.payload
                  break
                }
                // 직접 메시지 객체
                if (arg.id || arg.content) {
                  message = arg
                  break
                }
              }
            }
            
            // JSON 문자열 파싱 시도
            if (!message && !envelope) {
              const jsonMatch = text.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0])
                  if (parsed.t && parsed.payload) {
                    envelope = parsed
                    message = parsed.payload
                  } else if (parsed.id || parsed.content) {
                    message = parsed
                  }
                } catch (e) {
                  // 파싱 실패 무시
                }
              }
            }
            
            // 테스트 메시지인지 확인 (TEST_RUN_ID 포함)
            if (message && message.content && typeof message.content === 'string' && message.content.includes(testRunId)) {
              const messageId = message.id?.toString() || message.client_msg_id || `${message.user_id}_${message.created_at}`
              if (messageId) {
                const receiveTime = Date.now()
                
                // 중복 체크
                if ((window as any).__testReceivedIds.has(messageId)) {
                  ;(window as any).__testDuplicateCount++
                } else {
                  ;(window as any).__testReceivedIds.add(messageId)
                  ;(window as any).__testReceiveCount++
                  
                  // 전송 시간 추출 시도 (메시지 내용에서 ts: 타임스탬프)
                  const timeMatch = message.content.match(/ts:(\d+)/)
                  if (timeMatch) {
                    const sendTime = parseInt(timeMatch[1])
                    const latency = receiveTime - sendTime
                    ;(window as any).__testReceiveLatencies.push(latency)
                  }
                }
              }
            }
          } catch (e) {
            // 파싱 실패 무시
          }
        }
      }
    }, { testRunId: TEST_RUN_ID })
    
    // 페이지 내부에서 직접 Realtime 채널 모니터링 (더 확실한 방법)
    await page.evaluate(({ testRunId, webinarId }: { testRunId: string; webinarId: string }) => {
      // Supabase 클라이언트가 로드될 때까지 대기
      const checkSupabase = setInterval(() => {
        if ((window as any).supabase || (window as any).__NEXT_DATA__) {
          clearInterval(checkSupabase)
          
          // Realtime 채널 직접 모니터링 시도
          // 채널 이름: webinar:{webinarId}
          const channelName = `webinar:${webinarId}`
          
          // 페이지가 완전히 로드된 후 채널 확인
          setTimeout(() => {
            try {
              // window에서 supabase 인스턴스 찾기
              let supabaseClient: any = null
              if ((window as any).supabase) {
                supabaseClient = (window as any).supabase
              } else if ((window as any).__NEXT_DATA__) {
                // Next.js의 경우 다른 방법으로 접근 필요
              }
              
              // 채널이 이미 존재하는지 확인하고 이벤트 리스너 추가
              // 실제 구현은 React 컴포넌트 내부에서 이루어지므로
              // 여기서는 콘솔 로그를 통해 감지하는 것이 더 안전
            } catch (e) {
              // 에러 무시
            }
          }, 2000)
        }
      }, 100)
      
      // 최대 10초 대기
      setTimeout(() => clearInterval(checkSupabase), 10000)
    }, { testRunId: TEST_RUN_ID, webinarId })

    // 4. 채팅 입력 필드가 나타날 때까지 대기
    const chatInputSelector = 'input[placeholder="메시지를 입력하세요..."]'
    await page.waitForSelector(chatInputSelector, { state: 'attached', timeout: 30000 })

    // 채팅 탭이 활성화되어 있는지 확인 (채팅 탭 클릭)
    const chatTab = page.locator('button:has-text("채팅"), button:has-text("💬")').first()
    const chatTabExists = await chatTab.count() > 0
    if (chatTabExists) {
      try {
        await chatTab.click({ timeout: 5000 })
        await page.waitForTimeout(1000) // 탭 전환 대기
      } catch {
        // 탭 클릭 실패 무시 (이미 활성화되어 있을 수 있음)
      }
    }

    // 5. 인사 버튼 클릭 (JavaScript로 직접 실행하여 보이지 않아도 클릭)
    const greetingClicked = await page.evaluate(() => {
      // 인사 버튼 찾기 (title 속성 또는 이모지로)
      const buttons = Array.from(document.querySelectorAll('button'))
      const greetingButton = buttons.find(btn => 
        btn.getAttribute('title') === '인사말 자동 입력' || 
        btn.textContent?.includes('👋')
      )
      
      if (greetingButton) {
        // 클릭 이벤트 직접 트리거
        greetingButton.click()
        return true
      }
      return false
    })
    
    if (!greetingClicked) {
      result.errors.push('인사 버튼을 찾을 수 없습니다')
      return result
    }
    
    result.greetingClickSuccess = true

    // 6. 입력 필드에 인사말이 입력되었는지 확인 (최대 3초 대기)
    let inputValue = ''
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500)
      inputValue = await page.locator(chatInputSelector).first().inputValue()
      if (inputValue && inputValue.length > 0) {
        break
      }
    }
    
    if (!inputValue || inputValue.length === 0) {
      result.errors.push('인사말이 입력되지 않았습니다')
      return result
    }
    
    // 테스트 식별자 추가 (메시지 내용에 포함)
    const sendTimestamp = Date.now()
    const testMessageContent = `[${TEST_RUN_ID}_U${userId}_M1_ts:${sendTimestamp}] ${inputValue}`
    await page.evaluate((content: string) => {
      const input = document.querySelector('input[placeholder="메시지를 입력하세요..."]') as HTMLInputElement
      if (input) {
        input.value = content
        // React 상태 업데이트를 위한 이벤트 트리거
        const event = new Event('input', { bubbles: true })
        input.dispatchEvent(event)
        const changeEvent = new Event('change', { bubbles: true })
        input.dispatchEvent(changeEvent)
      }
    }, testMessageContent)

    // 7. API 응답 대기 리스너 먼저 설정
    let responseReceived = false
    let responseData: any = null
    let sentMessageId: string | null = null
    let requestBody: any = null
    
    // 요청 본문 캡처
    page.on('request', async (request) => {
      if (request.url().includes('/api/messages/create') && request.method() === 'POST') {
        try {
          const postData = request.postData()
          if (postData) {
            requestBody = JSON.parse(postData)
            console.log(`[${userId}] 요청 본문:`, JSON.stringify(requestBody).substring(0, 200))
          }
        } catch (e) {
          // 파싱 실패 무시
        }
      }
    })
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/messages/create') && response.request().method() === 'POST') {
        responseReceived = true
        try {
          responseData = await response.json()
          console.log(`[${userId}] API 응답:`, JSON.stringify(responseData).substring(0, 200))
          if (responseData.success && responseData.message?.id) {
            sentMessageId = responseData.message.id.toString()
            sentMessageIds.add(sentMessageId)
            console.log(`[${userId}] 메시지 전송 성공, ID: ${sentMessageId}`)
          } else {
            console.warn(`[${userId}] 메시지 전송 실패:`, responseData)
          }
        } catch (e) {
          responseData = { error: 'JSON 파싱 실패', raw: await response.text() }
          console.error(`[${userId}] 응답 파싱 실패:`, e)
        }
      }
    })

    // 8. JavaScript로 직접 form submit 트리거
    const sendStartTime = Date.now()
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="메시지를 입력하세요..."]') as HTMLInputElement
      if (input && input.value) {
        // form 찾기
        const form = input.closest('form')
        if (form) {
          // form submit 이벤트 트리거
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
          form.dispatchEvent(submitEvent)
        } else {
          // form이 없으면 Enter 키 이벤트 트리거
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          })
          input.dispatchEvent(enterEvent)
        }
      }
    })

    // API 응답 대기 (최대 15초)
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500)
      if (responseReceived) {
        break
      }
    }

    if (responseReceived && responseData) {
      if (responseData.success) {
        result.messageSendSuccess = true
      } else {
        result.errors.push(`메시지 전송 실패: ${JSON.stringify(responseData)}`)
      }
    } else {
      result.errors.push('API 응답을 받지 못했습니다 (타임아웃)')
    }

    // 9. Realtime 구독 상태 확인 (경고만, 실패로 처리하지 않음)
    // 구독이 완료되지 않아도 메시지 전송은 가능할 수 있음
    let realtimeSubscribed = false
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500)
      realtimeSubscribed = await page.evaluate(() => {
        return !!(window as any).__testRealtimeSubscribed
      })
      if (realtimeSubscribed) {
        break
      }
    }
    
    // 구독 상태는 경고만 (실제 메시지 수신 여부가 더 중요)
    if (!realtimeSubscribed) {
      console.warn(`[${userId}] Realtime 구독 상태 확인 실패 (콘솔 로그 미감지 가능)`)
    }

    // 10. 메시지 전송 완료 후 수신 카운트 확인 (window 카운터 사용)
    // 모든 사용자의 메시지 전송이 완료될 때까지 대기
    const waitTime = Math.max(15000, (totalUsers * 2000)) // 최소 15초 또는 사용자 수 * 2초
    await page.waitForTimeout(waitTime)
    
    // 전송한 메시지 ID 저장 (나중에 DB 조회용)
    if (sentMessageId) {
      result.receivedMessageIds.add(sentMessageId)
    }
    
    // window 카운터에서 수신 통계 읽기
    const receiveStats = await page.evaluate(({ testRunId }: { testRunId: string }) => {
      const win = window as any
      const stats = {
        receivedCount: 0,
        receivedTestCount: 0,
        receivedIds: [] as string[],
        receivedTestIds: [] as string[],
        latencies: [] as number[],
      }
      
      if (win.__TEST_RECEIVED_COUNT !== undefined) {
        stats.receivedCount = win.__TEST_RECEIVED_COUNT || 0
      }
      
      if (win.__TEST_RECEIVED_IDS) {
        stats.receivedIds = Array.from(win.__TEST_RECEIVED_IDS || new Set())
      }
      
      if (win.__TEST_RECEIVED_TEST_IDS) {
        stats.receivedTestIds = Array.from(win.__TEST_RECEIVED_TEST_IDS || new Set())
        stats.receivedTestCount = stats.receivedTestIds.length
      }
      
      if (win.__TEST_RECEIVE_LATENCIES) {
        stats.latencies = win.__TEST_RECEIVE_LATENCIES || []
      }
      
      return stats
    }, { testRunId: TEST_RUN_ID })
    
    // 수신 통계 업데이트
    result.receivedCount = receiveStats.receivedTestCount // 테스트 메시지만 카운트
    receiveStats.receivedTestIds.forEach(id => result.receivedMessageIds.add(id))
    result.receiveLatencies = receiveStats.latencies
    
    // 수신 성공 판정
    if (result.receivedCount > 0) {
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

    // 사용자 시뮬레이션 실행 (병렬 처리로 개선)
    const results: TestResult[] = []
    const startTime = Date.now()
    const CONCURRENT_BATCH = 10 // 동시에 실행할 사용자 수

    console.log('사용자 시뮬레이션 시작...')
    console.log(`병렬 처리: ${CONCURRENT_BATCH}명씩 동시 실행`)
    console.log('')

    // 배치 단위로 나누어 실행
    for (let batchStart = 0; batchStart < CONCURRENT_USERS; batchStart += CONCURRENT_BATCH) {
      const batchEnd = Math.min(batchStart + CONCURRENT_BATCH, CONCURRENT_USERS)
      const batchUsers = registeredUsers.slice(batchStart, batchEnd)
      
      console.log(`[배치 ${Math.floor(batchStart / CONCURRENT_BATCH) + 1}] ${batchStart + 1}~${batchEnd}번 사용자 시작...`)
      
      // 배치 내에서 병렬 실행
      const batchPromises = batchUsers.map((user, idx) => {
        const userIndex = batchStart + idx + 1
        console.log(`  [${userIndex}/${CONCURRENT_USERS}] 사용자 시뮬레이션 시작: ${user.name} (${user.email})`)
        return simulateUser(browser, user, userIndex, WEBINAR_SLUG, CONCURRENT_USERS, webinarId)
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 배치 결과 출력
      batchResults.forEach((result, idx) => {
        const userIndex = batchStart + idx + 1
        if (result.errors.length > 0) {
          console.log(`  [${userIndex}] ❌ 실패: ${result.errors.join(', ')}`)
        } else {
          console.log(`  [${userIndex}] ✅ 성공 (${result.totalTime}ms)`)
        }
      })
      
      console.log(`[배치 ${Math.floor(batchStart / CONCURRENT_BATCH) + 1}] 완료`)
      console.log('')
      
      // 배치 간 지연 (서버 부하 방지)
      if (batchEnd < CONCURRENT_USERS) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const totalTime = Date.now() - startTime

    // 결과 집계
    const loginSuccess = results.filter(r => r.loginSuccess).length
    const greetingClickSuccess = results.filter(r => r.greetingClickSuccess).length
    const messageSendSuccess = results.filter(r => r.messageSendSuccess).length
    
    // Supabase에서 테스트 메시지 조회 (DB에 저장된 메시지 확인 - 전송 검증)
    console.log('')
    console.log('='.repeat(60))
    console.log('메시지 전송 검증 (DB 기반)')
    console.log('='.repeat(60))
    console.log(`테스트 실행 ID: ${TEST_RUN_ID}`)
    const adminSupabase = createAdminSupabase()
    
    // TEST_RUN_ID가 포함된 메시지 조회 (최근 10분간)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: dbMessages, error: dbError } = await adminSupabase
      .from('messages')
      .select('id, user_id, content, created_at')
      .eq('webinar_id', webinarId)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(100)
    
    // 메모리에서 필터링 (like 쿼리가 작동하지 않을 수 있음)
    const testMessages = dbMessages?.filter(msg => 
      msg.content && msg.content.includes(TEST_RUN_ID)
    ) || []
    
    if (dbError) {
      console.warn(`⚠️ 메시지 조회 실패: ${dbError.message}`)
    } else {
      console.log(`최근 10분간 전체 메시지 수: ${dbMessages?.length || 0}`)
      console.log(`✅ DB에 저장된 테스트 메시지 수: ${testMessages.length}`)
      console.log(`   기대 전송 수: ${CONCURRENT_USERS}`)
      if (testMessages.length > 0) {
        const sendSuccessRate = ((testMessages.length / CONCURRENT_USERS) * 100).toFixed(2)
        console.log(`   전송 성공률: ${sendSuccessRate}%`)
        
        // 샘플 메시지 출력
        console.log('   샘플 메시지 (처음 3개):')
        testMessages.slice(0, 3).forEach((msg, idx) => {
          console.log(`     [${idx + 1}] ID: ${msg.id}, 내용: ${msg.content?.substring(0, 80)}...`)
        })
      } else if (dbMessages && dbMessages.length > 0) {
        console.log('   ⚠️ 최근 메시지는 있지만 TEST_RUN_ID가 포함되지 않음')
        console.log('   샘플 메시지 (처음 3개):')
        dbMessages.slice(0, 3).forEach((msg, idx) => {
          console.log(`     [${idx + 1}] ID: ${msg.id}, 내용: ${msg.content?.substring(0, 80)}...`)
        })
      }
    }
    
    // 수신 검증은 window 카운터 기반으로 이미 완료됨
    // DB 메시지는 전송 검증용으로만 사용
    
    // Realtime 수신 통계 (window 카운터 기반)
    const totalExpectedReceive = CONCURRENT_USERS * (CONCURRENT_USERS - 1) // 각 사용자가 (전체-1)개 메시지 수신 기대
    const totalReceived = results.reduce((sum, r) => sum + r.receivedCount, 0)
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicateReceiveCount, 0)
    const receiveMissRate = totalExpectedReceive > 0 
      ? (1 - (totalReceived / totalExpectedReceive)) * 100 
      : 0
    const duplicateRate = totalReceived > 0 
      ? (totalDuplicates / totalReceived) * 100 
      : 0
    
    // 전송→수신 지연 통계 (DB 기반으로는 정확하지 않음)
    const allLatencies = results.flatMap(r => r.receiveLatencies)
    const avgLatency = allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0
    const sortedLatencies = [...allLatencies].sort((a, b) => a - b)
    const p95Latency = sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
      : 0

    console.log('')
    console.log('='.repeat(60))
    console.log('테스트 결과')
    console.log('='.repeat(60))
    console.log(`테스트 실행 ID: ${TEST_RUN_ID}`)
    console.log(`총 실행 시간: ${totalTime}ms`)
    console.log(`로그인 성공: ${loginSuccess}/${CONCURRENT_USERS} (${((loginSuccess / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log(`인사 버튼 클릭 성공: ${greetingClickSuccess}/${CONCURRENT_USERS} (${((greetingClickSuccess / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log(`메시지 전송 성공: ${messageSendSuccess}/${CONCURRENT_USERS} (${((messageSendSuccess / CONCURRENT_USERS) * 100).toFixed(2)}%)`)
    console.log('')
    console.log('='.repeat(60))
    console.log('메시지 수신 검증 (Realtime 기반)')
    console.log('='.repeat(60))
    console.log(`  기대 수신 수 (사용자당): ${CONCURRENT_USERS - 1}`)
    console.log(`  총 기대 수신 수: ${totalExpectedReceive}`)
    console.log(`  실제 수신 수 (집계): ${totalReceived}`)
    console.log(`  수신 누락률: ${receiveMissRate.toFixed(2)}%`)
    console.log(`  중복 수신 수: ${totalDuplicates}`)
    console.log(`  중복 수신률: ${duplicateRate.toFixed(2)}%`)
    if (avgLatency > 0) {
      console.log(`  평균 전송→수신 지연: ${avgLatency.toFixed(0)}ms`)
      console.log(`  전송→수신 지연 p95: ${p95Latency.toFixed(0)}ms`)
    } else {
      console.log(`  ⚠️ 지연 측정 불가 (메시지 내용에 타임스탬프 없음)`)
    }
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
        receiveStats: {
          totalExpectedReceive,
          totalReceived,
          receiveMissRate,
          totalDuplicates,
          duplicateRate,
          avgLatency,
          p95Latency,
        },
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
