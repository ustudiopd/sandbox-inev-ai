import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkCIDLink() {
  const admin = createAdminSupabase()
  
  const cid = 'KYYV8F87'
  const registrationCampaignId = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98' // 등록 페이지 캠페인 ID
  
  console.log('🔍 CID 링크 확인...\n')
  console.log(`CID: ${cid}`)
  console.log(`등록 캠페인 ID: ${registrationCampaignId}\n`)
  
  // CID로 링크 조회
  const { data: link, error } = await admin
    .from('campaign_link_meta')
    .select('id, cid, name, target_campaign_id, utm_source, utm_medium, utm_campaign, status, client_id')
    .eq('cid', cid)
    .eq('status', 'active')
    .maybeSingle()
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!link) {
    console.log('⚠️ CID로 링크를 찾을 수 없습니다.')
    return
  }
  
  console.log('✅ 링크 정보:')
  console.log(`- 링크 ID: ${link.id}`)
  console.log(`- 이름: ${link.name}`)
  console.log(`- CID: ${link.cid}`)
  console.log(`- 타겟 캠페인 ID: ${link.target_campaign_id || '(없음)'}`)
  console.log(`- 상태: ${link.status}`)
  console.log(`- 클라이언트 ID: ${link.client_id}`)
  console.log(`- UTM Source: ${link.utm_source || '(없음)'}`)
  console.log(`- UTM Medium: ${link.utm_medium || '(없음)'}`)
  console.log(`- UTM Campaign: ${link.utm_campaign || '(없음)'}`)
  console.log('')
  
  // 캠페인 매칭 확인
  if (link.target_campaign_id === registrationCampaignId) {
    console.log('✅ 캠페인 매칭 성공!')
    console.log('   링크의 타겟 캠페인 ID가 등록 캠페인 ID와 일치합니다.')
  } else {
    console.log('⚠️ 캠페인 매칭 실패!')
    console.log(`   링크의 타겟 캠페인 ID: ${link.target_campaign_id}`)
    console.log(`   등록 캠페인 ID: ${registrationCampaignId}`)
    console.log('')
    console.log('해결 방법:')
    console.log('1. 등록 캠페인을 타겟으로 하는 새로운 링크를 만들거나')
    console.log('2. 기존 링크의 target_campaign_id를 등록 캠페인 ID로 업데이트')
  }
}

checkCIDLink().catch(console.error)
