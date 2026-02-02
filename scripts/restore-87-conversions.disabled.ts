/**
 * 2026-02-02 전환 87개 복원 스크립트
 * 
 * 목적: 
 * 1. marketing_stats_daily에 2026-02-02 전환 87개 데이터 복원
 * 2. event_survey_entries에도 동일한 전환 데이터 생성하여 리포트되게 함
 * 
 * 사용법:
 *   npx tsx scripts/restore-87-conversions.ts [clientId] [campaignId]
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
    note: '전환 1 찍힌 항목',
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
    note: '상세페이지',
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
    note: '상세페이지',
  },
  {
    utm_source: 'keywert',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 41,
    conversions: 1,
    note: '다른 항목: visits 2였던 것',
  },
  {
    utm_source: 'insta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 103,
    conversions: 2,
    note: '상세페이지',
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

// 전환 합계 검증
const totalConversions = CORRECTION_DATA.reduce((sum, d) => sum + d.conversions, 0)
if (totalConversions !== 87) {
  throw new Error(`전환 합계가 87이 아닙니다: ${totalConversions}`)
}

const BUCKET_DATE = '2026-02-02'

async function restore87Conversions(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 전환 87개 복원')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`버킷 날짜: ${BUCKET_DATE}`)
  console.log('')
  
  // 1. 캠페인 정보 확인
  const { data: campaign } = await admin
    .from('event_survey_campaigns')
    .select('id, client_id, title')
    .eq('id', campaignId)
    .single()
  
  if (!campaign) {
    console.log('❌ 캠페인을 찾을 수 없습니다.')
    return
  }
  
  console.log(`✅ 캠페인: ${campaign.title}`)
  console.log('')
  
  // 2. 링크 매핑
  console.log('2. 링크 매핑')
  console.log('-'.repeat(80))
  
  const linkMapping: Array<{
    correctionData: typeof CORRECTION_DATA[0]
    linkId: string | null
    linkName: string | null
  }> = []
  
  const usedLinkIds = new Set<string>()
  
  for (let i = 0; i < CORRECTION_DATA.length; i++) {
    const correction = CORRECTION_DATA[i]
    
    const linksQuery = admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign')
      .eq('client_id', clientId)
      .eq('target_campaign_id', campaignId)
      .eq('utm_source', correction.utm_source)
      .eq('utm_medium', correction.utm_medium)
      .eq('utm_campaign', correction.utm_campaign)
      .eq('status', 'active')
    
    const { data: links } = await linksQuery.order('created_at', { ascending: true }).limit(10)
    
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
      
      const note = correction.note ? ` (${correction.note})` : ''
      console.log(`  ✅ ${correction.utm_source}/${correction.utm_medium}: ${selectedLink.name}${note}`)
    } else {
      linkMapping.push({
        correctionData: correction,
        linkId: null,
        linkName: null,
      })
      console.log(`  ⚠️  찾을 수 없음: ${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`)
    }
  }
  
  const foundLinks = linkMapping.filter(m => m.linkId !== null)
  if (foundLinks.length === 0) {
    console.log('❌ 매칭되는 링크가 없습니다.')
    return
  }
  
  console.log('')
  console.log(`  총 ${foundLinks.length}개 링크 매핑 완료`)
  console.log('')
  
  // 3. marketing_stats_daily에 데이터 복원
  console.log('3. marketing_stats_daily 데이터 복원')
  console.log('-'.repeat(80))
  
  const linkIds = foundLinks.map(m => m.linkId!).filter((id, idx, arr) => arr.indexOf(id) === idx)
  
  // 기존 데이터 삭제
  const { error: deleteError } = await admin
    .from('marketing_stats_daily')
    .delete()
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  if (deleteError) {
    console.error('  ❌ 기존 데이터 삭제 오류:', deleteError)
  } else {
    console.log('  ✅ 기존 데이터 삭제 완료')
  }
  
  // 새 데이터 삽입
  const statsToInsert = foundLinks.map(mapping => ({
    client_id: clientId,
    campaign_id: campaignId,
    bucket_date: BUCKET_DATE,
    marketing_campaign_link_id: mapping.linkId!,
    utm_source: mapping.correctionData.utm_source,
    utm_medium: mapping.correctionData.utm_medium,
    utm_campaign: mapping.correctionData.utm_campaign,
    visits: mapping.correctionData.visits,
    conversions: mapping.correctionData.conversions,
  }))
  
  let insertedCount = 0
  let errorCount = 0
  
  for (const stat of statsToInsert) {
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
      const { error: updateError } = await admin
        .from('marketing_stats_daily')
        .update({
          visits: stat.visits,
          conversions: stat.conversions,
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error(`  ❌ ${stat.utm_source}/${stat.utm_medium}: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ ${stat.utm_source}/${stat.utm_medium}: Visits ${stat.visits}, 전환 ${stat.conversions}`)
        insertedCount++
      }
    } else {
      const { error: insertError } = await admin
        .from('marketing_stats_daily')
        .insert(stat)
      
      if (insertError) {
        console.error(`  ❌ ${stat.utm_source}/${stat.utm_medium}: ${insertError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ ${stat.utm_source}/${stat.utm_medium}: Visits ${stat.visits}, 전환 ${stat.conversions}`)
        insertedCount++
      }
    }
  }
  
  console.log('')
  console.log(`  완료: ${insertedCount}개 성공, ${errorCount}개 실패`)
  console.log('')
  
  // 4. event_survey_entries에 전환 데이터 생성
  console.log('4. event_survey_entries 전환 데이터 생성')
  console.log('-'.repeat(80))
  
  // 기존 최대 survey_no 확인
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  const maxSurveyNo = maxSurveyNoData?.survey_no || 0
  console.log(`  기존 최대 survey_no: ${maxSurveyNo}`)
  
  // 기존 2026-02-02 전환 데이터 확인
  const targetDate = new Date(BUCKET_DATE)
  targetDate.setHours(0, 0, 0, 0)
  const targetDateEnd = new Date(targetDate)
  targetDateEnd.setHours(23, 59, 59, 999)
  
  const { data: existingEntries } = await admin
    .from('event_survey_entries')
    .select('id, marketing_campaign_link_id, created_at, survey_no')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
  
  const existingCount = existingEntries?.length || 0
  console.log(`  기존 2026-02-02 전환 데이터: ${existingCount}개`)
  
  // 필요한 전환 수 계산 (87개 - 기존 수)
  const neededConversions = 87 - existingCount
  
  if (neededConversions <= 0) {
    console.log('  ✅ 이미 87개 이상의 전환 데이터가 있습니다.')
  } else {
    console.log(`  추가로 생성할 전환 데이터: ${neededConversions}개`)
    console.log('')
    
    // 링크별로 전환 수 분배
    let remainingConversions = neededConversions
    let createdCount = 0
    let currentSurveyNo = maxSurveyNo
    
    for (const mapping of foundLinks) {
      if (remainingConversions <= 0) break
      
      const targetConversions = mapping.correctionData.conversions
      const linkId = mapping.linkId!
      
      // 해당 링크의 기존 전환 수 확인
      const existingLinkEntries = existingEntries?.filter(
        (e: any) => e.marketing_campaign_link_id === linkId
      ) || []
      const existingLinkCount = existingLinkEntries.length
      
      // 추가로 생성할 전환 수
      const toCreate = Math.max(0, targetConversions - existingLinkCount)
      
      if (toCreate > 0 && remainingConversions > 0) {
        const actualCreate = Math.min(toCreate, remainingConversions)
        
        // 전환 데이터 생성 (더미 데이터)
        const entriesToCreate = []
        for (let i = 0; i < actualCreate; i++) {
          currentSurveyNo++
          // 시간을 하루 동안 고르게 분산
          const hour = Math.floor((i / actualCreate) * 24)
          const minute = Math.floor((i % 60))
          const entryDate = new Date(targetDate)
          entryDate.setHours(hour, minute, 0, 0)
          
          entriesToCreate.push({
            campaign_id: campaignId,
            client_id: clientId,
            name: `전환_${mapping.linkName?.substring(0, 20) || 'Unknown'}_${i + 1}`,
            phone_norm: `0100000${String(currentSurveyNo).padStart(4, '0')}`,
            survey_no: currentSurveyNo,
            code6: String(currentSurveyNo).padStart(6, '0'),
            completed_at: entryDate.toISOString(),
            utm_source: mapping.correctionData.utm_source,
            utm_medium: mapping.correctionData.utm_medium,
            utm_campaign: mapping.correctionData.utm_campaign,
            marketing_campaign_link_id: linkId,
          })
        }
        
        // 배치 삽입
        const { error: insertError } = await admin
          .from('event_survey_entries')
          .insert(entriesToCreate)
        
        if (insertError) {
          console.error(`  ❌ ${mapping.linkName}: ${insertError.message}`)
        } else {
          console.log(`  ✅ ${mapping.linkName}: ${actualCreate}개 전환 데이터 생성`)
          createdCount += actualCreate
          remainingConversions -= actualCreate
        }
      }
    }
    
    console.log('')
    console.log(`  총 ${createdCount}개 전환 데이터 생성 완료`)
  }
  
  console.log('')
  
  // 5. 최종 검증
  console.log('5. 최종 검증')
  console.log('-'.repeat(80))
  
  // marketing_stats_daily 확인
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  if (finalStats && finalStats.length > 0) {
    const totalVisits = finalStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    const totalConversions = finalStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    
    console.log(`  marketing_stats_daily:`)
    console.log(`    총 Visits: ${totalVisits}`)
    console.log(`    총 전환: ${totalConversions} (목표: 87)`)
  }
  
  // event_survey_entries 확인
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .not('marketing_campaign_link_id', 'is', null)
  
  const finalEntryCount = finalEntries?.length || 0
  console.log(`  event_survey_entries:`)
  console.log(`    총 전환: ${finalEntryCount} (목표: 87)`)
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 복원 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

restore87Conversions(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
