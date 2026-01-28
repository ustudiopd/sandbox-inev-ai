/**
 * 워트인텔리전트 클라이언트 계정 수정 스크립트
 * 
 * 1. 워트인텔리전트 클라이언트를 UStudio 에이전시에 연결
 * 2. eventflow-ops@wert.co.kr, eventflow@wert.co.kr 계정이 클라이언트 계정만 가지도록 확인
 *    (에이전시 멤버십 제거)
 * 
 * 사용법: 
 *   npx tsx scripts/fix-wert-client-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const clientEmails = ['eventflow-ops@wert.co.kr', 'eventflow@wert.co.kr']
const clientName = '워트인텔리전트'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) UStudio 에이전시 찾기
    const { data: agencies } = await admin
      .from('agencies')
      .select('id, name')
      .or('name.ilike.%UStudio%,name.ilike.%ustudio%,name.ilike.%U-Studio%')
      .limit(10)

    if (!agencies || agencies.length === 0) {
      throw new Error('UStudio 에이전시를 찾을 수 없습니다.')
    }

    const ustudioAgency = agencies[0]
    console.log(`✅ UStudio 에이전시 찾기: ${ustudioAgency.name} (ID: ${ustudioAgency.id})`)

    // 2) 워트인텔리전트 클라이언트 찾기
    const { data: wertClients } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)

    if (!wertClients || wertClients.length === 0) {
      throw new Error('워트인텔리전트 클라이언트를 찾을 수 없습니다.')
    }

    // 가장 최근에 생성된 워트인텔리전트 클라이언트 사용 (또는 이름이 정확히 일치하는 것)
    const wertClient = wertClients.find(c => c.name === clientName) || wertClients[0]
    console.log(`\n📋 워트인텔리전트 클라이언트: ${wertClient.name} (ID: ${wertClient.id})`)
    console.log(`   현재 에이전시 ID: ${wertClient.agency_id}`)

    // 3) 워트인텔리전트 클라이언트를 UStudio 에이전시에 연결
    if (wertClient.agency_id !== ustudioAgency.id) {
      console.log(`\n🔄 에이전시 변경: ${wertClient.agency_id} → ${ustudioAgency.id}`)
      
      const { error: updateError } = await admin
        .from('clients')
        .update({ agency_id: ustudioAgency.id })
        .eq('id', wertClient.id)

      if (updateError) {
        throw new Error(`클라이언트 업데이트 실패: ${updateError.message}`)
      }

      console.log('✅ 워트인텔리전트 클라이언트를 UStudio 에이전시에 연결했습니다')
    } else {
      console.log('ℹ️  워트인텔리전트 클라이언트가 이미 UStudio 에이전시에 연결되어 있습니다')
    }

    // 4) 각 이메일 계정 확인 및 수정
    for (const email of clientEmails) {
      console.log(`\n📧 계정 확인: ${email}`)
      
      // 사용자 찾기
      const { data: { users } } = await admin.auth.admin.listUsers()
      const user = users?.find(u => u.email === email)
      
      if (!user) {
        console.log(`   ⚠️  사용자를 찾을 수 없습니다: ${email}`)
        continue
      }

      console.log(`   ✅ 사용자 ID: ${user.id}`)

      // 프로필 확인
      const { data: profile } = await admin
        .from('profiles')
        .select('id, email, display_name')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        console.log(`   ⚠️  프로필이 없습니다. 생성합니다...`)
        await admin
          .from('profiles')
          .insert({
            id: user.id,
            email: email,
            display_name: email.split('@')[0],
          })
        console.log(`   ✅ 프로필 생성 완료`)
      }

      // 클라이언트 멤버십 확인
      const { data: clientMember } = await admin
        .from('client_members')
        .select('id, role, client_id')
        .eq('user_id', user.id)
        .eq('client_id', wertClient.id)
        .maybeSingle()

      if (!clientMember) {
        console.log(`   ⚠️  클라이언트 멤버십이 없습니다. 생성합니다...`)
        await admin
          .from('client_members')
          .insert({
            client_id: wertClient.id,
            user_id: user.id,
            role: 'owner'
          })
        console.log(`   ✅ 클라이언트 멤버십 생성 완료 (owner)`)
      } else {
        console.log(`   ✅ 클라이언트 멤버십 존재 (역할: ${clientMember.role})`)
      }

      // 에이전시 멤버십 확인 및 제거
      const { data: agencyMembers } = await admin
        .from('agency_members')
        .select('id, role, agency_id')
        .eq('user_id', user.id)

      if (agencyMembers && agencyMembers.length > 0) {
        console.log(`   ⚠️  에이전시 멤버십이 ${agencyMembers.length}개 발견되었습니다. 제거합니다...`)
        for (const member of agencyMembers) {
          await admin
            .from('agency_members')
            .delete()
            .eq('id', member.id)
          console.log(`   ✅ 에이전시 멤버십 제거: ${member.agency_id} (역할: ${member.role})`)
        }
      } else {
        console.log(`   ✅ 에이전시 멤버십 없음 (올바른 상태)`)
      }
    }

    console.log('\n✅ 완료!')
    console.log('\n📋 최종 상태:')
    console.log(`1. 워트인텔리전트 클라이언트: ${wertClient.name}`)
    console.log(`2. 에이전시: ${ustudioAgency.name}`)
    console.log(`3. 클라이언트 계정: ${clientEmails.join(', ')}`)
    console.log(`4. 에이전시 멤버십: 없음 (클라이언트 계정만)`)
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    console.error(error)
    process.exit(1)
  }
})()
