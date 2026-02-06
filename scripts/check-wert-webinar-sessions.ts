/**
 * Wert 웨비나 세션 및 heartbeat 확인 스크립트
 * 웨비나 slug: 149402
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const WEBINAR_SLUG = '149402'

async function checkWertWebinarSessions() {
  console.log('=== Wert 웨비나 세션 및 Heartbeat 확인 ===\n')
  console.log(`웨비나 Slug: ${WEBINAR_SLUG}\n`)

  // 웨비나 ID 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title')
    .eq('slug', WEBINAR_SLUG)
    .single()

  if (webinarError || !webinar) {
    console.error('웨비나를 찾을 수 없습니다:', webinarError)
    return
  }

  console.log(`웨비나 정보: ${webinar.title} (${webinar.id})\n`)

  // 최근 24시간간의 모든 세션 조회
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentSessions, error: recentError } = await admin
    .from('webinar_user_sessions')
    .select(`
      id,
      session_id,
      user_id,
      entered_at,
      exited_at,
      duration_seconds,
      watched_seconds_raw,
      last_heartbeat_at,
      user_agent,
      ip_address,
      created_at,
      updated_at
    `)
    .eq('webinar_id', webinar.id)
    .gte('entered_at', twentyFourHoursAgo)
    .order('entered_at', { ascending: false })

  if (recentError) {
    console.error('세션 조회 실패:', recentError)
    return
  }

  const sessions = recentSessions || []
  console.log(`=== 최근 24시간간 세션 기록: ${sessions.length}개 ===\n`)

  if (sessions.length === 0) {
    console.log('최근 세션이 없습니다.')
    return
  }

  const now = new Date()

  // 활성 세션과 종료된 세션 분리
  const activeSessions = sessions.filter((s: any) => !s.exited_at)
  const completedSessions = sessions.filter((s: any) => s.exited_at)

  console.log(`활성 세션: ${activeSessions.length}개`)
  console.log(`종료된 세션: ${completedSessions.length}개\n`)

  // 활성 세션 상세 정보
  if (activeSessions.length > 0) {
    console.log('=== 활성 세션 상세 ===\n')
    activeSessions.forEach((session: any, index: number) => {
      const enteredAt = new Date(session.entered_at)
      const enteredAgo = Math.floor((now.getTime() - enteredAt.getTime()) / 1000)
      const activeDuration = Math.floor((now.getTime() - enteredAt.getTime()) / 1000)
      
      console.log(`[${index + 1}] 세션 ID: ${session.session_id}`)
      console.log(`    DB ID: ${session.id}`)
      console.log(`    사용자 ID: ${session.user_id || '게스트'}`)
      console.log(`    입장: ${enteredAt.toLocaleString('ko-KR')} (${enteredAgo}초 전)`)
      console.log(`    현재 체류 시간: ${Math.floor(activeDuration / 60)}분 ${activeDuration % 60}초`)
      
      const watched = session.watched_seconds_raw || 0
      console.log(`    시청 시간 (heartbeat): ${Math.floor(watched / 60)}분 ${watched % 60}초`)
      
      if (session.last_heartbeat_at) {
        const lastHeartbeat = new Date(session.last_heartbeat_at)
        const heartbeatAgo = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)
        console.log(`    마지막 heartbeat: ${lastHeartbeat.toLocaleString('ko-KR')} (${heartbeatAgo}초 전)`)
        
        if (heartbeatAgo > 300) {
          console.log(`    ⚠️  마지막 heartbeat가 5분 이상 지났습니다. Sweeper에 의해 곧 종료될 수 있습니다.`)
        }
      } else {
        console.log(`    마지막 heartbeat: 없음`)
        console.log(`    ⚠️  heartbeat가 아직 없습니다. presence/ping이 호출되지 않았을 수 있습니다.`)
      }
      
      console.log(`    User Agent: ${session.user_agent || 'N/A'}`)
      console.log(`    IP 주소: ${session.ip_address || 'N/A'}`)
      console.log('')
    })
  }

  // 최근 종료된 세션 (최대 10개)
  if (completedSessions.length > 0) {
    console.log('=== 최근 종료된 세션 (최대 10개) ===\n')
    completedSessions.slice(0, 10).forEach((session: any, index: number) => {
      const enteredAt = new Date(session.entered_at)
      const exitedAt = new Date(session.exited_at!)
      const exitedAgo = Math.floor((now.getTime() - exitedAt.getTime()) / 1000)
      const duration = session.duration_seconds || 0
      
      console.log(`[${index + 1}] 세션 ID: ${session.session_id}`)
      console.log(`    사용자 ID: ${session.user_id || '게스트'}`)
      console.log(`    입장: ${enteredAt.toLocaleString('ko-KR')}`)
      console.log(`    퇴장: ${exitedAt.toLocaleString('ko-KR')} (${exitedAgo}초 전)`)
      console.log(`    체류 시간: ${Math.floor(duration / 60)}분 ${duration % 60}초`)
      
      const watched = session.watched_seconds_raw || 0
      console.log(`    시청 시간 (heartbeat): ${Math.floor(watched / 60)}분 ${watched % 60}초`)
      
      if (session.last_heartbeat_at) {
        const lastHeartbeat = new Date(session.last_heartbeat_at)
        console.log(`    마지막 heartbeat: ${lastHeartbeat.toLocaleString('ko-KR')}`)
      } else {
        console.log(`    마지막 heartbeat: 없음`)
      }
      console.log('')
    })
  }

  // 통계 요약
  console.log('=== 통계 요약 ===\n')
  const uniqueUsers = new Set(sessions.map((s: any) => s.user_id).filter(Boolean)).size
  const totalWatchSeconds = sessions.reduce((sum, s: any) => sum + (s.watched_seconds_raw || 0), 0)
  const totalDurationSeconds = completedSessions.reduce((sum, s: any) => sum + (s.duration_seconds || 0), 0)
  const sessionsWithHeartbeat = sessions.filter((s: any) => s.last_heartbeat_at).length
  
  console.log(`고유 사용자 수: ${uniqueUsers}명`)
  console.log(`전체 세션 수: ${sessions.length}개`)
  console.log(`Heartbeat가 있는 세션: ${sessionsWithHeartbeat}개 (${Math.round((sessionsWithHeartbeat / sessions.length) * 100)}%)`)
  console.log(`총 시청 시간 (heartbeat): ${Math.floor(totalWatchSeconds / 60)}분 ${totalWatchSeconds % 60}초`)
  console.log(`총 체류 시간: ${Math.floor(totalDurationSeconds / 60)}분 ${totalDurationSeconds % 60}초`)

  // Presence 확인
  console.log('\n=== 실시간 Presence 확인 ===\n')
  const activeSince = new Date(Date.now() - 3 * 60 * 1000).toISOString()
  const { data: activePresences, error: presenceError } = await admin
    .from('webinar_live_presence')
    .select('user_id, last_seen_at, joined_at')
    .eq('webinar_id', webinar.id)
    .gte('last_seen_at', activeSince)
    .order('last_seen_at', { ascending: false })

  if (presenceError) {
    console.error('Presence 조회 실패:', presenceError)
  } else {
    const presences = activePresences || []
    console.log(`현재 활성 Presence: ${presences.length}명`)
    if (presences.length > 0) {
      presences.slice(0, 5).forEach((p: any, index: number) => {
        const lastSeen = new Date(p.last_seen_at)
        const lastSeenAgo = Math.floor((now.getTime() - lastSeen.getTime()) / 1000)
        console.log(`  [${index + 1}] 사용자 ID: ${p.user_id}, 마지막 확인: ${lastSeenAgo}초 전`)
      })
    }
  }

  console.log('\n=== 조회 완료 ===')
}

checkWertWebinarSessions()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
