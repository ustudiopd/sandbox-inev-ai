/**
 * 2026-02-02 전환 87개 깔끔하게 생성 (기존 더미 데이터 모두 삭제 후 재생성)
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

async function cleanAndCreate87(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 전환 87개 깔끔하게 생성')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 2026-02-02 날짜의 더미 데이터만 삭제
  console.log('1. 2026-02-02 날짜의 더미 데이터 삭제')
  console.log('-'.repeat(80))
  
  const targetDate = new Date(`${BUCKET_DATE}T00:00:00+09:00`)
  const targetDateEnd = new Date(`${BUCKET_DATE}T23:59:59+09:00`)
  const targetDateUTC = new Date(targetDate.getTime() - 9 * 60 * 60 * 1000)
  const targetDateEndUTC = new Date(targetDateEnd.getTime() - 9 * 60 * 60 * 1000)
  
  const { data: dummyEntries } = await admin
    .from('event_survey_entries')
    .select('id')
    .eq('campaign_id', campaignId)
    .ilike('name', '%[보정]%')
    .gte('completed_at', targetDateUTC.toISOString())
    .lte('completed_at', targetDateEndUTC.toISOString())
  
  if (dummyEntries && dummyEntries.length > 0) {
    // 배치로 삭제 (100개씩)
    const batchSize = 100
    let deletedCount = 0
    for (let i = 0; i < dummyEntries.length; i += batchSize) {
      const batch = dummyEntries.slice(i, i + batchSize)
      const batchIds = batch.map(e => e.id)
      const { error } = await admin
        .from('event_survey_entries')
        .delete()
        .in('id', batchIds)
      
      if (error) {
        console.error(`  ❌ 배치 ${i / batchSize + 1} 삭제 오류:`, error)
      } else {
        deletedCount += batch.length
      }
    }
    console.log(`  ✅ ${deletedCount}개 더미 데이터 삭제 완료`)
  } else {
    console.log('  더미 데이터 없음')
  }
  
  console.log('')
  
  // 2. 링크 매핑
  console.log('2. 링크 매핑')
  console.log('-'.repeat(80))
  
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
  
  console.log(`  링크 매핑: ${linkMapping.size}개 UTM 조합`)
  console.log('')
  
  // 3. marketing_stats_daily 복원
  console.log('3. marketing_stats_daily 데이터 복원')
  console.log('-'.repeat(80))
  
  const linkIds = Array.from(linkMapping.values()).flat().map(l => l.id).filter((id, idx, arr) => arr.indexOf(id) === idx)
  
  // 기존 데이터 삭제
  await admin
    .from('marketing_stats_daily')
    .delete()
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  // 보정 데이터로 복원
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
      visits: correction.utm_source === 'stibee' ? 844 : 
              correction.utm_source === 'community' ? 323 :
              correction.utm_source === 'keywert' && usedIndex === 0 ? 57 : 41,
      conversions: correction.conversions,
    }
    
    // visits 값 설정
    if (correction.utm_source === 'stibee') stat.visits = 844
    else if (correction.utm_source === 'community') stat.visits = 323
    else if (correction.utm_source === 'keywert') stat.visits = usedIndex === 0 ? 57 : 41
    else if (correction.utm_source === 'association') stat.visits = 89
    else if (correction.utm_source === 'kakao' && correction.utm_medium === 'message') stat.visits = 132
    else if (correction.utm_source === 'kakao' && correction.utm_medium === 'opentalk') stat.visits = 78
    else if (correction.utm_source === 'heythere') stat.visits = 64
    else if (correction.utm_source === 'insta') stat.visits = 103
    else if (correction.utm_source === 'meta') stat.visits = 95
    else if (correction.utm_source === 'linkedin') stat.visits = 86
    else if (correction.utm_source === 'inblog') stat.visits = 112
    
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
        .update({ visits: stat.visits, conversions: stat.conversions })
        .eq('id', existing.id)
    } else {
      await admin
        .from('marketing_stats_daily')
        .insert(stat)
    }
  }
  
  console.log('  ✅ marketing_stats_daily 복원 완료')
  console.log('')
  
  // 4. 기존 2026-02-02 전환 데이터 확인 및 삭제 (이미 1단계에서 처리됨)
  console.log('4. 기존 2026-02-02 전환 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: existingEntries } = await admin
    .from('event_survey_entries')
    .select('id')
    .eq('campaign_id', campaignId)
    .gte('completed_at', targetDateUTC.toISOString())
    .lte('completed_at', targetDateEndUTC.toISOString())
  
  if (existingEntries && existingEntries.length > 0) {
    console.log(`  ⚠️  ${existingEntries.length}개 전환 데이터가 남아있습니다.`)
  } else {
    console.log('  기존 데이터 없음')
  }
  
  console.log('')
  
  // 5. 새로 87개 생성
  console.log('5. 새로 87개 전환 데이터 생성')
  console.log('-'.repeat(80))
  
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  let currentSurveyNo = maxSurveyNoData?.survey_no || 0
  const usedLinkIds2 = new Map<string, number>()
  let totalCreated = 0
  
  for (const correction of CORRECTION_DATA) {
    const key = `${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`
    const linkInfos = linkMapping.get(key)
    
    if (!linkInfos || linkInfos.length === 0) {
      console.log(`  ⚠️  링크 없음: ${key}`)
      continue
    }
    
    const usedIndex = usedLinkIds2.get(key) || 0
    const selectedLink = linkInfos[usedIndex % linkInfos.length]
    usedLinkIds2.set(key, usedIndex + 1)
    
    const entriesToCreate = []
    for (let i = 0; i < correction.conversions; i++) {
      currentSurveyNo++
      const hour = Math.floor((i / correction.conversions) * 24)
      const minute = Math.floor((i % 60))
      const entryDate = new Date(targetDateUTC)
      entryDate.setHours(entryDate.getHours() + hour, minute, 0, 0)
      
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
        marketing_campaign_link_id: selectedLink.id,
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
  
  // 6. 최종 검증
  console.log('6. 최종 검증')
  console.log('-'.repeat(80))
  
  // completed_at으로 2026-02-02만 필터링하여 검증
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('id, completed_at, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('completed_at', targetDateUTC.toISOString())
    .lte('completed_at', targetDateEndUTC.toISOString())
    .not('marketing_campaign_link_id', 'is', null)
  
  const finalTotal = finalEntries?.length || 0
  console.log(`  event_survey_entries: 총 전환 ${finalTotal}개 (목표: 87)`)
  
  if (finalTotal !== 87) {
    console.log(`  ⚠️  차이: ${87 - finalTotal}개`)
  }
  
  // marketing_stats_daily 검증 (2026-02-02만)
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
  
  const statsTotal = finalStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  console.log(`  marketing_stats_daily: 총 전환 ${statsTotal}개 (목표: 87)`)
  
  if (statsTotal !== 87) {
    console.log(`  ⚠️  차이: ${87 - statsTotal}개`)
    console.log(`  링크별 전환 수:`)
    finalStats?.forEach(s => {
      console.log(`    - ${s.utm_source}/${s.utm_medium}: ${s.conversions}개`)
    })
  } else {
    console.log(`  ✅ marketing_stats_daily 정확히 87개`)
  }
  
  if (finalTotal === 87 && statsTotal === 87) {
    console.log(`  ✅ event_survey_entries 정확히 87개`)
    console.log(`  ✅ 모든 데이터가 정확히 87개로 설정되었습니다!`)
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

cleanAndCreate87(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
