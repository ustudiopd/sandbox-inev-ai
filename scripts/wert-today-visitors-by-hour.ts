import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const WERT_CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트인텔리전트 149403
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC 시각을 KST(UTC+9)로 해석한 Date. getUTCHours() 등이 KST 값. */
function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

type LogRow = { session_id: string; accessed_at: string }

function todayHourlyFromLogs(
  logs: LogRow[],
  todayKST: string
): { hour: number; visits: number; visitors: number }[] {
  const byHour = new Map<number, { visits: number; sessions: Set<string> }>()
  for (let h = 0; h < 24; h++) byHour.set(h, { visits: 0, sessions: new Set() })

  logs.forEach((row) => {
    const d = toKST(new Date(row.accessed_at))
    const date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`
    if (date !== todayKST) return
    const h = d.getUTCHours()
    const bucket = byHour.get(h)!
    bucket.visits += 1
    bucket.sessions.add(row.session_id)
  })

  return Array.from({ length: 24 }, (_, hour) => {
    const b = byHour.get(hour)!
    return { hour, visits: b.visits, visitors: b.sessions.size }
  })
}

function printHourlyTable(
  rows: { hour: number; visits: number; visitors: number }[],
  title: string,
  totalVisits: number,
  totalVisitors: number
) {
  console.log(title)
  console.log(`총 방문(히트): ${totalVisits}건  |  총 방문자(unique session): ${totalVisitors}명\n`)

  const maxV = Math.max(1, ...rows.map((r) => r.visitors))
  for (const { hour, visits, visitors } of rows) {
    const label = `${hour.toString().padStart(2, '0')}:00 ~ ${hour.toString().padStart(2, '0')}:59`
    const bar = visitors > 0 ? '█'.repeat(Math.min(visitors, 40)) + (visitors > 40 ? ` +${visitors - 40}` : '') : '—'
    console.log(`  ${label}  방문 ${visits.toString().padStart(3)}건  방문자 ${visitors.toString().padStart(3)}명  ${bar}`)
  }
  console.log('')
}

/**
 * 오늘(KST) 시간대별 방문자
 * 1) 워트 등록페이지 방문자 (event_access_logs, campaign_id = 워트)
 * 2) Inev.ai 전체 방문자 (event_access_logs 전체)
 */
async function main() {
  const admin = createAdminSupabase()

  const nowKST = toKST(new Date())
  const todayKST = `${nowKST.getUTCFullYear()}-${(nowKST.getUTCMonth() + 1).toString().padStart(2, '0')}-${nowKST.getUTCDate().toString().padStart(2, '0')}`
  const nowStr = `${todayKST} ${nowKST.getUTCHours().toString().padStart(2, '0')}:${nowKST.getUTCMinutes().toString().padStart(2, '0')} (KST)`

  console.log('📅 오늘(KST) 시간대별 방문자 현황\n')
  console.log(`기준일: ${todayKST}`)
  console.log(`현재 시각(KST): ${nowStr}\n`)

  // event_access_logs 테이블 전체 유무 확인
  const { count: totalLogs } = await admin
    .from('event_access_logs')
    .select('*', { count: 'exact', head: true })
  const { data: latestLog } = await admin
    .from('event_access_logs')
    .select('accessed_at, campaign_id, webinar_id')
    .order('accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  console.log(`📌 event_access_logs: 전체 ${totalLogs ?? 0}건`)
  if (latestLog) {
    const d = toKST(new Date((latestLog as { accessed_at: string }).accessed_at))
    const t = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')} ${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} (KST)`
    console.log(`   최근 기록: ${t}\n`)
  } else {
    console.log('   (방문 기록 없음 — 등록/이벤트 페이지에서 Visit API가 호출되어야 기록됩니다)\n')
  }

  // 오늘 00:00 KST ~ 다음날 00:00 KST (UTC 구간)
  const todayStartUTC = new Date(`${todayKST}T00:00:00.000Z`).getTime() - KST_OFFSET_MS
  const todayEndUTC = todayStartUTC + 24 * 60 * 60 * 1000
  const fromUTC = new Date(todayStartUTC).toISOString()
  const toUTC = new Date(todayEndUTC).toISOString()

  // 1) 워트 등록페이지 방문 (campaign_id = 워트)
  const { data: wertLogs, error: wertErr } = await admin
    .from('event_access_logs')
    .select('session_id, accessed_at')
    .eq('campaign_id', WERT_CAMPAIGN_ID)
    .gte('accessed_at', fromUTC)
    .lt('accessed_at', toUTC)

  if (wertErr) {
    console.error('❌ 워트 방문 로그 조회 실패:', wertErr.message)
  } else {
    const wertHourly = todayHourlyFromLogs((wertLogs ?? []) as LogRow[], todayKST)
    const wertTotalVisits = wertHourly.reduce((s, r) => s + r.visits, 0)
    const wertTotalVisitors = new Set((wertLogs ?? []).map((r: LogRow) => r.session_id)).size
    printHourlyTable(
      wertHourly,
      '🌐 워트 인텔리전트 등록페이지 — 오늘 시간대별 방문 (KST)',
      wertTotalVisits,
      wertTotalVisitors
    )
  }

  // 2) Inev.ai 전체 방문 (오늘 접근 로그 전체)
  const { data: allLogs, error: allErr } = await admin
    .from('event_access_logs')
    .select('session_id, accessed_at')
    .gte('accessed_at', fromUTC)
    .lt('accessed_at', toUTC)

  if (allErr) {
    console.error('❌ Inev.ai 전체 방문 로그 조회 실패:', allErr.message)
  } else {
    const allHourly = todayHourlyFromLogs((allLogs ?? []) as LogRow[], todayKST)
    const allTotalVisits = allHourly.reduce((s, r) => s + r.visits, 0)
    const allTotalVisitors = new Set((allLogs ?? []).map((r: LogRow) => r.session_id)).size
    printHourlyTable(
      allHourly,
      '🌐 Inev.ai 전체 — 오늘 시간대별 방문 (KST)',
      allTotalVisits,
      allTotalVisitors
    )
  }
}

main().catch(console.error)
