import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * UTM 링크 생성일과 등록 데이터 비교
 */
async function compareLinksAndRegistrations() {
  const admin = createAdminSupabase()
  
  console.log('=== UTM 링크 생성일 vs 등록 데이터 비교 ===\n')
  
  // 링크 생성일 확인
  const { data: links } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, created_at, target_campaign_id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  
  if (!links || links.length === 0) {
    console.log('⚠️  링크가 없습니다.')
    return
  }
  
  const oldestLinkDate = new Date(links[0].created_at)
  const newestLinkDate = new Date(links[links.length - 1].created_at)
  
  console.log(`📅 링크 생성 기간:`)
  console.log(`  - 가장 오래된 링크: ${oldestLinkDate.toLocaleString('ko-KR')}`)
  console.log(`  - 가장 최근 링크: ${newestLinkDate.toLocaleString('ko-KR')}\n`)
  
  // 등록 데이터 확인 (링크 생성 이후)
  const { data: entriesAfterLinks } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, marketing_campaign_link_id')
    .gte('created_at', oldestLinkDate.toISOString())
    .order('created_at', { ascending: true })
  
  if (!entriesAfterLinks || entriesAfterLinks.length === 0) {
    console.log('⚠️  링크 생성 이후 등록 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 링크 생성 이후 등록 데이터:`)
  console.log(`  - 전체 등록: ${entriesAfterLinks.length}개`)
  
  const withUTM = entriesAfterLinks.filter(e => e.utm_source !== null)
  const withLink = entriesAfterLinks.filter(e => e.marketing_campaign_link_id !== null)
  const withoutBoth = entriesAfterLinks.filter(e => 
    e.utm_source === null && e.marketing_campaign_link_id === null
  )
  
  console.log(`  - UTM 있는 등록: ${withUTM.length}개 (${((withUTM.length / entriesAfterLinks.length) * 100).toFixed(1)}%)`)
  console.log(`  - 링크 ID 있는 등록: ${withLink.length}개 (${((withLink.length / entriesAfterLinks.length) * 100).toFixed(1)}%)`)
  console.log(`  - 둘 다 없는 등록: ${withoutBoth.length}개 (${((withoutBoth.length / entriesAfterLinks.length) * 100).toFixed(1)}%)\n`)
  
  // 날짜별 등록 추이
  const dateMap = new Map<string, { total: number; withUTM: number; withLink: number; withoutBoth: number }>()
  
  entriesAfterLinks.forEach((entry: any) => {
    const date = new Date(entry.created_at).toISOString().split('T')[0]
    
    if (!dateMap.has(date)) {
      dateMap.set(date, { total: 0, withUTM: 0, withLink: 0, withoutBoth: 0 })
    }
    
    const stats = dateMap.get(date)!
    stats.total++
    
    if (entry.utm_source) stats.withUTM++
    if (entry.marketing_campaign_link_id) stats.withLink++
    if (!entry.utm_source && !entry.marketing_campaign_link_id) stats.withoutBoth++
  })
  
  console.log('📈 날짜별 등록 추이:\n')
  const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
  
  sortedDates.forEach(([date, stats]) => {
    const linkCreatedOnThisDate = links.some((link: any) => 
      new Date(link.created_at).toISOString().split('T')[0] === date
    )
    const linkIndicator = linkCreatedOnThisDate ? ' 🔗' : ''
    
    console.log(`${date}${linkIndicator}:`)
    console.log(`  전체: ${stats.total}개`)
    console.log(`  UTM 있음: ${stats.withUTM}개 (${stats.total > 0 ? ((stats.withUTM / stats.total) * 100).toFixed(1) : 0}%)`)
    console.log(`  링크 ID 있음: ${stats.withLink}개 (${stats.total > 0 ? ((stats.withLink / stats.total) * 100).toFixed(1) : 0}%)`)
    console.log(`  둘 다 없음: ${stats.withoutBoth}개 (${stats.total > 0 ? ((stats.withoutBoth / stats.total) * 100).toFixed(1) : 0}%)`)
    console.log('')
  })
  
  // 링크별 등록 수 확인
  console.log('🔗 링크별 등록 수:\n')
  for (const link of links) {
    const { count } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_campaign_link_id', link.id)
    
    const { count: countWithUTM } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_campaign_link_id', link.id)
      .not('utm_source', 'is', null)
    
    console.log(`${link.name || link.id}:`)
    console.log(`  전체 등록: ${count || 0}개`)
    console.log(`  UTM 있는 등록: ${countWithUTM || 0}개`)
    console.log(`  UTM 없는 등록: ${(count || 0) - (countWithUTM || 0)}개`)
    console.log(`  생성일: ${new Date(link.created_at).toLocaleString('ko-KR')}`)
    console.log('')
  }
}

compareLinksAndRegistrations().catch(console.error)
