/**
 * 어제·오늘 접속 테스트 후 하트비트 및 통계 수집 검증
 *
 * 확인 항목:
 * - webinar_user_sessions: 입장 건수, last_heartbeat_at 갱신 여부, watched_seconds_raw
 * - webinar_live_presence: last_seen_at 갱신 (현재 접속자/통계용)
 *
 * 사용: npx tsx scripts/verify-heartbeat-and-stats.ts
 * 옵션: --hours=48 (기본 48시간), --slug=149400,149402 (쉼표 구분, 기본 149400,149402)
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '@/lib/supabase/admin'

const HOURS = parseInt(process.env.npm_config_hours || process.argv.find((a) => a.startsWith('--hours='))?.split('=')[1] || '48', 10)
const SLUGS = (process.env.npm_config_slug || process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1] || '149400,149402').split(',')

const since = new Date(Date.now() - HOURS * 60 * 60 * 1000)

async function main() {
  const admin = createAdminSupabase()

  console.log('=== 하트비트·통계 수집 검증 (어제·오늘 접속 테스트) ===\n')
  console.log(`조회 기간: ${since.toLocaleString('ko-KR')} ~ 현재 (최근 ${HOURS}시간)`)
  console.log(`대상 웨비나 slug: ${SLUGS.join(', ')}\n`)

  for (const slug of SLUGS) {
    const { data: webinar, error: wErr } = await admin
      .from('webinars')
      .select('id, slug, title')
      .eq('slug', slug.trim())
      .maybeSingle()

    if (wErr || !webinar) {
      console.log(`[${slug}] 웨비나 없음 또는 조회 실패:`, wErr?.message || 'not found')
      continue
    }

    const webinarId = webinar.id
    console.log(`\n--- ${webinar.slug}: ${webinar.title} ---`)

    // 1) webinar_user_sessions: 최근 입장 건수, heartbeat 갱신 여부
    const { data: sessions, error: sessErr } = await admin
      .from('webinar_user_sessions')
      .select('id, user_id, session_id, entered_at, exited_at, last_heartbeat_at, watched_seconds_raw')
      .eq('webinar_id', webinarId)
      .gte('entered_at', since.toISOString())
      .order('entered_at', { ascending: false })

    if (sessErr) {
      console.log('  세션 조회 실패:', sessErr.message)
    } else {
      const total = sessions?.length ?? 0
      const withHeartbeat = sessions?.filter((s: any) => s.last_heartbeat_at != null)?.length ?? 0
      const active = sessions?.filter((s: any) => !s.exited_at)?.length ?? 0
      const watchedSum = sessions?.reduce((acc: number, s: any) => acc + (s.watched_seconds_raw || 0), 0) ?? 0
      const withHb = (sessions as any[])?.filter((s: any) => s.last_heartbeat_at) ?? []
      const mostRecentHb = withHb.length
        ? withHb.reduce((a: any, b: any) =>
            new Date(b.last_heartbeat_at) > new Date(a.last_heartbeat_at) ? b : a
          )
        : null

      console.log(`  [세션] 최근 ${HOURS}시간 입장: ${total}건`)
      console.log(`  [세션] heartbeat 갱신됨: ${withHeartbeat}건 ${total ? `(${Math.round((withHeartbeat / total) * 100)}%)` : ''}`)
      console.log(`  [세션] 아직 퇴장 안 함: ${active}건`)
      console.log(`  [세션] 시청시간 합계(watched_seconds_raw): ${watchedSum}초`)
      if (mostRecentHb?.last_heartbeat_at) {
        console.log(`  [세션] 가장 최근 heartbeat: ${new Date(mostRecentHb.last_heartbeat_at).toLocaleString('ko-KR')}`)
      }
    }

    // 2) webinar_live_presence: 최근 last_seen_at (통계/현재 접속자용)
    const { data: presences, error: presErr } = await admin
      .from('webinar_live_presence')
      .select('user_id, last_seen_at, joined_at')
      .eq('webinar_id', webinarId)
      .gte('last_seen_at', since.toISOString())
      .order('last_seen_at', { ascending: false })

    if (presErr) {
      console.log('  presence 조회 실패:', presErr.message)
    } else {
      const presCount = presences?.length ?? 0
      const uniqueUsers = presences ? new Set(presences.map((p: any) => p.user_id)).size : 0
      const latestSeen = (presences as any[])?.[0]?.last_seen_at
        ? new Date((presences as any[])[0].last_seen_at).toLocaleString('ko-KR')
        : '-'
      console.log(`  [Presence] 최근 ${HOURS}시간 내 last_seen_at 기록: ${presCount}건 (고유 ${uniqueUsers}명)`)
      if (latestSeen !== '-') console.log(`  [Presence] 가장 최근 last_seen_at: ${latestSeen}`)
    }
  }

  console.log('\n=== 검증 완료 ===')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
