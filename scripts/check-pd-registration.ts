import { createAdminSupabase } from '@/lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkPdRegistration() {
  const admin = createAdminSupabase()
  
  console.log('=== pd@ustudio.co.kr 등록 정보 확인 ===\n')
  
  // 1. 프로필 조회
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', 'pd@ustudio.co.kr')
    .maybeSingle()
  
  if (profileError || !profile) {
    console.error('❌ 프로필 조회 실패:', profileError)
    return
  }
  
  console.log('1. 프로필 정보:')
  console.log(`   ID: ${profile.id}`)
  console.log(`   Email: ${profile.email}`)
  console.log(`   Display Name: ${profile.display_name || '없음'}`)
  console.log()
  
  // 2. registrations 테이블에서 해당 사용자의 모든 등록 조회
  const { data: registrations, error: regError } = await admin
    .from('registrations')
    .select('webinar_id, nickname, role, registered_via, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
  
  if (regError) {
    console.error('❌ registrations 조회 실패:', regError)
    return
  }
  
  console.log(`2. registrations 테이블 (총 ${registrations?.length || 0}개):`)
  if (!registrations || registrations.length === 0) {
    console.log('   등록 정보가 없습니다.')
    return
  }
  
  registrations.forEach((reg: any, index: number) => {
    console.log(`\n   [${index + 1}] 웨비나 ID: ${reg.webinar_id}`)
    console.log(`       Nickname: ${reg.nickname || '없음'}`)
    console.log(`       Role: ${reg.role || '없음'}`)
    console.log(`       Registered Via: ${reg.registered_via || '없음'}`)
    console.log(`       Created At: ${reg.created_at ? new Date(reg.created_at).toLocaleString('ko-KR') : '없음'}`)
  })
  
  // 3. manual 등록 중 role이 '관리자'가 아닌 것 찾기
  console.log('\n3. manual 등록 중 role이 "관리자"가 아닌 항목:')
  const manualRegistrations = registrations?.filter((reg: any) => reg.registered_via === 'manual' && reg.role !== '관리자') || []
  
  if (manualRegistrations.length === 0) {
    console.log('   모든 manual 등록이 "관리자" 역할로 설정되어 있습니다.')
  } else {
    console.log(`   총 ${manualRegistrations.length}개 발견:`)
    manualRegistrations.forEach((reg: any, index: number) => {
      console.log(`\n   [${index + 1}] 웨비나 ID: ${reg.webinar_id}`)
      console.log(`       현재 Role: ${reg.role || '없음'}`)
      console.log(`       Registered Via: ${reg.registered_via}`)
    })
  }
}

checkPdRegistration()
  .then(() => {
    console.log('\n✅ 확인 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 오류:', error)
    process.exit(1)
  })
