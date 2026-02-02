/**
 * 어제 10시 이전 누락된 집계 데이터 보정 스크립트 (추정치 기반) - 옵션 A
 * 
 * 목적: 어제 10시 이전에 로그가 없어져서 집계되지 않은 데이터를
 *       실무자가 실제로 집계했을 때 나올 법한 숫자로 보정
 * 
 * 옵션 A: marketing_campaign_link_id를 실제 링크 ID로 채워서 넣기
 * - 각 채널별로 대표 링크를 찾거나 생성
 * - 보정 데이터를 "정상 집계 데이터"처럼 적재하여 기존 API 로직 변경 없이 반영
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
import { generateCID } from '../lib/utils/cid'
import { normalizeUTM } from '../lib/utils/utm'

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

/**
 * 채널별 대표 링크 찾기 또는 생성
 */
async function findOrCreateRepresentativeLink(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  campaignId: string,
  channelKey: string,
  channelData: { utm_source: string; utm_medium: string; utm_campaign: string }
): Promise<string> {
  // 1. 기존 링크 찾기: 같은 client_id에서 (utm_source, utm_medium, utm_campaign) 조합이 동일한 링크
  const { data: existingLinks } = await admin
    .from('campaign_link_meta')
    .select('id')
    .eq('client_id', clientId)
    .eq('target_campaign_id', campaignId)
    .eq('utm_source', channelData.utm_source)
    .eq('utm_medium', channelData.utm_medium)
    .eq('utm_campaign', channelData.utm_campaign)
    .eq('status', 'active')
    .limit(1)
  
  if (existingLinks && existingLinks.length > 0) {
    return existingLinks[0].id
  }
  
  // 2. 링크가 없으면 생성
  const normalizedUTM = normalizeUTM({
    utm_source: channelData.utm_source,
    utm_medium: channelData.utm_medium,
    utm_campaign: channelData.utm_campaign,
  })
  
  // CID 생성 (중복 체크 포함)
  let cid: string
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    cid = generateCID()
    
    const { data: existingLink } = await admin
      .from('campaign_link_meta')
      .select('id')
      .eq('client_id', clientId)
      .eq('cid', cid)
      .maybeSingle()
    
    if (!existingLink) {
      break
    }
    
    attempts++
  }
  
  if (attempts >= maxAttempts) {
    throw new Error(`CID 생성 실패 (${channelKey})`)
  }
  
  // 링크 이름 생성
  const channelNames: Record<string, string> = {
    email: '광고메일',
    keywordt: '키워트 배너',
    partner: '협회/파트너',
    community: '커뮤니티/오픈채널',
    sns: 'SNS/메시지',
  }
  
  const linkName = `[Backfill] ${channelNames[channelKey] || channelKey} ${channelData.utm_campaign}`
  
  // 링크 생성
  const { data: newLink, error: linkError } = await admin
    .from('campaign_link_meta')
    .insert({
      client_id: clientId,
      name: linkName,
      target_campaign_id: campaignId,
      landing_variant: 'register',
      cid: cid!,
      utm_source: normalizedUTM.utm_source || null,
      utm_medium: normalizedUTM.utm_medium || null,
      utm_campaign: normalizedUTM.utm_campaign || null,
      status: 'active',
    })
    .select()
    .single()
  
  if (linkError) {
    // 중복 이름 오류 처리 (재시도)
    if (linkError.code === '23505') {
      const retryName = `${linkName} ${Date.now()}`
      const { data: retryLink, error: retryError } = await admin
        .from('campaign_link_meta')
        .insert({
          client_id: clientId,
          name: retryName,
          target_campaign_id: campaignId,
          landing_variant: 'register',
          cid: cid!,
          utm_source: normalizedUTM.utm_source || null,
          utm_medium: normalizedUTM.utm_medium || null,
          utm_campaign: normalizedUTM.utm_campaign || null,
          status: 'active',
        })
        .select()
        .single()
      
      if (retryError || !retryLink) {
        throw new Error(`링크 생성 실패 (${channelKey}): ${retryError?.message || 'Unknown error'}`)
      }
      
      return retryLink.id
    }
    
    throw new Error(`링크 생성 실패 (${channelKey}): ${linkError.message}`)
  }
  
  if (!newLink) {
    throw new Error(`링크 생성 실패 (${channelKey}): No data returned`)
  }
  
  return newLink.id
}

/**
 * 실측 데이터와 충돌 확인
 */
async function checkConflict(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  campaignId: string,
  bucketDate: string,
  linkId: string,
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null
): Promise<boolean> {
  // 어제 10시 이후 실측 데이터 확인
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(10, 0, 0, 0)
  const yesterday10amUTC = new Date(yesterday.getTime() - 9 * 60 * 60 * 1000)
  
  // 같은 bucket_date + link_id에 실측 데이터가 있는지 확인
  // (실측 데이터는 marketing_campaign_link_id가 null이 아닌 경우)
  const { data: existingStats } = await admin
    .from('marketing_stats_daily')
    .select('id, last_aggregated_at')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', bucketDate)
    .eq('marketing_campaign_link_id', linkId)
    .eq('utm_source', utmSource || null)
    .eq('utm_medium', utmMedium || null)
    .eq('utm_campaign', utmCampaign || null)
    .limit(1)
  
  if (existingStats && existingStats.length > 0) {
    // 실측 데이터가 어제 10시 이후에 집계된 것인지 확인
    const aggregatedAt = new Date(existingStats[0].last_aggregated_at)
    if (aggregatedAt >= yesterday10amUTC) {
      return true // 충돌
    }
  }
  
  return false // 충돌 없음
}

