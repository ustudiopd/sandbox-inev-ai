/**
 * 최근 접속 기록 확인 스크립트
 * 149400 웨비나의 최근 10분간 접속 기록 확인
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

async function checkRecentSessions() {
  console.log('=== 최근 접속 기록 확인 ===\n')
  console.log(`웨비나: ${WEBINAR_SLUG}\n`)

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

  // 최근 10분간의 접속 기록 조회
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { data: sessions, error: sessionsError } = await admin
    .from('webinar_user_sessions')
    .select(`
      id,
      user_id,
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
    .gte('entered_at', tenMinutesAgo)
    .order('entered_at', { ascending: false })

  if (sessionsError) {
    console.error('접속 기록 조회 실패:', sessionsError)
    return
  }

  const sessionsList = sessions || []
  console.log(`최근 10분간 접속 기록: ${sessionsList.length}건\n`)

  if (sessionsList.length === 0) {
    console.log('최근 10분간 접속 기록이 없습니다.')
    console.log('현재 시간:', new Date().toLocaleString('ko-KR'))
    console.log('조회 시작 시간:', new Date(tenMinutesAgo).toLocaleString('ko-KR'))
    return
  }

  // 사용자 ID 수집
  const userIds = sessionsList.map((s: any) => s.user_id).filter(Boolean)
  
  // 프로필 정보 조회
  let profilesMap = new Map<string, any>()
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .in('id', userIds)
    
    if (profiles) {
      profiles.forEach((p: any) => {
        profilesMap.set(p.id, p)
      })
    }
  }

  // jubileo@naver.com 사용자 ID 찾기
  const jubileoProfile = Array.from(profilesMap.values()).find((p: any) => p.email === 'jubileo@naver.com')
  const jubileoUserId = jubileoProfile?.id

  // jubileo@naver.com 사용자 필터링
  const jubileoSessions = sessionsList.filter((s: any) => 
    s.user_id === jubileoUserId
  )

  console.log(`jubileo@naver.com 접속 기록: ${jubileoSessions.length}건\n`)

  // 전체 최근 접속 기록
  console.log('=== 전체 최근 접속 기록 ===\n')
  sessionsList.forEach((session: any, index: number) => {
    const profile = session.user_id ? profilesMap.get(session.user_id) : null
    console.log(`[${index + 1}] ${profile?.display_name || profile?.email || '익명'} (${profile?.email || '게스트'})`)
    console.log(`    사용자 ID: ${session.user_id || 'N/A'}`)
    console.log(`    세션 ID: ${session.session_id}`)
    console.log(`    입장 시간: ${new Date(session.entered_at).toLocaleString('ko-KR')}`)
    if (session.exited_at) {
      console.log(`    퇴장 시간: ${new Date(session.exited_at).toLocaleString('ko-KR')}`)
    } else {
      console.log(`    퇴장 시간: 진행 중`)
    }
    console.log(`    User Agent: ${session.user_agent || 'N/A'}`)
    console.log(`    IP 주소: ${session.ip_address || 'N/A'}`)
    console.log('')
  })

  // jubileo 사용자 상세 기록
  if (jubileoSessions.length > 0) {
    console.log('=== jubileo@naver.com 상세 기록 ===\n')
    jubileoSessions.forEach((session: any, index: number) => {
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
      console.log(`    User Agent: ${session.user_agent || 'N/A'}`)
      console.log(`    IP 주소: ${session.ip_address || 'N/A'}`)
      console.log('')
    })
  }

  console.log('=== 조회 완료 ===')
}

checkRecentSessions()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
