import { config } from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '@/lib/supabase/admin'

const webinarId = '1a1eb091-290b-4451-8f74-62cb47ac37ea'

async function checkWebinarInfo() {
  const admin = createAdminSupabase()

  console.log('=== 웨비나 정보 조회 ===\n')
  console.log(`웨비나 ID: ${webinarId}\n`)

  // 웨비나 기본 정보
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('*')
    .eq('id', webinarId)
    .single()

  if (webinarError) {
    console.error('❌ 웨비나 조회 실패:', webinarError)
    return
  }

  console.log('✅ 웨비나 기본 정보:')
  console.log(JSON.stringify(webinar, null, 2))
  console.log('\n')

  // 등록자 수
  const { count: registrantsCount } = await admin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinarId)

  console.log(`📊 총 등록자 수: ${registrantsCount || 0}`)

  // 접속 로그
  const { data: accessLogs, error: accessError } = await admin
    .from('webinar_access_logs')
    .select('*')
    .eq('webinar_id', webinarId)
    .order('time_bucket', { ascending: true })

  if (!accessError && accessLogs) {
    console.log(`\n📈 접속 로그 수: ${accessLogs.length}`)
    if (accessLogs.length > 0) {
      const maxParticipants = Math.max(...accessLogs.map((log: any) => log.max_participants || 0))
      const totalSum = accessLogs.reduce((sum: number, log: any) => sum + (log.sum_participants || 0), 0)
      const totalSamples = accessLogs.reduce((sum: number, log: any) => sum + (log.sample_count || 0), 0)
      const avgParticipants = totalSamples > 0 ? totalSum / totalSamples : 0
      
      console.log(`   최대 동시 접속자: ${maxParticipants}`)
      console.log(`   평균 동시 접속자: ${avgParticipants.toFixed(2)}`)
    }
  }

  // 실제 접속자 수 (webinar_live_presence)
  const { data: presences, error: presenceError } = await admin
    .from('webinar_live_presence')
    .select('user_id')
    .eq('webinar_id', webinarId)

  if (!presenceError && presences) {
    const uniqueAttendees = new Set(presences.map((p: any) => p.user_id)).size
    console.log(`\n👥 실제 접속자 수 (고유): ${uniqueAttendees}`)
  }

  // 메시지 수
  const { count: messagesCount } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinarId)
    .eq('hidden', false)

  console.log(`\n💬 총 메시지 수: ${messagesCount || 0}`)

  // 질문 수
  const { count: questionsCount } = await admin
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinarId)
    .neq('status', 'hidden')

  console.log(`❓ 총 질문 수: ${questionsCount || 0}`)

  // 답변된 질문 수
  const { count: answeredCount } = await admin
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinarId)
    .neq('status', 'hidden')
    .not('answered_at', 'is', null)

  console.log(`✅ 답변된 질문 수: ${answeredCount || 0}`)
}

checkWebinarInfo().catch(console.error)
