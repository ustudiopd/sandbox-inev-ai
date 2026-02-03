/**
 * pd@usutdio.co.kr 계정을 에이전시 계정으로 설정하는 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/set-pd-as-agency.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// 환경 변수 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

async function setPdAsAgency() {
  try {
    console.log('=== pd@usutdio.co.kr 계정을 에이전시로 설정 ===\n')
    
    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 1. 사용자 찾기
    const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ 사용자 목록 조회 실패:', authError)
      process.exit(1)
    }
    
    const pdUser = users.find(u => u.email?.toLowerCase() === 'pd@usutdio.co.kr')
    
    if (!pdUser) {
      console.error('❌ pd@usutdio.co.kr 사용자를 찾을 수 없습니다.')
      process.exit(1)
    }
    
    console.log('✅ 사용자 찾기:', {
      id: pdUser.id,
      email: pdUser.email,
    })
    
    // 2. UStudio 에이전시 찾기
    const { data: agencies, error: agenciesError } = await admin
      .from('agencies')
      .select('id, name')
      .ilike('name', '%UStudio%')
      .limit(5)
    
    if (agenciesError) {
      console.error('❌ 에이전시 조회 실패:', agenciesError)
      process.exit(1)
    }
    
    if (!agencies || agencies.length === 0) {
      console.error('❌ UStudio 에이전시를 찾을 수 없습니다.')
      console.log('\n📋 모든 에이전시 목록:')
      const { data: allAgencies } = await admin
        .from('agencies')
        .select('id, name')
        .limit(10)
      allAgencies?.forEach(a => {
        console.log(`   - ${a.name} (${a.id})`)
      })
      process.exit(1)
    }
    
    const ustudioAgency = agencies[0]
    console.log(`✅ UStudio 에이전시 찾기: ${ustudioAgency.name} (${ustudioAgency.id})`)
    
    // 3. 슈퍼어드민 권한 제거
    console.log('\n🔄 슈퍼어드민 권한 제거 중...')
    
    // profiles 테이블 업데이트
    const { error: profileUpdateError } = await admin
      .from('profiles')
      .update({ is_super_admin: false })
      .eq('id', pdUser.id)
    
    if (profileUpdateError) {
      console.error('❌ 프로필 업데이트 실패:', profileUpdateError)
      process.exit(1)
    }
    console.log('   ✅ profiles.is_super_admin = false')
    
    // JWT app_metadata 업데이트
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(pdUser.id, {
      app_metadata: { is_super_admin: false }
    })
    
    if (authUpdateError) {
      console.error('❌ JWT app_metadata 업데이트 실패:', authUpdateError)
      console.log('   ⚠️  재로그인이 필요할 수 있습니다.')
    } else {
      console.log('   ✅ JWT app_metadata.is_super_admin = false')
    }
    
    // 4. 에이전시 멤버십 확인 및 추가
    console.log('\n🔄 에이전시 멤버십 확인 중...')
    
    const { data: existingMember, error: memberCheckError } = await admin
      .from('agency_members')
      .select('id, role')
      .eq('agency_id', ustudioAgency.id)
      .eq('user_id', pdUser.id)
      .maybeSingle()
    
    if (memberCheckError) {
      console.error('❌ 에이전시 멤버십 조회 실패:', memberCheckError)
      process.exit(1)
    }
    
    if (existingMember) {
      console.log(`   ℹ️  이미 에이전시 멤버입니다. 역할: ${existingMember.role}`)
      
      // 역할이 owner가 아니면 owner로 업데이트
      if (existingMember.role !== 'owner') {
        const { error: updateRoleError } = await admin
          .from('agency_members')
          .update({ role: 'owner' })
          .eq('id', existingMember.id)
        
        if (updateRoleError) {
          console.error('❌ 역할 업데이트 실패:', updateRoleError)
        } else {
          console.log('   ✅ 역할을 owner로 업데이트했습니다.')
        }
      }
    } else {
      // 에이전시 멤버십 추가
      const { error: insertError } = await admin
        .from('agency_members')
        .insert({
          agency_id: ustudioAgency.id,
          user_id: pdUser.id,
          role: 'owner'
        })
      
      if (insertError) {
        console.error('❌ 에이전시 멤버십 추가 실패:', insertError)
        process.exit(1)
      }
      console.log('   ✅ 에이전시 멤버십 추가 완료 (역할: owner)')
    }
    
    // 5. 최종 확인
    console.log('\n🔍 최종 확인:')
    const { data: finalProfile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', pdUser.id)
      .single()
    
    const { data: { user: finalUser } } = await admin.auth.admin.getUserById(pdUser.id)
    
    const { data: finalMember } = await admin
      .from('agency_members')
      .select('role, agencies:agency_id (id, name)')
      .eq('user_id', pdUser.id)
      .eq('agency_id', ustudioAgency.id)
      .single()
    
    console.log('   - profiles.is_super_admin:', finalProfile?.is_super_admin)
    console.log('   - JWT app_metadata.is_super_admin:', finalUser?.app_metadata?.is_super_admin)
    const agencyInfo = finalMember?.agencies as { name: string } | undefined
    console.log('   - 에이전시 멤버십:', finalMember ? `${agencyInfo?.name || ustudioAgency.name} (역할: ${finalMember.role})` : '없음')
    
    if (!finalProfile?.is_super_admin && !finalUser?.app_metadata?.is_super_admin && finalMember) {
      console.log('\n✅ 에이전시 계정으로 설정 완료!')
      console.log('\n📝 다음 단계:')
      console.log('   1. 브라우저에서 로그아웃 후 재로그인하세요.')
      console.log('   2. /agency/' + ustudioAgency.id + '/dashboard 경로로 접속해보세요.')
    } else {
      console.log('\n⚠️  일부 설정이 완료되지 않았습니다. 재로그인 후 다시 확인해주세요.')
    }
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

setPdAsAgency()
