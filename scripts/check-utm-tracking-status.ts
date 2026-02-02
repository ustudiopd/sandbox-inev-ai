import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * UTM 추적 상태 확인 스크립트
 * Direct 159 문제의 원인 규명을 위한 팩트 확인
 */
async function checkUTMTrackingStatus() {
  const admin = createAdminSupabase()
  
  console.log('=== UTM 추적 상태 확인 ===\n')
  
  // 1단계: Direct 159의 실체 확인
  console.log('🔍 1단계: Direct (추적 없음) 항목 확인')
  const { count: directCount, error: directError } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .is('utm_source', null)
    .is('marketing_campaign_link_id', null)
  
  if (directError) {
    console.error('❌ 쿼리 실패:', directError.message)
    process.exit(1)
  }
  
  console.log(`  - utm_source IS NULL AND marketing_campaign_link_id IS NULL: ${directCount || 0}개\n`)
  
  // 전체 통계
  const { count: totalCount } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
  
  const { count: withLinkAndUTM } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('marketing_campaign_link_id', 'is', null)
    .not('utm_source', 'is', null)
  
  const { count: withLinkNoUTM } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('marketing_campaign_link_id', 'is', null)
    .is('utm_source', null)
  
  const { count: noLinkWithUTM } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .is('marketing_campaign_link_id', null)
    .not('utm_source', 'is', null)
  
  console.log('📊 전체 추적 상태 분포:')
  console.log(`  - 전체 등록: ${totalCount || 0}개`)
  console.log(`  - 링크+UTM 있음: ${withLinkAndUTM || 0}개`)
  console.log(`  - 링크만 있음 (UTM 없음): ${withLinkNoUTM || 0}개`)
  console.log(`  - UTM만 있음 (링크 없음): ${noLinkWithUTM || 0}개`)
  console.log(`  - 추적 없음 (Direct): ${directCount || 0}개\n`)
  
  // 2단계: 시간대별 분포 확인
  console.log('🔍 2단계: 시간대별 Direct vs UTM 분포 (최근 24시간)')
  
  const { data: hourlyData, error: hourlyError } = await admin
    .from('event_survey_entries')
    .select('created_at, utm_source, marketing_campaign_link_id')
    .order('created_at', { ascending: false })
    .limit(1000) // 최근 1000개만
  
  if (hourlyError) {
    console.error('❌ 시간대별 쿼리 실패:', hourlyError.message)
  } else {
    // 시간대별 집계
    const hourlyMap = new Map<string, { direct: number; utm: number }>()
    
    hourlyData?.forEach((entry: any) => {
      const hour = new Date(entry.created_at).toISOString().slice(0, 13) + ':00:00'
      const hasUTM = entry.utm_source !== null
      
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { direct: 0, utm: 0 })
      }
      
      const stats = hourlyMap.get(hour)!
      if (hasUTM) {
        stats.utm++
      } else {
        stats.direct++
      }
    })
    
    const sortedHours = Array.from(hourlyMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 24)
    
    console.log('  시간대별 분포:')
    sortedHours.forEach(([hour, stats]) => {
      const total = stats.direct + stats.utm
      const directPct = total > 0 ? ((stats.direct / total) * 100).toFixed(1) : '0.0'
      console.log(`  ${hour}: Direct ${stats.direct}개 (${directPct}%), UTM ${stats.utm}개`)
    })
    console.log('')
  }
  
  // 3단계: 링크 추적 상태 분포
  console.log('🔍 3단계: 링크 추적 상태 분포')
  
  const { data: statusData, error: statusError } = await admin
    .from('event_survey_entries')
    .select('utm_source, marketing_campaign_link_id')
  
  if (statusError) {
    console.error('❌ 상태 분포 쿼리 실패:', statusError.message)
  } else {
    const statusMap = new Map<string, number>()
    
    statusData?.forEach((entry: any) => {
      const hasLink = entry.marketing_campaign_link_id !== null
      const hasUTM = entry.utm_source !== null
      
      let status: string
      if (hasLink && hasUTM) {
        status = '링크+UTM 있음'
      } else if (hasLink && !hasUTM) {
        status = '링크만 있음 (UTM 없음)'
      } else if (!hasLink && hasUTM) {
        status = 'UTM만 있음 (링크 없음)'
      } else {
        status = '추적 없음 (Direct)'
      }
      
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })
    
    const sortedStatus = Array.from(statusMap.entries())
      .sort((a, b) => b[1] - a[1])
    
    console.log('  추적 상태별 분포:')
    sortedStatus.forEach(([status, count]) => {
      const pct = totalCount ? ((count / totalCount) * 100).toFixed(1) : '0.0'
      console.log(`  - ${status}: ${count}개 (${pct}%)`)
    })
    console.log('')
  }
  
  // UTM Source 분포 (있는 것만)
  console.log('🔍 4단계: UTM Source 분포 (UTM이 있는 항목만)')
  
  const { data: sourceData, error: sourceError } = await admin
    .from('event_survey_entries')
    .select('utm_source')
    .not('utm_source', 'is', null)
  
  if (sourceError) {
    console.error('❌ Source 분포 쿼리 실패:', sourceError.message)
  } else {
    const sourceMap = new Map<string | null, number>()
    
    sourceData?.forEach((entry: any) => {
      const source = entry.utm_source || null
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    })
    
    const sortedSources = Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
    
    console.log('  UTM Source별 분포:')
    sortedSources.forEach(([source, count]) => {
      console.log(`  - ${source || '(null)'}: ${count}개`)
    })
    console.log('')
  }
  
  // 결론
  console.log('📌 결론:')
  if (directCount && directCount > 100) {
    console.log(`  ⚠️  Direct 항목이 ${directCount}개로 많습니다.`)
    console.log(`  → 링크를 통해 들어왔지만 marketing_campaign_link_id가 저장되지 않은 가능성이 높습니다.`)
  } else {
    console.log(`  ✅ Direct 항목이 ${directCount || 0}개로 정상 범위입니다.`)
  }
}

checkUTMTrackingStatus().catch(console.error)
