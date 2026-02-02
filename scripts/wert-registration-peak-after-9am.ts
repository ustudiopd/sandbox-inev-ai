import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a' // 워트인텔리전트 149403
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC 시각을 KST(UTC+9) 시각으로 해석한 Date. getUTCHours() 등이 KST 값이 됨. */
function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

/** 10분 단위 버킷 키 (KST): "YYYY-MM-DD HH:00" ~ "HH:50" */
function bucketKeyKST(utcCreatedAt: string): string {
  const d = toKST(new Date(utcCreatedAt))
  const min = Math.floor(d.getUTCMinutes() / 10) * 10
  const h = d.getUTCHours().toString().padStart(2, '0')
  const m = min.toString().padStart(2, '0')
  const date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`
  return `${date} ${h}:${m}`
}

/** KST 기준 9시 이후인지 (서버 타임존 무관) */
function isAfter9amKST(utcCreatedAt: string): boolean {
  const d = toKST(new Date(utcCreatedAt))
  return d.getUTCHours() > 9 || (d.getUTCHours() === 9)
}

/**
 * 워트 인텔리전트 — 오전 9시(KST) 이후 등록이 집중된 시점 찾기
 */
async function wertRegistrationPeakAfter9am() {
  const admin = createAdminSupabase()

  const nowKST = toKST(new Date())
  const nowStr = `${nowKST.getUTCFullYear()}-${(nowKST.getUTCMonth() + 1).toString().padStart(2, '0')}-${nowKST.getUTCDate().toString().padStart(2, '0')} ${nowKST.getUTCHours().toString().padStart(2, '0')}:${nowKST.getUTCMinutes().toString().padStart(2, '0')} (KST)`
  console.log('🔍 워트 인텔리전트 — 오전 9시(KST) 이후 등록 집중 시점 분석\n')
  console.log(`캠페인 ID: ${CAMPAIGN_ID}`)
  console.log(`현재 시각(KST): ${nowStr}\n`)

  const { data: entries, error } = await admin
    .from('event_survey_entries')
    .select('id, created_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  if (!entries?.length) {
    console.log('등록 데이터가 없습니다.')
    return
  }

  // KST 09:00 이후만 필터 (서버 타임존 무관)
  const after9amIncl = entries.filter((e: { created_at: string }) => isAfter9amKST(e.created_at))

  const totalAfter9 = after9amIncl.length
  console.log(`📊 전체 등록: ${entries.length}건`)
  console.log(`📊 오전 9시(KST) 이후 등록: ${totalAfter9}건\n`)

  if (totalAfter9 === 0) {
    console.log('오전 9시 이후 등록이 없습니다.')
    return
  }

  // 10분 단위 집계 (KST)
  const bucketCount = new Map<string, number>()
  after9amIncl.forEach((e: { created_at: string }) => {
    const key = bucketKeyKST(e.created_at)
    bucketCount.set(key, (bucketCount.get(key) || 0) + 1)
  })

  const sorted = Array.from(bucketCount.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  console.log('⏰ 오전 9시 이후 — 10분 단위 등록 집중도 (상위 20개, KST)\n')
  sorted.slice(0, 20).forEach(({ key, count }, i) => {
    const bar = '█'.repeat(Math.min(count, 40)) + (count > 40 ? ` +${count - 40}` : '')
    console.log(`${(i + 1).toString().padStart(2)}. ${key}  ${count.toString().padStart(4)}건  ${bar}`)
  })

  // 시간대별(1시간) 집계 (KST, 서버 타임존 무관)
  const hourlyCount = new Map<string, number>()
  after9amIncl.forEach((e: { created_at: string }) => {
    const d = toKST(new Date(e.created_at))
    const date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`
    const key = `${date} ${d.getUTCHours().toString().padStart(2, '0')}:00`
    hourlyCount.set(key, (hourlyCount.get(key) || 0) + 1)
  })

  const sortedHourly = Array.from(hourlyCount.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  console.log('\n⏰ 오전 9시 이후 — 1시간 단위 등록 집중도 (상위 15개, KST)\n')
  sortedHourly.slice(0, 15).forEach(({ key, count }, i) => {
    const bar = '█'.repeat(Math.min(count, 50)) + (count > 50 ? ` +${count - 50}` : '')
    console.log(`${(i + 1).toString().padStart(2)}. ${key}  ${count.toString().padStart(4)}건  ${bar}`)
  })

  if (sorted.length > 0) {
    const top = sorted[0]
    console.log('\n📌 가장 집중된 시점 (10분 단위):')
    console.log(`   ${top.key} (KST) — ${top.count}건`)
  }

  // 오늘(KST) 시간대별 등록
  const todayKST = `${nowKST.getUTCFullYear()}-${(nowKST.getUTCMonth() + 1).toString().padStart(2, '0')}-${nowKST.getUTCDate().toString().padStart(2, '0')}`
  const todayEntries = (entries as { created_at: string }[]).filter((e) => {
    const d = toKST(new Date(e.created_at))
    const date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}`
    return date === todayKST
  })

  console.log('\n\n📅 오늘(KST) 시간대별 등록 현황\n')
  console.log(`기준일: ${todayKST}`)
  console.log(`총 등록: ${todayEntries.length}건\n`)

  if (todayEntries.length === 0) {
    console.log('오늘 등록이 없습니다.')
    return
  }

  const todayHourly = new Map<number, number>()
  for (let h = 0; h < 24; h++) todayHourly.set(h, 0)
  todayEntries.forEach((e: { created_at: string }) => {
    const d = toKST(new Date(e.created_at))
    const h = d.getUTCHours()
    todayHourly.set(h, (todayHourly.get(h) ?? 0) + 1)
  })

  const maxCount = Math.max(...todayHourly.values())
  for (let h = 0; h < 24; h++) {
    const count = todayHourly.get(h) ?? 0
    const bar = count > 0 ? '█'.repeat(Math.min(count, 50)) + (count > 50 ? ` +${count - 50}` : '') : '—'
    const label = `${h.toString().padStart(2, '0')}:00 ~ ${h.toString().padStart(2, '0')}:59`
    console.log(`  ${label}  ${count.toString().padStart(3)}건  ${bar}`)
  }
  console.log('')
}

wertRegistrationPeakAfter9am().catch(console.error)
