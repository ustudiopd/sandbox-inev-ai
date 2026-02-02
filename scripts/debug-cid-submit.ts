import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeCID } from '@/lib/utils/cid'

dotenv.config({ path: '.env.local' })

async function debugCIDSubmit() {
  const admin = createAdminSupabase()
  
  const campaignId = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6'
  const testCid = 'KYYV8F87'
  const clientId = 'a556c562-03c3-4988-8b88-ae0a96648514'
  
  console.log('🔍 CID Submit 디버깅...\n')
  console.log(`테스트 CID: ${testCid}`)
  console.log(`정규화된 CID: ${normalizeCID(testCid)}\n`)
  
  // 링크 조회 테스트
  console.log('1. 링크 조회 테스트:')
  const { data: link, error: linkError } = await admin
    .from('campaign_link_meta')
    .select('id, cid, target_campaign_id, utm_source, utm_medium, utm_campaign, status')
    .eq('client_id', clientId)
    .eq('cid', normalizeCID(testCid))
    .eq('status', 'active')
    .maybeSingle()
  
  if (linkError) {
    console.error('❌ 링크 조회 실패:', linkError)
  } else if (link) {
    console.log('✅ 링크 찾음:')
    console.log(`  ID: ${link.id}`)
    console.log(`  CID: ${link.cid}`)
    console.log(`  Target Campaign ID: ${link.target_campaign_id}`)
    console.log(`  UTM Source: ${link.utm_source}`)
    console.log(`  UTM Medium: ${link.utm_medium}`)
    console.log(`  UTM Campaign: ${link.utm_campaign}`)
    console.log(`  Status: ${link.status}`)
    
    // 캠페인 매칭 확인
    const campaignMatch = link.target_campaign_id === campaignId
    console.log(`\n  캠페인 매칭: ${campaignMatch ? '✅ 성공' : '❌ 실패'}`)
    if (!campaignMatch) {
      console.log(`  이유: link.target_campaign_id (${link.target_campaign_id}) !== campaignId (${campaignId})`)
    }
  } else {
    console.log('⚠️ 링크를 찾을 수 없습니다')
  }
  
  // 최신 항목 확인
  console.log('\n2. 최신 항목 확인:')
  const { data: latestEntry } = await admin
    .from('event_survey_entries')
    .select('id, name, phone_norm, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (latestEntry) {
    console.log(`최신 항목: ${latestEntry.name} (${latestEntry.phone_norm})`)
    console.log(`생성일: ${latestEntry.created_at}`)
    console.log(`UTM Source: ${latestEntry.utm_source || '(없음)'}`)
    console.log(`UTM Medium: ${latestEntry.utm_medium || '(없음)'}`)
    console.log(`UTM Campaign: ${latestEntry.utm_campaign || '(없음)'}`)
    console.log(`링크 ID: ${latestEntry.marketing_campaign_link_id || '(없음)'}`)
  }
}

debugCIDSubmit().catch(console.error)
