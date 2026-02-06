/**
 * 웨비나 149400 접속 기록 테스트 스크립트
 * 여러 계정으로 접속 기록을 생성하여 로그가 제대로 들어오는지 확인
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

const WEBINAR_ID = 'c9c7d93a-d775-4f8e-9243-8fdbb3618e2a' // 149400 웨비나 UUID
const WEBINAR_SLUG = '149400'

// 테스트할 계정 목록
const testAccounts = [
  { email: 'jubileo@naver.com', name: '양승철2' },
  { email: 'ysj@ustudio.co.kr', name: '윤석준' },
  { email: 'eventflow@wert.co.kr', name: '워트인텔리전스' },
  { email: 'cue@ustudio.co.kr', name: '이명현' },
  { email: 'arshin@wert.co.kr', name: 'arshin' },
]

async function testWebinarSessions() {
  console.log('=== 웨비나 접속 기록 테스트 시작 ===\n')
  console.log(`웨비나: ${WEBINAR_SLUG} (${WEBINAR_ID})\n`)

  // 웨비나 정보 확인
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title, agency_id, client_id')
    .eq('id', WEBINAR_ID)
    .single()

  if (webinarError || !webinar) {
    console.error('웨비나를 찾을 수 없습니다:', webinarError)
    return
  }

  console.log(`웨비나 정보: ${webinar.title}\n`)

  // 각 계정으로 접속 기록 생성
  for (const account of testAccounts) {
    console.log(`\n--- ${account.name} (${account.email}) 테스트 ---`)

    // 사용자 ID 조회
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .eq('email', account.email)
      .single()

    if (!profile) {
      console.log(`  ⚠️  사용자를 찾을 수 없습니다: ${account.email}`)
      continue
    }

    console.log(`  사용자 ID: ${profile.id}`)

    // 세션 ID 생성
    const sessionId = `test_${account.email.replace('@', '_')}_${Date.now()}`
    const enteredAt = new Date().toISOString()

    // webinar_user_sessions에 접속 기록 생성
    const { data: session, error: sessionError } = await admin
      .from('webinar_user_sessions')
      .insert({
        webinar_id: WEBINAR_ID,
        user_id: profile.id,
        session_id: sessionId,
        entered_at: enteredAt,
        user_agent: 'Test Script',
        referrer: 'https://eventflow.kr/test',
        ip_address: '127.0.0.1',
        agency_id: webinar.agency_id,
        client_id: webinar.client_id,
      })
      .select()
      .single()

    if (sessionError) {
      console.error(`  ❌ 접속 기록 생성 실패:`, sessionError)
      continue
    }

    console.log(`  ✅ 접속 기록 생성 성공`)
    console.log(`     세션 ID: ${sessionId}`)
    console.log(`     입장 시간: ${enteredAt}`)

    // webinar_live_presence 업데이트
    const { error: presenceError } = await admin
      .from('webinar_live_presence')
      .upsert({
        webinar_id: WEBINAR_ID,
        user_id: profile.id,
        joined_at: enteredAt,
        last_seen_at: enteredAt,
        agency_id: webinar.agency_id,
        client_id: webinar.client_id,
      }, {
        onConflict: 'webinar_id,user_id',
      })

    if (presenceError) {
      console.error(`  ⚠️  Presence 업데이트 실패:`, presenceError)
    } else {
      console.log(`  ✅ Presence 업데이트 성공`)
    }

    // 몇 초 후 heartbeat 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const heartbeatAt = new Date().toISOString()
    const deltaSeconds = 2 // 2초 경과

    const { error: heartbeatError } = await admin
      .from('webinar_user_sessions')
      .update({
        last_heartbeat_at: heartbeatAt,
        watched_seconds_raw: deltaSeconds,
        updated_at: heartbeatAt,
      })
      .eq('id', session.id)

    if (heartbeatError) {
      console.error(`  ⚠️  Heartbeat 업데이트 실패:`, heartbeatError)
    } else {
      console.log(`  ✅ Heartbeat 업데이트 성공 (시청시간: ${deltaSeconds}초)`)
    }

    // 몇 초 후 퇴장 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const exitedAt = new Date().toISOString()

    const { error: exitError } = await admin
      .from('webinar_user_sessions')
      .update({
        exited_at: exitedAt,
        updated_at: exitedAt,
      })
      .eq('id', session.id)

    if (exitError) {
      console.error(`  ⚠️  퇴장 기록 실패:`, exitError)
    } else {
      console.log(`  ✅ 퇴장 기록 성공`)
      console.log(`     퇴장 시간: ${exitedAt}`)
    }
  }

  // 결과 확인
  console.log('\n\n=== 테스트 결과 확인 ===\n')

  const { data: sessions, error: checkError } = await admin
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
      profiles:user_id (
        email,
        display_name
      )
    `)
    .eq('webinar_id', WEBINAR_ID)
    .order('entered_at', { ascending: false })
    .limit(20)

  if (checkError) {
    console.error('세션 조회 실패:', checkError)
    return
  }

  console.log(`총 ${sessions?.length || 0}개의 세션 기록이 있습니다.\n`)

  sessions?.forEach((session: any) => {
    const profile = session.profiles
    console.log(`- ${profile?.display_name || profile?.email || '익명'} (${profile?.email || 'N/A'})`)
    console.log(`  세션 ID: ${session.session_id}`)
    console.log(`  입장: ${session.entered_at}`)
    console.log(`  퇴장: ${session.exited_at || '진행 중'}`)
    console.log(`  체류시간: ${session.duration_seconds || 0}초`)
    console.log(`  시청시간 (heartbeat): ${session.watched_seconds_raw || 0}초`)
    console.log(`  마지막 heartbeat: ${session.last_heartbeat_at || '없음'}`)
    console.log('')
  })

  console.log('\n=== 테스트 완료 ===')
}

testWebinarSessions()
  .then(() => {
    console.log('\n모든 테스트가 완료되었습니다.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n테스트 중 오류 발생:', error)
    process.exit(1)
  })
