/**
 * 2026-02-02 전환 87개 완전 복원 스크립트
 * 
 * 목적: 
 * 1. 기존 82개 전환 데이터에 링크 ID 매칭
 * 2. 부족한 5개 더미 데이터 추가
 * 3. marketing_stats_daily에 87개 전환 반영
 * 4. event_survey_entries에도 87개 전환 (링크 ID 포함) 반영
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

// 보정 데이터: 링크별 고정 값 (전환 합계 = 87)
const CORRECTION_DATA = [
  {
    utm_source: 'stibee',
    utm_medium: 'email',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 844,
    conversions: 65,
  },
  {
    utm_source: 'community',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 323,
    conversions: 6,
  },
  {
    utm_source: 'keywert',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 57,
    conversions: 1,
  },
  {
    utm_source: 'association',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 89,
    conversions: 2,
  },
  {
    utm_source: 'kakao',
    utm_medium: 'message',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 132,
    conversions: 3,
  },
  {
    utm_source: 'kakao',
    utm_medium: 'opentalk',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 78,
    conversions: 2,
  },
  {
    utm_source: 'heythere',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 64,
    conversions: 1,
  },
  {
    utm_source: 'keywert',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 41,
    conversions: 1,
  },
  {
    utm_source: 'insta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 103,
    conversions: 2,
  },
  {
    utm_source: 'meta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_meta',
    visits: 95,
    conversions: 1,
  },
  {
    utm_source: 'linkedin',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 86,
    conversions: 1,
  },
  {
    utm_source: 'inblog',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 112,
    conversions: 2,
  },
]

const BUCKET_DATE = '2026-02-02'

async function fix87ConversionsComplete(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 전환 87개 완전 복원')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 링크 매핑
  console.log('1. 링크 매핑')
  console.log('-'.repeat(80))
  
  const linkMapping: Array<{
    correctionData: typeof CORRECTION_DATA[0]
    linkId: string | null
    linkName: string | null
  }> = []
  
  const usedLinkIds = new Set<string>()
  
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
      .limit(10)
    
    if (links && links.length > 0) {
      let selectedLink = links.find(link => !usedLinkIds.has(link.id))
      if (!selectedLink) {
        selectedLink = links[0]
      }
      usedLinkIds.add(selectedLink.id)
      
      linkMapping.push({
        correctionData: correction,
        linkId: selectedLink.id,
        linkName: selectedLink.name,
      })
    } else {
      linkMapping.push({
        correctionData: correction,
        linkId: null,
        linkName: null,
      })
    }
  }
  
  const foundLinks = linkMapping.filter(m => m.linkId !== null)
  console.log(`  총 ${foundLinks.length}개 링크 매핑 완료`)
  console.log('')
  
  // 2. marketing_stats_daily 복원
  console.log('2. marketing_stats_daily 데이터 복원')
  console.log('-'.repeat(80))
  
  const linkIds = foundLinks.map(m => m.linkId!).filter((id, idx, arr) => arr.indexOf(id) === idx)
  
  // 기존 데이터 삭제
  await admin
    .from('marketing_stats_daily')
    .delete()
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  // 새 데이터 삽입 (개별 upsert)
  for (const mapping of foundLinks) {
    const stat = {
      client_id: clientId,
      campaign_id: campaignId,
      bucket_date: BUCKET_DATE,
      marketing_campaign_link_id: mapping.linkId!,
      utm_source: mapping.correctionData.utm_source,
      utm_medium: mapping.correctionData.utm_medium,
      utm_campaign: mapping.correctionData.utm_campaign,
      visits: mapping.correctionData.visits,
      conversions: mapping.correctionData.conversions,
    }
    
    // 존재 여부 확인 후 upsert
    const { data: existing } = await admin
      .from('marketing_stats_daily')
      .select('id')
      .eq('client_id', stat.client_id)
      .eq('bucket_date', stat.bucket_date)
      .eq('campaign_id', stat.campaign_id)
      .eq('marketing_campaign_link_id', stat.marketing_campaign_link_id)
      .eq('utm_source', stat.utm_source || null)
      .eq('utm_medium', stat.utm_medium || null)
      .eq('utm_campaign', stat.utm_campaign || null)
      .maybeSingle()
    
    if (existing) {
      await admin
        .from('marketing_stats_daily')
        .update({
          visits: stat.visits,
          conversions: stat.conversions,
        })
        .eq('id', existing.id)
    } else {
      await admin
        .from('marketing_stats_daily')
        .insert(stat)
    }
  }
  
  console.log('  ✅ marketing_stats_daily 복원 완료')
  console.log('')
  
  // 3. 기존 전환 데이터에 링크 ID 매칭
  console.log('3. 기존 전환 데이터에 링크 ID 매칭')
  console.log('-'.repeat(80))
  
  const targetDate = new Date(BUCKET_DATE)
  targetDate.setHours(0, 0, 0, 0)
  const targetDateEnd = new Date(targetDate)
  targetDateEnd.setHours(23, 59, 59, 999)
  
  const { data: existingEntries } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .is('marketing_campaign_link_id', null)
    .not('utm_source', 'is', null)
  
  console.log(`  링크 ID가 없는 전환 데이터: ${existingEntries?.length || 0}개`)
  
  let matchedCount = 0
  for (const entry of existingEntries || []) {
    const matchedLink = foundLinks.find(m => 
      m.correctionData.utm_source === entry.utm_source &&
      m.correctionData.utm_medium === entry.utm_medium &&
      m.correctionData.utm_campaign === entry.utm_campaign
    )
    
    if (matchedLink && matchedLink.linkId) {
      await admin
        .from('event_survey_entries')
        .update({ marketing_campaign_link_id: matchedLink.linkId })
        .eq('id', entry.id)
      matchedCount++
    }
  }
  
  console.log(`  ✅ ${matchedCount}개 전환 데이터에 링크 ID 매칭 완료`)
  console.log('')
  
  // 4. 부족한 전환 데이터 추가
  console.log('4. 부족한 전환 데이터 추가')
  console.log('-'.repeat(80))
  
  // 현재 링크별 전환 수 확인
  const { data: currentEntries } = await admin
    .from('event_survey_entries')
    .select('marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .not('marketing_campaign_link_id', 'is', null)
  
  const linkCountMap = new Map<string, number>()
  currentEntries?.forEach((e: any) => {
    const linkId = e.marketing_campaign_link_id
    linkCountMap.set(linkId, (linkCountMap.get(linkId) || 0) + 1)
  })
  
  // 최대 survey_no 확인
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  let currentSurveyNo = maxSurveyNoData?.survey_no || 0
  
  let totalCreated = 0
  for (const mapping of foundLinks) {
    const currentCount = linkCountMap.get(mapping.linkId!) || 0
    const targetCount = mapping.correctionData.conversions
    const needed = targetCount - currentCount
    
    if (needed > 0) {
      const entriesToCreate = []
      for (let i = 0; i < needed; i++) {
        currentSurveyNo++
        const hour = Math.floor((i / needed) * 24)
        const minute = Math.floor((i % 60))
        const entryDate = new Date(targetDate)
        entryDate.setHours(hour, minute, 0, 0)
        
        entriesToCreate.push({
          campaign_id: campaignId,
          client_id: clientId,
          name: `[보정] ${mapping.linkName?.substring(0, 30) || 'Unknown'}_${i + 1}`,
          phone_norm: `0100000${String(currentSurveyNo).padStart(4, '0')}`,
          survey_no: currentSurveyNo,
          code6: String(currentSurveyNo).padStart(6, '0'),
          completed_at: entryDate.toISOString(),
          utm_source: mapping.correctionData.utm_source,
          utm_medium: mapping.correctionData.utm_medium,
          utm_campaign: mapping.correctionData.utm_campaign,
          marketing_campaign_link_id: mapping.linkId!,
        })
      }
      
      if (entriesToCreate.length > 0) {
        const { error } = await admin
          .from('event_survey_entries')
          .insert(entriesToCreate)
        
        if (!error) {
          console.log(`  ✅ ${mapping.linkName}: ${needed}개 추가`)
          totalCreated += needed
        } else {
          console.error(`  ❌ ${mapping.linkName}: ${error.message}`)
        }
      }
    }
  }
  
  console.log('')
  console.log(`  총 ${totalCreated}개 전환 데이터 추가 완료`)
  console.log('')
  
  // 5. 최종 검증
  console.log('5. 최종 검증')
  console.log('-'.repeat(80))
  
  // marketing_stats_daily
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  const statsTotal = finalStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  console.log(`  marketing_stats_daily: 총 전환 ${statsTotal}개 (목표: 87)`)
  
  // event_survey_entries (전체 확인)
  const { data: finalEntriesAll } = await admin
    .from('event_survey_entries')
    .select('id, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
  
  const entriesTotal = finalEntriesAll?.length || 0
  const entriesWithLink = finalEntriesAll?.filter(e => e.marketing_campaign_link_id).length || 0
  console.log(`  event_survey_entries: 총 전환 ${entriesTotal}개 (링크 ID 있음: ${entriesWithLink}개, 목표: 87)`)
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

fix87ConversionsComplete(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
