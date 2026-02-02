/**
 * 2026-02-02 전환 87개 최종 수정 스크립트
 * 
 * 목적: 
 * 1. 기존 82개 전환 데이터에 링크 ID 매칭 (UTM 기반)
 * 2. 부족한 5개만 추가하여 총 87개로 맞추기
 * 3. marketing_stats_daily는 이미 87개로 복원됨
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const CORRECTION_DATA = [
  { utm_source: 'stibee', utm_medium: 'email', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 65 },
  { utm_source: 'community', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 6 },
  { utm_source: 'keywert', utm_medium: 'banner', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 1 },
  { utm_source: 'association', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 2 },
  { utm_source: 'kakao', utm_medium: 'message', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 3 },
  { utm_source: 'kakao', utm_medium: 'opentalk', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 2 },
  { utm_source: 'heythere', utm_medium: 'banner', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 1 },
  { utm_source: 'keywert', utm_medium: 'banner', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 1 },
  { utm_source: 'insta', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 2 },
  { utm_source: 'meta', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_meta', conversions: 1 },
  { utm_source: 'linkedin', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 1 },
  { utm_source: 'inblog', utm_medium: 'contents', utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom', conversions: 2 },
]

const BUCKET_DATE = '2026-02-02'

async function fix87ConversionsFinal(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 전환 87개 최종 수정')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 링크 매핑
  const linkMapping = new Map<string, string>()
  for (const correction of CORRECTION_DATA) {
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign')
      .eq('client_id', clientId)
      .eq('target_campaign_id', campaignId)
      .eq('utm_source', correction.utm_source)
      .eq('utm_medium', correction.utm_medium)
      .eq('utm_campaign', correction.utm_campaign)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    
    if (link) {
      const key = `${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`
      linkMapping.set(key, link.id)
    }
  }
  
  console.log(`링크 매핑: ${linkMapping.size}개`)
  console.log('')
  
  // 2. 기존 전환 데이터에 링크 ID 매칭
  console.log('2. 기존 전환 데이터에 링크 ID 매칭')
  console.log('-'.repeat(80))
  
  const targetDate = new Date(BUCKET_DATE)
  targetDate.setHours(0, 0, 0, 0)
  const targetDateEnd = new Date(targetDate)
  targetDateEnd.setHours(23, 59, 59, 999)
  
  const { data: entriesWithoutLink } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .is('marketing_campaign_link_id', null)
    .not('utm_source', 'is', null)
  
  console.log(`링크 ID가 없는 전환: ${entriesWithoutLink?.length || 0}개`)
  
  let matchedCount = 0
  for (const entry of entriesWithoutLink || []) {
    const key = `${entry.utm_source}/${entry.utm_medium}/${entry.utm_campaign || ''}`
    const linkId = linkMapping.get(key)
    
    if (linkId) {
      await admin
        .from('event_survey_entries')
        .update({ marketing_campaign_link_id: linkId })
        .eq('id', entry.id)
      matchedCount++
    }
  }
  
  console.log(`✅ ${matchedCount}개 전환 데이터에 링크 ID 매칭 완료`)
  console.log('')
  
  // 3. 현재 링크별 전환 수 확인
  console.log('3. 현재 링크별 전환 수 확인')
  console.log('-'.repeat(80))
  
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
  
  // 4. 부족한 전환 데이터 추가 (목표: 87개)
  console.log('4. 부족한 전환 데이터 추가')
  console.log('-'.repeat(80))
  
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  let currentSurveyNo = maxSurveyNoData?.survey_no || 0
  const totalCurrent = currentEntries?.length || 0
  const neededTotal = 87 - totalCurrent
  
  console.log(`현재 링크 ID가 있는 전환: ${totalCurrent}개`)
  console.log(`추가 필요: ${neededTotal}개`)
  console.log('')
  
  if (neededTotal > 0) {
    // 링크별로 부족한 만큼 추가
    let remaining = neededTotal
    
    for (const correction of CORRECTION_DATA) {
      if (remaining <= 0) break
      
      const key = `${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`
      const linkId = linkMapping.get(key)
      
      if (!linkId) continue
      
      const currentCount = linkCountMap.get(linkId) || 0
      const targetCount = correction.conversions
      const needed = Math.max(0, targetCount - currentCount)
      const actualCreate = Math.min(needed, remaining)
      
      if (actualCreate > 0) {
        const entriesToCreate = []
        for (let i = 0; i < actualCreate; i++) {
          currentSurveyNo++
          const hour = Math.floor((i / actualCreate) * 24)
          const minute = Math.floor((i % 60))
          const entryDate = new Date(targetDate)
          entryDate.setHours(hour, minute, 0, 0)
          
          entriesToCreate.push({
            campaign_id: campaignId,
            client_id: clientId,
            name: `[보정] ${correction.utm_source}_${i + 1}`,
            phone_norm: `0100000${String(currentSurveyNo).padStart(4, '0')}`,
            survey_no: currentSurveyNo,
            code6: String(currentSurveyNo).padStart(6, '0'),
            completed_at: entryDate.toISOString(),
            utm_source: correction.utm_source,
            utm_medium: correction.utm_medium,
            utm_campaign: correction.utm_campaign,
            marketing_campaign_link_id: linkId,
          })
        }
        
        const { error } = await admin
          .from('event_survey_entries')
          .insert(entriesToCreate)
        
        if (!error) {
          console.log(`  ✅ ${correction.utm_source}/${correction.utm_medium}: ${actualCreate}개 추가`)
          remaining -= actualCreate
        } else {
          console.error(`  ❌ ${correction.utm_source}/${correction.utm_medium}: ${error.message}`)
        }
      }
    }
    
    console.log('')
    console.log(`  총 ${neededTotal - remaining}개 추가 완료`)
  } else {
    console.log('  ✅ 이미 87개 이상입니다.')
  }
  
  console.log('')
  
  // 5. 최종 검증
  console.log('5. 최종 검증')
  console.log('-'.repeat(80))
  
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .not('marketing_campaign_link_id', 'is', null)
  
  const finalTotal = finalEntries?.length || 0
  console.log(`  event_survey_entries: 총 전환 ${finalTotal}개 (목표: 87)`)
  
  // marketing_stats_daily 확인
  const linkIds = Array.from(linkMapping.values())
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  const statsTotal = finalStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  console.log(`  marketing_stats_daily: 총 전환 ${statsTotal}개 (목표: 87)`)
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

fix87ConversionsFinal(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
