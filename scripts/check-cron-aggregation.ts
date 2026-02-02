/**
 * 크론 집계 상태 확인 스크립트
 * 
 * 최근 집계 시간, 집계 데이터 상태 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkCronAggregation() {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('크론 집계 상태 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 최근 집계 시간 확인
  console.log('1. 최근 집계 시간 확인 (marketing_stats_daily)')
  console.log('-'.repeat(80))
  
  const { data: recentStats, error: statsError } = await admin
    .from('marketing_stats_daily')
    .select('bucket_date, last_aggregated_at, updated_at, visits, conversions')
    .order('last_aggregated_at', { ascending: false })
    .limit(10)
  
  if (statsError) {
    console.error('  ❌ 오류:', statsError)
  } else if (recentStats && recentStats.length > 0) {
    console.log(`  최근 집계 레코드: ${recentStats.length}개`)
    console.log('')
    
    recentStats.forEach((stat, index) => {
      const lastAggregated = new Date(stat.last_aggregated_at)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - lastAggregated.getTime()) / (1000 * 60))
      
      console.log(`  ${index + 1}. 버킷 날짜: ${stat.bucket_date}`)
      console.log(`     마지막 집계: ${lastAggregated.toLocaleString('ko-KR')} (${diffMinutes}분 전)`)
      console.log(`     Visits: ${stat.visits}, Conversions: ${stat.conversions}`)
      console.log('')
    })
    
    // 가장 최근 집계 시간
    const latestAggregated = new Date(recentStats[0].last_aggregated_at)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - latestAggregated.getTime()) / (1000 * 60))
    
    if (diffMinutes <= 10) {
      console.log(`  ✅ 최근 집계: ${diffMinutes}분 전 (정상)`)
    } else if (diffMinutes <= 30) {
      console.log(`  ⚠️  최근 집계: ${diffMinutes}분 전 (지연 가능성)`)
    } else {
      console.log(`  ❌ 최근 집계: ${diffMinutes}분 전 (크론이 작동하지 않을 수 있음)`)
    }
  } else {
    console.log('  ⚠️  집계 데이터가 없습니다.')
  }
  
  console.log('')
  
  // 2. 최근 1일 Raw 데이터 확인
  console.log('2. 최근 1일 Raw 데이터 확인')
  console.log('-'.repeat(80))
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const today = new Date()
  
  const { data: recentEntries, count: entriesCount, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at', { count: 'exact' })
    .gte('created_at', oneDayAgo.toISOString())
    .lte('created_at', today.toISOString())
  
  if (entriesError) {
    console.error('  ❌ 오류:', entriesError)
  } else {
    console.log(`  최근 1일 전환 수: ${entriesCount || 0}개`)
  }
  
  const { data: recentVisits, count: visitsCount, error: visitsError } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, accessed_at', { count: 'exact' })
    .gte('accessed_at', oneDayAgo.toISOString())
    .lte('accessed_at', today.toISOString())
  
  if (visitsError) {
    console.error('  ❌ 오류:', visitsError)
  } else {
    console.log(`  최근 1일 Visits: ${visitsCount || 0}개`)
  }
  
  console.log('')
  
  // 3. 최근 1일 집계 데이터 확인
  console.log('3. 최근 1일 집계 데이터 확인')
  console.log('-'.repeat(80))
  
  const todayStr = today.toISOString().split('T')[0]
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0]
  
  const { data: aggregatedStats, count: aggregatedCount, error: aggregatedError } = await admin
    .from('marketing_stats_daily')
    .select('bucket_date, visits, conversions', { count: 'exact' })
    .gte('bucket_date', oneDayAgoStr)
    .lte('bucket_date', todayStr)
  
  if (aggregatedError) {
    console.error('  ❌ 오류:', aggregatedError)
  } else {
    console.log(`  집계 레코드 수: ${aggregatedCount || 0}개`)
    
    if (aggregatedStats && aggregatedStats.length > 0) {
      const totalConversions = aggregatedStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      const totalVisits = aggregatedStats.reduce((sum, s) => sum + (s.visits || 0), 0)
      
      console.log(`  집계된 총 전환 수: ${totalConversions}개`)
      console.log(`  집계된 총 Visits: ${totalVisits}개`)
      
      if (entriesCount && totalConversions !== entriesCount) {
        console.log(`  ⚠️  전환 수 불일치: Raw ${entriesCount}개 ≠ 집계 ${totalConversions}개`)
        console.log(`     차이: ${entriesCount - totalConversions}개`)
      } else if (entriesCount) {
        console.log(`  ✅ 전환 수 일치: Raw ${entriesCount}개 = 집계 ${totalConversions}개`)
      }
    }
  }
  
  console.log('')
  
  // 4. 크론 설정 확인
  console.log('4. 크론 설정 확인')
  console.log('-'.repeat(80))
  console.log('  Vercel Cron 설정: vercel.json')
  console.log('    - 경로: /api/cron/aggregate-marketing-stats')
  console.log('    - 스케줄: */5 * * * * (5분마다)')
  console.log('    - 환경변수: CRON_SECRET 필요')
  console.log('')
  console.log('  ⚠️  실제 크론 실행 여부는 Vercel Dashboard에서 확인해야 합니다.')
  console.log('      Vercel Dashboard → 프로젝트 → Settings → Cron Jobs')
  
  console.log('')
  console.log('='.repeat(80))
}

checkCronAggregation()
  .then(() => {
    console.log('완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
