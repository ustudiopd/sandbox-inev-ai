/**
 * 현재 활성 세션 확인 스크립트
 * 149400 웨비나의 현재 진행 중인 세션 확인
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

const WEBINAR_SLUG = '149400'
const USER_EMAIL = 'jubileo@naver.com'

async function checkActiveSessions() {
  console.log('=== 현재 활성 세션 확인 ===\n')
  console.log(`웨비나: ${WEBINAR_SLUG}`)
  console.log(`사용자 이메일: ${USER_EMAIL}\n`)

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

  // 사용자 프로필 조회
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', USER_EMAIL)
    .single()

  if (profileError || !profile) {
    console.error('사용자를 찾을 수 없습니다:', profileError)
    return
  }

  console.log(`사용자 정보:`)
  console.log(`  이름: ${profile.display_name || 'N/A'}`)
  console.log(`  이메일: ${profile.email}`)
  console.log(`  사용자 ID: ${profile.id}\n`)

  // 현재 활성 세션 조회 (exited_at이 null인 세션)
  const { data: activeSessions, error: activeError } = await admin
    .from('webinar_user_sessions')
    .select(`
      id,
      session_id,
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
    .eq('user_id', profile.id)
    .is('exited_at', null)
    .order('entered_at', { ascending: false })

  if (activeError) {
    console.error('활성 세션 조회 실패:', activeError)
    return
  }

  const activeList = activeSessions || []
  console.log(`=== 현재 활성 세션: ${activeList.length}개 ===\n`)

  if (activeList.length === 0) {
    console.log('현재 활성 세션이 없습니다.')
  } else {
    activeList.forEach((session: any, index: number) => {
      console.log(`[${index + 1}] 세션 ID: ${session.session_id}`)
      console.log(`    입장 시간: ${new Date(session.entered_at).toLocaleString('ko-KR')}`)
      console.log(`    퇴장 시간: 진행 중`)
      const watched = session.watched_seconds_raw || 0
      console.log(`    시청 시간 (heartbeat): ${Math.floor(watched / 60)}분 ${watched % 60}초`)
      if (session.last_heartbeat_at) {
        const lastHeartbeat = new Date(session.last_heartbeat_at)
        const now = new Date()
        const secondsSinceHeartbeat = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)
        console.log(`    마지막 heartbeat: ${lastHeartbeat.toLocaleString('ko-KR')} (${secondsSinceHeartbeat}초 전)`)
      } else {
        console.log(`    마지막 heartbeat: 없음`)
      }
      console.log(`    User Agent: ${session.user_agent || 'N/A'}`)
      console.log(`    IP 주소: ${session.ip_address || 'N/A'}`)
      console.log('')
    })
  }

  // 최근 5분간의 모든 세션 조회 (활성/비활성 모두)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recentSessions, error: recentError } = await admin
    .from('webinar_user_sessions')
    .select(`
      id,
      session_id,
      entered_at,
      exited_at,
      duration_seconds,
      watched_seconds_raw,
      last_heartbeat_at,
      user_agent,
      ip_address
    `)
    .eq('webinar_id', webinar.id)
    .eq('user_id', profile.id)
    .gte('entered_at', fiveMinutesAgo)
    .order('entered_at', { ascending: false })

  if (!recentError && recentSessions) {
    console.log(`=== 최근 5분간 세션 기록: ${recentSessions.length}개 ===\n`)
    recentSessions.forEach((session: any, index: number) => {
      const status = session.exited_at ? '종료됨' : '진행 중'
      console.log(`[${index + 1}] ${status} - 세션 ID: ${session.session_id}`)
      console.log(`    입장: ${new Date(session.entered_at).toLocaleString('ko-KR')}`)
      if (session.exited_at) {
        console.log(`    퇴장: ${new Date(session.exited_at).toLocaleString('ko-KR')}`)
        const duration = session.duration_seconds || 0
        console.log(`    체류 시간: ${Math.floor(duration / 60)}분 ${duration % 60}초`)
      } else {
        console.log(`    퇴장: 진행 중`)
      }
      console.log('')
    })
  }

  console.log('=== 조회 완료 ===')
}

checkActiveSessions()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
