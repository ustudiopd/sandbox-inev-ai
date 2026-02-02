/**
 * 링크 통계 조정 스크립트
 * 
 * 1. 특정 링크들을 삭제하고 다른 곳에 이동
 * 2. 나머지 링크들의 visits를 100 이하로 조절
 * 
 * 사용법:
 *   npx tsx scripts/adjust-link-stats.ts [clientId] [campaignId 또는 webinarId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

// 삭제할 링크 이름들
const LINKS_TO_REMOVE = [
  'SNS/메시지',
  '협회/파트너',
  '키워트 배너',
]

// Visits를 100 이하로 조절할 링크들 (제외할 링크들)
const LINKS_TO_ADJUST = [
  '커뮤니티_키인유즈케이스웨비나 상세페이지',
  '오픈카톡_유즈케이스웨비나',
  '커뮤니티_키인유즈케이스웨비나',
  '협회',
  '카카오채널메세지_상세페이지',
  '키워트홈페이지 배너',
  '워트홈페이지_상세페이지',
  '인스타그램 _상세페이지',
  '메타 콘텐츠_상세페이지',
  '링크드인 콘텐츠_상세페이지',
  '인블로그 콘텐츠',
  '인블로그',
  '카카오채널메세지',
  '헤이데어 배너',
  '키워트 홈페이지 배너',
  '인스타 피드',
  '메타 콘텐츠',
  '링크드인 콘텐츠',
]

async function adjustLinkStats(clientId?: string, targetId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('링크 통계 조정')
  console.log('='.repeat(80))
  console.log('')
  
  if (!clientId) {
    console.log('❌ clientId가 필요합니다.')
    console.log('사용법: npx tsx scripts/adjust-link-stats.ts [clientId] [campaignId 또는 webinarId]')
    return
  }
  
  console.log(`클라이언트 ID: ${clientId}`)
  if (targetId) {
    console.log(`타겟 ID: ${targetId}`)
  }
  console.log('')
  
  // 1. 웨비나 또는 캠페인 찾기
  let campaignId: string | null = null
  let webinarId: string | null = null
  
  if (targetId) {
    // 웨비나인지 확인
    const { data: webinar } = await admin
      .from('webinars')
      .select('id, registration_campaign_id')
      .eq('id', targetId)
      .maybeSingle()
    
    if (webinar) {
      webinarId = webinar.id
      campaignId = webinar.registration_campaign_id
      console.log(`✅ 웨비나 찾음: ${webinarId}`)
      if (campaignId) {
        console.log(`   등록 캠페인 ID: ${campaignId}`)
      }
    } else {
      // 캠페인인지 확인
      const { data: campaign } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('id', targetId)
        .maybeSingle()
      
      if (campaign) {
        campaignId = campaign.id
        console.log(`✅ 캠페인 찾음: ${campaignId}`)
      }
    }
  }
  
  // "AI 특허리서치 실무 활용 웨비나"로 검색
  if (!campaignId && !webinarId) {
    console.log('🔍 "AI 특허리서치 실무 활용 웨비나" 검색 중...')
    
    const { data: webinars } = await admin
      .from('webinars')
      .select('id, registration_campaign_id, title')
      .ilike('title', '%AI 특허리서치%')
      .eq('client_id', clientId)
      .limit(5)
    
    if (webinars && webinars.length > 0) {
      const webinar = webinars[0]
      webinarId = webinar.id
      campaignId = webinar.registration_campaign_id
      console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinarId})`)
      if (campaignId) {
        console.log(`   등록 캠페인 ID: ${campaignId}`)
      }
    } else {
      // 캠페인으로 검색
      const { data: campaigns } = await admin
        .from('event_survey_campaigns')
        .select('id, title')
        .ilike('title', '%AI 특허리서치%')
        .eq('client_id', clientId)
        .limit(5)
      
      if (campaigns && campaigns.length > 0) {
        campaignId = campaigns[0].id
        console.log(`✅ 캠페인 찾음: ${campaigns[0].title} (ID: ${campaignId})`)
      }
    }
  }
  
  if (!campaignId && !webinarId) {
    console.log('❌ 웨비나 또는 캠페인을 찾을 수 없습니다.')
    return
  }
  
  console.log('')
  
  // 2. 링크 목록 조회
  console.log('2. 링크 목록 조회')
  console.log('-'.repeat(80))
  
  let linksQuery = admin
    .from('campaign_link_meta')
    .select('*')
    .eq('client_id', clientId)
  
  if (campaignId) {
    linksQuery = linksQuery.eq('target_campaign_id', campaignId)
  } else if (webinarId) {
    linksQuery = linksQuery.eq('target_webinar_id', webinarId)
  }
  
  const { data: links, error: linksError } = await linksQuery.order('created_at', { ascending: false })
  
  if (linksError) {
    console.error('❌ 링크 조회 오류:', linksError)
    return
  }
  
  if (!links || links.length === 0) {
    console.log('  링크가 없습니다.')
    return
  }
  
  console.log(`  총 ${links.length}개의 링크 발견`)
  console.log('')
  
  // 3. 삭제할 링크 찾기 및 통계 수집
  console.log('3. 삭제할 링크 처리 및 통계 수집')
  console.log('-'.repeat(80))
  
  const linksToRemove = links.filter(link => 
    LINKS_TO_REMOVE.some(name => link.name.includes(name))
  )
  
  // 삭제할 링크들의 통계를 수집 (다른 링크에 분배하기 위해)
  let totalStatsToDistribute: { bucket_date: string; visits: number; conversions: number; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }[] = []
  let totalVisitsToDistribute = 0
  let totalConversionsToDistribute = 0
  
  if (linksToRemove.length === 0) {
    console.log('  삭제할 링크가 없습니다.')
  } else {
    console.log(`  삭제할 링크 ${linksToRemove.length}개 발견:`)
    
    for (const link of linksToRemove) {
      console.log(`    - ${link.name} (${link.id})`)
      
      // 통계 데이터 조회
      const { data: stats } = await admin
        .from('marketing_stats_daily')
        .select('*')
        .eq('marketing_campaign_link_id', link.id)
        .order('bucket_date', { ascending: true })
      
      if (stats && stats.length > 0) {
        console.log(`      통계 데이터 ${stats.length}개 발견`)
        
        // 통계 데이터 수집 (날짜별로 그룹화)
        const statsByDate = new Map<string, { visits: number; conversions: number; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }>()
        
        for (const stat of stats) {
          const dateKey = stat.bucket_date
          const existing = statsByDate.get(dateKey) || { visits: 0, conversions: 0, utm_source: stat.utm_source, utm_medium: stat.utm_medium, utm_campaign: stat.utm_campaign }
          existing.visits += stat.visits || 0
          existing.conversions += stat.conversions || 0
          statsByDate.set(dateKey, existing)
        }
        
        // 날짜별 통계를 배열로 변환
        for (const [date, stat] of statsByDate.entries()) {
          totalStatsToDistribute.push({
            bucket_date: date,
            visits: stat.visits,
            conversions: stat.conversions,
            utm_source: stat.utm_source,
            utm_medium: stat.utm_medium,
            utm_campaign: stat.utm_campaign,
          })
          totalVisitsToDistribute += stat.visits
          totalConversionsToDistribute += stat.conversions
        }
        
        console.log(`      총 Visits: ${totalVisitsToDistribute}, 전환: ${totalConversionsToDistribute}`)
        
        // 통계 데이터 삭제
        const { error: deleteStatsError } = await admin
          .from('marketing_stats_daily')
          .delete()
          .eq('marketing_campaign_link_id', link.id)
        
        if (deleteStatsError) {
          console.error(`      ❌ 통계 데이터 삭제 오류:`, deleteStatsError)
        } else {
          console.log(`      ✅ 통계 데이터 삭제 완료`)
        }
      }
      
      // 링크 삭제 (archived 상태로 변경)
      const { error: deleteError } = await admin
        .from('campaign_link_meta')
        .update({ status: 'archived' })
        .eq('id', link.id)
      
      if (deleteError) {
        console.error(`      ❌ 링크 삭제 오류:`, deleteError)
      } else {
        console.log(`      ✅ 링크 삭제 완료 (archived 상태로 변경)`)
      }
    }
  }
  
  console.log('')
  
  // 4. 통계 분배할 링크들 찾기 (조절할 링크들)
  console.log('4. 통계 분배 대상 링크 찾기')
  console.log('-'.repeat(80))
  
  const linksToAdjust = links.filter(link => 
    !linksToRemove.some(removed => removed.id === link.id) &&
    LINKS_TO_ADJUST.some(name => link.name.includes(name))
  )
  
  if (linksToAdjust.length === 0) {
    console.log('  분배할 링크가 없습니다.')
  } else {
    console.log(`  분배 대상 링크 ${linksToAdjust.length}개 발견`)
    
    // 통계를 분배할 링크들에 적당히 분배
    if (totalStatsToDistribute.length > 0 && linksToAdjust.length > 0) {
      console.log(`  총 ${totalVisitsToDistribute} Visits, ${totalConversionsToDistribute} 전환을 분배합니다.`)
      
      // 각 링크에 균등하게 분배 (날짜별로도 분배)
      const visitsPerLink = Math.floor(totalVisitsToDistribute / linksToAdjust.length)
      const conversionsPerLink = Math.floor(totalConversionsToDistribute / linksToAdjust.length)
      const remainingVisits = totalVisitsToDistribute - (visitsPerLink * linksToAdjust.length)
      const remainingConversions = totalConversionsToDistribute - (conversionsPerLink * linksToAdjust.length)
      
      for (let i = 0; i < linksToAdjust.length; i++) {
        const link = linksToAdjust[i]
        const extraVisits = i === 0 ? remainingVisits : 0 // 첫 번째 링크에 나머지 추가
        const extraConversions = i === 0 ? remainingConversions : 0
        
        const targetVisits = visitsPerLink + extraVisits
        const targetConversions = conversionsPerLink + extraConversions
        
        console.log(`    - ${link.name}: Visits +${targetVisits}, 전환 +${targetConversions}`)
        
        // 링크의 가장 최근 통계 찾기
        const { data: recentStats } = await admin
          .from('marketing_stats_daily')
          .select('id, visits, conversions, bucket_date')
          .eq('marketing_campaign_link_id', link.id)
          .order('bucket_date', { ascending: false })
          .limit(1)
        
        if (recentStats && recentStats.length > 0) {
          const recentStat = recentStats[0]
          const { error: updateError } = await admin
            .from('marketing_stats_daily')
            .update({
              visits: (recentStat.visits || 0) + targetVisits,
              conversions: (recentStat.conversions || 0) + targetConversions,
            })
            .eq('id', recentStat.id)
          
          if (updateError) {
            console.error(`      ❌ 통계 업데이트 오류:`, updateError)
          } else {
            console.log(`      ✅ ${link.name}: Visits +${targetVisits}, 전환 +${targetConversions}`)
          }
        } else {
          // 통계가 없으면 가장 최근 날짜로 새로 생성
          const latestDate = totalStatsToDistribute.length > 0 
            ? totalStatsToDistribute[totalStatsToDistribute.length - 1].bucket_date
            : new Date().toISOString().split('T')[0]
          
          const { error: insertError } = await admin
            .from('marketing_stats_daily')
            .insert({
              client_id: clientId,
              campaign_id: campaignId,
              bucket_date: latestDate,
              marketing_campaign_link_id: link.id,
              visits: targetVisits,
              conversions: targetConversions,
            })
          
          if (insertError) {
            console.error(`      ❌ 통계 생성 오류:`, insertError)
          } else {
            console.log(`      ✅ ${link.name}: 새 통계 생성 (Visits +${targetVisits}, 전환 +${targetConversions})`)
          }
        }
      }
      
      console.log(`  ✅ 통계 분배 완료`)
    }
  }
  
  console.log('')
  
  // 5. Visits 조절할 링크들 처리 (100 이하로)
  console.log('5. Visits 조절 (100 이하로)')
  console.log('-'.repeat(80))
  
  // linksToAdjust 재정의 (5번 섹션용)
  const linksToAdjustForReduction = links.filter(link => 
    !linksToRemove.some(removed => removed.id === link.id) &&
    LINKS_TO_ADJUST.some(name => link.name.includes(name))
  )
  
  if (linksToAdjustForReduction.length === 0) {
    console.log('  조절할 링크가 없습니다.')
  } else {
    console.log(`  조절할 링크 ${linksToAdjustForReduction.length}개 발견:`)
    
    for (const link of linksToAdjustForReduction) {
      console.log(`    - ${link.name} (${link.id})`)
      
      // 통계 데이터 조회
      const { data: stats } = await admin
        .from('marketing_stats_daily')
        .select('*')
        .eq('marketing_campaign_link_id', link.id)
        .order('bucket_date', { ascending: false })
      
      if (!stats || stats.length === 0) {
        console.log(`      통계 데이터 없음, 건너뜀`)
        continue
      }
      
      // 전체 visits 합산
      const totalVisits = stats.reduce((sum, s) => sum + (s.visits || 0), 0)
      const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      
      console.log(`      현재 총 Visits: ${totalVisits}, 전환: ${totalConversions}`)
      
      if (totalVisits <= 100) {
        console.log(`      ✅ 이미 100 이하입니다.`)
        continue
      }
      
      // 비율 계산 (100 이하로 조절)
      const ratio = 100 / totalVisits
      const targetVisits = 100
      const targetConversions = Math.round(totalConversions * ratio)
      
      console.log(`      조절 비율: ${(ratio * 100).toFixed(2)}%`)
      console.log(`      목표 Visits: ${targetVisits}, 전환: ${targetConversions}`)
      
      // 각 통계 데이터를 비율에 맞게 조절
      let adjustedVisits = 0
      let adjustedConversions = 0
      
      for (const stat of stats) {
        const newVisits = Math.round((stat.visits || 0) * ratio)
        const newConversions = Math.round((stat.conversions || 0) * ratio)
        
        adjustedVisits += newVisits
        adjustedConversions += newConversions
        
        const { error: updateError } = await admin
          .from('marketing_stats_daily')
          .update({
            visits: newVisits,
            conversions: newConversions,
          })
          .eq('id', stat.id)
        
        if (updateError) {
          console.error(`        ❌ 통계 업데이트 오류:`, updateError)
        }
      }
      
      // 마지막 레코드에 나머지 조정 (반올림 오차 보정)
      if (stats.length > 0 && (adjustedVisits !== targetVisits || adjustedConversions !== targetConversions)) {
        const lastStat = stats[stats.length - 1]
        const diffVisits = targetVisits - adjustedVisits
        const diffConversions = targetConversions - adjustedConversions
        
        const { data: lastStatData } = await admin
          .from('marketing_stats_daily')
          .select('visits, conversions')
          .eq('id', lastStat.id)
          .single()
        
        if (lastStatData) {
          const { error: updateError } = await admin
            .from('marketing_stats_daily')
            .update({
              visits: Math.max(0, (lastStatData.visits || 0) + diffVisits),
              conversions: Math.max(0, (lastStatData.conversions || 0) + diffConversions),
            })
            .eq('id', lastStat.id)
          
          if (updateError) {
            console.error(`        ❌ 마지막 통계 보정 오류:`, updateError)
          }
        }
      }
      
      console.log(`      ✅ 조절 완료: Visits ${totalVisits} → ${targetVisits}, 전환 ${totalConversions} → ${targetConversions}`)
    }
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 작업 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const targetId = args[1] || undefined

adjustLinkStats(clientId, targetId)
  .then(() => {
    console.log('완료')
    setTimeout(() => {
      process.exit(0)
    }, 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => {
      process.exit(1)
    }, 100)
  })
