import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkLatestEntryDetails() {
  const admin = createAdminSupabase()
  
  const campaignId = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6'
  
  console.log('🔍 최신 항목 상세 확인...\n')
  
  // 최신 항목 1개만 조회
  const { data: entry, error } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!entry) {
    console.log('⚠️ 항목이 없습니다.')
    return
  }
  
  console.log('📋 최신 항목 상세:')
  console.log(`이름: ${entry.name}`)
  console.log(`전화번호: ${entry.phone_norm}`)
  console.log(`생성일: ${entry.created_at}`)
  console.log(`\nUTM 정보:`)
  console.log(`- utm_source: ${entry.utm_source || '(없음)'}`)
  console.log(`- utm_medium: ${entry.utm_medium || '(없음)'}`)
  console.log(`- utm_campaign: ${entry.utm_campaign || '(없음)'}`)
  console.log(`- utm_term: ${entry.utm_term || '(없음)'}`)
  console.log(`- utm_content: ${entry.utm_content || '(없음)'}`)
  console.log(`\n링크 정보:`)
  console.log(`- marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '(없음)'}`)
  
  // 링크 ID가 있으면 링크 정보 조회
  if (entry.marketing_campaign_link_id) {
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('id, cid, name, utm_source, utm_medium, utm_campaign')
      .eq('id', entry.marketing_campaign_link_id)
      .single()
    
    if (link) {
      console.log(`\n🔗 연결된 링크 정보:`)
      console.log(`- 이름: ${link.name}`)
      console.log(`- CID: ${link.cid}`)
      console.log(`- 링크의 UTM Source: ${link.utm_source}`)
      console.log(`- 링크의 UTM Medium: ${link.utm_medium}`)
      console.log(`- 링크의 UTM Campaign: ${link.utm_campaign}`)
    }
  }
}

checkLatestEntryDetails().catch(console.error)