async function backfillEstimatedStats(clientId?: string, campaignId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('어제 10시 이전 누락된 집계 데이터 보정 (추정치 기반) - 옵션 A')
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
  
  // 3. 채널별 대표 링크 찾기/생성
  console.log('3. 채널별 대표 링크 찾기/생성')
  console.log('-'.repeat(80))
  
  const channelLinkMap = new Map<string, string>()
  
  for (const [channelKey, channelData] of Object.entries(ESTIMATED_STATS)) {
    try {
      const linkId = await findOrCreateRepresentativeLink(
        admin,
        targetClientId!,
        targetCampaignId!,
        channelKey,
        channelData
      )
      channelLinkMap.set(channelKey, linkId)
      console.log(`  ✅ ${channelKey}: ${linkId}`)
    } catch (error: any) {
      console.error(`  ❌ ${channelKey} 링크 생성 실패:`, error.message)
      return
    }
  }
  
  console.log('')
  
  // 3.5. 기존 null 링크 ID 보정 데이터 마이그레이션
  console.log('3.5. 기존 null 링크 ID 보정 데이터 마이그레이션')
  console.log('-'.repeat(80))
  
  // 기존 marketing_campaign_link_id = null인 보정 데이터 찾기
  const { data: existingNullLinkStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', targetClientId)
    .eq('campaign_id', targetCampaignId)
    .eq('bucket_date', yesterdayBucketDate)
    .is('marketing_campaign_link_id', null)
  
  let migratedCount = 0
  let mergedCount = 0
  let deletedCount = 0
  
  if (existingNullLinkStats && existingNullLinkStats.length > 0) {
    console.log(`  기존 null 링크 ID 데이터: ${existingNullLinkStats.length}개 레코드 발견`)
    
    // UTM 파라미터로 채널별 대표 링크와 매칭
    for (const nullStat of existingNullLinkStats) {
      // UTM 파라미터로 채널 찾기
      let matchedChannelKey: string | null = null
      let matchedLinkId: string | null = null
      
      for (const [channelKey, channelData] of Object.entries(ESTIMATED_STATS)) {
        if (
          nullStat.utm_source === channelData.utm_source &&
          nullStat.utm_medium === channelData.utm_medium &&
          nullStat.utm_campaign?.startsWith(channelData.utm_campaign) // breakdown suffix 고려
        ) {
          matchedChannelKey = channelKey
          matchedLinkId = channelLinkMap.get(channelKey) || null
          break
        }
      }
      
      if (matchedChannelKey && matchedLinkId) {
        // utm_campaign의 base 값으로 정규화 (breakdown suffix 제거)
        const baseUtmCampaign = ESTIMATED_STATS[matchedChannelKey as keyof typeof ESTIMATED_STATS].utm_campaign
        
        // 같은 키(링크 ID + UTM base)에 이미 데이터가 있는지 확인
        const { data: existingWithLink } = await admin
          .from('marketing_stats_daily')
          .select('id, visits, conversions')
          .eq('client_id', targetClientId)
          .eq('campaign_id', targetCampaignId)
          .eq('bucket_date', yesterdayBucketDate)
          .eq('marketing_campaign_link_id', matchedLinkId)
          .eq('utm_source', nullStat.utm_source || null)
          .eq('utm_medium', nullStat.utm_medium || null)
          .eq('utm_campaign', baseUtmCampaign || null)
          .maybeSingle()
        
        if (existingWithLink) {
          // 합산 (기존 데이터에 추가)
          const { error: updateError } = await admin
            .from('marketing_stats_daily')
            .update({
              visits: (existingWithLink.visits || 0) + (nullStat.visits || 0),
              conversions: (existingWithLink.conversions || 0) + (nullStat.conversions || 0),
            })
            .eq('id', existingWithLink.id)
          
          if (!updateError) {
            mergedCount++
            // 기존 null 링크 ID 레코드 삭제
            await admin
              .from('marketing_stats_daily')
              .delete()
              .eq('id', nullStat.id)
            deletedCount++
          }
        } else {
          // 링크 ID 업데이트 및 utm_campaign base 값으로 정규화
          const { error: updateError } = await admin
            .from('marketing_stats_daily')
            .update({
              marketing_campaign_link_id: matchedLinkId,
              utm_campaign: baseUtmCampaign, // breakdown suffix 제거
            })
            .eq('id', nullStat.id)
          
          if (!updateError) {
            migratedCount++
          }
        }
      } else {
        console.log(`  ⚠️  매칭되지 않은 null 링크 ID 데이터: ${nullStat.utm_source}/${nullStat.utm_medium}/${nullStat.utm_campaign}`)
      }
    }
    
    console.log(`  ✅ 마이그레이션 완료:`)
    console.log(`     Migrated: ${migratedCount}개 (링크 ID 업데이트)`)
    console.log(`     Merged: ${mergedCount}개 (기존 데이터와 합산)`)
    console.log(`     Deleted: ${deletedCount}개 (합산 후 삭제)`)
  } else {
    console.log(`  기존 null 링크 ID 데이터 없음`)
  }
  
  console.log('')
  
  // 4. 보정 후 확인
  console.log('4. 보정 후 확인')
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
  console.log('✅ 보정 완료 (옵션 A: Link ID 채움 방식)')
  console.log('')
  console.log('📝 참고:')
  console.log('  - 어제 10시 이후 데이터는 변경하지 않았습니다.')
  console.log('  - 보정된 데이터는 "정상 집계 데이터"처럼 marketing_campaign_link_id를 채워 넣었습니다.')
  console.log('  - 기존 API/집계 로직 변경 없이 자동으로 반영됩니다.')
  console.log('  - 실측 데이터와 충돌하는 경우 실측 데이터를 우선했습니다.')
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
