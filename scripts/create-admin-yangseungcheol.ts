/**
 * 관리자 계정 생성 스크립트 - 양승철
 * 
 * 사용법: 
 *   npx tsx scripts/create-admin-yangseungcheol.ts
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const email = 'pd@ustudio.co.kr'
const displayName = '양승철'
const password = 'uslab3300' // 기본 비밀번호 (변경 권장)

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) 유저 조회/생성
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`사용자 목록 조회 실패: ${listError.message}`)
    }

    // 기존 사용자 조회
    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    let userId: string | undefined = existingUser?.id

    if (!userId) {
      // 새 사용자 생성 시도
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: password,
        email_confirm: true, // 이메일 확인 없이 바로 활성화
        app_metadata: { is_super_admin: true }, // JWT 클레임에 슈퍼어드민 권한 추가
        user_metadata: {
          display_name: displayName,
          nickname: displayName,
        }
      })

      if (authError) {
        // 이미 등록된 사용자인 경우, 페이지네이션으로 다시 찾기
        if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
          console.log('ℹ️  사용자가 이미 존재합니다. 사용자 찾는 중...')
          let foundUser = null
          let page = 1
          const perPage = 1000
          
          while (!foundUser && page <= 10) {
            const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
              page,
              perPage,
            })
            
            if (listError) {
              throw new Error(`사용자 목록 조회 실패: ${listError.message}`)
            }
            
            foundUser = usersData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
            
            if (foundUser) {
              userId = foundUser.id
              break
            }
            
            if (!usersData?.users || usersData.users.length < perPage) {
              break
            }
            
            page++
          }
          
          if (!userId) {
            throw new Error('사용자를 찾을 수 없습니다')
          }
        } else {
          throw new Error(`사용자 생성 실패: ${authError.message}`)
        }
      } else if (authData?.user) {
        userId = authData.user.id
        console.log('✅ 관리자 계정 생성:', email)
        console.log('✅ 비밀번호 설정 완료')
      }
    }
    
    if (userId && existingUser) {
      // 기존 사용자 업데이트
      console.log('ℹ️  관리자 계정이 이미 존재합니다:', email)
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: password,
        app_metadata: { is_super_admin: true },
        user_metadata: {
          display_name: displayName,
          nickname: displayName,
        }
      })
      if (updateError) {
        throw new Error(`사용자 업데이트 실패: ${updateError.message}`)
      }
      console.log('✅ 비밀번호 업데이트 완료')
      console.log('✅ JWT app_metadata 동기화 완료')
      console.log('ℹ️  JWT 토큰 갱신을 위해 재로그인이 필요할 수 있습니다')
    } else if (userId && !existingUser) {
      // 새로 찾은 사용자 업데이트
      console.log('ℹ️  기존 사용자를 찾았습니다. 업데이트 중...')
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: password,
        app_metadata: { is_super_admin: true },
        user_metadata: {
          display_name: displayName,
          nickname: displayName,
        }
      })
      if (updateError) {
        throw new Error(`사용자 업데이트 실패: ${updateError.message}`)
      }
      console.log('✅ 사용자 정보 업데이트 완료')
      console.log('✅ 슈퍼어드민 권한 부여 완료')
    }

    // 2) 프로필 확인 및 is_super_admin 설정
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, is_super_admin, display_name')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      throw new Error(`프로필 조회 실패: ${profileError.message}`)
    }

    if (!profile) {
      // 프로필이 없으면 생성
      const { error: createProfileError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          display_name: displayName,
          nickname: displayName,
          is_super_admin: true
        })

      if (createProfileError) {
        throw new Error(`프로필 생성 실패: ${createProfileError.message}`)
      }
      console.log('✅ 프로필 생성 및 슈퍼어드민 권한 부여')
    } else {
      // 프로필 업데이트
      const { error: updateError } = await admin
        .from('profiles')
        .update({ 
          is_super_admin: true,
          display_name: displayName,
          nickname: displayName,
        })
        .eq('id', userId)

      if (updateError) {
        throw new Error(`프로필 업데이트 실패: ${updateError.message}`)
      }
      console.log('✅ 프로필 업데이트 및 슈퍼어드민 권한 부여')
    }

    // 3) 감사 로그 (선택적)
    try {
      await admin.from('audit_logs').insert({
        actor_user_id: userId,
        action: 'CREATE_ADMIN',
        payload: { email, display_name: displayName, created: !existingUser }
      })
    } catch (auditError) {
      // 감사 로그 실패는 무시 (테이블이 없을 수 있음)
      console.warn('⚠️  감사 로그 기록 실패 (무시됨):', auditError)
    }

    console.log('\n✅ 완료!')
    console.log('\n📋 로그인 정보:')
    console.log('1. 이메일:', email)
    console.log('2. 이름:', displayName)
    console.log('3. 비밀번호:', password)
    console.log('4. 권한: 슈퍼어드민')
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
