import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 오늘 등록 데이터 시간대별 추이 확인
 */
async function checkTodayRegistrationTimeline() {
  const admin = createAdminSupabase()
  
  console.log('=== 오늘 등록 데이터 시간대별 추이 ===\n')
  
  // 오늘 날짜
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  console.log(`📅 분석 기간: ${today.toLocaleDateString('ko-KR')} ~ ${tomorrow.toLocaleDateString('ko-KR')}\n`)
  
  // 오늘 등록 데이터 조회
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, utm_medium, marketing_campaign_link_id')
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: true })
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  오늘 등록 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 오늘 전체 등록: ${entries.length}개\n`)
  
  // 시간대별 집계 (시간 단위)
  const hourlyMap = new Map<string, {
    total: number
    withUTM: number
    withLink: number
    withoutBoth: number
    entries: any[]
  }>()
  
  entries.forEach((entry: any) => {
    const date = new Date(entry.created_at)
    const hour = date.toISOString().slice(0, 13) + ':00:00'
    const hourKey = `${date.toISOString().split('T')[0]} ${date.getHours().toString().padStart(2, '0')}:00`
    
    if (!hourlyMap.has(hourKey)) {
      hourlyMap.set(hourKey, {
        total: 0,
        withUTM: 0,
        withLink: 0,
        withoutBoth: 0,
        entries: [],
      })
    }
    
    const stats = hourlyMap.get(hourKey)!
    stats.total++
    stats.entries.push(entry)
    
    if (entry.utm_source) stats.withUTM++
    if (entry.marketing_campaign_link_id) stats.withLink++
    if (!entry.utm_source && !entry.marketing_campaign_link_id) stats.withoutBoth++
  })
  
  // 시간대별 출력
  console.log('⏰ 시간대별 등록 추이:\n')
  const sortedHours = Array.from(hourlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
  
  let cumulativeTotal = 0
  let cumulativeWithUTM = 0
  let cumulativeWithLink = 0
  
  sortedHours.forEach(([hour, stats]) => {
    cumulativeTotal += stats.total
    cumulativeWithUTM += stats.withUTM
    cumulativeWithLink += stats.withLink
    
    const time = new Date(hour.split(' ')[0] + 'T' + hour.split(' ')[1] + ':00')
    const isAfter9AM = time.getHours() >= 9
    
    console.log(`${hour}${isAfter9AM ? ' 🌅' : ''}:`)
    console.log(`  해당 시간대: ${stats.total}개`)
    console.log(`    - UTM 있음: ${stats.withUTM}개`)
    console.log(`    - 링크 ID 있음: ${stats.withLink}개`)
    console.log(`    - 둘 다 없음: ${stats.withoutBoth}개`)
    console.log(`  누적: ${cumulativeTotal}개 (UTM: ${cumulativeWithUTM}개, 링크: ${cumulativeWithLink}개)`)
    console.log('')
  })
  
  // 오전 9시 기준 분석
  const nineAM = new Date(today)
  nineAM.setHours(9, 0, 0, 0)
  
  const before9AM = entries.filter(e => new Date(e.created_at) < nineAM)
  const after9AM = entries.filter(e => new Date(e.created_at) >= nineAM)
  
  console.log('📊 오전 9시 기준 분석:\n')
  console.log(`오전 9시 이전:`)
  console.log(`  - 전체: ${before9AM.length}개`)
  console.log(`  - UTM 있음: ${before9AM.filter(e => e.utm_source).length}개`)
  console.log(`  - 링크 ID 있음: ${before9AM.filter(e => e.marketing_campaign_link_id).length}개`)
  console.log(`  - 둘 다 없음: ${before9AM.filter(e => !e.utm_source && !e.marketing_campaign_link_id).length}개`)
  console.log('')
  
  console.log(`오전 9시 이후:`)
  console.log(`  - 전체: ${after9AM.length}개`)
  console.log(`  - UTM 있음: ${after9AM.filter(e => e.utm_source).length}개`)
  console.log(`  - 링크 ID 있음: ${after9AM.filter(e => e.marketing_campaign_link_id).length}개`)
  console.log(`  - 둘 다 없음: ${after9AM.filter(e => !e.utm_source && !e.marketing_campaign_link_id).length}개`)
  console.log('')
  
  // 오늘 생성된 링크 확인
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
      
      // 이 링크로 등록된 항목 확인
      const { count } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_campaign_link_id', link.id)
        .gte('created_at', new Date(link.created_at).toISOString())
      
      console.log(`    등록 수: ${count || 0}개`)
      console.log('')
    }
  } else {
    console.log('⚠️  오늘 생성된 링크가 없습니다.\n')
  }
  
  // 오늘 오전 9시 이후 등록 중 링크 ID가 있는 항목 확인
  const entriesWithLinkAfter9AM = after9AM.filter(e => e.marketing_campaign_link_id)
  
  if (entriesWithLinkAfter9AM.length > 0) {
    console.log('🔍 오전 9시 이후 링크 ID가 있는 등록:\n')
    
    // 링크별 집계
    const linkMap = new Map<string, number>()
    entriesWithLinkAfter9AM.forEach(e => {
      const linkId = e.marketing_campaign_link_id!
      linkMap.set(linkId, (linkMap.get(linkId) || 0) + 1)
    })
    
    for (const [linkId, count] of linkMap.entries()) {
      const { data: link } = await admin
        .from('campaign_link_meta')
        .select('id, name, utm_source, created_at')
        .eq('id', linkId)
        .single()
      
      if (link) {
        const linkCreatedDate = new Date(link.created_at)
        const isToday = linkCreatedDate >= today && linkCreatedDate < tomorrow
        
        console.log(`  ${link.name || link.id}${isToday ? ' ✨ (오늘 생성)' : ''}:`)
        console.log(`    등록 수: ${count}개`)
        console.log(`    링크 생성일: ${linkCreatedDate.toLocaleString('ko-KR')}`)
        console.log(`    UTM Source: ${link.utm_source || '(없음)'}`)
        console.log('')
      }
    }
  }
}

checkTodayRegistrationTimeline().catch(console.error)
