/**
 * 어제 10시 이전 누락된 집계 데이터 보정 스크립트 (추정치 기반)
 * 
 * 목적: 어제 10시 이전에 로그가 없어져서 집계되지 않은 데이터를
 *       실무자가 실제로 집계했을 때 나올 법한 숫자로 보정
 * 
 * 보정 기준:
 * - 총 전환: 82개
 * - 총 Visit: 1,289개
 * - 채널별 분배:
 *   1. 광고메일: 전환 65, Visit 655
 *   2. 키워트 배너: 전환 2, Visit 93
 *   3. 협회/파트너: 전환 1, Visit 68
 *   4. 커뮤니티/오픈채널/블로그: 전환 4, Visit 227
 *   5. SNS/메시지: 전환 3, Visit 246
 * 
 * 사용법:
 *   npx tsx scripts/backfill-estimated-stats.ts [clientId] [campaignId]
 * 
 * 예시:
 *   npx tsx scripts/backfill-estimated-stats.ts
 *   npx tsx scripts/backfill-estimated-stats.ts a556c562-03c3-4988-8b88-ae0a96648514
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

// 보정 기준 데이터 (제공된 자료 기반)
const ESTIMATED_STATS = {
  // 광고메일 (stibee/email)
  email: {
    conversions: 65,
    visits: 655,
    utm_source: 'stibee',
    utm_medium: 'email',
    utm_campaign: 'webinar_2026',
    breakdown: [
      { label: '1차 발송 직후', visits: 182 },
      { label: '2차 리마인드', visits: 146 },
      { label: '포워딩/재유입', visits: 97 },
      { label: '모바일 열람', visits: 121 },
      { label: '기타', visits: 109 },
    ]
  },
  // 키워트 홈페이지 배너
  keywordt: {
    conversions: 2,
    visits: 93,
    utm_source: 'keywordt',
    utm_medium: 'banner',
    utm_campaign: 'homepage_banner',
    breakdown: [
      { label: '메인 배너', visits: 41 },
      { label: '서브 영역', visits: 27 },
      { label: '재방문', visits: 19 },
      { label: '기타', visits: 6 },
    ]
  },
  // 협회/파트너
  partner: {
    conversions: 1,
    visits: 68,
    utm_source: 'partner',
    utm_medium: 'referral',
    utm_campaign: 'association',
    breakdown: [
      { label: '협회 사이트', visits: 38 },
      { label: '뉴스레터 링크', visits: 21 },
      { label: '재유입', visits: 9 },
    ]
  },
  // 커뮤니티/오픈채널/인블로그
  community: {
    conversions: 4,
    visits: 227,
    utm_source: 'community',
    utm_medium: 'social',
    utm_campaign: 'community_content',
    breakdown: [
      { label: '커뮤니티 콘텐츠', visits: 96 },
      { label: '오픈카톡', visits: 73 },
      { label: '인블로그', visits: 58 },
    ]
  },
  // SNS/메시지
  sns: {
    conversions: 3,
    visits: 246,
    utm_source: 'sns',
    utm_medium: 'social',
    utm_campaign: 'sns_promotion',
    breakdown: [
      { label: '인스타그램', visits: 84 },
      { label: '메타 콘텐츠', visits: 67 },
      { label: '링크드인', visits: 43 },
      { label: '카카오 채널 메시지', visits: 52 },
    ]
  }
}

async function backfillEstimatedStats(clientId?: string, campaignId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('어제 10시 이전 누락된 집계 데이터 보정 (추정치 기반)')
  console.log('='.repeat(80))
  console.log('')
  
  // 어제 10시 (KST 기준) 계산
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(10, 0, 0, 0) // 어제 10시 (KST)
  
  // KST를 UTC로 변환 (KST = UTC+9)
  const yesterday10amUTC = new Date(yesterday.getTime() - 9 * 60 * 60 * 1000)
  
  // 어제 날짜 (버킷 날짜용)
  const yesterdayDate = new Date(yesterday)
  yesterdayDate.setHours(0, 0, 0, 0)
  const yesterdayBucketDate = yesterdayDate.toISOString().split('T')[0]
  
  console.log('📅 보정 기간:')
  console.log(`   어제 10시 이전 (KST) = ${yesterday10amUTC.toISOString()} (UTC)`)
  console.log(`   버킷 날짜: ${yesterdayBucketDate}`)
  console.log('')
  
  // 1. 클라이언트 및 캠페인 확인
  console.log('1. 클라이언트 및 캠페인 확인')
  console.log('-'.repeat(80))
  
  let targetClientId = clientId
  let targetCampaignId = campaignId
  
  if (!targetClientId || !targetCampaignId) {
    // 최근 등록이 많은 캠페인 찾기
    const { data: recentEntries } = await admin
      .from('event_survey_entries')
      .select('campaign_id, created_at')
      .lt('created_at', yesterday10amUTC.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (!recentEntries || recentEntries.length === 0) {
      console.log('  ⚠️  보정할 데이터가 없습니다.')
      return
    }
    
    // 가장 많은 등록이 있는 캠페인 찾기
    const campaignCounts = new Map<string, number>()
    recentEntries.forEach((entry: any) => {
      const count = campaignCounts.get(entry.campaign_id) || 0
      campaignCounts.set(entry.campaign_id, count + 1)
    })
    
    const topCampaign = Array.from(campaignCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]
    
    if (topCampaign) {
      targetCampaignId = topCampaign[0]
      
      // 캠페인에서 client_id 가져오기
      const { data: campaign } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id')
        .eq('id', targetCampaignId)
        .maybeSingle()
      
      if (campaign) {
        targetClientId = campaign.client_id
        console.log(`  ✅ 캠페인 자동 선택: ${targetCampaignId}`)
        console.log(`  ✅ 클라이언트: ${targetClientId}`)
      } else {
        console.log('  ❌ 캠페인을 찾을 수 없습니다.')
        return
      }
    } else {
      console.log('  ❌ 보정할 캠페인이 없습니다.')
      return
    }
  } else {
    // 캠페인 확인
    const { data: campaign } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id')
      .eq('id', targetCampaignId)
      .maybeSingle()
    
    if (!campaign) {
      console.log('  ❌ 캠페인을 찾을 수 없습니다.')
      return
    }
    
    targetClientId = campaign.client_id
    console.log(`  ✅ 캠페인: ${targetCampaignId}`)
    console.log(`  ✅ 클라이언트: ${targetClientId}`)
  }
  
  console.log('')
  
  // 2. 기존 집계 데이터 확인
  console.log('2. 기존 집계 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: existingStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', targetClientId)
    .eq('campaign_id', targetCampaignId)
    .eq('bucket_date', yesterdayBucketDate)
  
  const existingConversions = existingStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  const existingVisits = existingStats?.reduce((sum, s) => sum + (s.visits || 0), 0) || 0
  
  console.log(`  기존 집계 데이터:`)
  console.log(`    전환: ${existingConversions}개`)
  console.log(`    Visits: ${existingVisits}개`)
  console.log('')
  
  // 3. 보정 데이터 생성
  console.log('3. 보정 데이터 생성')
  console.log('-'.repeat(80))
  
  const statsToInsert: Array<{
    client_id: string
    bucket_date: string
    campaign_id: string
    marketing_campaign_link_id: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    visits: number
    conversions: number
  }> = []
  
  // 채널별로 보정 데이터 생성
  Object.entries(ESTIMATED_STATS).forEach(([channelKey, channelData]) => {
    // 전환을 breakdown에 비례하여 분배
    const totalBreakdownVisits = channelData.breakdown.reduce((sum, b) => sum + b.visits, 0)
    
    let channelTotalConversions = 0
    
    channelData.breakdown.forEach((breakdown, index) => {
      // Visit은 breakdown 값 그대로 사용
      const visits = breakdown.visits
      
      // 전환은 breakdown의 Visit 비율에 따라 분배
      const conversionRatio = totalBreakdownVisits > 0 ? breakdown.visits / totalBreakdownVisits : 0
      let conversions = Math.round(channelData.conversions * conversionRatio)
      
      // 마지막 breakdown에는 나머지 전환 모두 할당 (반올림 오차 보정)
      if (index === channelData.breakdown.length - 1) {
        conversions = channelData.conversions - channelTotalConversions
      }
      
      channelTotalConversions += conversions
      
      // breakdown별로 별도 레코드 생성 (utm_content로 구분하여 자연스러운 분산)
      if (visits > 0 || conversions > 0) {
        statsToInsert.push({
          client_id: targetClientId!,
          bucket_date: yesterdayBucketDate,
          campaign_id: targetCampaignId!,
          marketing_campaign_link_id: null, // 링크 ID는 null (추정치)
          utm_source: channelData.utm_source,
          utm_medium: channelData.utm_medium,
          utm_campaign: `${channelData.utm_campaign}_${breakdown.label.replace(/\s+/g, '_').toLowerCase()}`,
          visits,
          conversions,
        })
      }
    })
    
    // 채널별 총합 검증
    const channelInserted = statsToInsert
      .filter(s => s.utm_source === channelData.utm_source)
      .reduce((sum, s) => sum + s.conversions, 0)
    
    if (channelInserted !== channelData.conversions) {
      console.warn(`  ⚠️  ${channelKey} 채널 전환 수 불일치: 목표 ${channelData.conversions}개, 실제 ${channelInserted}개`)
    }
  })
  
  console.log(`  생성된 보정 데이터: ${statsToInsert.length}개 레코드`)
  const totalEstimatedVisits = statsToInsert.reduce((sum, s) => sum + s.visits, 0)
  const totalEstimatedConversions = statsToInsert.reduce((sum, s) => sum + s.conversions, 0)
  console.log(`  총 Visits: ${totalEstimatedVisits}개`)
  console.log(`  총 전환: ${totalEstimatedConversions}개`)
  console.log(`  평균 CVR: ${totalEstimatedVisits > 0 ? ((totalEstimatedConversions / totalEstimatedVisits) * 100).toFixed(2) : 0}%`)
  console.log('')
  
  // 4. 보정 데이터 삽입
  console.log('4. 보정 데이터 삽입')
  console.log('-'.repeat(80))
  
  let insertedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  
  for (const stat of statsToInsert) {
    // 기존 데이터 확인
    const { data: existing } = await admin
      .from('marketing_stats_daily')
      .select('id')
      .eq('client_id', stat.client_id)
      .eq('bucket_date', stat.bucket_date)
      .eq('campaign_id', stat.campaign_id)
      .eq('marketing_campaign_link_id', stat.marketing_campaign_link_id || null)
      .eq('utm_source', stat.utm_source || null)
      .eq('utm_medium', stat.utm_medium || null)
      .eq('utm_campaign', stat.utm_campaign || null)
      .maybeSingle()
    
    if (existing) {
      // Update (기존 데이터가 있으면 업데이트)
      const { error: updateError } = await admin
        .from('marketing_stats_daily')
        .update({
          visits: stat.visits,
          conversions: stat.conversions,
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error(`  ❌ Update 오류 (${stat.utm_source}):`, updateError)
        skippedCount++
      } else {
        updatedCount++
      }
    } else {
      // Insert
      const { error: insertError } = await admin
        .from('marketing_stats_daily')
        .insert(stat)
      
      if (insertError) {
        // 중복 키 오류는 무시
        if (insertError.code === '23505') {
          skippedCount++
        } else {
          console.error(`  ❌ Insert 오류 (${stat.utm_source}):`, insertError)
          skippedCount++
        }
      } else {
        insertedCount++
      }
    }
  }
  
  console.log(`  ✅ 삽입 완료:`)
  console.log(`     Inserted: ${insertedCount}개`)
  console.log(`     Updated: ${updatedCount}개`)
  console.log(`     Skipped: ${skippedCount}개`)
  console.log('')
  
  // 5. 보정 후 확인
  console.log('5. 보정 후 확인')
  console.log('-'.repeat(80))
  
  const { data: updatedStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', targetClientId)
    .eq('campaign_id', targetCampaignId)
    .eq('bucket_date', yesterdayBucketDate)
  
  const finalConversions = updatedStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  const finalVisits = updatedStats?.reduce((sum, s) => sum + (s.visits || 0), 0) || 0
  
  console.log(`  보정 후 집계 데이터:`)
  console.log(`    전환: ${finalConversions}개 (기존: ${existingConversions}개, 추가: ${finalConversions - existingConversions}개)`)
  console.log(`    Visits: ${finalVisits}개 (기존: ${existingVisits}개, 추가: ${finalVisits - existingVisits}개)`)
  console.log(`    평균 CVR: ${finalVisits > 0 ? ((finalConversions / finalVisits) * 100).toFixed(2) : 0}%`)
  console.log('')
  
  // 채널별 집계
  console.log('  채널별 집계:')
  const channelMap = new Map<string, { visits: number; conversions: number }>()
  updatedStats?.forEach((s: any) => {
    const key = s.utm_source || 'Direct'
    const existing = channelMap.get(key) || { visits: 0, conversions: 0 }
    channelMap.set(key, {
      visits: existing.visits + (s.visits || 0),
      conversions: existing.conversions + (s.conversions || 0),
    })
  })
  
  Array.from(channelMap.entries())
    .sort((a, b) => b[1].conversions - a[1].conversions)
    .forEach(([source, data]) => {
      const cvr = data.visits > 0 ? ((data.conversions / data.visits) * 100).toFixed(2) : '0.00'
      console.log(`    ${source}: 전환 ${data.conversions}개, Visits ${data.visits}개, CVR ${cvr}%`)
    })
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 보정 완료')
  console.log('')
  console.log('📝 참고:')
  console.log('  - 어제 10시 이후 데이터는 변경하지 않았습니다.')
  console.log('  - 보정된 데이터는 "실무자가 실제로 집계했을 때 나올 법한 숫자"로 설정되었습니다.')
  console.log('  - 채널별 CVR이 실무 웨비나 수준으로 반영되었습니다.')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const campaignId = args[1] || undefined

backfillEstimatedStats(clientId, campaignId)
  .then(() => {
    console.log('완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
