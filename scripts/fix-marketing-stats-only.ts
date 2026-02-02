/**
 * marketing_stats_daily에서 2026-02-02만 남기고 나머지 삭제
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const BUCKET_DATE = '2026-02-02'

async function fixMarketingStatsOnly(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('marketing_stats_daily 2026-02-02만 남기기')
  console.log('='.repeat(80))
  console.log('')
  
  // 2026-02-02 데이터 모두 삭제 후 재생성
  const { error: deleteError } = await admin
    .from('marketing_stats_daily')
    .delete()
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
  
  if (deleteError) {
    console.error('  ❌ 삭제 오류:', deleteError)
  } else {
    console.log('  ✅ 2026-02-02 데이터 삭제 완료')
  }
  
  console.log('')
  
  // 보정 데이터로 재생성
  const CORRECTION_DATA = [
    { utm_source: 'stibee', utm_medium: 'email', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 844, conversions: 65 },
    { utm_source: 'community', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 323, conversions: 6 },
    { utm_source: 'keywert', utm_medium: 'banner', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 57, conversions: 1 },
    { utm_source: 'association', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 89, conversions: 2 },
    { utm_source: 'kakao', utm_medium: 'message', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 132, conversions: 3 },
    { utm_source: 'kakao', utm_medium: 'opentalk', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 78, conversions: 2 },
    { utm_source: 'heythere', utm_medium: 'banner', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 64, conversions: 1 },
    { utm_source: 'keywert', utm_medium: 'banner', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 41, conversions: 1 },
    { utm_source: 'insta', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 103, conversions: 2 },
    { utm_source: 'meta', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_meta', visits: 95, conversions: 1 },
    { utm_source: 'linkedin', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 86, conversions: 1 },
    { utm_source: 'inblog', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', visits: 112, conversions: 2 },
  ]
  
  // 링크 매핑
  const linkMapping = new Map<string, Array<{ id: string; name: string }>>()
  for (const correction of CORRECTION_DATA) {
    const { data: links } = await admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign')
      .eq('client_id', clientId)
      .eq('target_campaign_id', campaignId)
      .eq('utm_source', correction.utm_source)
      .eq('utm_medium', correction.utm_medium)
      .eq('utm_campaign', correction.utm_campaign)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
    
    if (links && links.length > 0) {
      const key = `${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`
      linkMapping.set(key, links.map(l => ({ id: l.id, name: l.name })))
    }
  }
  
  // 데이터 삽입
  const usedLinkIds = new Map<string, number>()
  for (const correction of CORRECTION_DATA) {
    const key = `${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`
    const linkInfos = linkMapping.get(key)
    
    if (!linkInfos || linkInfos.length === 0) continue
    
    const usedIndex = usedLinkIds.get(key) || 0
    const selectedLink = linkInfos[usedIndex % linkInfos.length]
    usedLinkIds.set(key, usedIndex + 1)
    
    const stat = {
      client_id: clientId,
      campaign_id: campaignId,
      bucket_date: BUCKET_DATE,
      marketing_campaign_link_id: selectedLink.id,
      utm_source: correction.utm_source,
      utm_medium: correction.utm_medium,
      utm_campaign: correction.utm_campaign,
      visits: correction.visits,
      conversions: correction.conversions,
    }
    
    await admin
      .from('marketing_stats_daily')
      .insert(stat)
  }
  
  console.log('  ✅ 2026-02-02 데이터 재생성 완료')
  console.log('')
  
  // 최종 검증
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
  
  const statsTotal = finalStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  console.log(`  marketing_stats_daily: 총 전환 ${statsTotal}개 (목표: 87)`)
  
  if (statsTotal === 87) {
    console.log('  ✅ 정확히 87개입니다!')
  } else {
    console.log(`  ⚠️  차이: ${87 - statsTotal}개`)
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

fixMarketingStatsOnly(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
