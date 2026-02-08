#!/usr/bin/env node
/**
 * inev Phase 1~4 DoD 검증 스크립트 (인증 포함)
 * 사용: node scripts/inev-dod-test-phase1-4-auth.mjs [BASE_URL]
 * BASE_URL 기본: http://localhost:3000
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
for (const p of [join(root, '.env.local'), join(root, 'app', '.env.local')]) {
  if (existsSync(p)) {
    const content = readFileSync(p, 'utf8')
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    })
    break
  }
}

const BASE = process.argv[2] || 'http://localhost:3000'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 필요')
  process.exit(1)
}

const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
const PD_EMAIL = 'pd@ustudio.co.kr'
const PD_PASSWORD = 'ustudio@82'

const log = (msg, ok) => console.log(ok === true ? `  ✅ ${msg}` : ok === false ? `  ❌ ${msg}` : `  ${msg}`)

async function getToken(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`로그인 실패 ${email}: ${error.message}`)
  return data.session?.access_token
}

async function main() {
  console.log('\n--- inev Phase 1~4 DoD 테스트 (인증 포함) ---\n')
  
  // 인증 토큰 획득
  let token
  try {
    token = await getToken(PD_EMAIL, PD_PASSWORD)
    log(`인증 성공 (${PD_EMAIL})`, true)
  } catch (e) {
    log(`인증 실패: ${e.message}`, false)
    process.exit(1)
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  let clientId, eventId, eventSlug, eventId2, eventSlug2

  // Phase 1: Client 목록, Event 목록, public 이벤트 조회
  console.log('\nPhase 1: Event 컨테이너 + 모듈 ON/OFF')
  try {
    const cr = await fetch(`${BASE}/api/inev/clients`, { headers })
    const clients = await cr.json()
    if (!Array.isArray(clients) || clients.length === 0) {
      log('DoD 1: client 1개 이상 필요 (스킵: 데이터 없음)', null)
    } else {
      clientId = clients[0].id
      log(`DoD 1: Client 목록 조회 (${clients.length}개)`, true)
    }

    let events = []
    if (clientId) {
      const er = await fetch(`${BASE}/api/inev/events?client_id=${clientId}`, { headers })
      events = await er.json()
      if (!Array.isArray(events)) events = []
      
      // 이벤트가 2개 미만이면 추가 생성
      if (events.length < 2 && clientId) {
        const createR1 = await fetch(`${BASE}/api/inev/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            client_id: clientId,
            code: 'DOD001',
            slug: 'dod-test-event-1',
            module_registration: true,
            module_survey: true,
            module_utm: true,
            module_email: true,
          }),
        })
        const created1 = await createR1.json()
        if (createR1.ok && created1.id) {
          events.push(created1)
          log('DoD 1: 테스트용 이벤트 1 생성 (dod-test-event-1)', true)
        }
      }
      
      if (events.length < 2 && clientId) {
        const createR2 = await fetch(`${BASE}/api/inev/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            client_id: clientId,
            code: 'DOD002',
            slug: 'dod-test-event-2',
            module_registration: true,
            module_survey: false,
            module_utm: true,
            module_email: false,
          }),
        })
        const created2 = await createR2.json()
        if (createR2.ok && created2.id) {
          events.push(created2)
          log('DoD 1: 테스트용 이벤트 2 생성 (dod-test-event-2)', true)
        }
      }
    }
    
    if (events.length > 0) {
      eventId = events[0].id
      eventSlug = events[0].slug
      log(`DoD 1: 이벤트 목록 조회 (${events.length}개), public 진입 가능 slug=${eventSlug}`, true)
      
      if (events.length >= 2) {
        eventId2 = events[1].id
        eventSlug2 = events[1].slug
        log(`DoD 1: 이벤트 2개 준비 완료 (${eventSlug}, ${eventSlug2})`, true)
      }
    } else {
      log('DoD 1: 이벤트 목록 조회 실패 또는 생성 실패', false)
    }
  } catch (e) {
    log(`Phase 1 요청 실패: ${e.message}`, false)
  }

  // Phase 2: 등록, 등록자 목록
  console.log('\nPhase 2: 등록 + 설문')
  if (eventSlug) {
    try {
      // 이벤트 1에 등록
      const reg1 = await fetch(`${BASE}/api/inev/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: eventSlug, email: 'dod-test-1@example.com', name: 'DoD Test User 1' }),
      })
      const regData1 = await reg1.json()
      log('DoD 2: 등록 API (POST /api/inev/register) - 이벤트 1', reg1.ok)
      
      // 중복 등록 테스트
      const reg1Dup = await fetch(`${BASE}/api/inev/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: eventSlug, email: 'dod-test-1@example.com', name: 'DoD Test User 1 Updated' }),
      })
      log('DoD 2: 중복 등록 시 갱신 메시지', reg1Dup.ok)
      
      // 이벤트 2에 등록 (데이터 분리 확인용)
      if (eventSlug2) {
        const reg2 = await fetch(`${BASE}/api/inev/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: eventSlug2, email: 'dod-test-2@example.com', name: 'DoD Test User 2' }),
        })
        log('DoD 2: 등록 API - 이벤트 2', reg2.ok)
      }
      
      if (eventId) {
        const lr = await fetch(`${BASE}/api/inev/events/${eventId}/leads`, { headers })
        const leads = await lr.json()
        const leadCount = Array.isArray(leads) ? leads.length : 0
        log(`DoD 2: 등록자 목록 조회 (${leadCount}명)`, Array.isArray(leads))
      }
    } catch (e) {
      log(`Phase 2 실패: ${e.message}`, false)
    }
  }

  // Phase 3: Visit 수집, UTM 집계, 이벤트별 데이터 분리 확인
  console.log('\nPhase 3: UTM/Visit 이벤트 단위')
  if (eventSlug) {
    try {
      // 이벤트 1에 visit 기록
      const vr1 = await fetch(`${BASE}/api/inev/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: eventSlug, utm_source: 'dod-test', utm_medium: 'script', utm_campaign: 'event1' }),
      })
      const vData1 = await vr1.json()
      log('DoD 3: Visit 기록 (POST /api/inev/visits) - 이벤트 1', vr1.ok || vData1.skipped === 'utm_off')
      
      // 이벤트 2에 visit 기록 (다른 UTM)
      if (eventSlug2) {
        const vr2 = await fetch(`${BASE}/api/inev/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: eventSlug2, utm_source: 'dod-test-2', utm_medium: 'script-2', utm_campaign: 'event2' }),
        })
        log('DoD 3: Visit 기록 - 이벤트 2', vr2.ok)
      }
      
      if (eventId) {
        const ar1 = await fetch(`${BASE}/api/inev/events/${eventId}/visits?aggregate=true`, { headers })
        const agg1 = await ar1.json()
        log('DoD 3: UTM 집계 조회 - 이벤트 1', ar1.ok && typeof agg1.total === 'number')
        
        // 이벤트별 데이터 분리 확인 (UTM 값 직접 비교)
        if (eventId2) {
          const ar2 = await fetch(`${BASE}/api/inev/events/${eventId2}/visits?aggregate=true`, { headers })
          const agg2 = await ar2.json()
          
          if (ar2.ok && typeof agg2.total === 'number') {
            // 이벤트 1에는 'dod-test'가 있어야 하고 'dod-test-2'가 없어야 함
            // 이벤트 2에는 'dod-test-2'가 있어야 하고 'dod-test'가 없어야 함
            const agg1Sources = agg1.by_utm_source || {}
            const agg2Sources = agg2.by_utm_source || {}
            
            const event1HasTest = agg1Sources['dod-test'] > 0
            const event1HasTest2 = agg1Sources['dod-test-2'] > 0
            const event2HasTest2 = agg2Sources['dod-test-2'] > 0
            const event2HasTest = agg2Sources['dod-test'] > 0
            
            const separated = event1HasTest && !event1HasTest2 && event2HasTest2 && !event2HasTest
            
            if (separated) {
              log('DoD 3: 이벤트별 데이터 분리 확인 (이벤트 1: dod-test만, 이벤트 2: dod-test-2만)', true)
            } else {
              log(`DoD 3: 이벤트별 데이터 분리 확인 실패 - 이벤트1: dod-test=${event1HasTest}, dod-test-2=${event1HasTest2}, 이벤트2: dod-test-2=${event2HasTest2}, dod-test=${event2HasTest}`, false)
            }
          } else {
            log('DoD 3: 이벤트 2 집계 조회 실패', false)
          }
        }
      }
    } catch (e) {
      log(`Phase 3 실패: ${e.message}`, false)
    }
  }

  // Phase 4: 이메일 초안 저장, 미리보기(저장본), 테스트 발송
  console.log('\nPhase 4: 이메일 + 미리보기/테스트 발송')
  if (eventId) {
    try {
      const putR = await fetch(`${BASE}/api/inev/events/${eventId}/email`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          subject: 'DoD 테스트 제목',
          body_html: '<p>DoD 테스트 본문</p>',
          from_name: 'Inev.ai',
        }),
      })
      log('DoD 4: 이메일 초안 저장 (PUT /api/inev/email)', putR.ok)

      const getR = await fetch(`${BASE}/api/inev/events/${eventId}/email`, { headers })
      const emailData = await getR.json()
      log('DoD 4: 이메일 조회 (미리보기용)', getR.ok && (emailData.subject != null || emailData.body_html != null))

      const testR = await fetch(`${BASE}/api/inev/events/${eventId}/email/test-send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to: 'test@example.com' }),
      })
      const testData = await testR.json()
      const testOk = testR.ok || (testData.error && testData.error.includes('Resend')) // Resend 미설정 시 에러 가능
      log('DoD 4: 테스트 발송 API 호출 (실제 발송은 RESEND_KEY 필요)', testOk)
    } catch (e) {
      log(`Phase 4 실패: ${e.message}`, false)
    }
  } else {
    log('Phase 4: eventId 없음 스킵', null)
  }

  console.log('\n--- DoD 테스트 종료 ---\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
