import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { generateCID } from '@/lib/utils/cid'

dotenv.config({ path: '.env.local' })

async function createRegistrationCIDLink() {
  const admin = createAdminSupabase()
  
  const clientId = 'a556c562-03c3-4988-8b88-ae0a96648514' // 모두의특강
  const campaignId = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98' // 등록 페이지 캠페인 ID
  const cid = generateCID()
  
  console.log('🔍 등록 캠페인 CID 링크 생성...\n')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`CID: ${cid}\n`)
  
  // 클라이언트 정보 조회
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name, agency_id')
    .eq('id', clientId)
    .single()
  
  if (clientError || !client) {
    console.error('❌ 클라이언트를 찾을 수 없습니다:', clientError)
    return
  }
  
  console.log(`✅ 클라이언트 확인: ${client.name}`)
  console.log(`   Agency ID: ${client.agency_id}\n`)
  
  // 캠페인 정보 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, type')
    .eq('id', campaignId)
    .single()
  
  if (campaignError || !campaign) {
    console.error('❌ 캠페인을 찾을 수 없습니다:', campaignError)
    return
  }
  
  console.log(`✅ 캠페인 확인: ${campaign.title} (${campaign.type})\n`)
  
  // 링크 생성
  console.log('📝 링크 생성 중...')
  const { data: link, error: linkError } = await admin
    .from('campaign_link_meta')
    .insert({
      client_id: clientId,
      agency_id: client.agency_id,
      name: `등록 페이지 테스트 링크 ${new Date().toISOString().split('T')[0]}`,
      cid: cid,
      target_campaign_id: campaignId,
      utm_source: 'test_cid_reg',
      utm_medium: 'email',
      utm_campaign: 'cid_reg_test',
      utm_term: 'test_term',
      utm_content: 'test_content',
      status: 'active',
    })
    .select()
    .single()
  
  if (linkError) {
    console.error('❌ 링크 생성 실패:', linkError)
    return
  }
  
  console.log('✅ 링크 생성 성공!\n')
  console.log('📋 생성된 링크 정보:')
  console.log(`- 링크 ID: ${link.id}`)
  console.log(`- 이름: ${link.name}`)
  console.log(`- CID: ${link.cid}`)
  console.log(`- 타겟 캠페인 ID: ${link.target_campaign_id}`)
  console.log(`- UTM Source: ${link.utm_source}`)
  console.log(`- UTM Medium: ${link.utm_medium}`)
  console.log(`- UTM Campaign: ${link.utm_campaign}\n`)
  
  console.log('🔗 테스트 URL:')
  console.log(`   http://localhost:3000/event/test-registration-modu/register?cid=${cid}\n`)
  
  console.log('✅ 완료!')
}

createRegistrationCIDLink().catch(console.error)
