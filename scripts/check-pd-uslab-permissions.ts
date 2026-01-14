import { createAdminSupabase } from '../lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkPdUslabPermissions() {
  try {
    const admin = createAdminSupabase()
    const email = 'pd@uslab.ai'
    
    console.log('=== pd@uslab.ai 계정 권한 확인 ===\n')
    
    // 1. 사용자 조회
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ 사용자 목록 조회 실패:', usersError)
      process.exit(1)
    }
    
    const user = usersData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다:', email)
      process.exit(1)
    }
    
    console.log('✅ 사용자 정보:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Created: ${user.created_at}`)
    console.log(`   App Metadata:`, user.app_metadata)
    console.log(`   User Metadata:`, user.user_metadata)
    
    // 2. 프로필 확인
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, is_super_admin')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ 프로필 조회 실패:', profileError)
    } else {
      console.log('\n✅ 프로필 정보:')
      console.log(`   ID: ${profile?.id}`)
      console.log(`   Email: ${profile?.email}`)
      console.log(`   is_super_admin: ${profile?.is_super_admin}`)
    }
    
    // 3. 클라이언트 멤버십 확인
    const { data: clientMembers, error: clientMembersError } = await admin
      .from('client_members')
      .select('client_id, role, clients:client_id (id, name)')
      .eq('user_id', user.id)
    
    if (clientMembersError) {
      console.error('❌ 클라이언트 멤버십 조회 실패:', clientMembersError)
    } else {
      console.log('\n✅ 클라이언트 멤버십:')
      if (clientMembers && clientMembers.length > 0) {
        clientMembers.forEach((cm: any) => {
          const client = Array.isArray(cm.clients) ? cm.clients[0] : cm.clients
          console.log(`   - ${client?.name || 'Unknown'} (${client?.id}): ${cm.role}`)
        })
      } else {
        console.log('   멤버십 없음')
      }
    }
    
    // 4. 에이전시 멤버십 확인
    const { data: agencyMembers, error: agencyMembersError } = await admin
      .from('agency_members')
      .select('agency_id, role, agencies:agency_id (id, name)')
      .eq('user_id', user.id)
    
    if (agencyMembersError) {
      console.error('❌ 에이전시 멤버십 조회 실패:', agencyMembersError)
    } else {
      console.log('\n✅ 에이전시 멤버십:')
      if (agencyMembers && agencyMembers.length > 0) {
        agencyMembers.forEach((am: any) => {
          const agency = Array.isArray(am.agencies) ? am.agencies[0] : am.agencies
          console.log(`   - ${agency?.name || 'Unknown'} (${agency?.id}): ${am.role}`)
        })
      } else {
        console.log('   멤버십 없음')
      }
    }
    
    // 5. "모두의특강" 클라이언트 멤버인지 확인
    const { data: moduClient } = await admin
      .from('clients')
      .select('id, name')
      .ilike('name', '%모두의특강%')
      .maybeSingle()
    
    if (moduClient) {
      console.log(`\n✅ "모두의특강" 클라이언트 찾음: ${moduClient.id}`)
      
      const { data: moduMember } = await admin
        .from('client_members')
        .select('role')
        .eq('client_id', moduClient.id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (moduMember) {
        console.log(`   ✅ "모두의특강" 클라이언트 멤버: ${moduMember.role}`)
      } else {
        console.log(`   ❌ "모두의특강" 클라이언트 멤버가 아님`)
      }
    }
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

checkPdUslabPermissions()
