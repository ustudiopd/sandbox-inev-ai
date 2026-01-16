/**
 * 워트인텔리전트 클라이언트를 UStudio 에이전시에도 연결하는 스크립트
 * UStudio 에이전시 멤버들이 워트인텔리전트 리소스에 접근할 수 있도록 함
 * 
 * 사용법: 
 *   npx tsx scripts/link-wert-to-ustudio.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const wertClientId = '89e22a5f-e9ff-4e3b-959f-0314caa94356'
const wertAgencyId = 'd61ee043-2bad-47b4-a7a2-d5f2a286edaf'

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

    console.log('✅ UStudio 에이전시 찾기:')
    agencies.forEach(agency => {
      console.log(`   - ID: ${agency.id}, 이름: ${agency.name}`)
    })

    // 첫 번째 UStudio 에이전시 사용 (또는 가장 적합한 것 선택)
    const ustudioAgency = agencies[0]
    console.log(`\n📋 사용할 에이전시: ${ustudioAgency.name} (ID: ${ustudioAgency.id})`)

    // 2) 워트인텔리전트 클라이언트 확인
    const { data: wertClient } = await admin
      .from('clients')
      .select('id, name, agency_id')
      .eq('id', wertClientId)
      .single()

    if (!wertClient) {
      throw new Error('워트인텔리전트 클라이언트를 찾을 수 없습니다.')
    }

    console.log('\n📋 워트인텔리전트 클라이언트:')
    console.log(`   - ID: ${wertClient.id}`)
    console.log(`   - 이름: ${wertClient.name}`)
    console.log(`   - 현재 에이전시 ID: ${wertClient.agency_id}`)

    // 3) 워트인텔리전트 클라이언트를 UStudio 에이전시에도 연결
    // 클라이언트는 하나의 에이전시에만 속할 수 있으므로,
    // 대신 UStudio 에이전시 멤버들을 워트인텔리전트 클라이언트 멤버로 추가하거나
    // 워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경하는 방법이 있습니다.
    
    // 하지만 클라이언트는 하나의 에이전시에만 속해야 하므로,
    // 대신 UStudio 에이전시 멤버들을 워트인텔리전트 클라이언트의 멤버로 추가하는 것이 좋습니다.
    
    // 또는 워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경하고,
    // 워트인텔리전트 에이전시를 UStudio로 병합하는 방법도 있습니다.
    
    // 사용자 요구사항에 따라: UStudio 에이전시 멤버들이 워트인텔리전트 리소스에 접근할 수 있어야 함
    // 가장 간단한 방법: 워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경
    
    console.log('\n⚠️  주의: 클라이언트는 하나의 에이전시에만 속할 수 있습니다.')
    console.log('   현재 워트인텔리전트 클라이언트는 워트인텔리전트 에이전시에 속해 있습니다.')
    console.log('   UStudio 에이전시 멤버들이 접근할 수 있도록 하려면:')
    console.log('   1. 워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경')
    console.log('   2. 또는 UStudio 에이전시 멤버들을 워트인텔리전트 클라이언트 멤버로 추가')
    
    // 사용자 확인 없이 자동으로 처리하지 않고, 옵션을 제시
    console.log('\n📝 권장 방법:')
    console.log('   워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경하면')
    console.log('   UStudio 에이전시 멤버들이 자동으로 접근할 수 있습니다.')
    console.log('   (에이전시 멤버는 소속 클라이언트의 리소스에 접근 가능)')
    
    // 자동으로 변경하지 않고, 사용자가 확인할 수 있도록 정보만 출력
    console.log('\n✅ 현재 상태:')
    console.log(`   - 워트인텔리전트 클라이언트: ${wertClient.name}`)
    console.log(`   - 현재 에이전시: ${wertClient.agency_id}`)
    console.log(`   - UStudio 에이전시: ${ustudioAgency.name} (${ustudioAgency.id})`)
    
    // UStudio 에이전시 멤버 목록 확인
    const { data: ustudioMembers } = await admin
      .from('agency_members')
      .select(`
        id,
        role,
        profiles:user_id (
          id,
          email,
          display_name
        )
      `)
      .eq('agency_id', ustudioAgency.id)
      .limit(20)
    
    if (ustudioMembers && ustudioMembers.length > 0) {
      console.log(`\n📋 UStudio 에이전시 멤버 (${ustudioMembers.length}명):`)
      ustudioMembers.forEach((member: any) => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
        console.log(`   - ${profile?.email || 'N/A'} (${profile?.display_name || 'N/A'}) - 역할: ${member.role}`)
      })
    }
    
    console.log('\n💡 다음 단계:')
    console.log('   워트인텔리전트 클라이언트의 agency_id를 UStudio로 변경하려면')
    console.log('   scripts/link-wert-client-to-ustudio-agency.ts 스크립트를 실행하세요.')
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()
