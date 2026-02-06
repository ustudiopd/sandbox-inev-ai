/**
 * 특정 사용자의 웨비나 접속 로그 조회 스크립트
 * jubileo@naver.com 사용자의 149400 웨비나 접속 기록 확인
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

async function checkUserSessions() {
  console.log('=== 사용자 접속 로그 조회 ===\n')
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

  // 접속 기록 조회
  const { data: sessions, error: sessionsError } = await admin
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
    .order('entered_at', { ascending: false })

  if (sessionsError) {
    console.error('접속 기록 조회 실패:', sessionsError)
    return
  }

  const sessionsList = sessions || []
  const totalSessions = sessionsList.length
  const completedSessions = sessionsList.filter(s => s.exited_at !== null).length
  const activeSessions = sessionsList.filter(s => s.exited_at === null).length

  console.log('=== 접속 기록 요약 ===')
  console.log(`총 접속 횟수: ${totalSessions}회`)
  console.log(`완료된 세션: ${completedSessions}회`)
  console.log(`진행 중 세션: ${activeSessions}회\n`)

  if (totalSessions === 0) {
    console.log('접속 기록이 없습니다.')
    return
  }

  // 총 시청 시간 계산
  const totalWatchedSeconds = sessionsList.reduce((sum, s) => sum + (s.watched_seconds_raw || 0), 0)
  const totalDurationSeconds = sessionsList.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)

  console.log(`총 시청 시간 (heartbeat): ${Math.floor(totalWatchedSeconds / 60)}분 ${totalWatchedSeconds % 60}초`)
  console.log(`총 체류 시간: ${Math.floor(totalDurationSeconds / 60)}분 ${totalDurationSeconds % 60}초`)
  if (completedSessions > 0) {
    console.log(`평균 시청 시간: ${Math.floor(totalWatchedSeconds / completedSessions / 60)}분 ${Math.floor(totalWatchedSeconds / completedSessions) % 60}초`)
    console.log(`평균 체류 시간: ${Math.floor(totalDurationSeconds / completedSessions / 60)}분 ${Math.floor(totalDurationSeconds / completedSessions) % 60}초`)
  }
  console.log('')

  // 최초 접속 시간
  const firstSession = sessionsList[sessionsList.length - 1]
  const lastSession = sessionsList[0]

  console.log('=== 접속 시간 정보 ===')
  if (firstSession) {
    console.log(`최초 접속 시간: ${new Date(firstSession.entered_at).toLocaleString('ko-KR')}`)
  }
  if (lastSession) {
    console.log(`마지막 접속 시간: ${new Date(lastSession.entered_at).toLocaleString('ko-KR')}`)
    if (lastSession.exited_at) {
      console.log(`마지막 퇴장 시간: ${new Date(lastSession.exited_at).toLocaleString('ko-KR')}`)
    } else {
      console.log(`마지막 퇴장 시간: 진행 중`)
    }
  }
  console.log('')

  // 상세 접속 기록
  console.log('=== 상세 접속 기록 ===\n')
  sessionsList.forEach((session, index) => {
    console.log(`[${index + 1}] 세션 ID: ${session.session_id}`)
    console.log(`    입장 시간: ${new Date(session.entered_at).toLocaleString('ko-KR')}`)
    if (session.exited_at) {
      console.log(`    퇴장 시간: ${new Date(session.exited_at).toLocaleString('ko-KR')}`)
      const duration = session.duration_seconds || 0
      console.log(`    체류 시간: ${Math.floor(duration / 60)}분 ${duration % 60}초`)
    } else {
      console.log(`    퇴장 시간: 진행 중`)
    }
    const watched = session.watched_seconds_raw || 0
    console.log(`    시청 시간 (heartbeat): ${Math.floor(watched / 60)}분 ${watched % 60}초`)
    if (session.last_heartbeat_at) {
      console.log(`    마지막 heartbeat: ${new Date(session.last_heartbeat_at).toLocaleString('ko-KR')}`)
    }
    if (session.user_agent) {
      console.log(`    User Agent: ${session.user_agent}`)
    }
    if (session.ip_address) {
      console.log(`    IP 주소: ${session.ip_address}`)
    }
    console.log('')
  })

  console.log('=== 조회 완료 ===')
}

checkUserSessions()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
