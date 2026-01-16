/**
 * 워트인텔리전트 클라이언트를 UStudio 에이전시에 연결하는 스크립트
 * UStudio 에이전시 멤버들이 워트인텔리전트 리소스에 접근할 수 있도록 함
 * 
 * 사용법: 
 *   npx tsx scripts/link-wert-client-to-ustudio-agency.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const wertClientId = '89e22a5f-e9ff-4e3b-959f-0314caa94356'

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

    // 첫 번째 UStudio 에이전시 사용
    const ustudioAgency = agencies[0]
    console.log(`✅ UStudio 에이전시 찾기: ${ustudioAgency.name} (ID: ${ustudioAgency.id})`)

    // 2) 워트인텔리전트 클라이언트 확인
    const { data: wertClient } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', wertClientId)
      .single()

    if (!wertClient) {
      throw new Error('워트인텔리전트 클라이언트를 찾을 수 없습니다.')
    }

    console.log(`\n📋 워트인텔리전트 클라이언트: ${wertClient.name}`)
    console.log(`   현재 에이전시 ID: ${wertClient.agency_id}`)

    // 3) 워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경
    if (wertClient.agency_id !== ustudioAgency.id) {
      console.log(`\n🔄 에이전시 변경: ${wertClient.agency_id} → ${ustudioAgency.id}`)
      
      const { error: updateError } = await admin
        .from('clients')
        .update({ agency_id: ustudioAgency.id })
        .eq('id', wertClientId)

      if (updateError) {
        throw new Error(`클라이언트 업데이트 실패: ${updateError.message}`)
      }

      console.log('✅ 워트인텔리전트 클라이언트를 UStudio 에이전시에 연결했습니다')
      
      // 4) 워트인텔리전트 클라이언트의 웨비나와 이벤트 캠페인도 업데이트
      const { error: webinarUpdateError } = await admin
        .from('webinars')
        .update({ agency_id: ustudioAgency.id })
        .eq('client_id', wertClientId)

      if (webinarUpdateError) {
        console.warn('⚠️  웨비나 agency_id 업데이트 실패:', webinarUpdateError.message)
      } else {
        console.log('✅ 워트인텔리전트 웨비나의 agency_id를 업데이트했습니다')
      }

      const { error: campaignUpdateError } = await admin
        .from('event_survey_campaigns')
        .update({ agency_id: ustudioAgency.id })
        .eq('client_id', wertClientId)

      if (campaignUpdateError) {
        console.warn('⚠️  이벤트 캠페인 agency_id 업데이트 실패:', campaignUpdateError.message)
      } else {
        console.log('✅ 워트인텔리전트 이벤트 캠페인의 agency_id를 업데이트했습니다')
      }

      // 5) 감사 로그
      try {
        await admin.from('audit_logs').insert({
          agency_id: ustudioAgency.id,
          client_id: wertClientId,
          action: 'LINK_WERT_TO_USTUDIO',
          payload: { 
            oldAgencyId: wertClient.agency_id,
            newAgencyId: ustudioAgency.id
          }
        })
      } catch (auditError) {
        console.warn('⚠️  감사 로그 기록 실패 (무시됨):', auditError)
      }

      console.log('\n✅ 완료!')
      console.log('\n📋 변경 사항:')
      console.log(`   - 워트인텔리전트 클라이언트가 UStudio 에이전시에 연결되었습니다`)
      console.log(`   - UStudio 에이전시 멤버들이 워트인텔리전트 리소스에 접근할 수 있습니다`)
    } else {
      console.log('\nℹ️  워트인텔리전트 클라이언트가 이미 UStudio 에이전시에 연결되어 있습니다')
    }

  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
