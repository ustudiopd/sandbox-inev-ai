import { createAdminSupabase } from '@/lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function updateManualRegistrationsRole() {
  const admin = createAdminSupabase()
  
  console.log('=== manual 등록의 role을 "관리자"로 업데이트 ===\n')
  
  // 1. manual 등록 중 role이 '관리자'가 아닌 항목 조회
  const { data: manualRegistrations, error: selectError } = await admin
    .from('registrations')
    .select('webinar_id, user_id, role, registered_via, created_at')
    .eq('registered_via', 'manual')
    .neq('role', '관리자')
  
  if (selectError) {
    console.error('❌ 조회 실패:', selectError)
    return
  }
  
  if (!manualRegistrations || manualRegistrations.length === 0) {
    console.log('✅ 업데이트할 항목이 없습니다. 모든 manual 등록이 이미 "관리자" 역할로 설정되어 있습니다.')
    return
  }
  
  console.log(`📋 업데이트 대상: ${manualRegistrations.length}개\n`)
  
  // 2. 각 항목 업데이트
  let successCount = 0
  let errorCount = 0
  
  for (const reg of manualRegistrations) {
    const { error: updateError } = await admin
      .from('registrations')
      .update({ role: '관리자' })
      .eq('webinar_id', reg.webinar_id)
      .eq('user_id', reg.user_id)
    
    if (updateError) {
      console.error(`❌ 업데이트 실패 (웨비나: ${reg.webinar_id}, 사용자: ${reg.user_id}):`, updateError.message)
      errorCount++
    } else {
      console.log(`✅ 업데이트 완료 (웨비나: ${reg.webinar_id}, 사용자: ${reg.user_id})`)
      successCount++
    }
  }
  
  console.log(`\n📊 결과:`)
  console.log(`   성공: ${successCount}개`)
  console.log(`   실패: ${errorCount}개`)
}

updateManualRegistrationsRole()
  .then(() => {
    console.log('\n✅ 작업 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 오류:', error)
    process.exit(1)
  })
