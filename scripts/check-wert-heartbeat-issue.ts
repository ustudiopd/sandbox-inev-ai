/**
 * Wert 웨비나 heartbeat 문제 진단 스크립트
 * heartbeat가 있는 세션과 없는 세션 비교
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

async function checkHeartbeatIssue() {
  console.log('=== Wert 웨비나 Heartbeat 문제 진단 ===\n')
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

  console.log(`웨비나 정보: ${webinar.title}`)
  console.log(`웨비나 ID (UUID): ${webinar.id}`)
  console.log(`웨비나 Slug: ${webinar.slug}\n`)

  // 최근 1시간간의 활성 세션 조회
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: activeSessions, error: sessionsError } = await admin
    .from('webinar_user_sessions')
    .select(`
      id,
      session_id,
      user_id,
      entered_at,
      last_heartbeat_at,
      watched_seconds_raw,
      user_agent
    `)
    .eq('webinar_id', webinar.id)
    .is('exited_at', null)
    .gte('entered_at', oneHourAgo)
    .order('entered_at', { ascending: false })

  if (sessionsError) {
    console.error('세션 조회 실패:', sessionsError)
    return
  }

  const sessions = activeSessions || []
  console.log(`=== 최근 1시간간 활성 세션: ${sessions.length}개 ===\n`)

  // heartbeat가 있는 세션과 없는 세션 분리
  const sessionsWithHeartbeat = sessions.filter((s: any) => s.last_heartbeat_at)
  const sessionsWithoutHeartbeat = sessions.filter((s: any) => !s.last_heartbeat_at)

  console.log(`Heartbeat 있는 세션: ${sessionsWithHeartbeat.length}개`)
  console.log(`Heartbeat 없는 세션: ${sessionsWithoutHeartbeat.length}개\n`)

  // Heartbeat가 있는 세션 분석
  if (sessionsWithHeartbeat.length > 0) {
    console.log('=== Heartbeat가 있는 세션 (최대 5개) ===\n')
    sessionsWithHeartbeat.slice(0, 5).forEach((session: any, index: number) => {
      console.log(`[${index + 1}] 세션 ID: ${session.session_id}`)
      console.log(`    사용자 ID: ${session.user_id || '게스트'}`)
      console.log(`    입장: ${new Date(session.entered_at).toLocaleString('ko-KR')}`)
      console.log(`    마지막 heartbeat: ${new Date(session.last_heartbeat_at).toLocaleString('ko-KR')}`)
      console.log(`    시청 시간: ${Math.floor((session.watched_seconds_raw || 0) / 60)}분`)
      console.log(`    User Agent: ${session.user_agent?.substring(0, 50) || 'N/A'}`)
      console.log('')
    })
  }

  // Heartbeat가 없는 세션 분석
  if (sessionsWithoutHeartbeat.length > 0) {
    console.log('=== Heartbeat가 없는 세션 (최대 10개) ===\n')
    sessionsWithoutHeartbeat.slice(0, 10).forEach((session: any, index: number) => {
      const enteredAgo = Math.floor((Date.now() - new Date(session.entered_at).getTime()) / 1000)
      console.log(`[${index + 1}] 세션 ID: ${session.session_id}`)
      console.log(`    사용자 ID: ${session.user_id || '게스트'}`)
      console.log(`    입장: ${new Date(session.entered_at).toLocaleString('ko-KR')} (${enteredAgo}초 전)`)
      console.log(`    User Agent: ${session.user_agent?.substring(0, 50) || 'N/A'}`)
      console.log('')
    })
  }

  // 사용자별 분석
  console.log('=== 사용자별 분석 ===\n')
  const userMap = new Map<string, { total: number; withHeartbeat: number; withoutHeartbeat: number }>()
  
  sessions.forEach((session: any) => {
    const userId = session.user_id || '게스트'
    const existing = userMap.get(userId) || { total: 0, withHeartbeat: 0, withoutHeartbeat: 0 }
    existing.total += 1
    if (session.last_heartbeat_at) {
      existing.withHeartbeat += 1
    } else {
      existing.withoutHeartbeat += 1
    }
    userMap.set(userId, existing)
  })

  console.log(`고유 사용자 수: ${userMap.size}명\n`)
  
  // Heartbeat가 없는 사용자들
  const usersWithoutHeartbeat = Array.from(userMap.entries())
    .filter(([_, stats]) => stats.withoutHeartbeat > 0)
    .slice(0, 10)

  if (usersWithoutHeartbeat.length > 0) {
    console.log('Heartbeat가 없는 사용자 (최대 10명):')
    usersWithoutHeartbeat.forEach(([userId, stats]) => {
      console.log(`  - ${userId === '게스트' ? '게스트' : userId.substring(0, 8) + '...'}: 총 ${stats.total}개 세션, heartbeat 없음 ${stats.withoutHeartbeat}개`)
    })
  }

  // 등록 정보 확인 (로그인 사용자만)
  const loggedInUsers = sessions.filter((s: any) => s.user_id).map((s: any) => s.user_id)
  const uniqueLoggedInUsers = [...new Set(loggedInUsers)]
  
  if (uniqueLoggedInUsers.length > 0) {
    console.log(`\n=== 등록 정보 확인 (최대 10명) ===\n`)
    const { data: registrations } = await admin
      .from('registrations')
      .select('user_id')
      .eq('webinar_id', webinar.id)
      .in('user_id', uniqueLoggedInUsers.slice(0, 10))

    const registeredUserIds = new Set(registrations?.map((r: any) => r.user_id) || [])
    
    uniqueLoggedInUsers.slice(0, 10).forEach((userId) => {
      const hasRegistration = registeredUserIds.has(userId)
      const userSessions = sessions.filter((s: any) => s.user_id === userId)
      const hasHeartbeat = userSessions.some((s: any) => s.last_heartbeat_at)
      
      console.log(`사용자: ${userId.substring(0, 8)}...`)
      console.log(`  등록 여부: ${hasRegistration ? '✅' : '❌'}`)
      console.log(`  Heartbeat 여부: ${hasHeartbeat ? '✅' : '❌'}`)
      console.log(`  세션 수: ${userSessions.length}개`)
      console.log('')
    })
  }

  console.log('\n=== 진단 완료 ===')
}

checkHeartbeatIssue()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('진단 중 오류 발생:', error)
    process.exit(1)
  })
