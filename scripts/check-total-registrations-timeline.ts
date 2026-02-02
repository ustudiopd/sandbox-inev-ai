import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 전체 등록 데이터 시간대별 추이 확인 (최근 며칠)
 */
async function checkTotalRegistrationsTimeline() {
  const admin = createAdminSupabase()
  
  console.log('=== 전체 등록 데이터 시간대별 추이 ===\n')
  
  // 최근 7일 데이터
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // 전체 등록 데이터 조회
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, utm_medium, marketing_campaign_link_id')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true })
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  등록 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 최근 7일 전체 등록: ${entries.length}개\n`)
  
  // 날짜별 집계
  const dateMap = new Map<string, {
    total: number
    withUTM: number
    withLink: number
    withoutBoth: number
  }>()
  
  entries.forEach((entry: any) => {
    const date = new Date(entry.created_at).toISOString().split('T')[0]
    
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        total: 0,
        withUTM: 0,
        withLink: 0,
        withoutBoth: 0,
      })
    }
    
    const stats = dateMap.get(date)!
    stats.total++
    
    if (entry.utm_source) stats.withUTM++
    if (entry.marketing_campaign_link_id) stats.withLink++
    if (!entry.utm_source && !entry.marketing_campaign_link_id) stats.withoutBoth++
  })
  
  // 날짜별 출력 (누적 포함)
  console.log('📅 날짜별 등록 추이 (누적):\n')
  const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
  
  let cumulativeTotal = 0
  let cumulativeWithUTM = 0
  let cumulativeWithLink = 0
  
  sortedDates.forEach(([date, stats]) => {
    cumulativeTotal += stats.total
    cumulativeWithUTM += stats.withUTM
    cumulativeWithLink += stats.withLink
    
    const dateObj = new Date(date)
    const isToday = dateObj.toDateString() === new Date().toDateString()
    
    console.log(`${date}${isToday ? ' ✨ (오늘)' : ''}:`)
    console.log(`  해당 날짜: ${stats.total}개`)
    console.log(`    - UTM 있음: ${stats.withUTM}개`)
    console.log(`    - 링크 ID 있음: ${stats.withLink}개`)
    console.log(`    - 둘 다 없음: ${stats.withoutBoth}개`)
    console.log(`  누적: ${cumulativeTotal}개 (UTM: ${cumulativeWithUTM}개, 링크: ${cumulativeWithLink}개)`)
    console.log('')
  })
  
  // 오늘(2026-02-02) 오전 9시 기준 분석
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nineAM = new Date(today)
  nineAM.setHours(9, 0, 0, 0)
  
  const before9AMToday = entries.filter(e => {
    const entryDate = new Date(e.created_at)
    return entryDate >= today && entryDate < nineAM
  })
  
  const after9AMToday = entries.filter(e => {
    const entryDate = new Date(e.created_at)
    return entryDate >= nineAM
  })
  
  const beforeToday = entries.filter(e => {
    const entryDate = new Date(e.created_at)
    return entryDate < today
  })
  
  console.log('📊 오전 9시 기준 분석:\n')
  console.log(`오늘 오전 9시 이전:`)
  console.log(`  - 등록: ${before9AMToday.length}개`)
  console.log(`  - 누적 (어제까지 + 오늘 9시 이전): ${beforeToday.length + before9AMToday.length}개`)
  console.log('')
  
  console.log(`오늘 오전 9시 이후:`)
  console.log(`  - 등록: ${after9AMToday.length}개`)
  console.log(`  - UTM 있음: ${after9AMToday.filter(e => e.utm_source).length}개`)
  console.log(`  - 링크 ID 있음: ${after9AMToday.filter(e => e.marketing_campaign_link_id).length}개`)
  console.log(`  - 둘 다 없음: ${after9AMToday.filter(e => !e.utm_source && !e.marketing_campaign_link_id).length}개`)
  console.log(`  - 누적 (전체): ${beforeToday.length + before9AMToday.length + after9AMToday.length}개`)
  console.log('')
  
  // 오늘 생성된 링크 확인
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data: todayLinks } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, created_at')
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
  
  if (todayLinks && todayLinks.length > 0) {
    console.log(`🔗 오늘 생성된 링크: ${todayLinks.length}개\n`)
    for (const link of todayLinks) {
      console.log(`  - ${link.name || link.id}`)
      console.log(`    생성: ${new Date(link.created_at).toLocaleString('ko-KR')}`)
      console.log(`    UTM Source: ${link.utm_source || '(없음)'}`)
      
      // 이 링크로 등록된 항목 확인 (오늘 오전 9시 이후)
      const { count } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_campaign_link_id', link.id)
        .gte('created_at', nineAM.toISOString())
      
      console.log(`    오전 9시 이후 등록: ${count || 0}개`)
      console.log('')
    }
  } else {
    console.log('⚠️  오늘 생성된 링크가 없습니다.\n')
  }
  
  // 어제 생성된 링크 중 오늘 오전 9시 이후 사용된 것 확인
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const { data: recentLinks } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, created_at')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
  
  if (recentLinks && recentLinks.length > 0) {
    console.log(`🔗 최근 생성된 링크 (어제~오늘): ${recentLinks.length}개\n`)
    
    for (const link of recentLinks) {
      const linkCreatedDate = new Date(link.created_at)
      const isToday = linkCreatedDate >= today
      
      // 이 링크로 등록된 항목 확인 (오늘 오전 9시 이후)
      const { count } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_campaign_link_id', link.id)
        .gte('created_at', nineAM.toISOString())
      
      if (count && count > 0) {
        console.log(`  ${link.name || link.id}${isToday ? ' ✨ (오늘 생성)' : ' (어제 생성)'}:`)
        console.log(`    링크 생성: ${linkCreatedDate.toLocaleString('ko-KR')}`)
        console.log(`    UTM Source: ${link.utm_source || '(없음)'}`)
        console.log(`    오전 9시 이후 등록: ${count}개`)
        console.log('')
      }
    }
  }
}

checkTotalRegistrationsTimeline().catch(console.error)
