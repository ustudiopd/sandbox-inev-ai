/**
 * 집계 테이블 상태 확인 및 집계 실행 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/check-aggregation-status.ts [clientId] [from] [to]
 * 
 * 예시:
 *   npx tsx scripts/check-aggregation-status.ts
 *   npx tsx scripts/check-aggregation-status.ts 55317496-d3d6-4e65-81d3-405892de78ab
 *   npx tsx scripts/check-aggregation-status.ts 55317496-d3d6-4e65-81d3-405892de78ab 2026-02-01 2026-02-02
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkAggregationStatus(clientId?: string, fromDate?: string, toDate?: string) {
  const admin = createAdminSupabase()
  
  // 기본값 설정
  const defaultToDate = toDate || new Date().toISOString().split('T')[0]
  const defaultFromDate = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  console.log('='.repeat(80))
  console.log('집계 테이블 상태 확인')
  console.log('='.repeat(80))
  console.log(`날짜 범위: ${defaultFromDate} ~ ${defaultToDate}`)
  if (clientId) {
    console.log(`클라이언트 ID: ${clientId}`)
  }
  console.log('')
  
  // 1. Raw 데이터 확인 (event_survey_entries)
  console.log('1. Raw 데이터 확인 (event_survey_entries)')
  console.log('-'.repeat(80))
  
  let entriesQuery = admin
    .from('event_survey_entries')
    .select('id, campaign_id, marketing_campaign_link_id, utm_source, utm_medium, utm_campaign, created_at', { count: 'exact' })
    .gte('created_at', `${defaultFromDate}T00:00:00Z`)
    .lte('created_at', `${defaultToDate}T23:59:59Z`)
  
  if (clientId) {
    // 클라이언트의 캠페인 ID 목록 조회
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id)
      entriesQuery = entriesQuery.in('campaign_id', campaignIds)
    } else {
      console.log('  ⚠️  해당 클라이언트의 캠페인이 없습니다.')
      return
    }
  }
  
  const { data: entries, count: entriesCount, error: entriesError } = await entriesQuery
  
  if (entriesError) {
    console.error('  ❌ 오류:', entriesError)
    return
  }
  
  console.log(`  총 전환 수: ${entriesCount || 0}개`)
  
  // UTM 및 링크 ID 통계
  const withUTM = entries?.filter(e => e.utm_source || e.utm_medium || e.utm_campaign).length || 0
  const withLinkId = entries?.filter(e => e.marketing_campaign_link_id).length || 0
  
  console.log(`  UTM 있는 전환: ${withUTM}개`)
  console.log(`  링크 ID 있는 전환: ${withLinkId}개`)
  console.log('')
  
  // 2. 집계 테이블 확인
  console.log('2. 집계 테이블 확인 (marketing_stats_daily)')
  console.log('-'.repeat(80))
  
  let statsQuery = admin
    .from('marketing_stats_daily')
    .select('*', { count: 'exact' })
    .gte('bucket_date', defaultFromDate)
    .lte('bucket_date', defaultToDate)
  
  if (clientId) {
    statsQuery = statsQuery.eq('client_id', clientId)
  }
  
  const { data: stats, count: statsCount, error: statsError } = await statsQuery
  
  if (statsError) {
    console.error('  ❌ 오류:', statsError)
  } else {
    console.log(`  집계 레코드 수: ${statsCount || 0}개`)
    
    if (stats && stats.length > 0) {
      const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      const totalVisits = stats.reduce((sum, s) => sum + (s.visits || 0), 0)
      
      console.log(`  집계된 총 전환 수: ${totalConversions}개`)
      console.log(`  집계된 총 Visits: ${totalVisits}개`)
      
      // 날짜별 집계
      const dateMap = new Map<string, { conversions: number; visits: number }>()
      stats.forEach(s => {
        const date = s.bucket_date
        const existing = dateMap.get(date) || { conversions: 0, visits: 0 }
        dateMap.set(date, {
          conversions: existing.conversions + (s.conversions || 0),
          visits: existing.visits + (s.visits || 0)
        })
      })
      
      console.log('  날짜별 집계:')
      Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, data]) => {
          console.log(`    ${date}: 전환 ${data.conversions}개, Visits ${data.visits}개`)
        })
    } else {
      console.log('  ⚠️  집계 테이블에 데이터가 없습니다.')
    }
  }
  console.log('')
  
  // 3. 비교
  console.log('3. 비교')
  console.log('-'.repeat(80))
  if (stats && stats.length > 0) {
    const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    const rawCount = entriesCount || 0
    
    if (totalConversions === rawCount) {
      console.log(`  ✅ 일치: Raw ${rawCount}개 = 집계 ${totalConversions}개`)
    } else {
      console.log(`  ⚠️  불일치: Raw ${rawCount}개 ≠ 집계 ${totalConversions}개`)
      console.log(`  차이: ${rawCount - totalConversions}개`)
    }
  } else {
    console.log('  ⚠️  집계 테이블에 데이터가 없어 비교할 수 없습니다.')
    console.log(`  Raw 데이터: ${entriesCount || 0}개`)
  }
  console.log('')
  
  // 4. 집계 실행 필요 여부 확인
  if (!stats || stats.length === 0) {
    console.log('4. 집계 실행 필요')
    console.log('-'.repeat(80))
    console.log('  집계 테이블에 데이터가 없습니다. 집계를 실행해야 합니다.')
    console.log('  수동 실행 방법:')
    console.log(`    POST /api/cron/aggregate-marketing-stats`)
    console.log(`    Body: { "from": "${defaultFromDate}", "to": "${defaultToDate}"${clientId ? `, "client_id": "${clientId}"` : ''} }`)
  }
  
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const fromDate = args[1] || undefined
const toDate = args[2] || undefined

checkAggregationStatus(clientId, fromDate, toDate)
  .then(() => {
    console.log('완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
