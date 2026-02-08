#!/usr/bin/env node
/**
 * inev Phase 1~4 DoD 검증 스크립트
 * 사용: node scripts/inev-dod-test-phase1-4.mjs [BASE_URL]
 * BASE_URL 기본: http://localhost:3000
 */
const BASE = process.argv[2] || 'http://localhost:3000'
const log = (msg, ok) => console.log(ok === true ? `  ✅ ${msg}` : ok === false ? `  ❌ ${msg}` : `  ${msg}`)

async function main() {
  console.log('\n--- inev Phase 1~4 DoD 테스트 ---\n')
  let clientId, eventId, eventSlug

  // Phase 1: Client 목록, Event 목록, public 이벤트 조회
  console.log('Phase 1: Event 컨테이너 + 모듈 ON/OFF')
  try {
    const cr = await fetch(`${BASE}/api/inev/clients`)
    const clients = await cr.json()
    if (!Array.isArray(clients) || clients.length === 0) {
      log('DoD 1: client 1개 이상 필요 (스킵: 데이터 없음)', null)
    } else {
      clientId = clients[0].id
      log(`DoD 1: Client 목록 조회 (${clients.length}개)`, true)
    }

    let events = []
    const er = await fetch(`${BASE}/api/inev/events?client_id=${clientId || 'unknown'}`)
    events = await er.json()
    if (!Array.isArray(events)) events = []
    if (events.length === 0 && clientId) {
      const createR = await fetch(`${BASE}/api/inev/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          code: '999888',
          slug: 'dod-test-event',
          module_registration: true,
          module_survey: true,
          module_utm: true,
          module_email: true,
        }),
      })
      const created = await createR.json()
      if (createR.ok && created.id) {
        events = [created]
        log('DoD 1: 이벤트 없어서 테스트용 이벤트 생성 (dod-test-event)', true)
      }
    }
    if (events.length > 0) {
      eventId = events[0].id
      eventSlug = events[0].slug
      log(`DoD 1: 이벤트 목록 조회 (${events.length}개), public 진입 가능 slug=${eventSlug}`, true)
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
      const reg = await fetch(`${BASE}/api/inev/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: eventSlug, email: 'dod-test@example.com', name: 'DoD Test' }),
      })
      const regData = await reg.json()
      log('DoD 2: 등록 API (POST /api/inev/register)', reg.ok)
      if (eventId) {
        const lr = await fetch(`${BASE}/api/inev/events/${eventId}/leads`)
        const leads = await lr.json()
        log('DoD 2: 등록자 목록 조회', Array.isArray(leads))
      }
    } catch (e) {
      log(`Phase 2 실패: ${e.message}`, false)
    }
  }

  // Phase 3: Visit 수집, UTM 집계
  console.log('\nPhase 3: UTM/Visit 이벤트 단위')
  if (eventSlug) {
    try {
      const vr = await fetch(`${BASE}/api/inev/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: eventSlug, utm_source: 'dod-test', utm_medium: 'script' }),
      })
      const vData = await vr.json()
      log('DoD 3: Visit 기록 (POST /api/inev/visits)', vr.ok || vData.skipped === 'utm_off')
      if (eventId) {
        const ar = await fetch(`${BASE}/api/inev/events/${eventId}/visits?aggregate=true`)
        const agg = await ar.json()
        log('DoD 3: UTM 집계 조회', ar.ok && typeof agg.total === 'number')
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'DoD 테스트 제목',
          body_html: '<p>DoD 테스트 본문</p>',
          from_name: 'Inev.ai',
        }),
      })
      log('DoD 4: 이메일 초안 저장 (PUT /api/inev/email)', putR.ok)

      const getR = await fetch(`${BASE}/api/inev/events/${eventId}/email`)
      const emailData = await getR.json()
      log('DoD 4: 이메일 조회 (미리보기용)', getR.ok && (emailData.subject != null || emailData.body_html != null))

      const testR = await fetch(`${BASE}/api/inev/events/${eventId}/email/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
