import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function delete149402Registrations() {
  const admin = createAdminSupabase()
  
  console.log('=== 149402 웨비나 registrations 데이터 삭제 ===\n')
  
  // 1. 웨비나 정보 조회
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select('id, slug, title')
    .eq('slug', '149402')
    .single()
  
  if (webinarError || !webinar) {
    console.error('❌ 웨비나 조회 실패:', webinarError)
    process.exit(1)
  }
  
  console.log(`웨비나: ${webinar.title} (ID: ${webinar.id})\n`)
  
  // 2. 삭제할 데이터 확인
  const { data: registrations, error: checkError } = await admin
    .from('registrations')
    .select(`
      user_id, 
      nickname, 
      registered_via, 
      created_at,
      profiles:user_id (
        email,
        display_name
      )
    `)
    .eq('webinar_id', webinar.id)
    .order('created_at', { ascending: false })
  
  if (checkError) {
    console.error('❌ 데이터 조회 실패:', checkError.message)
    process.exit(1)
  }
  
  if (!registrations || registrations.length === 0) {
    console.log('✅ 삭제할 데이터가 없습니다.')
    return
  }
  
  console.log(`삭제할 데이터: ${registrations.length}건\n`)
  registrations.forEach((reg: any, index: number) => {
    const profile = Array.isArray(reg.profiles) ? reg.profiles[0] : reg.profiles
    const name = reg.nickname || profile?.display_name || '이름 없음'
    const email = profile?.email || '이메일 없음'
    console.log(`${index + 1}. ${name} (${email}) - ${reg.registered_via}`)
  })
  console.log()
  
  // 3. 삭제 실행
  const { error: deleteError } = await admin
    .from('registrations')
    .delete()
    .eq('webinar_id', webinar.id)
  
  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  
  console.log('✅ 삭제 완료!')
  console.log(`   총 ${registrations.length}건의 데이터가 삭제되었습니다.`)
  console.log('\n이제 API는 event_survey_entries의 데이터만 반환합니다.')
}

delete149402Registrations().catch(console.error)
