/**
 * pd@ustudio.co.kr 계정의 관리자 권한 확인 및 수정 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/fix-pd-admin-access.ts
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

async function fixPdAdminAccess() {
  try {
    console.log('=== pd@ustudio.co.kr 관리자 권한 확인 및 수정 ===\n')
    
    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 1. 사용자 이메일로 auth.users에서 사용자 찾기
    const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ 사용자 목록 조회 실패:', authError)
      process.exit(1)
    }
    
    const pdUser = users.find(u => u.email?.toLowerCase() === 'pd@ustudio.co.kr')
    
    if (!pdUser) {
      console.error('❌ pd@ustudio.co.kr 사용자를 찾을 수 없습니다.')
      console.log('\n📋 등록된 사용자 목록:')
      users.slice(0, 10).forEach(u => {
        console.log(`   - ${u.email} (${u.id})`)
      })
      process.exit(1)
    }
    
    console.log('✅ 사용자 찾기:', {
      id: pdUser.id,
      email: pdUser.email,
      app_metadata: pdUser.app_metadata,
    })
    
    // 2. profiles 테이블에서 확인
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, is_super_admin, display_name')
      .eq('id', pdUser.id)
      .maybeSingle()
    
    if (profileError) {
      console.error('❌ 프로필 조회 실패:', profileError)
      process.exit(1)
    }
    
    console.log('\n📋 현재 프로필 상태:')
    console.log('   - is_super_admin:', profile?.is_super_admin || false)
    console.log('   - display_name:', profile?.display_name || '(없음)')
    console.log('   - JWT app_metadata.is_super_admin:', pdUser.app_metadata?.is_super_admin || false)
    
    // 3. 권한이 없으면 설정
    const needsUpdate = !profile?.is_super_admin || !pdUser.app_metadata?.is_super_admin
    
    if (needsUpdate) {
      console.log('\n🔄 관리자 권한 설정 중...')
      
      // profiles 테이블 업데이트
      if (!profile?.is_super_admin) {
        const { error: updateError } = await admin
          .from('profiles')
          .update({ is_super_admin: true })
          .eq('id', pdUser.id)
        
        if (updateError) {
          console.error('❌ 프로필 업데이트 실패:', updateError)
          process.exit(1)
        }
        console.log('   ✅ profiles.is_super_admin = true')
      }
      
      // JWT app_metadata 업데이트
      if (!pdUser.app_metadata?.is_super_admin) {
        const { error: authUpdateError } = await admin.auth.admin.updateUserById(pdUser.id, {
          app_metadata: { is_super_admin: true }
        })
        
        if (authUpdateError) {
          console.error('❌ JWT app_metadata 업데이트 실패:', authUpdateError)
          console.log('   ⚠️  재로그인이 필요할 수 있습니다.')
        } else {
          console.log('   ✅ JWT app_metadata.is_super_admin = true')
        }
      }
      
      console.log('\n✅ 관리자 권한 설정 완료!')
      console.log('\n📝 다음 단계:')
      console.log('   1. 브라우저에서 로그아웃 후 재로그인하세요.')
      console.log('   2. 또는 브라우저 쿠키를 삭제하고 다시 로그인하세요.')
      console.log('   3. /super/dashboard 경로로 접속해보세요.')
    } else {
      console.log('\n✅ 이미 관리자 권한이 설정되어 있습니다.')
      console.log('\n💡 접속이 안 되는 경우:')
      console.log('   1. 브라우저에서 로그아웃 후 재로그인하세요.')
      console.log('   2. 브라우저 쿠키를 삭제하고 다시 로그인하세요.')
      console.log('   3. JWT 토큰이 갱신되지 않았을 수 있습니다.')
    }
    
    // 4. 최종 확인
    console.log('\n🔍 최종 확인:')
    const { data: finalProfile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', pdUser.id)
      .single()
    
    const { data: { user: finalUser } } = await admin.auth.admin.getUserById(pdUser.id)
    
    console.log('   - profiles.is_super_admin:', finalProfile?.is_super_admin)
    console.log('   - JWT app_metadata.is_super_admin:', finalUser?.app_metadata?.is_super_admin)
    
    if (finalProfile?.is_super_admin && finalUser?.app_metadata?.is_super_admin) {
      console.log('\n✅ 모든 권한이 정상적으로 설정되었습니다!')
    } else {
      console.log('\n⚠️  일부 권한이 설정되지 않았습니다. 재로그인 후 다시 확인해주세요.')
    }
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

fixPdAdminAccess()
