/**
 * 빈 워트인텔리전트 에이전시와 클라이언트 삭제 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const emptyWertAgencyId = 'd61ee043-2bad-47b4-a7a2-d5f2a286edaf'
const emptyWertClientId = 'c60b0afb-ac59-452c-94c0-841dd89913dc'
const activeWertClientId = '89e22a5f-e9ff-4e3b-959f-0314caa94356'

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) 빈 워트인텔리전트 클라이언트 확인 및 삭제
    console.log('🔍 빈 워트인텔리전트 클라이언트 확인...')
    const { data: emptyClient } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', emptyWertClientId)
      .maybeSingle()

    if (emptyClient) {
      // 클라이언트 멤버 확인
      const { data: members } = await admin
        .from('client_members')
        .select('id')
        .eq('client_id', emptyWertClientId)
        .limit(1)

      // 웨비나 확인
      const { data: webinars } = await admin
        .from('webinars')
        .select('id')
        .eq('client_id', emptyWertClientId)
        .limit(1)

      // 캠페인 확인
      const { data: campaigns } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('client_id', emptyWertClientId)
        .limit(1)

      if ((!members || members.length === 0) && (!webinars || webinars.length === 0) && (!campaigns || campaigns.length === 0)) {
        console.log(`✅ 빈 클라이언트 확인: ${emptyClient.name} (${emptyClient.id})`)
        
        // 클라이언트 멤버 삭제 (혹시 있을 경우)
        await admin
          .from('client_members')
          .delete()
          .eq('client_id', emptyWertClientId)
        
        // 클라이언트 삭제
        const { error: deleteError } = await admin
          .from('clients')
          .delete()
          .eq('id', emptyWertClientId)

        if (deleteError) {
          throw new Error(`클라이언트 삭제 실패: ${deleteError.message}`)
        }

        console.log('✅ 빈 워트인텔리전트 클라이언트 삭제 완료')
      } else {
        console.log('⚠️  클라이언트가 비어있지 않습니다. 삭제하지 않습니다.')
      }
    } else {
      console.log('ℹ️  빈 클라이언트를 찾을 수 없습니다 (이미 삭제되었을 수 있음)')
    }

    // 2) 빈 워트인텔리전트 에이전시 확인 및 삭제
    console.log('\n🔍 빈 워트인텔리전트 에이전시 확인...')
    const { data: emptyAgency } = await admin
      .from('agencies')
      .select('id, name')
      .eq('id', emptyWertAgencyId)
      .maybeSingle()

    if (emptyAgency) {
      // 에이전시의 클라이언트 확인
      const { data: clients } = await admin
        .from('clients')
        .select('id')
        .eq('agency_id', emptyWertAgencyId)
        .limit(1)

      // 에이전시 멤버 확인
      const { data: members } = await admin
        .from('agency_members')
        .select('id')
        .eq('agency_id', emptyWertAgencyId)
        .limit(1)

      if ((!clients || clients.length === 0) && (!members || members.length === 0)) {
        console.log(`✅ 빈 에이전시 확인: ${emptyAgency.name} (${emptyAgency.id})`)
        
        // 구독 정보 삭제 (혹시 있을 경우)
        await admin
          .from('subscriptions')
          .delete()
          .eq('agency_id', emptyWertAgencyId)
        
        // 에이전시 멤버 삭제 (혹시 있을 경우)
        await admin
          .from('agency_members')
          .delete()
          .eq('agency_id', emptyWertAgencyId)
        
        // 에이전시 삭제
        const { error: deleteError } = await admin
          .from('agencies')
          .delete()
          .eq('id', emptyWertAgencyId)

        if (deleteError) {
          throw new Error(`에이전시 삭제 실패: ${deleteError.message}`)
        }

        console.log('✅ 빈 워트인텔리전트 에이전시 삭제 완료')
      } else {
        console.log('⚠️  에이전시가 비어있지 않습니다. 삭제하지 않습니다.')
        if (clients && clients.length > 0) {
          console.log(`   - 클라이언트 ${clients.length}개 존재`)
        }
        if (members && members.length > 0) {
          console.log(`   - 멤버 ${members.length}명 존재`)
        }
      }
    } else {
      console.log('ℹ️  빈 에이전시를 찾을 수 없습니다 (이미 삭제되었을 수 있음)')
    }

    // 3) 감사 로그
    try {
      await admin.from('audit_logs').insert({
        agency_id: 'b48534de-ec75-4473-8d68-9e2e3aae0ab1', // UStudio
        client_id: activeWertClientId,
        action: 'REMOVE_EMPTY_WERT',
        payload: { 
          deletedAgency: emptyWertAgencyId,
          deletedClient: emptyWertClientId
        }
      })
    } catch (auditError) {
      console.warn('⚠️  감사 로그 기록 실패 (무시됨):', auditError)
    }

    console.log('\n✅ 완료!')
    console.log('\n📋 삭제된 항목:')
    console.log('   - 빈 워트인텔리전트 클라이언트')
    console.log('   - 빈 워트인텔리전트 에이전시')
    console.log('\n📋 남아있는 항목:')
    console.log(`   - 워트인텔리전트 클라이언트 (${activeWertClientId}) - UStudio 에이전시 소속`)

  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
