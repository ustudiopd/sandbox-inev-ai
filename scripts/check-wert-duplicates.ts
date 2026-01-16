/**
 * 워트인텔리전트 중복 항목 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 1) 워트인텔리전트 에이전시 찾기
    const { data: wertAgencies } = await admin
      .from('agencies')
      .select('id, name, created_at')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)

    console.log('🔍 워트인텔리전트 에이전시:')
    if (wertAgencies && wertAgencies.length > 0) {
      wertAgencies.forEach(agency => {
        console.log(`   - ID: ${agency.id}`)
        console.log(`     이름: ${agency.name}`)
        console.log(`     생성일: ${agency.created_at}`)
        
        // 해당 에이전시의 클라이언트 확인
        admin
          .from('clients')
          .select('id, name, agency_id')
          .eq('agency_id', agency.id)
          .then(({ data: clients }) => {
            if (clients && clients.length > 0) {
              console.log(`     클라이언트 (${clients.length}개):`)
              clients.forEach(client => {
                console.log(`       - ${client.name} (${client.id})`)
              })
            } else {
              console.log(`     클라이언트: 없음 (빈 에이전시)`)
            }
          })
      })
    } else {
      console.log('   없음')
    }

    // 2) 워트인텔리전트 클라이언트 찾기
    const { data: wertClients } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .or('name.ilike.%워트%,name.ilike.%Wert%,name.ilike.%wert%')
      .limit(10)

    console.log('\n🔍 워트인텔리전트 클라이언트:')
    if (wertClients && wertClients.length > 0) {
      wertClients.forEach(client => {
        console.log(`   - ID: ${client.id}`)
        console.log(`     이름: ${client.name}`)
        console.log(`     에이전시 ID: ${client.agency_id}`)
        
        // 해당 클라이언트의 웨비나와 캠페인 확인
        Promise.all([
          admin.from('webinars').select('id, title').eq('client_id', client.id).limit(5),
          admin.from('event_survey_campaigns').select('id, title').eq('client_id', client.id).limit(5)
        ]).then(([webinars, campaigns]) => {
          const webinarCount = webinars.data?.length || 0
          const campaignCount = campaigns.data?.length || 0
          console.log(`     웨비나: ${webinarCount}개, 캠페인: ${campaignCount}개`)
          if (webinarCount === 0 && campaignCount === 0) {
            console.log(`     ⚠️  빈 클라이언트 (리소스 없음)`)
          }
        })
      })
    } else {
      console.log('   없음')
    }

    // 3) UStudio 에이전시 확인
    const { data: ustudioAgencies } = await admin
      .from('agencies')
      .select('id, name')
      .or('name.ilike.%UStudio%,name.ilike.%ustudio%')
      .limit(5)

    console.log('\n🔍 UStudio 에이전시:')
    if (ustudioAgencies && ustudioAgencies.length > 0) {
      ustudioAgencies.forEach(agency => {
        console.log(`   - ID: ${agency.id}, 이름: ${agency.name}`)
        
        // UStudio 에이전시의 클라이언트 확인
        admin
          .from('clients')
          .select('id, name, agency_id')
          .eq('agency_id', agency.id)
          .then(({ data: clients }) => {
            if (clients && clients.length > 0) {
              console.log(`     클라이언트 (${clients.length}개):`)
              clients.forEach(client => {
                console.log(`       - ${client.name} (${client.id})`)
              })
            } else {
              console.log(`     클라이언트: 없음`)
            }
          })
      })
    }

    await new Promise(resolve => setTimeout(resolve, 2000)) // 비동기 결과 대기

  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
