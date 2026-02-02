/**
 * 캠페인 링크와 전환 성과 데이터 동기화 스크립트
 * 
 * 목적: 실제 전환 데이터를 확인하고 marketing_stats_daily의 전환 수를 조정
 * 
 * 사용법:
 *   npx tsx scripts/sync-conversions-with-links.ts [clientId] [campaignId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function syncConversionsWithLinks(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('캠페인 링크와 전환 성과 데이터 동기화')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 1. 캠페인의 모든 활성 링크 조회
  console.log('1. 캠페인 링크 조회')
  console.log('-'.repeat(80))
  
  const { data: links } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign, status')
    .eq('client_id', clientId)
    .eq('target_campaign_id', campaignId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  
  if (!links || links.length === 0) {
    console.log('  ⚠️  활성 링크가 없습니다.')
    return
  }
  
  console.log(`  총 ${links.length}개 활성 링크 발견`)
  console.log('')
  
  // 2. 실제 전환 데이터 확인 (event_survey_entries 테이블)
  console.log('2. 실제 전환 데이터 확인')
  console.log('-'.repeat(80))
  
  // event_survey_entries 테이블에서 marketing_campaign_link_id로 그룹화하여 전환 수 확인
  const { data: actualConversions } = await admin
    .from('event_survey_entries')
    .select('marketing_campaign_link_id, utm_source, utm_medium, utm_campaign, created_at')
    .eq('campaign_id', campaignId)
    .not('marketing_campaign_link_id', 'is', null)
  
  // UTM으로도 그룹화 (marketing_campaign_link_id가 없는 경우 대비)
  const { data: utmConversions } = await admin
    .from('event_survey_entries')
    .select('utm_source, utm_medium, utm_campaign, created_at')
    .eq('campaign_id', campaignId)
    .is('marketing_campaign_link_id', null)
    .not('utm_source', 'is', null)
  
  // 링크별 실제 전환 수 계산
  const linkConversionMap = new Map<string, number>()
  const utmConversionMap = new Map<string, number>()
  
  if (actualConversions) {
    actualConversions.forEach((reg: any) => {
      if (reg.marketing_campaign_link_id) {
        const count = linkConversionMap.get(reg.marketing_campaign_link_id) || 0
        linkConversionMap.set(reg.marketing_campaign_link_id, count + 1)
      }
    })
  }
  
  if (utmConversions) {
    utmConversions.forEach((reg: any) => {
      const key = `${reg.utm_source}/${reg.utm_medium}/${reg.utm_campaign || ''}`
      const count = utmConversionMap.get(key) || 0
      utmConversionMap.set(key, count + 1)
    })
  }
  
  console.log(`  링크 ID로 매칭된 전환: ${linkConversionMap.size}개 링크`)
  console.log(`  UTM으로 매칭된 전환: ${utmConversionMap.size}개 UTM 조합`)
  console.log('')
  
  // 3. marketing_stats_daily의 현재 전환 수 확인
  console.log('3. marketing_stats_daily 현재 상태 확인')
  console.log('-'.repeat(80))
  
  const { data: currentStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .not('marketing_campaign_link_id', 'is', null)
    .order('bucket_date', { ascending: true })
  
  // 링크별로 집계
  const statsByLink = new Map<string, { visits: number; conversions: number; dates: string[] }>()
  
  if (currentStats) {
    currentStats.forEach((stat: any) => {
      const linkId = stat.marketing_campaign_link_id
      const existing = statsByLink.get(linkId) || { visits: 0, conversions: 0, dates: [] }
      existing.visits += stat.visits || 0
      existing.conversions += stat.conversions || 0
      if (!existing.dates.includes(stat.bucket_date)) {
        existing.dates.push(stat.bucket_date)
      }
      statsByLink.set(linkId, existing)
    })
  }
  
  console.log(`  총 ${statsByLink.size}개 링크의 통계 데이터 발견`)
  console.log('')
  
  // 4. 비교 및 조정 계획
  console.log('4. 비교 및 조정 계획')
  console.log('-'.repeat(80))
  
  const adjustments: Array<{
    linkId: string
    linkName: string
    currentConversions: number
    actualConversions: number
    difference: number
  }> = []
  
  for (const link of links) {
    const currentConversions = statsByLink.get(link.id)?.conversions || 0
    const actualConversions = linkConversionMap.get(link.id) || 0
    
    if (currentConversions !== actualConversions) {
      adjustments.push({
        linkId: link.id,
        linkName: link.name,
        currentConversions,
        actualConversions,
        difference: actualConversions - currentConversions,
      })
    }
  }
  
  if (adjustments.length === 0) {
    console.log('  ✅ 모든 링크의 전환 수가 실제 데이터와 일치합니다.')
    return
  }
  
  console.log(`  조정이 필요한 링크: ${adjustments.length}개`)
  adjustments.forEach(adj => {
    console.log(`    - ${adj.linkName}: 현재 ${adj.currentConversions} → 실제 ${adj.actualConversions} (차이: ${adj.difference > 0 ? '+' : ''}${adj.difference})`)
  })
  console.log('')
  
  // 5. 실제 전환 수로 조정
  console.log('5. 실제 전환 수로 조정')
  console.log('-'.repeat(80))
  
  let updatedCount = 0
  let errorCount = 0
  
  for (const adj of adjustments) {
    // 해당 링크의 모든 날짜 통계를 찾아서 비율로 조정
    const linkStats = currentStats?.filter((s: any) => s.marketing_campaign_link_id === adj.linkId) || []
    
    if (linkStats.length === 0) {
      console.log(`  ⚠️  ${adj.linkName}: 통계 데이터가 없습니다.`)
      continue
    }
    
    const totalCurrentConversions = linkStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    
    if (totalCurrentConversions === 0 && adj.actualConversions > 0) {
      // 전환이 없었는데 실제로는 있는 경우, 비율로 분배
      const totalVisits = linkStats.reduce((sum, s) => sum + (s.visits || 0), 0)
      const avgCVR = totalVisits > 0 ? adj.actualConversions / totalVisits : 0
      
      for (const stat of linkStats) {
        const newConversions = Math.round((stat.visits || 0) * avgCVR)
        
        const { error } = await admin
          .from('marketing_stats_daily')
          .update({ conversions: newConversions })
          .eq('id', stat.id)
        
        if (error) {
          console.error(`    ❌ ${stat.bucket_date}: ${error.message}`)
          errorCount++
        } else {
          console.log(`    ✅ ${stat.bucket_date}: 전환 ${stat.conversions} → ${newConversions}`)
        }
      }
      updatedCount++
    } else if (totalCurrentConversions > 0) {
      // 기존 전환이 있는 경우, 비율로 조정
      const ratio = adj.actualConversions / totalCurrentConversions
      
      for (const stat of linkStats) {
        const newConversions = Math.round((stat.conversions || 0) * ratio)
        
        const { error } = await admin
          .from('marketing_stats_daily')
          .update({ conversions: newConversions })
          .eq('id', stat.id)
        
        if (error) {
          console.error(`    ❌ ${stat.bucket_date}: ${error.message}`)
          errorCount++
        } else {
          console.log(`    ✅ ${stat.bucket_date}: 전환 ${stat.conversions} → ${newConversions}`)
        }
      }
      updatedCount++
    }
  }
  
  console.log('')
  console.log(`  완료: ${updatedCount}개 링크 조정, ${errorCount}개 오류`)
  console.log('')
  
  // 6. 최종 검증
  console.log('6. 최종 검증')
  console.log('-'.repeat(80))
  
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .not('marketing_campaign_link_id', 'is', null)
  
  const finalStatsByLink = new Map<string, number>()
  if (finalStats) {
    finalStats.forEach((stat: any) => {
      const linkId = stat.marketing_campaign_link_id
      const current = finalStatsByLink.get(linkId) || 0
      finalStatsByLink.set(linkId, current + (stat.conversions || 0))
    })
  }
  
  console.log('  링크별 최종 비교:')
  for (const link of links) {
    const statsConversions = finalStatsByLink.get(link.id) || 0
    const actualConversions = linkConversionMap.get(link.id) || 0
    const match = statsConversions === actualConversions ? '✅' : '⚠️'
    console.log(`    ${match} ${link.name}: 통계 ${statsConversions}, 실제 ${actualConversions}`)
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 동기화 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

syncConversionsWithLinks(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
