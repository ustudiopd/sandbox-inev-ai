import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { generateCID } from '@/lib/utils/cid'

dotenv.config({ path: '.env.local' })

async function createTestCampaignLink() {
  const admin = createAdminSupabase()
  
  const clientId = 'a556c562-03c3-4988-8b88-ae0a96648514' // 모두의특강
  const campaignId = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6' // Test 설문조사 복사본
  
  console.log('🔧 테스트용 캠페인 링크 생성...\n')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}\n`)
  
  // 테스트용 cid 생성 (8자리 A-Z0-9)
  const cid = generateCID()
  
  console.log(`생성할 CID: ${cid}\n`)
  
  // 캠페인 링크 생성
  const insertData: any = {
    client_id: clientId,
    name: `테스트 CID 링크 ${new Date().toISOString().slice(0, 10)}`,
    target_campaign_id: campaignId,
    cid: cid,
    utm_source: 'test_cid',
    utm_medium: 'email',
    utm_campaign: 'cid_test',
    utm_term: 'test_term',
    utm_content: 'test_content',
    status: 'active',
  }
  
  // target_type이 있으면 추가 (마이그레이션 상태에 따라 다를 수 있음)
  const { data: link, error } = await admin
    .from('campaign_link_meta')
    .insert(insertData)
    .select('id, cid, utm_source, utm_medium, utm_campaign')
    .single()
  
  if (error) {
    console.error('❌ 생성 실패:', error)
    return
  }
  
  console.log('✅ 캠페인 링크 생성 완료!\n')
  console.log(`ID: ${link.id}`)
  console.log(`CID: ${link.cid}`)
  console.log(`UTM Source: ${link.utm_source}`)
  console.log(`UTM Medium: ${link.utm_medium}`)
  console.log(`UTM Campaign: ${link.utm_campaign}\n`)
  
  console.log('📋 테스트 URL:')
  console.log(`  CID만: http://localhost:3000/event/test-survey-copy-modu?cid=${link.cid}`)
  console.log(`  CID + UTM (URL 우선): http://localhost:3000/event/test-survey-copy-modu?cid=${link.cid}&utm_source=test&utm_medium=email&utm_campaign=modu_test`)
  console.log(`\n💡 예상 동작:`)
  console.log(`  - CID만: 링크의 UTM이 사용됨 (test_cid, email, cid_test)`)
  console.log(`  - CID + UTM: URL의 UTM이 우선됨 (test, email, modu_test)`)
  console.log(`  - marketing_campaign_link_id: ${link.id}가 저장되어야 함`)
}

createTestCampaignLink().catch(console.error)
