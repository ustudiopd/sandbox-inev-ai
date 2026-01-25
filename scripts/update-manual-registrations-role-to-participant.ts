import { createAdminSupabase } from '@/lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function updateManualRegistrationsRole() {
  const admin = createAdminSupabase()
  
  console.log('=== manual 등록의 role 업데이트 ===')
  console.log('pd@ustudio.co.kr 계정만 관리자로 유지, 나머지는 참여자로 변경\n')
  
  // 1. manual 등록 조회 (profiles와 조인하여 이메일 확인)
  const { data: manualRegistrations, error: selectError } = await admin
    .from('registrations')
    .select(`
      webinar_id,
      user_id,
      role,
      registered_via,
      created_at,
      profiles:user_id (
        email
      )
    `)
    .eq('registered_via', 'manual')
  
  if (selectError) {
    console.error('❌ 조회 실패:', selectError)
    return
  }
  
  if (!manualRegistrations || manualRegistrations.length === 0) {
    console.log('✅ 업데이트할 항목이 없습니다.')
    return
  }
  
  console.log(`📋 총 manual 등록 수: ${manualRegistrations.length}개\n`)
  
  // 2. 각 항목 업데이트
  let successCount = 0
  let errorCount = 0
  let pdAccountCount = 0
  let participantCount = 0
  
  for (const reg of manualRegistrations) {
    const email = (reg.profiles as any)?.email?.toLowerCase()?.trim()
    const isPdAccount = email === 'pd@ustudio.co.kr'
    const targetRole = isPdAccount ? '관리자' : 'attendee'
    
    // 이미 올바른 role이면 스킵
    if (reg.role === targetRole) {
      if (isPdAccount) {
        pdAccountCount++
      } else {
        participantCount++
      }
      continue
    }
    
    const { error: updateError } = await admin
      .from('registrations')
      .update({ role: targetRole })
      .eq('webinar_id', reg.webinar_id)
      .eq('user_id', reg.user_id)
    
    if (updateError) {
      console.error(`❌ 업데이트 실패 (웨비나: ${reg.webinar_id}, 사용자: ${reg.user_id}, 이메일: ${email}):`, updateError.message)
      errorCount++
    } else {
      console.log(`✅ 업데이트 완료 (웨비나: ${reg.webinar_id}, 사용자: ${reg.user_id}, 이메일: ${email || '없음'}) → ${targetRole}`)
      successCount++
      if (isPdAccount) {
        pdAccountCount++
      } else {
        participantCount++
      }
    }
  }
  
  console.log(`\n📊 결과:`)
  console.log(`   총 manual 등록: ${manualRegistrations.length}개`)
  console.log(`   업데이트 성공: ${successCount}개`)
  console.log(`   업데이트 실패: ${errorCount}개`)
  console.log(`   관리자 (pd@ustudio.co.kr): ${pdAccountCount}개`)
  console.log(`   참여자: ${participantCount}개`)
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
