/**
 * 특정 세션의 heartbeat 상태 확인 스크립트
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

const SESSION_ID = 'session_1769493288956_lrm0x'
const WEBINAR_ID = 'f257ce42-723a-4fad-a9a5-1bd8c154d7ce'

async function checkSessionHeartbeat() {
  console.log('=== 세션 Heartbeat 확인 ===\n')
  console.log(`세션 ID: ${SESSION_ID}`)
  console.log(`웨비나 ID: ${WEBINAR_ID}\n`)

  const { data: session, error } = await admin
    .from('webinar_user_sessions')
    .select('*')
    .eq('session_id', SESSION_ID)
    .eq('webinar_id', WEBINAR_ID)
    .maybeSingle()

  if (error) {
    console.error('세션 조회 실패:', error)
    return
  }

  if (!session) {
    console.log('세션을 찾을 수 없습니다.')
    console.log('세션이 아직 생성되지 않았거나, session_id가 잘못되었을 수 있습니다.')
    return
  }

  console.log('=== 세션 정보 ===\n')
  console.log(`DB ID: ${session.id}`)
  console.log(`사용자 ID: ${session.user_id || '게스트'}`)
  console.log(`입장 시간: ${new Date(session.entered_at).toLocaleString('ko-KR')}`)
  console.log(`퇴장 시간: ${session.exited_at ? new Date(session.exited_at).toLocaleString('ko-KR') : '없음 (활성)'}`)
  console.log(`시청 시간 (heartbeat): ${session.watched_seconds_raw || 0}초`)
  
  if (session.last_heartbeat_at) {
    const lastHeartbeat = new Date(session.last_heartbeat_at)
    const now = new Date()
    const heartbeatAgo = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)
    console.log(`마지막 heartbeat: ${lastHeartbeat.toLocaleString('ko-KR')} (${heartbeatAgo}초 전)`)
  } else {
    console.log(`마지막 heartbeat: 없음`)
    console.log(`⚠️  heartbeat가 아직 업데이트되지 않았습니다.`)
  }

  console.log(`생성 시간: ${new Date(session.created_at).toLocaleString('ko-KR')}`)
  console.log(`업데이트 시간: ${new Date(session.updated_at).toLocaleString('ko-KR')}`)
}

checkSessionHeartbeat()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('조회 중 오류 발생:', error)
    process.exit(1)
  })
