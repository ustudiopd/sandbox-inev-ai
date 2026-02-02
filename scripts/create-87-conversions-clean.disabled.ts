/**
 * 2026-02-02 전환 87개 깔끔하게 생성 스크립트
 * 
 * 목적: 기존 2026-02-02 전환 데이터를 모두 삭제하고, 새로 87개 생성
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

async function create87ConversionsClean(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 전환 87개 깔끔하게 생성')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 링크 매핑 (같은 UTM이 여러 개인 경우 처리)
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
  
  console.log(`링크 매핑: ${linkMapping.size}개 UTM 조합`)
  console.log('')
  
  // 2. 기존 2026-02-02 전환 데이터 삭제
  console.log('2. 기존 2026-02-02 전환 데이터 삭제')
  console.log('-'.repeat(80))
  
  // KST 기준 날짜를 UTC로 변환
  const targetDateKST = new Date(`${BUCKET_DATE}T00:00:00+09:00`)
  const targetDateEndKST = new Date(`${BUCKET_DATE}T23:59:59+09:00`)
  const targetDate = new Date(targetDateKST.getTime() - 9 * 60 * 60 * 1000) // UTC로 변환
  const targetDateEnd = new Date(targetDateEndKST.getTime() - 9 * 60 * 60 * 1000) // UTC로 변환
  
  const { data: existingEntries } = await admin
    .from('event_survey_entries')
    .select('id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
  
  if (existingEntries && existingEntries.length > 0) {
    const entryIds = existingEntries.map(e => e.id)
    const { error: deleteError } = await admin
      .from('event_survey_entries')
      .delete()
      .in('id', entryIds)
    
    if (deleteError) {
      console.error('  ❌ 삭제 오류:', deleteError)
      return
    }
    
    console.log(`  ✅ ${existingEntries.length}개 전환 데이터 삭제 완료`)
  } else {
    console.log('  기존 데이터 없음')
  }
  
  console.log('')
  
  // 3. 최대 survey_no 확인
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  let currentSurveyNo = maxSurveyNoData?.survey_no || 0
  console.log(`현재 최대 survey_no: ${currentSurveyNo}`)
  console.log('')
  
  // 4. 새로 87개 생성
  console.log('4. 새로 87개 전환 데이터 생성')
  console.log('-'.repeat(80))
  
  const usedLinkIds = new Map<string, number>() // UTM 조합별로 사용한 링크 인덱스 추적
  let totalCreated = 0
  
  for (const correction of CORRECTION_DATA) {
    const key = `${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`
    const linkInfos = linkMapping.get(key)
    
    if (!linkInfos || linkInfos.length === 0) {
      console.log(`  ⚠️  링크 없음: ${key}`)
      continue
    }
    
    // 같은 UTM이 여러 개인 경우, 순서대로 사용
    const usedIndex = usedLinkIds.get(key) || 0
    const selectedLink = linkInfos[usedIndex % linkInfos.length]
    usedLinkIds.set(key, usedIndex + 1)
    
    const selectedLinkId = selectedLink.id
    
    const entriesToCreate = []
    for (let i = 0; i < correction.conversions; i++) {
      currentSurveyNo++
      const hour = Math.floor((i / correction.conversions) * 24)
      const minute = Math.floor((i % 60))
      const entryDate = new Date(targetDate)
      entryDate.setHours(hour, minute, 0, 0)
      
      entriesToCreate.push({
        campaign_id: campaignId,
        client_id: clientId,
        name: `[보정] ${selectedLink.name.substring(0, 30)}_${i + 1}`,
        phone_norm: `0100000${String(currentSurveyNo).padStart(4, '0')}`,
        survey_no: currentSurveyNo,
        code6: String(currentSurveyNo).padStart(6, '0'),
        completed_at: entryDate.toISOString(),
        utm_source: correction.utm_source,
        utm_medium: correction.utm_medium,
        utm_campaign: correction.utm_campaign,
        marketing_campaign_link_id: selectedLinkId,
      })
    }
    
    const { error } = await admin
      .from('event_survey_entries')
      .insert(entriesToCreate)
    
    if (error) {
      console.error(`  ❌ ${selectedLink.name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${selectedLink.name}: ${correction.conversions}개 생성`)
      totalCreated += correction.conversions
    }
  }
  
  console.log('')
  console.log(`  총 ${totalCreated}개 전환 데이터 생성 완료`)
  console.log('')
  
  // 5. 최종 검증
  console.log('5. 최종 검증')
  console.log('-'.repeat(80))
  
  // 2026-02-02 날짜만 필터링
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('id, created_at, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lt('created_at', new Date(targetDateEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()) // 다음 날 00:00:00 전까지
    .not('marketing_campaign_link_id', 'is', null)
  
  const finalTotal = finalEntries?.length || 0
  console.log(`  event_survey_entries: 총 전환 ${finalTotal}개 (목표: 87)`)
  
  if (finalTotal !== 87) {
    console.log(`  ⚠️  차이: ${87 - finalTotal}개`)
    // 링크별 집계
    const linkMap = new Map<string, number>()
    finalEntries?.forEach((e: any) => {
      const linkId = e.marketing_campaign_link_id
      linkMap.set(linkId, (linkMap.get(linkId) || 0) + 1)
    })
    console.log(`  링크별 전환 수:`)
    for (const [linkId, count] of linkMap.entries()) {
      const { data: link } = await admin
        .from('campaign_link_meta')
        .select('name')
        .eq('id', linkId)
        .maybeSingle()
      console.log(`    - ${link?.name || linkId}: ${count}개`)
    }
  }
  
  // marketing_stats_daily 확인
  const linkIds = Array.from(linkMapping.values()).flat().map(v => v.id)
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

create87ConversionsClean(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
