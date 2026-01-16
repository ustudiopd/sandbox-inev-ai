/**
 * 워트인텔리전트 클라이언트 계정 생성 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/create-wert-client.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const email = 'eventflow@wert.co.kr'
const password = 'eventflow1@'
const clientName = '워트인텔리전트'
const agencyName = '워트인텔리전트'
const displayName = '워트인텔리전트'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) 사용자 계정 생성 또는 조회
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
      console.log('✅ 사용자 계정 생성:', email)
    } else {
      console.log('ℹ️  사용자 계정이 이미 존재합니다:', email)
      // 비밀번호 업데이트
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: password,
      })
      if (updateError) {
        throw new Error(`비밀번호 업데이트 실패: ${updateError.message}`)
      }
      console.log('✅ 비밀번호 업데이트 완료')
    }

    // 2) 프로필 확인 및 생성
    let { data: profile } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      // 프로필 생성
      const { error: createProfileError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          display_name: displayName,
        })

      if (createProfileError) {
        throw new Error(`프로필 생성 실패: ${createProfileError.message}`)
      }
      console.log('✅ 프로필 생성 완료')
      
      // 다시 조회
      const { data: newProfile } = await admin
        .from('profiles')
        .select('id, email, display_name')
        .eq('id', userId)
        .single()
      profile = newProfile
    } else {
      // 프로필 업데이트
      await admin
        .from('profiles')
        .update({
          email: email,
          display_name: displayName,
        })
        .eq('id', userId)
      console.log('✅ 프로필 업데이트 완료')
    }

    // 3) 워트인텔리전트 에이전시 찾기 또는 생성
    let { data: agency } = await admin
      .from('agencies')
      .select('id, name')
      .ilike('name', `%${agencyName}%`)
      .maybeSingle()

    let agencyId: string

    if (!agency) {
      // 에이전시 생성
      const { data: newAgency, error: agencyError } = await admin
        .from('agencies')
        .insert({ name: agencyName })
        .select()
        .single()

      if (agencyError) {
        throw new Error(`에이전시 생성 실패: ${agencyError.message}`)
      }

      agencyId = newAgency.id
      console.log('✅ 에이전시 생성:', agencyName)

      // 기본 플랜 할당
      await admin
        .from('subscriptions')
        .insert({
          agency_id: agencyId,
          plan_code: 'free',
          status: 'active'
        })
    } else {
      agencyId = agency.id
      console.log('ℹ️  에이전시가 이미 존재합니다:', agency.name)
    }

    // 4) 클라이언트 찾기 또는 생성
    let { data: client } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('agency_id', agencyId)
      .ilike('name', `%${clientName}%`)
      .maybeSingle()

    let clientId: string

    if (!client) {
      // 클라이언트 생성
      const { data: newClient, error: clientError } = await admin
        .from('clients')
        .insert({
          agency_id: agencyId,
          name: clientName,
        })
        .select()
        .single()

      if (clientError) {
        throw new Error(`클라이언트 생성 실패: ${clientError.message}`)
      }

      clientId = newClient.id
      console.log('✅ 클라이언트 생성:', clientName)
    } else {
      clientId = client.id
      console.log('ℹ️  클라이언트가 이미 존재합니다:', client.name)
    }

    // 5) 클라이언트 멤버십 확인 및 생성
    const { data: existingMember } = await admin
      .from('client_members')
      .select('id, role')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingMember) {
      // 클라이언트 멤버십 생성 (owner 역할)
      const { error: memberError } = await admin
        .from('client_members')
        .insert({
          client_id: clientId,
          user_id: userId,
          role: 'owner'
        })

      if (memberError) {
        throw new Error(`클라이언트 멤버십 생성 실패: ${memberError.message}`)
      }
      console.log('✅ 클라이언트 멤버십 생성 (owner 역할)')
    } else {
      console.log('ℹ️  클라이언트 멤버십이 이미 존재합니다 (역할:', existingMember.role, ')')
      // 역할을 owner로 업데이트
      await admin
        .from('client_members')
        .update({ role: 'owner' })
        .eq('client_id', clientId)
        .eq('user_id', userId)
      console.log('✅ 클라이언트 멤버십 역할을 owner로 업데이트')
    }

    // 6) 감사 로그
    try {
      await admin.from('audit_logs').insert({
        actor_user_id: userId,
        agency_id: agencyId,
        client_id: clientId,
        action: 'CLIENT_CREATE_SCRIPT',
        payload: { email, clientName, agencyName }
      })
    } catch (auditError) {
      console.warn('⚠️  감사 로그 기록 실패 (무시됨):', auditError)
    }

    console.log('\n✅ 완료!')
    console.log('\n📋 계정 정보:')
    console.log('1. 이메일:', email)
    console.log('2. 비밀번호:', password)
    console.log('3. 클라이언트:', clientName)
    console.log('4. 에이전시:', agencyName)
    console.log('5. 역할: owner')
    console.log('\n📝 클라이언트 ID:', clientId)
    console.log('📝 에이전시 ID:', agencyId)
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
