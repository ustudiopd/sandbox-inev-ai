/**
 * 어제 10시 이전 누락된 집계 데이터 보정 스크립트
 * 
 * 목적: 어제 10시 이전에 로그가 없어져서 집계되지 않은 데이터를 집계 테이블에 보정
 * 
 * 사용법:
 *   npx tsx scripts/backfill-missing-aggregation-data.ts [clientId]
 * 
 * 예시:
 *   npx tsx scripts/backfill-missing-aggregation-data.ts
 *   npx tsx scripts/backfill-missing-aggregation-data.ts a556c562-03c3-4988-8b88-ae0a96648514
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'
import { aggregateMarketingStats } from '../app/api/cron/aggregate-marketing-stats/route'

dotenv.config({ path: '.env.local' })

async function backfillMissingAggregationData(clientId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('어제 10시 이전 누락된 집계 데이터 보정')
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
  
  // 어제 10시 이전 날짜 범위 (최근 7일)
  const sevenDaysAgo = new Date(yesterday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const fromBucketDate = sevenDaysAgo.toISOString().split('T')[0]
  
  console.log('📅 분석 기간:')
  console.log(`   시작: ${fromBucketDate} (UTC)`)
  console.log(`   종료: ${yesterdayBucketDate} 10:00 (KST) = ${yesterday10amUTC.toISOString()} (UTC)`)
  console.log('')
  
  // 1. Raw 데이터 확인 (어제 10시 이전)
  console.log('1. Raw 데이터 확인 (어제 10시 이전)')
  console.log('-'.repeat(80))
  
  let entriesQuery = admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id', { count: 'exact' })
    .gte('created_at', `${fromBucketDate}T00:00:00Z`)
    .lt('created_at', yesterday10amUTC.toISOString())
  
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
  
  const { data: rawEntries, count: rawCount, error: entriesError } = await entriesQuery
  
  if (entriesError) {
    console.error('  ❌ 오류:', entriesError)
    return
  }
  
  console.log(`  Raw 데이터 (어제 10시 이전): ${rawCount || 0}개`)
  console.log('')
  
  // 2. 집계 테이블 확인
  console.log('2. 집계 테이블 확인')
  console.log('-'.repeat(80))
  
  let statsQuery = admin
    .from('marketing_stats_daily')
    .select('*', { count: 'exact' })
    .gte('bucket_date', fromBucketDate)
    .lte('bucket_date', yesterdayBucketDate)
  
  if (clientId) {
    statsQuery = statsQuery.eq('client_id', clientId)
  }
  
  const { data: existingStats, count: statsCount, error: statsError } = await statsQuery
  
  if (statsError) {
    console.error('  ❌ 오류:', statsError)
    return
  }
  
  const aggregatedTotalConversions = existingStats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0
  console.log(`  집계 테이블 레코드 수: ${statsCount || 0}개`)
  console.log(`  집계된 전환 수: ${aggregatedTotalConversions}개`)
  console.log('')
  
  // 3. 누락된 데이터 확인
  console.log('3. 누락된 데이터 확인')
  console.log('-'.repeat(80))
  
  const missingCount = (rawCount || 0) - aggregatedTotalConversions
  console.log(`  Raw 데이터: ${rawCount || 0}개`)
  console.log(`  집계 테이블: ${aggregatedTotalConversions}개`)
  console.log(`  누락된 데이터: ${missingCount}개`)
  console.log('')
  
  if (missingCount <= 0) {
    console.log('  ✅ 누락된 데이터가 없습니다.')
    return
  }
  
  // 4. 보정 실행 여부 확인
  console.log('4. 보정 실행')
  console.log('-'.repeat(80))
  console.log(`  어제 10시 이전 데이터 (${fromBucketDate} ~ ${yesterdayBucketDate})를 집계 테이블에 보정합니다.`)
  console.log('')
  
  // 집계 함수 호출 (어제 10시 이전까지)
  try {
    const fromDate = new Date(`${fromBucketDate}T00:00:00Z`)
    const toDate = yesterday10amUTC
    
    console.log('  집계 실행 중...')
    const result = await aggregateMarketingStats(fromDate, toDate, clientId)
    
    console.log('  ✅ 보정 완료:')
    console.log(`     Upserted: ${result.upserted}개`)
    console.log(`     Total Visits: ${result.totalVisits || 0}개`)
    console.log(`     Total Conversions: ${result.totalConversions || 0}개`)
    console.log(`     Skipped Visits: ${result.skippedVisits || 0}개`)
    console.log(`     Skipped Conversions: ${result.skippedConversions || 0}개`)
    console.log('')
    
    // 5. 보정 후 확인
    console.log('5. 보정 후 확인')
    console.log('-'.repeat(80))
    
    const { data: updatedStats, count: updatedStatsCount } = await statsQuery
    
    if (updatedStats) {
      const updatedTotalConversions = updatedStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      console.log(`  집계 테이블 레코드 수: ${updatedStatsCount || 0}개`)
      console.log(`  집계된 전환 수: ${updatedTotalConversions}개`)
      console.log(`  보정 전: ${aggregatedTotalConversions}개`)
      console.log(`  보정 후: ${updatedTotalConversions}개`)
      console.log(`  추가된 전환 수: ${updatedTotalConversions - aggregatedTotalConversions}개`)
      
      if (updatedTotalConversions >= (rawCount || 0) * 0.95) {
        console.log('  ✅ 보정 성공: 집계 테이블이 Raw 데이터의 95% 이상을 포함합니다.')
      } else {
        console.log('  ⚠️  보정 부분 성공: 일부 데이터가 여전히 누락될 수 있습니다.')
      }
    }
    
  } catch (error: any) {
    console.error('  ❌ 보정 실패:', error.message)
    console.error('  에러 상세:', error)
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined

backfillMissingAggregationData(clientId)
  .then(() => {
    console.log('완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
