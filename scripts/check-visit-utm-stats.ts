import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * UTM 기준 Visit 집계 수치 확인
 * 집계 테이블과 Raw 데이터 비교
 */
async function checkVisitUTMStats() {
  const admin = createAdminSupabase()
  
  console.log('=== UTM 기준 Visit 집계 수치 분석 ===\n')
  
  // 최근 7일 데이터 조회
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const fromDate = sevenDaysAgo.toISOString().split('T')[0]
  const toDate = today.toISOString().split('T')[0]
  
  console.log(`📅 분석 기간: ${fromDate} ~ ${toDate}\n`)
  
  // 1. 집계 테이블 (marketing_stats_daily)에서 UTM 조합별 Visit 집계
  console.log('1️⃣ 집계 테이블 (marketing_stats_daily) 기준:\n')
  
  const { data: aggregatedStats, error: aggError } = await admin
    .from('marketing_stats_daily')
    .select('utm_source, utm_medium, utm_campaign, visits, conversions')
    .gte('bucket_date', fromDate)
    .lte('bucket_date', toDate)
  
  if (aggError) {
    console.error('❌ 집계 테이블 조회 실패:', aggError.message)
  } else {
    // UTM 조합별로 합산
    const comboMap = new Map<string, { visits: number; conversions: number }>()
    
    aggregatedStats?.forEach(stat => {
      const key = `${stat.utm_source || '__null__'}|${stat.utm_medium || '__null__'}|${stat.utm_campaign || '__null__'}`
      const existing = comboMap.get(key) || { visits: 0, conversions: 0 }
      comboMap.set(key, {
        visits: existing.visits + (stat.visits || 0),
        conversions: existing.conversions + (stat.conversions || 0)
      })
    })
    
    const sortedCombos = Array.from(comboMap.entries())
      .map(([key, data]) => {
        const [source, medium, campaign] = key.split('|')
        return {
          source: source === '__null__' ? null : source,
          medium: medium === '__null__' ? null : medium,
          campaign: campaign === '__null__' ? null : campaign,
          visits: data.visits,
          conversions: data.conversions,
          cvr: data.visits > 0 ? ((data.conversions / data.visits) * 100).toFixed(2) : '0.00'
        }
      })
      .sort((a, b) => b.visits - a.visits)
    
    console.log(`   총 ${sortedCombos.length}개 UTM 조합\n`)
    
    sortedCombos.slice(0, 10).forEach((combo, idx) => {
      console.log(`   ${idx + 1}. ${combo.source || '(null)'} / ${combo.medium || '(null)'} / ${combo.campaign || '(null)'}`)
      console.log(`      Visits: ${combo.visits.toLocaleString()} | Conversions: ${combo.conversions.toLocaleString()} | CVR: ${combo.cvr}%`)
    })
    
    const totalVisits = sortedCombos.reduce((sum, c) => sum + c.visits, 0)
    const totalConversions = sortedCombos.reduce((sum, c) => sum + c.conversions, 0)
    console.log(`\n   📊 집계 테이블 합계: Visits ${totalVisits.toLocaleString()} | Conversions ${totalConversions.toLocaleString()}\n`)
  }
  
  // 2. Raw 데이터 (event_access_logs)에서 UTM 조합별 Visit 집계
  console.log('2️⃣ Raw 데이터 (event_access_logs) 기준:\n')
  
  const fromDateUTC = new Date(sevenDaysAgo.getTime() - 9 * 60 * 60 * 1000)
  const toDateUTC = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 9 * 60 * 60 * 1000)
  
  const { data: rawVisits, error: rawError } = await admin
    .from('event_access_logs')
    .select('utm_source, utm_medium, utm_campaign, session_id, accessed_at')
    .not('campaign_id', 'is', null)
    .gte('accessed_at', fromDateUTC.toISOString())
    .lt('accessed_at', toDateUTC.toISOString())
  
  if (rawError) {
    console.error('❌ Raw 데이터 조회 실패:', rawError.message)
  } else {
    // UTM 조합별로 session_id DISTINCT 집계
    const rawComboMap = new Map<string, Set<string>>()
    
    rawVisits?.forEach(visit => {
      const source = visit.utm_source || null
      const medium = visit.utm_medium || null
      const campaign = visit.utm_campaign || null
      const key = `${source || '__null__'}|${medium || '__null__'}|${campaign || '__null__'}`
      
      if (!rawComboMap.has(key)) {
        rawComboMap.set(key, new Set())
      }
      
      if (visit.session_id) {
        rawComboMap.get(key)!.add(visit.session_id)
      }
    })
    
    const sortedRawCombos = Array.from(rawComboMap.entries())
      .map(([key, sessionSet]) => {
        const [source, medium, campaign] = key.split('|')
        return {
          source: source === '__null__' ? null : source,
          medium: medium === '__null__' ? null : medium,
          campaign: campaign === '__null__' ? null : campaign,
          visits: sessionSet.size, // DISTINCT session_id 카운트
          rawCount: rawVisits?.filter(v => {
            const s = v.utm_source || null
            const m = v.utm_medium || null
            const c = v.utm_campaign || null
            return `${s || '__null__'}|${m || '__null__'}|${c || '__null__'}` === key
          }).length || 0 // 레코드 수
        }
      })
      .sort((a, b) => b.visits - a.visits)
    
    console.log(`   총 ${sortedRawCombos.length}개 UTM 조합\n`)
    
    sortedRawCombos.slice(0, 10).forEach((combo, idx) => {
      console.log(`   ${idx + 1}. ${combo.source || '(null)'} / ${combo.medium || '(null)'} / ${combo.campaign || '(null)'}`)
      console.log(`      Visits (DISTINCT session_id): ${combo.visits.toLocaleString()} | Raw 레코드 수: ${combo.rawCount.toLocaleString()}`)
      if (combo.rawCount > combo.visits) {
        console.log(`      ⚠️  중복: ${(combo.rawCount - combo.visits).toLocaleString()}개 (같은 session_id가 여러 번 카운트됨)`)
      }
    })
    
    const totalRawVisits = sortedRawCombos.reduce((sum, c) => sum + c.visits, 0)
    const totalRawRecords = sortedRawCombos.reduce((sum, c) => sum + c.rawCount, 0)
    console.log(`\n   📊 Raw 데이터 합계:`)
    console.log(`      Visits (DISTINCT): ${totalRawVisits.toLocaleString()}`)
    console.log(`      Raw 레코드 수: ${totalRawRecords.toLocaleString()}`)
    if (totalRawRecords > totalRawVisits) {
      console.log(`      ⚠️  중복: ${(totalRawRecords - totalRawVisits).toLocaleString()}개\n`)
    } else {
      console.log('')
    }
  }
  
  // 3. 비교 분석
  console.log('3️⃣ 집계 테이블 vs Raw 데이터 비교:\n')
  
  if (aggregatedStats && rawVisits) {
    const aggTotal = aggregatedStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    const rawTotal = Array.from(new Set(rawVisits.map(v => v.session_id))).length
    
    console.log(`   집계 테이블 총 Visits: ${aggTotal.toLocaleString()}`)
    console.log(`   Raw 데이터 총 Visits (DISTINCT): ${rawTotal.toLocaleString()}`)
    console.log(`   차이: ${Math.abs(aggTotal - rawTotal).toLocaleString()}`)
    
    if (aggTotal !== rawTotal) {
      const diffPercent = ((Math.abs(aggTotal - rawTotal) / Math.max(aggTotal, rawTotal)) * 100).toFixed(2)
      console.log(`   차이율: ${diffPercent}%`)
      
      if (aggTotal < rawTotal * 0.95) {
        console.log(`   ⚠️  집계 테이블이 Raw 데이터보다 5% 이상 적음 (집계 누락 가능성)`)
      }
    } else {
      console.log(`   ✅ 일치`)
    }
    console.log('')
  }
  
  // 4. UTM Source별 집계
  console.log('4️⃣ UTM Source별 Visit 집계:\n')
  
  if (rawVisits) {
    const sourceMap = new Map<string, Set<string>>()
    
    rawVisits.forEach(visit => {
      const source = visit.utm_source || '__null__'
      if (!sourceMap.has(source)) {
        sourceMap.set(source, new Set())
      }
      if (visit.session_id) {
        sourceMap.get(source)!.add(visit.session_id)
      }
    })
    
    const sortedSources = Array.from(sourceMap.entries())
      .map(([source, sessionSet]) => ({
        source: source === '__null__' ? '(null)' : source,
        visits: sessionSet.size
      }))
      .sort((a, b) => b.visits - a.visits)
    
    sortedSources.forEach((item, idx) => {
      const pct = rawVisits.length > 0 
        ? ((item.visits / Array.from(new Set(rawVisits.map(v => v.session_id))).length) * 100).toFixed(1)
        : '0.0'
      console.log(`   ${idx + 1}. ${item.source}: ${item.visits.toLocaleString()}개 (${pct}%)`)
    })
    console.log('')
  }
  
  // 5. UTM Medium별 집계
  console.log('5️⃣ UTM Medium별 Visit 집계:\n')
  
  if (rawVisits) {
    const mediumMap = new Map<string, Set<string>>()
    
    rawVisits.forEach(visit => {
      const medium = visit.utm_medium || '__null__'
      if (!mediumMap.has(medium)) {
        mediumMap.set(medium, new Set())
      }
      if (visit.session_id) {
        mediumMap.get(medium)!.add(visit.session_id)
      }
    })
    
    const sortedMediums = Array.from(mediumMap.entries())
      .map(([medium, sessionSet]) => ({
        medium: medium === '__null__' ? '(null)' : medium,
        visits: sessionSet.size
      }))
      .sort((a, b) => b.visits - a.visits)
    
    sortedMediums.forEach((item, idx) => {
      const pct = rawVisits.length > 0 
        ? ((item.visits / Array.from(new Set(rawVisits.map(v => v.session_id))).length) * 100).toFixed(1)
        : '0.0'
      console.log(`   ${idx + 1}. ${item.medium}: ${item.visits.toLocaleString()}개 (${pct}%)`)
    })
    console.log('')
  }
  
  // 6. UTM Campaign별 집계
  console.log('6️⃣ UTM Campaign별 Visit 집계:\n')
  
  if (rawVisits) {
    const campaignMap = new Map<string, Set<string>>()
    
    rawVisits.forEach(visit => {
      const campaign = visit.utm_campaign || '__null__'
      if (!campaignMap.has(campaign)) {
        campaignMap.set(campaign, new Set())
      }
      if (visit.session_id) {
        campaignMap.get(campaign)!.add(visit.session_id)
      }
    })
    
    const sortedCampaigns = Array.from(campaignMap.entries())
      .map(([campaign, sessionSet]) => ({
        campaign: campaign === '__null__' ? '(null)' : campaign,
        visits: sessionSet.size
      }))
      .sort((a, b) => b.visits - a.visits)
    
    sortedCampaigns.forEach((item, idx) => {
      const pct = rawVisits.length > 0 
        ? ((item.visits / Array.from(new Set(rawVisits.map(v => v.session_id))).length) * 100).toFixed(1)
        : '0.0'
      console.log(`   ${idx + 1}. ${item.campaign}: ${item.visits.toLocaleString()}개 (${pct}%)`)
    })
    console.log('')
  }
}

checkVisitUTMStats().catch(console.error)
