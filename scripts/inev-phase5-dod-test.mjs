#!/usr/bin/env node
/**
 * inev Phase 5 DoD 검증 스크립트
 * 사용: node scripts/inev-phase5-dod-test.mjs [BASE_URL]
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
  console.log('\n--- inev Phase 5 DoD 테스트 ---\n')

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

  // 테스트용 이벤트 및 등록 데이터 준비
  console.log('\n--- 테스트 데이터 준비 ---\n')
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 클라이언트 조회
  const { data: clients } = await admin.from('clients').select('id').limit(1)
  if (!clients || clients.length === 0) {
    log('클라이언트가 없습니다. 테스트를 진행할 수 없습니다.', false)
    process.exit(1)
  }
  const clientId = clients[0].id

  // 테스트용 이벤트 조회 또는 생성
  let { data: events } = await admin.from('events').select('id, slug').eq('client_id', clientId).limit(1)
  if (!events || events.length === 0) {
    const { data: newEvent } = await admin
      .from('events')
      .insert({
        client_id: clientId,
        code: 'P5TEST',
        slug: 'phase5-test-event',
        module_registration: true,
      })
      .select('id, slug')
      .single()
    events = newEvent ? [newEvent] : []
  }
  const eventId = events[0].id
  const eventSlug = events[0].slug

  // 테스트용 등록 데이터 생성 (이름 있음)
  const testEmail = 'phase5-test@example.com'
  const testName = 'Phase5 테스트 사용자'
  const { data: existingLead } = await admin
    .from('leads')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('email', testEmail)
    .maybeSingle()

  if (!existingLead) {
    await admin.from('leads').insert({
      event_id: eventId,
      email: testEmail,
      name: testName,
    })
    log('테스트용 등록 데이터 생성', true)
  } else {
    log('테스트용 등록 데이터 확인', true)
  }

  // 테스트용 등록 데이터 생성 (이름 없음 - 실패 케이스)
  const testEmailNoName = 'phase5-noname@example.com'
  const { data: existingLeadNoName } = await admin
    .from('leads')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('email', testEmailNoName)
    .maybeSingle()

  if (!existingLeadNoName) {
    await admin.from('leads').insert({
      event_id: eventId,
      email: testEmailNoName,
      name: null, // 이름 없음
    })
    log('테스트용 등록 데이터 생성 (이름 없음)', true)
  }

  console.log('\n--- Phase 5 DoD 테스트 ---\n')

  // DoD 1: 자동입장 - 등록 정보가 있으면 표시이름 반환
  console.log('DoD 1: 자동입장 (등록 정보 있음)')
  try {
    const r1 = await fetch(`${BASE}/api/inev/events/${eventId}/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    })
    const d1 = await r1.json()
    const pass1 = r1.ok && d1.success && d1.displayName === testName && d1.displayName !== testEmail.split('@')[0]
    log('DoD 1: 자동입장 - 등록 정보에서 표시이름 조회 (이메일 로컬파트 아님)', pass1)
    if (!pass1) {
      console.log('     응답:', JSON.stringify(d1, null, 2))
    }
  } catch (e) {
    log(`DoD 1 실패: ${e.message}`, false)
  }

  // DoD 2: 자동입장 - 등록 정보가 없으면 수동입장 요구
  console.log('\nDoD 2: 자동입장 (등록 정보 없음)')
  try {
    const r2 = await fetch(`${BASE}/api/inev/events/${eventId}/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-registered@example.com' }),
    })
    const d2 = await r2.json()
    const pass2 = !r2.ok && d2.requiresName === true && d2.code === 'NOT_REGISTERED'
    log('DoD 2: 자동입장 - 등록 정보 없으면 requiresName=true 반환', pass2)
  } catch (e) {
    log(`DoD 2 실패: ${e.message}`, false)
  }

  // DoD 3: 수동입장 - 이메일+이름으로 등록 생성 후 표시이름 반환
  console.log('\nDoD 3: 수동입장 (이메일+이름 제공)')
  try {
    const manualEmail = 'phase5-manual@example.com'
    const manualName = '수동입장 테스트'
    const r3 = await fetch(`${BASE}/api/inev/events/${eventId}/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: manualEmail, name: manualName }),
    })
    const d3 = await r3.json()
    const pass3 = r3.ok && d3.success && d3.displayName === manualName
    log('DoD 3: 수동입장 - 이름 제공 시 등록 생성 후 표시이름 반환', pass3)
  } catch (e) {
    log(`DoD 3 실패: ${e.message}`, false)
  }

  // DoD 4: 표시이름 없으면 에러 (이메일 로컬파트로 떨어지지 않음)
  console.log('\nDoD 4: 표시이름 없음 방지')
  try {
    const r4 = await fetch(`${BASE}/api/inev/events/${eventId}/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailNoName }),
    })
    const d4 = await r4.json()
    const pass4 = !r4.ok && d4.code === 'NAME_REQUIRED' && d4.requiresName === true
    log('DoD 4: 표시이름 없으면 NAME_REQUIRED 에러 (이메일 로컬파트 fallback 방지)', pass4)
  } catch (e) {
    log(`DoD 4 실패: ${e.message}`, false)
  }

  // DoD 5: Entry Gate 페이지 접근 (링크 오픈만으로 side effect 없음)
  console.log('\nDoD 5: Entry Gate 페이지 (side effect 없음)')
  try {
    const r5 = await fetch(`${BASE}/event/${eventSlug}/enter?email=${testEmail}`, {
      method: 'GET',
    })
    const html5 = await r5.text()
    // 페이지가 로드되고 버튼이 있으면 성공 (자동으로 세션 생성하지 않음)
    const pass5 = r5.ok && html5.includes('입장하기') && !html5.includes('세션')
    log('DoD 5: Entry Gate 페이지 로드 - 버튼 있음, 자동 세션 생성 없음', pass5)
  } catch (e) {
    log(`DoD 5 실패: ${e.message}`, false)
  }

  console.log('\n--- Phase 5 DoD 테스트 종료 ---\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
