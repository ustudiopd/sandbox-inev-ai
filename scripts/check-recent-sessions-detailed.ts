/**
 * 최근 세션 상세 확인 스크립트
 * 149400 웨비나의 최근 세션 상세 정보 확인
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

async function checkRecentSessionsDetailed() {
  console.log('=== 최근 세션 상세 확인 ===\n')
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

  // 최근 10분간의 모든 세션 조회 (활성/비활성 모두)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
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
      ip_address,
      created_at,
      updated_at
    `)
    .eq('webinar_id', webinar.id)
    .eq('user_id', profile.id)
    .gte('entered_at', tenMinutesAgo)
    .order('entered_at', { ascending: false })

  if (recentError) {
    console.error('세션 조회 실패:', recentError)
    return
  }

  const sessions = recentSessions || []
  console.log(`=== 최근 10분간 세션 기록: ${sessions.length}개 ===\n`)

  if (sessions.length === 0) {
    console.log('최근 세션이 없습니다.')
    return
  }

  const now = new Date()

  sessions.forEach((session: any, index: number) => {
    const status = session.exited_at ? '종료됨' : '진행 중'
    console.log(`[${index + 1}] ${status} - 세션 ID: ${session.session_id}`)
    console.log(`    DB ID: ${session.id}`)
    
    const enteredAt = new Date(session.entered_at)
    const enteredAgo = Math.floor((now.getTime() - enteredAt.getTime()) / 1000)
    console.log(`    입장: ${enteredAt.toLocaleString('ko-KR')} (${enteredAgo}초 전)`)
    
    if (session.exited_at) {
      const exitedAt = new Date(session.exited_at)
      const exitedAgo = Math.floor((now.getTime() - exitedAt.getTime()) / 1000)
      console.log(`    퇴장: ${exitedAt.toLocaleString('ko-KR')} (${exitedAgo}초 전)`)
      const duration = session.duration_seconds || 0
      console.log(`    체류 시간: ${Math.floor(duration / 60)}분 ${duration % 60}초`)
    } else {
      console.log(`    퇴장: 진행 중`)
      const activeDuration = Math.floor((now.getTime() - enteredAt.getTime()) / 1000)
      console.log(`    현재 체류 시간: ${Math.floor(activeDuration / 60)}분 ${activeDuration % 60}초`)
    }
    
    const watched = session.watched_seconds_raw || 0
    console.log(`    시청 시간 (heartbeat): ${Math.floor(watched / 60)}분 ${watched % 60}초`)
    
    if (session.last_heartbeat_at) {
      const lastHeartbeat = new Date(session.last_heartbeat_at)
      const heartbeatAgo = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)
      console.log(`    마지막 heartbeat: ${lastHeartbeat.toLocaleString('ko-KR')} (${heartbeatAgo}초 전)`)
    } else {
      console.log(`    마지막 heartbeat: 없음`)
    }
    
    console.log(`    User Agent: ${session.user_agent || 'N/A'}`)
    console.log(`    IP 주소: ${session.ip_address || 'N/A'}`)
    console.log(`    Created: ${new Date(session.created_at).toLocaleString('ko-KR')}`)
    console.log(`    Updated: ${new Date(session.updated_at).toLocaleString('ko-KR')}`)
    console.log('')
  })

  // 가장 최근 세션 확인
  if (sessions.length > 0) {
    const latestSession = sessions[0]
    console.log('=== 가장 최근 세션 분석 ===\n')
    
    if (!latestSession.exited_at) {
      console.log('✅ 활성 세션입니다.')
      const activeDuration = Math.floor((now.getTime() - new Date(latestSession.entered_at).getTime()) / 1000)
      console.log(`현재 체류 시간: ${activeDuration}초`)
      
      if (latestSession.last_heartbeat_at) {
        const heartbeatAgo = Math.floor((now.getTime() - new Date(latestSession.last_heartbeat_at).getTime()) / 1000)
        console.log(`마지막 heartbeat: ${heartbeatAgo}초 전`)
        
        if (heartbeatAgo > 300) {
          console.log('⚠️  마지막 heartbeat가 5분 이상 지났습니다. Sweeper에 의해 곧 종료될 수 있습니다.')
        }
      } else {
        console.log('⚠️  heartbeat가 아직 없습니다. presence/ping이 호출되지 않았을 수 있습니다.')
      }
    } else {
      console.log('❌ 이미 종료된 세션입니다.')
      const exitedAgo = Math.floor((now.getTime() - new Date(latestSession.exited_at).getTime()) / 1000)
      console.log(`종료된 지: ${exitedAgo}초 전`)
    }
  }

  console.log('\n=== 조회 완료 ===')
}

checkRecentSessionsDetailed()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
