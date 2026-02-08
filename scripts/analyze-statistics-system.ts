import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function toKST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

function formatKST(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = d.getUTCDate().toString().padStart(2, '0')
  const h = d.getUTCHours().toString().padStart(2, '0')
  const m = d.getUTCMinutes().toString().padStart(2, '0')
  return `${y}-${mo}-${day} ${h}:${m}`
}

/**
 * Inev.ai 전체 통계 시스템 종합 분석
 * 
 * 분석 항목:
 * 1. Visit 추적 현황 (event_access_logs)
 * 2. 등록/전환 추적 현황 (event_survey_entries)
 * 3. Visit-등록 연결 현황
 * 4. UTM 추적 현황
 * 5. 링크 추적 현황 (campaign_link_meta)
 * 6. 집계 함수 동작 확인
 */
async function analyzeStatisticsSystem() {
  const admin = createAdminSupabase()

  console.log('='.repeat(80))
  console.log('Inev.ai 전체 통계 시스템 종합 분석')
  console.log('='.repeat(80))
  console.log()

  const nowKST = toKST(new Date())
  const todayKST = `${nowKST.getUTCFullYear()}-${(nowKST.getUTCMonth() + 1).toString().padStart(2, '0')}-${nowKST.getUTCDate().toString().padStart(2, '0')}`
  const nowStr = formatKST(nowKST)
  console.log(`📅 분석 기준 시각(KST): ${nowStr}\n`)

  // ==========================================
  // 1. Visit 추적 현황 (event_access_logs)
  // ==========================================
  console.log('1️⃣ Visit 추적 현황 (event_access_logs)\n')

  const { count: totalVisits } = await admin
    .from('event_access_logs')
    .select('*', { count: 'exact', head: true })

  const { data: latestVisit } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, webinar_id, session_id, accessed_at, converted_at, utm_source, marketing_campaign_link_id')
    .order('accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const todayStartUTC = new Date(`${todayKST}T00:00:00.000Z`).getTime() - KST_OFFSET_MS
  const todayEndUTC = todayStartUTC + 24 * 60 * 60 * 1000
  const { count: todayVisits } = await admin
    .from('event_access_logs')
    .select('*', { count: 'exact', head: true })
    .gte('accessed_at', new Date(todayStartUTC).toISOString())
    .lt('accessed_at', new Date(todayEndUTC).toISOString())

  const { count: convertedVisits } = await admin
    .from('event_access_logs')
    .select('*', { count: 'exact', head: true })
    .not('converted_at', 'is', null)

  console.log(`  전체 Visit: ${totalVisits ?? 0}건`)
  console.log(`  오늘 Visit: ${todayVisits ?? 0}건`)
  console.log(`  전환된 Visit: ${convertedVisits ?? 0}건 (${totalVisits && totalVisits > 0 ? ((convertedVisits ?? 0) / totalVisits * 100).toFixed(1) : 0}%)`)
  if (latestVisit) {
    const d = toKST(new Date((latestVisit as any).accessed_at))
    console.log(`  최근 Visit: ${formatKST(d)} (KST)`)
    console.log(`    - 캠페인 ID: ${(latestVisit as any).campaign_id || '(없음)'}`)
    console.log(`    - 웨비나 ID: ${(latestVisit as any).webinar_id || '(없음)'}`)
    console.log(`    - UTM Source: ${(latestVisit as any).utm_source || '(없음)'}`)
    console.log(`    - 링크 ID: ${(latestVisit as any).marketing_campaign_link_id || '(없음)'}`)
    console.log(`    - 전환 여부: ${(latestVisit as any).converted_at ? '전환됨' : '미전환'}`)
  } else {
    console.log(`  최근 Visit: (없음)`)
  }
  console.log()

  // ==========================================
  // 2. 등록/전환 추적 현황 (event_survey_entries)
  // ==========================================
  console.log('2️⃣ 등록/전환 추적 현황 (event_survey_entries)\n')

  const { count: totalEntries } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })

  const { count: todayEntries } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(todayStartUTC).toISOString())
    .lt('created_at', new Date(todayEndUTC).toISOString())

  const { data: entriesWithUTM } = await admin
    .from('event_survey_entries')
    .select('utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .not('utm_source', 'is', null)
    .limit(1000)

  const { count: entriesWithLink } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('marketing_campaign_link_id', 'is', null)

  const { data: latestEntry } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const utmSourceCount = new Map<string | null, number>()
  entriesWithUTM?.forEach((e: any) => {
    const s = e.utm_source || null
    utmSourceCount.set(s, (utmSourceCount.get(s) || 0) + 1)
  })

  console.log(`  전체 등록/전환: ${totalEntries ?? 0}건`)
  console.log(`  오늘 등록/전환: ${todayEntries ?? 0}건`)
  console.log(`  UTM Source 있는 항목: ${entriesWithUTM?.length || 0}건`)
  console.log(`  링크 ID 있는 항목: ${entriesWithLink ?? 0}건`)
  if (latestEntry) {
    const d = toKST(new Date((latestEntry as any).created_at))
    console.log(`  최근 등록: ${formatKST(d)} (KST)`)
    console.log(`    - 캠페인 ID: ${(latestEntry as any).campaign_id}`)
    console.log(`    - UTM Source: ${(latestEntry as any).utm_source || '(없음)'}`)
    console.log(`    - UTM Medium: ${(latestEntry as any).utm_medium || '(없음)'}`)
    console.log(`    - UTM Campaign: ${(latestEntry as any).utm_campaign || '(없음)'}`)
    console.log(`    - 링크 ID: ${(latestEntry as any).marketing_campaign_link_id || '(없음)'}`)
  } else {
    console.log(`  최근 등록: (없음)`)
  }
  console.log()

  // ==========================================
  // 3. Visit-등록 연결 현황
  // ==========================================
  console.log('3️⃣ Visit-등록 연결 현황\n')

  const { data: connectedVisits } = await admin
    .from('event_access_logs')
    .select('id, entry_id, converted_at')
    .not('entry_id', 'is', null)

  const { count: unconnectedEntries } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('campaign_id', 'is', null)

  console.log(`  Visit-등록 연결된 항목: ${connectedVisits?.length || 0}건`)
  console.log(`  연결되지 않은 등록: ${unconnectedEntries ?? 0}건 (대부분 정상 - Visit 없이 등록 가능)`)

  // 오늘 등록 중 Visit 연결 확인
  const { data: todayEntriesForLink } = await admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at')
    .gte('created_at', new Date(todayStartUTC).toISOString())
    .lt('created_at', new Date(todayEndUTC).toISOString())
    .limit(100)

  if (todayEntriesForLink && todayEntriesForLink.length > 0) {
    const entryIds = todayEntriesForLink.map((e: any) => e.id)
    const { data: linkedToday } = await admin
      .from('event_access_logs')
      .select('entry_id')
      .in('entry_id', entryIds)

    const linkedCount = new Set(linkedToday?.map((v: any) => v.entry_id)).size
    console.log(`  오늘 등록 중 Visit 연결: ${linkedCount}/${todayEntriesForLink.length}건 (${todayEntriesForLink.length > 0 ? (linkedCount / todayEntriesForLink.length * 100).toFixed(1) : 0}%)`)
  }
  console.log()

  // ==========================================
  // 4. UTM 추적 현황
  // ==========================================
  console.log('4️⃣ UTM 추적 현황\n')

  const { data: allEntriesSample } = await admin
    .from('event_survey_entries')
    .select('utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .limit(1000)

  let trackedCount = 0
  let untrackedCount = 0
  const sourceMap = new Map<string | null, number>()

  allEntriesSample?.forEach((e: any) => {
    const hasLink = !!e.marketing_campaign_link_id
    const hasUTM = !!(e.utm_source || e.utm_medium || e.utm_campaign)
    if (hasLink || hasUTM) {
      trackedCount++
    } else {
      untrackedCount++
    }
    const source = e.utm_source || null
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
  })

  const totalSample = (allEntriesSample?.length || 0)
  const trackingRate = totalSample > 0 ? (trackedCount / totalSample * 100).toFixed(1) : '0.0'

  console.log(`  샘플 분석 (최근 ${totalSample}건):`)
  console.log(`    추적 성공: ${trackedCount}건 (${trackingRate}%)`)
  console.log(`    추적 실패: ${untrackedCount}건 (${(100 - parseFloat(trackingRate)).toFixed(1)}%)`)
  console.log(`  UTM Source 분포 (상위 10개):`)
  Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([source, count]) => {
      console.log(`    - ${source || '(null)'}: ${count}건`)
    })
  console.log()

  // ==========================================
  // 5. 링크 추적 현황 (campaign_link_meta)
  // ==========================================
  console.log('5️⃣ 링크 추적 현황 (campaign_link_meta)\n')

  const { count: totalLinks } = await admin
    .from('campaign_link_meta')
    .select('*', { count: 'exact', head: true })

  const { count: activeLinks } = await admin
    .from('campaign_link_meta')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { data: linksWithConversions } = await admin
    .from('campaign_link_meta')
    .select('id, name, cid, status')
    .eq('status', 'active')
    .limit(20)

  console.log(`  전체 링크: ${totalLinks ?? 0}개`)
  console.log(`  활성 링크: ${activeLinks ?? 0}개`)

  if (linksWithConversions && linksWithConversions.length > 0) {
    console.log(`  활성 링크별 전환 수 (상위 10개):`)
    for (const link of linksWithConversions.slice(0, 10)) {
      const { count } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_campaign_link_id', (link as any).id)
      console.log(`    - ${(link as any).name || (link as any).cid}: ${count ?? 0}건`)
    }
  }
  console.log()

  // ==========================================
  // 6. 집계 함수 동작 확인
  // ==========================================
  console.log('6️⃣ 집계 함수 동작 확인\n')

  // 클라이언트별로 테스트
  const { data: clients } = await admin
    .from('clients')
    .select('id, name')
    .limit(5)

  if (clients && clients.length > 0) {
    console.log(`  클라이언트별 집계 테스트 (상위 ${clients.length}개):`)
    for (const client of clients) {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const toDate = new Date().toISOString().split('T')[0]

      try {
        const { data: summary } = await admin.rpc('get_marketing_summary', {
          p_client_id: client.id,
          p_from_date: fromDate,
          p_to_date: toDate,
        })

        const total = (summary as any)?.total_conversions || 0
        const sources = (summary as any)?.by_source || []
        console.log(`    - ${client.name}: 전환 ${total}건, Source ${sources.length}개`)
      } catch (error: any) {
        console.log(`    - ${client.name}: 집계 함수 오류 - ${error.message}`)
      }
    }
  } else {
    console.log(`  클라이언트 없음`)
  }
  console.log()

  // ==========================================
  // 7. 문제점 진단
  // ==========================================
  console.log('7️⃣ 문제점 진단\n')

  const issues: string[] = []

  // Visit이 너무 적음
  if ((totalVisits ?? 0) < 100 && (totalEntries ?? 0) > 100) {
    issues.push(`⚠️  Visit 수(${totalVisits ?? 0})가 등록 수(${totalEntries ?? 0})보다 훨씬 적음 - Visit API 호출 누락 가능성`)
  }

  // 오늘 Visit이 0
  if ((todayVisits ?? 0) === 0 && (todayEntries ?? 0) > 0) {
    issues.push(`⚠️  오늘 Visit이 0건인데 등록은 ${todayEntries ?? 0}건 - Visit API가 호출되지 않거나 저장 실패`)
  }

  // 최근 Visit이 오래됨
  if (latestVisit) {
    const latestDate = toKST(new Date((latestVisit as any).accessed_at))
    const daysDiff = Math.floor((nowKST.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000))
    if (daysDiff > 1) {
      issues.push(`⚠️  최근 Visit이 ${daysDiff}일 전 - Visit 추적이 멈춘 상태일 수 있음`)
    }
  } else {
    issues.push(`⚠️  Visit 기록이 전혀 없음 - Visit API가 한 번도 호출되지 않았거나 저장 실패`)
  }

  // 추적률이 낮음
  if (parseFloat(trackingRate) < 50) {
    issues.push(`⚠️  UTM/링크 추적률이 ${trackingRate}%로 낮음 - UTM 파라미터 전달/저장 문제 가능성`)
  }

  // Visit-등록 연결률이 낮음
  if (todayEntriesForLink && todayEntriesForLink.length > 0) {
    const entryIds = todayEntriesForLink.map((e: any) => e.id)
    const { data: linkedToday } = await admin
      .from('event_access_logs')
      .select('entry_id')
      .in('entry_id', entryIds)
    const linkedCount = new Set(linkedToday?.map((v: any) => v.entry_id)).size
    const linkRate = (linkedCount / todayEntriesForLink.length * 100)
    if (linkRate < 30) {
      issues.push(`⚠️  오늘 등록 중 Visit 연결률이 ${linkRate.toFixed(1)}%로 낮음 - session_id 전달 문제 가능성`)
    }
  }

  if (issues.length === 0) {
    console.log(`  ✅ 특별한 문제점 없음`)
  } else {
    issues.forEach(issue => console.log(`  ${issue}`))
  }
  console.log()

  // ==========================================
  // 8. 권장 사항
  // ==========================================
  console.log('8️⃣ 권장 사항\n')

  const recommendations: string[] = []

  if ((totalVisits ?? 0) < (totalEntries ?? 0) * 0.5) {
    recommendations.push(`1. Visit API 호출 확인: 모든 등록/설문 페이지에서 Visit API가 호출되는지 확인`)
    recommendations.push(`2. Visit API 실패 로그 확인: 서버 로그에서 [VisitTrackFail] 검색하여 실패 원인 파악`)
  }

  if (parseFloat(trackingRate) < 50) {
    recommendations.push(`3. UTM 파라미터 전달 확인: 등록 시 UTM이 body에 포함되어 전달되는지 확인`)
    recommendations.push(`4. UTM 복원 로직 확인: restoreTrackingInfo()가 제대로 동작하는지 확인`)
  }

  if (issues.length > 0) {
    recommendations.push(`5. 브라우저 네트워크 탭 확인: 실제 페이지에서 Visit API 호출 여부 확인`)
    recommendations.push(`6. DB 직접 확인: event_access_logs, event_survey_entries 테이블 직접 조회하여 데이터 저장 여부 확인`)
  }

  if (recommendations.length === 0) {
    console.log(`  ✅ 특별한 권장 사항 없음`)
  } else {
    recommendations.forEach(rec => console.log(`  ${rec}`))
  }
  console.log()

  console.log('='.repeat(80))
  console.log('분석 완료')
  console.log('='.repeat(80))
}

analyzeStatisticsSystem().catch(console.error)
