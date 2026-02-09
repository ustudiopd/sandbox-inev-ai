/**
 * 워트인텔리전트 클라이언트 관리자 계정 추가 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/add-wert-admin.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const email = 'eventflow@wert.co.kr'
const password = 'eventflow1@'
const clientName = '워트인텔리전트'
const displayName = '워트인텔리전트 관리자'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) 워트인텔리전트 클라이언트 찾기
    console.log('🔍 워트인텔리전트 클라이언트 찾기...\n')
    
    const { data: wertClients, error: clientError } = await admin
      .from('clients')
      .select('id, name')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)

    if (clientError) {
      throw new Error(`클라이언트 조회 실패: ${clientError.message}`)
    }

    if (!wertClients || wertClients.length === 0) {
      throw new Error('워트인텔리전트 클라이언트를 찾을 수 없습니다.')
    }

    // 가장 정확한 이름 매칭 또는 첫 번째 클라이언트 사용
    const wertClient = wertClients.find(c => c.name === clientName) || wertClients[0]
    console.log(`✅ 클라이언트 찾음: ${wertClient.name} (ID: ${wertClient.id})`)

    // 2) 사용자 계정 생성 또는 조회
    console.log(`\n📧 사용자 계정 처리: ${email}`)
    
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`사용자 목록 조회 실패: ${listError.message}`)
    }

    const existingUser = users?.find(u => u.email === email)
    let userId: string | undefined = existingUser?.id

    if (!userId) {
      // 새 사용자 생성
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          role: 'client',
        }
      })

      if (authError) {
        throw new Error(`사용자 생성 실패: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('사용자 생성 실패: user 데이터 없음')
      }

      userId = authData.user.id
      console.log('✅ 사용자 계정 생성 완료')
    } else {
      console.log('ℹ️  사용자 계정이 이미 존재합니다')
      // 비밀번호 업데이트
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: password,
      })
      if (updateError) {
        console.warn(`⚠️  비밀번호 업데이트 실패 (무시됨): ${updateError.message}`)
      } else {
        console.log('✅ 비밀번호 업데이트 완료')
      }
    }

    // 3) 프로필 확인 및 생성 (profiles 테이블이 있는 경우에만)
    console.log(`\n👤 프로필 확인 및 생성...`)
    
    try {
      let { data: profile, error: profileCheckError } = await admin
        .from('profiles')
        .select('id, email, display_name')
        .eq('id', userId)
        .maybeSingle()

      // profiles 테이블이 없는 경우 (inev 스키마 등) 무시
      if (profileCheckError && profileCheckError.message.includes('Could not find the table')) {
        console.log('ℹ️  profiles 테이블이 없습니다 (inev 스키마). 프로필 생성을 건너뜁니다.')
      } else if (profileCheckError) {
        throw new Error(`프로필 조회 실패: ${profileCheckError.message}`)
      } else if (!profile) {
        // 프로필 생성
        const { error: createProfileError } = await admin
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            display_name: displayName,
          })

        if (createProfileError) {
          // 테이블이 없는 경우 무시
          if (createProfileError.message.includes('Could not find the table')) {
            console.log('ℹ️  profiles 테이블이 없습니다. 프로필 생성을 건너뜁니다.')
          } else {
            throw new Error(`프로필 생성 실패: ${createProfileError.message}`)
          }
        } else {
          console.log('✅ 프로필 생성 완료')
        }
      } else {
        // 프로필 업데이트
        const { error: updateProfileError } = await admin
          .from('profiles')
          .update({
            email: email,
            display_name: displayName,
          })
          .eq('id', userId)
        
        if (updateProfileError) {
          if (updateProfileError.message.includes('Could not find the table')) {
            console.log('ℹ️  profiles 테이블이 없습니다. 프로필 업데이트를 건너뜁니다.')
          } else {
            throw new Error(`프로필 업데이트 실패: ${updateProfileError.message}`)
          }
        } else {
          console.log('✅ 프로필 업데이트 완료')
        }
      }
    } catch (error: any) {
      // profiles 테이블 관련 오류는 무시 (inev 스키마)
      if (error.message && error.message.includes('Could not find the table')) {
        console.log('ℹ️  profiles 테이블이 없습니다 (inev 스키마). 프로필 생성을 건너뜁니다.')
      } else {
        throw error
      }
    }

    // 4) 클라이언트 멤버십 확인 및 생성
    console.log(`\n🔗 클라이언트 멤버십 확인 및 생성...`)
    
    const { data: existingMember } = await admin
      .from('client_members')
      .select('id, role')
      .eq('client_id', wertClient.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingMember) {
      // 클라이언트 멤버십 생성 (owner 역할)
      const { error: memberError } = await admin
        .from('client_members')
        .insert({
          client_id: wertClient.id,
          user_id: userId,
          role: 'owner'
        })

      if (memberError) {
        throw new Error(`클라이언트 멤버십 생성 실패: ${memberError.message}`)
      }
      console.log('✅ 클라이언트 멤버십 생성 완료 (owner 역할)')
    } else {
      console.log(`ℹ️  클라이언트 멤버십이 이미 존재합니다 (역할: ${existingMember.role})`)
      // 역할을 owner로 업데이트
      const { error: updateRoleError } = await admin
        .from('client_members')
        .update({ role: 'owner' })
        .eq('client_id', wertClient.id)
        .eq('user_id', userId)
      
      if (updateRoleError) {
        console.warn(`⚠️  역할 업데이트 실패 (무시됨): ${updateRoleError.message}`)
      } else {
        console.log('✅ 클라이언트 멤버십 역할을 owner로 업데이트 완료')
      }
    }

    // 5) 에이전시 멤버십 확인 (있으면 제거 - 클라이언트 계정만 유지)
    // inev 스키마에는 agency_members 테이블이 없을 수 있으므로 선택적으로 처리
    console.log(`\n🔍 에이전시 멤버십 확인...`)
    
    try {
      const { data: agencyMembers, error: agencyCheckError } = await admin
        .from('agency_members')
        .select('id, role, agency_id')
        .eq('user_id', userId)

      // agency_members 테이블이 없는 경우 (inev 스키마) 무시
      if (agencyCheckError && agencyCheckError.message.includes('Could not find the table')) {
        console.log('ℹ️  agency_members 테이블이 없습니다 (inev 스키마). 에이전시 멤버십 확인을 건너뜁니다.')
      } else if (agencyCheckError) {
        throw new Error(`에이전시 멤버십 조회 실패: ${agencyCheckError.message}`)
      } else if (agencyMembers && agencyMembers.length > 0) {
        console.log(`⚠️  에이전시 멤버십이 ${agencyMembers.length}개 발견되었습니다. 제거합니다...`)
        for (const member of agencyMembers) {
          const { error: deleteError } = await admin
            .from('agency_members')
            .delete()
            .eq('id', member.id)
          
          if (deleteError) {
            console.warn(`⚠️  에이전시 멤버십 제거 실패 (무시됨): ${deleteError.message}`)
          } else {
            console.log(`✅ 에이전시 멤버십 제거: ${member.agency_id} (역할: ${member.role})`)
          }
        }
      } else {
        console.log('✅ 에이전시 멤버십 없음 (올바른 상태)')
      }
    } catch (error: any) {
      // agency_members 테이블 관련 오류는 무시 (inev 스키마)
      if (error.message && error.message.includes('Could not find the table')) {
        console.log('ℹ️  agency_members 테이블이 없습니다 (inev 스키마). 에이전시 멤버십 확인을 건너뜁니다.')
      } else {
        throw error
      }
    }

    console.log('\n✅ 완료!')
    console.log('\n📋 계정 정보:')
    console.log('1. 이메일:', email)
    console.log('2. 비밀번호:', password)
    console.log('3. 클라이언트:', wertClient.name)
    console.log('4. 역할: owner')
    console.log('\n📝 클라이언트 ID:', wertClient.id)
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
})()
