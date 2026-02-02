import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 오늘 유입 경로 분석
 * Visit 로그의 referer와 user-agent를 기반으로 유입 소스 추정
 */
async function checkTodayTrafficSources() {
  const admin = createAdminSupabase()
  
  console.log('=== 오늘 유입 경로 분석 ===\n')
  
  // 오늘 날짜
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // 오늘 오전 9시
  const nineAM = new Date(today)
  nineAM.setHours(9, 0, 0, 0)
  
  console.log(`📅 분석 기간: ${today.toLocaleDateString('ko-KR')} 오전 9시 이후\n`)
  
  // 오늘 오전 9시 이후 Visit 로그 조회
  const { data: visitLogs, error: visitError } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, session_id, utm_source, utm_medium, referrer, user_agent, accessed_at, marketing_campaign_link_id')
    .gte('accessed_at', nineAM.toISOString())
    .lt('accessed_at', tomorrow.toISOString())
    .order('accessed_at', { ascending: true })
  
  if (visitError) {
    console.error('❌ Visit 로그 조회 실패:', visitError.message)
    process.exit(1)
  }
  
  if (!visitLogs || visitLogs.length === 0) {
    console.log('⚠️  오늘 오전 9시 이후 Visit 로그가 없습니다.')
    console.log('   → 등록 페이지 직접 접속 또는 Visit 추적 미작동 가능성\n')
    
    // 등록 데이터에서 시간대별 패턴 확인
    const { data: entries } = await admin
      .from('event_survey_entries')
      .select('id, created_at')
      .gte('created_at', nineAM.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: true })
    
    if (entries && entries.length > 0) {
      console.log(`📊 등록 데이터 시간대별 패턴 (${entries.length}개):\n`)
      
      const hourlyMap = new Map<string, number>()
      entries.forEach((entry: any) => {
        const hour = new Date(entry.created_at).getHours()
        const hourKey = `${hour.toString().padStart(2, '0')}:00`
        hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1)
      })
      
      const sortedHours = Array.from(hourlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
      
      sortedHours.forEach(([hour, count]) => {
        console.log(`  ${hour}: ${count}개 등록`)
      })
    }
    
    return
  }
  
  console.log(`📊 오늘 오전 9시 이후 Visit 로그: ${visitLogs.length}개\n`)
  
  // Referer 기반 분석
  const refererMap = new Map<string, number>()
  const refererDetails: Array<{ referer: string; count: number; samples: any[] }> = []
  
  visitLogs.forEach((log: any) => {
    const referer = log.referrer || '(direct)'
    
    if (!refererMap.has(referer)) {
      refererMap.set(referer, 0)
      refererDetails.push({ referer, count: 0, samples: [] })
    }
    
    refererMap.set(referer, (refererMap.get(referer) || 0) + 1)
    const detail = refererDetails.find(d => d.referer === referer)!
    detail.count++
    if (detail.samples.length < 3) {
      detail.samples.push(log)
    }
  })
  
  console.log('🔗 Referer별 유입 분석:\n')
  const sortedReferers = Array.from(refererMap.entries())
    .sort((a, b) => b[1] - a[1])
  
  sortedReferers.forEach(([referer, count]) => {
    const pct = ((count / visitLogs.length) * 100).toFixed(1)
    console.log(`  ${referer}: ${count}개 (${pct}%)`)
  })
  console.log('')
  
  // User-Agent 기반 분석
  const uaMap = new Map<string, number>()
  visitLogs.forEach((log: any) => {
    if (!log.user_agent) return
    
    // User-Agent에서 주요 정보 추출
    let uaKey = 'unknown'
    
    if (log.user_agent.includes('Gmail') || log.user_agent.includes('GoogleImageProxy')) {
      uaKey = 'Gmail/Email Client'
    } else if (log.user_agent.includes('Outlook')) {
      uaKey = 'Outlook/Email Client'
    } else if (log.user_agent.includes('LinkedIn')) {
      uaKey = 'LinkedIn'
    } else if (log.user_agent.includes('FBAN') || log.user_agent.includes('FBAV')) {
      uaKey = 'Facebook App'
    } else if (log.user_agent.includes('Twitter') || log.user_agent.includes('Tweetbot')) {
      uaKey = 'Twitter'
    } else if (log.user_agent.includes('Mobile')) {
      uaKey = 'Mobile Browser'
    } else if (log.user_agent.includes('Chrome') || log.user_agent.includes('Safari') || log.user_agent.includes('Firefox')) {
      uaKey = 'Desktop Browser'
    }
    
    uaMap.set(uaKey, (uaMap.get(uaKey) || 0) + 1)
  })
  
  if (uaMap.size > 0) {
    console.log('📱 User-Agent별 유입 분석:\n')
    const sortedUAs = Array.from(uaMap.entries())
      .sort((a, b) => b[1] - a[1])
    
    sortedUAs.forEach(([ua, count]) => {
      const pct = ((count / visitLogs.length) * 100).toFixed(1)
      console.log(`  ${ua}: ${count}개 (${pct}%)`)
    })
    console.log('')
  }
  
  // UTM이 있는 Visit 로그 확인
  const visitsWithUTM = visitLogs.filter((log: any) => log.utm_source)
  const visitsWithLink = visitLogs.filter((log: any) => log.marketing_campaign_link_id)
  
  console.log('📊 Visit 로그 추적 상태:\n')
  console.log(`  - 전체 Visit: ${visitLogs.length}개`)
  console.log(`  - UTM 있는 Visit: ${visitsWithUTM.length}개 (${((visitsWithUTM.length / visitLogs.length) * 100).toFixed(1)}%)`)
  console.log(`  - 링크 ID 있는 Visit: ${visitsWithLink.length}개 (${((visitsWithLink.length / visitLogs.length) * 100).toFixed(1)}%)`)
  console.log('')
  
  // 시간대별 Visit 추이
  const hourlyVisitMap = new Map<string, number>()
  visitLogs.forEach((log: any) => {
    const hour = new Date(log.accessed_at).getHours()
    const hourKey = `${hour.toString().padStart(2, '0')}:00`
    hourlyVisitMap.set(hourKey, (hourlyVisitMap.get(hourKey) || 0) + 1)
  })
  
  if (hourlyVisitMap.size > 0) {
    console.log('⏰ 시간대별 Visit 추이:\n')
    const sortedHours = Array.from(hourlyVisitMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
    
    sortedHours.forEach(([hour, count]) => {
      console.log(`  ${hour}: ${count}개 Visit`)
    })
    console.log('')
  }
  
  // 등록 데이터와 비교
  const { data: entries } = await admin
    .from('event_survey_entries')
    .select('id, created_at')
    .gte('created_at', nineAM.toISOString())
    .lt('created_at', tomorrow.toISOString())
  
  if (entries && entries.length > 0) {
    console.log('📊 Visit vs 등록 비교:\n')
    console.log(`  - Visit 로그: ${visitLogs.length}개`)
    console.log(`  - 등록 데이터: ${entries.length}개`)
    console.log(`  - 전환율: ${visitLogs.length > 0 ? ((entries.length / visitLogs.length) * 100).toFixed(1) : 0}%`)
    console.log('')
    
    // Visit과 등록 시간대 비교
    const hourlyEntryMap = new Map<string, number>()
    entries.forEach((entry: any) => {
      const hour = new Date(entry.created_at).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      hourlyEntryMap.set(hourKey, (hourlyEntryMap.get(hourKey) || 0) + 1)
    })
    
    console.log('⏰ 시간대별 Visit vs 등록:\n')
    const allHours = new Set([...hourlyVisitMap.keys(), ...hourlyEntryMap.keys()])
    const sortedAllHours = Array.from(allHours).sort()
    
    sortedAllHours.forEach(hour => {
      const visits = hourlyVisitMap.get(hour) || 0
      const entries = hourlyEntryMap.get(hour) || 0
      const cvr = visits > 0 ? ((entries / visits) * 100).toFixed(1) : '0.0'
      console.log(`  ${hour}: Visit ${visits}개 → 등록 ${entries}개 (CVR: ${cvr}%)`)
    })
  }
  
  // 가장 많은 유입을 가져온 referer 상세 정보
  if (sortedReferers.length > 0) {
    const topReferer = sortedReferers[0]
    const topDetail = refererDetails.find(d => d.referer === topReferer[0])
    
    if (topDetail && topDetail.samples.length > 0) {
      console.log(`\n🔍 주요 유입 소스 상세 (${topReferer[0]}):\n`)
      topDetail.samples.forEach((sample, idx) => {
        console.log(`  샘플 ${idx + 1}:`)
        console.log(`    접속 시간: ${new Date(sample.accessed_at).toLocaleString('ko-KR')}`)
        console.log(`    Referer: ${sample.referrer || '(없음)'}`)
        console.log(`    User-Agent: ${sample.user_agent ? sample.user_agent.substring(0, 80) + '...' : '(없음)'}`)
        console.log(`    UTM Source: ${sample.utm_source || '(없음)'}`)
        console.log(`    링크 ID: ${sample.marketing_campaign_link_id || '(없음)'}`)
        console.log('')
      })
    }
  }
}

checkTodayTrafficSources().catch(console.error)
