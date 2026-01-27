import dotenv from 'dotenv'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createAdminSupabase } from '../lib/supabase/admin'

async function deleteUser() {
  const email = 'eventflow@onepredict.com'
  const admin = createAdminSupabase()
  
  console.log(`\n=== 사용자 계정 삭제: ${email} ===\n`)
  
  // 1. 이메일로 사용자 찾기
  console.log('🔍 사용자 조회 중...')
  const { data: usersData } = await admin.auth.admin.listUsers()
  const user = usersData?.users.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )
  
  if (!user) {
    console.log(`⚠️  사용자를 찾을 수 없습니다: ${email}`)
    process.exit(0)
  }
  
  console.log(`✅ 사용자 찾음: ${user.email} (ID: ${user.id})\n`)
  
  // 2. 관련 데이터 확인 및 삭제
  console.log('🔍 관련 데이터 확인 중...')
  
  // client_members 확인
  const { data: clientMembers, error: clientMembersError } = await admin
    .from('client_members')
    .select('client_id, role')
    .eq('user_id', user.id)
  
  if (clientMembersError) {
    console.error('❌ client_members 조회 실패:', clientMembersError.message)
  } else if (clientMembers && clientMembers.length > 0) {
    console.log(`   📋 클라이언트 멤버십: ${clientMembers.length}개`)
    clientMembers.forEach((cm: any) => {
      console.log(`      - 클라이언트 ID: ${cm.client_id}, 역할: ${cm.role}`)
    })
  }
  
  // agency_members 확인
  const { data: agencyMembers, error: agencyMembersError } = await admin
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
  
  if (agencyMembersError) {
    console.error('❌ agency_members 조회 실패:', agencyMembersError.message)
  } else if (agencyMembers && agencyMembers.length > 0) {
    console.log(`   📋 에이전시 멤버십: ${agencyMembers.length}개`)
    agencyMembers.forEach((am: any) => {
      console.log(`      - 에이전시 ID: ${am.agency_id}, 역할: ${am.role}`)
    })
  }
  
  // profiles 확인
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, display_name, nickname')
    .eq('id', user.id)
    .maybeSingle()
  
  if (profileError) {
    console.error('❌ profiles 조회 실패:', profileError.message)
  } else if (profile) {
    console.log(`   📋 프로필: ${profile.display_name || profile.email}`)
  }
  
  console.log('\n🗑️  관련 데이터 삭제 중...')
  
  // client_members 삭제
  const { error: deleteClientMembersError } = await admin
    .from('client_members')
    .delete()
    .eq('user_id', user.id)
  
  if (deleteClientMembersError) {
    console.error('   ❌ client_members 삭제 실패:', deleteClientMembersError.message)
  } else {
    console.log('   ✅ client_members 삭제 완료')
  }
  
  // agency_members 삭제
  const { error: deleteAgencyMembersError } = await admin
    .from('agency_members')
    .delete()
    .eq('user_id', user.id)
  
  if (deleteAgencyMembersError) {
    console.error('   ❌ agency_members 삭제 실패:', deleteAgencyMembersError.message)
  } else {
    console.log('   ✅ agency_members 삭제 완료')
  }
  
  // profiles 삭제
  const { error: deleteProfileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', user.id)
  
  if (deleteProfileError) {
    console.error('   ❌ profiles 삭제 실패:', deleteProfileError.message)
  } else {
    console.log('   ✅ profiles 삭제 완료')
  }
  
  // 3. Supabase Auth에서 사용자 삭제
  console.log('\n🗑️  Auth 사용자 삭제 중...')
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
  
  if (deleteUserError) {
    console.error('❌ 사용자 삭제 실패:', deleteUserError.message)
    process.exit(1)
  }
  
  console.log('✅ 사용자 삭제 완료!')
  console.log(`\n   계정 "${email}"이(가) 완전히 삭제되었습니다.`)
}

deleteUser()
  .then(() => {
    console.log('\n✅ 작업 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  })
