#!/usr/bin/env node
/**
 * inev Phase 1~3 RLS / Tenant Isolation Negative Test
 * 문서: docs/test/페이즈1-3테스트.md
 * 사용: node scripts/inev-phase1-3-rls-test.mjs [BASE_URL]
 * 전제: ad@(wert만), pd@(wert+modoolecture), 이벤트 wert-e1/e2, modoo-e1/e2
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

const AD_EMAIL = 'ad@ustudio.co.kr'
const AD_PASSWORD = 'ustudio@82'
const PD_EMAIL = 'pd@ustudio.co.kr'
const PD_PASSWORD = 'ustudio@82'

function log(msg, pass) {
  const icon = pass === true ? '✅' : pass === false ? '❌' : '  '
  console.log(`${icon} ${msg}`)
}

async function ensureSeed() {
  console.log('\n--- 테스트 데이터 준비 ---\n')
  const { data: clients } = await admin.from('clients').select('id, slug').in('slug', ['wert', 'modoolecture'])
  const bySlug = (clients || []).reduce((acc, c) => ({ ...acc, [c.slug]: c.id }), {})
  let wertId = bySlug.wert
  let modooId = bySlug.modoolecture
  if (!wertId) {
    const { data: c } = await admin.from('clients').insert({ name: 'Wert Intelligence', slug: 'wert' }).select('id').single()
    wertId = c?.id
    log('클라이언트 생성: wert', !!wertId)
  }
  if (!modooId) {
    const { data: c } = await admin.from('clients').insert({ name: '모두의특강', slug: 'modoolecture' }).select('id').single()
    modooId = c?.id
    log('클라이언트 생성: modoolecture', !!modooId)
  }

  let { data: users } = await admin.auth.admin.listUsers({ perPage: 500 })
  let adUser = users?.users?.find((u) => u.email === AD_EMAIL)
  let pdUser = users?.users?.find((u) => u.email === PD_EMAIL)
  if (!adUser) {
    await admin.auth.admin.createUser({ email: AD_EMAIL, password: AD_PASSWORD, email_confirm: true })
    log('계정 생성: ad@', true)
  }
  if (!pdUser) {
    await admin.auth.admin.createUser({ email: PD_EMAIL, password: PD_PASSWORD, email_confirm: true })
    log('계정 생성: pd@', true)
  }
  const list2 = await admin.auth.admin.listUsers({ perPage: 500 })
  adUser = list2.data?.users?.find((u) => u.email === AD_EMAIL)
  pdUser = list2.data?.users?.find((u) => u.email === PD_EMAIL)
  const adUserId = adUser?.id
  const pdUserId = pdUser?.id
  if (adUserId) await ensureMember(adUserId, wertId, 'ad')
  if (pdUserId) {
    await ensureMember(pdUserId, wertId, 'pd-wert')
    await ensureMember(pdUserId, modooId, 'pd-modoo')
  }
  const { data: adMembers } = await admin.from('client_members').select('client_id').eq('user_id', adUserId)
  const adInModoo = adUserId && (adMembers || []).some((m) => m.client_id === modooId)
  if (adInModoo) {
    await admin.from('client_members').delete().eq('user_id', adUserId).eq('client_id', modooId)
    log('ad@ modoolecture 멤버십 제거 (wert만 유지)', true)
  }

  const eventSlugs = [
    { client_id: wertId, slug: 'wert-e1', code: 'W1' },
    { client_id: wertId, slug: 'wert-e2', code: 'W2' },
    { client_id: modooId, slug: 'modoo-e1', code: 'M1' },
    { client_id: modooId, slug: 'modoo-e2', code: 'M2' },
  ]
  const eventIds = {}
  for (const e of eventSlugs) {
    const { data: ev } = await admin.from('events').select('id').eq('slug', e.slug).maybeSingle()
    if (!ev) {
      const { data: created } = await admin.from('events').insert({
        client_id: e.client_id,
        code: e.code,
        slug: e.slug,
        module_registration: true,
        module_utm: true,
      }).select('id').single()
      if (created) eventIds[e.slug] = created.id
    } else {
      eventIds[e.slug] = ev.id
    }
  }
  log('이벤트 wert-e1, wert-e2, modoo-e1, modoo-e2', Object.keys(eventIds).length >= 4)
  return { wertId, modooId, eventIds }
}

async function ensureMember(userId, clientId, label) {
  if (!userId) return
  const { data: existing } = await admin.from('client_members').select('id').eq('user_id', userId).eq('client_id', clientId).maybeSingle()
  if (existing) return
  await admin.from('client_members').insert({ user_id: userId, client_id: clientId, role: 'admin' })
}

async function getToken(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`로그인 실패 ${email}: ${error.message}`)
  return data.session?.access_token
}

async function run() {
  console.log('\n# inev Phase 1~3 — RLS / Tenant Isolation Negative Test\n')
  let wertId, modooId, eventIds
  try {
    const seed = await ensureSeed()
    wertId = seed.wertId
    modooId = seed.modooId
    eventIds = seed.eventIds
  } catch (e) {
    console.error('시드 실패:', e.message)
    process.exit(1)
  }

  const adToken = await getToken(AD_EMAIL, AD_PASSWORD)
  const pdToken = await getToken(PD_EMAIL, PD_PASSWORD)
  const modooE1Id = eventIds['modoo-e1']
  const wertE1Id = eventIds['wert-e1']
  const wertE2Id = eventIds['wert-e2']

  const h = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
  let failed = 0

  console.log('\n--- 테스트 0: 스모크 (Phase 1~3 정상) ---\n')
  const cr = await fetch(`${BASE}/api/inev/clients`, { headers: h(pdToken) })
  const clients = await cr.json()
  const smokeOk = cr.ok && Array.isArray(clients) && clients.length >= 1
  log('GET /api/inev/clients (pd@)', smokeOk)
  if (!smokeOk) failed++

  const er = await fetch(`${BASE}/api/inev/events?client_id=${wertId}`, { headers: h(pdToken) })
  const events = await er.json()
  log('GET /api/inev/events?client_id=wert (pd@)', er.ok && Array.isArray(events))
  if (!er.ok) failed++

  console.log('\n--- 테스트 1: 한 클라이언트만 계정(ad@) 차단 ---\n')
  const r1_1 = await fetch(`${BASE}/api/inev/events?client_id=${modooId}`, { headers: h(adToken) })
  const body1_1 = await r1_1.json().catch(() => ({}))
  const pass1_1 = r1_1.status === 403 || r1_1.status === 404
  log('1-1 GET /api/inev/events?client_id=modoo (ad@) → 403/404', pass1_1)
  if (!pass1_1) { console.log('     실제:', r1_1.status, body1_1); failed++ }

  const r1_2 = await fetch(`${BASE}/api/inev/events/${modooE1Id}/leads`, { headers: h(adToken) })
  const pass1_2 = r1_2.status === 403 || r1_2.status === 404
  log('1-2 GET /api/inev/events/{modooE1}/leads (ad@) → 403/404', pass1_2)
  if (!pass1_2) { console.log('     실제:', r1_2.status); failed++ }

  const r1_3 = await fetch(`${BASE}/api/inev/events/${modooE1Id}/visits?aggregate=true`, { headers: h(adToken) })
  const pass1_3 = r1_3.status === 403 || r1_3.status === 404
  log('1-3 GET /api/inev/events/{modooE1}/visits?aggregate=true (ad@) → 403/404', pass1_3)
  if (!pass1_3) { console.log('     실제:', r1_3.status); failed++ }

  console.log('\n--- 테스트 2: 겹친 계정(pd@) 컨텍스트 분리 ---\n')
  const r2a = await fetch(`${BASE}/api/inev/events?client_id=${wertId}`, { headers: h(pdToken) })
  const listWert = await r2a.json()
  const r2b = await fetch(`${BASE}/api/inev/events?client_id=${modooId}`, { headers: h(pdToken) })
  const listModoo = await r2b.json()
  const wertOnly = Array.isArray(listWert) && listWert.every((e) => e.client_id === wertId)
  const modooOnly = Array.isArray(listModoo) && listModoo.every((e) => e.client_id === modooId)
  log('2-1 wert 목록에는 wert만, modoo 목록에는 modoo만 (pd@)', wertOnly && modooOnly)
  if (!wertOnly || !modooOnly) failed++

  const l1 = await fetch(`${BASE}/api/inev/events/${wertE1Id}/leads`, { headers: h(pdToken) })
  const l2 = await fetch(`${BASE}/api/inev/events/${wertE2Id}/leads`, { headers: h(pdToken) })
  const leads1 = await l1.json()
  const leads2 = await l2.json()
  const ids1 = (leads1 || []).map((x) => x.id)
  const ids2 = (leads2 || []).map((x) => x.id)
  const noCross = ids1.every((id) => !ids2.includes(id)) && ids2.every((id) => !ids1.includes(id))
  log('2-2 e1/e2 leads 교차 없음 (pd@)', noCross)

  const v1 = await fetch(`${BASE}/api/inev/events/${wertE1Id}/visits?aggregate=true`, { headers: h(pdToken) })
  const v2 = await fetch(`${BASE}/api/inev/events/${wertE2Id}/visits?aggregate=true`, { headers: h(pdToken) })
  const agg1 = await v1.json()
  const agg2 = await v2.json()
  log('2-3 e1/e2 visits 집계 분리 (pd@)', v1.ok && v2.ok && typeof agg1?.total === 'number' && typeof agg2?.total === 'number')

  console.log('\n--- 테스트 3: Cross-tenant write 차단 ---\n')
  const reg = await fetch(`${BASE}/api/inev/register`, {
    method: 'POST',
    headers: h(adToken),
    body: JSON.stringify({ slug: 'modoo-e1', email: 'ad-block@test.com', name: 'Ad' }),
  })
  const pass3_1 = reg.status === 403 || reg.status === 404
  log('3-1 POST /api/inev/register slug=modoo-e1 (ad@) → 403/404', pass3_1)
  if (!pass3_1) { console.log('     실제:', reg.status); failed++ }

  const vis = await fetch(`${BASE}/api/inev/visits`, {
    method: 'POST',
    headers: h(adToken),
    body: JSON.stringify({ slug: 'modoo-e1', utm_source: 'ad-test' }),
  })
  const pass3_2 = vis.status === 403 || vis.status === 404
  log('3-2 POST /api/inev/visits slug=modoo-e1 (ad@) → 403/404', pass3_2)
  if (!pass3_2) { console.log('     실제:', vis.status); failed++ }

  console.log('\n--- 테스트 4: client_id 파라미터 변조 ---\n')
  const tamper = await fetch(`${BASE}/api/inev/events?client_id=${modooId}`, { headers: h(adToken) })
  const pass4 = tamper.status === 403 || tamper.status === 404
  log('4 GET /api/inev/events?client_id=modoo (ad@) → 403/404', pass4)
  if (!pass4) { console.log('     실제:', tamper.status); failed++ }

  console.log('\n--- 결과 ---\n')
  if (failed > 0) {
    console.log('실패:', failed, '건. 최소 통과 기준: 테스트 1,2,3 전부 PASS.\n')
    process.exit(1)
  }
  console.log('Phase 1~3 RLS 테스트 전부 PASS.\n')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
