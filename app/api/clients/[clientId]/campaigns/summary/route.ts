import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

export const runtime = 'nodejs'

/**
 * 마케팅 캠페인 요약 API (Phase 1: 집계 테이블 기반)
 * GET /api/clients/[clientId]/campaigns/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 
 * Phase 1 개선: marketing_stats_daily 테이블에서 집계 데이터를 읽어서 응답
 * Fallback: 집계 테이블에 데이터가 없으면 기존 방식(raw 집계) 사용
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
    
    // 권한 확인
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer', 'member'])
    
    const admin = createAdminSupabase()
    
    // 날짜 범위 설정 (KST 기준)
    // 입력된 날짜 문자열을 KST 기준으로 해석하여 UTC로 변환
    const fromDateKST = new Date(`${from}T00:00:00+09:00`) // KST 자정
    const toDateKST = new Date(`${to}T23:59:59+09:00`) // KST 마지막 시간
    const fromDateUTC = new Date(fromDateKST.getTime() - 9 * 60 * 60 * 1000) // UTC로 변환
    const toDateUTC = new Date(toDateKST.getTime() - 9 * 60 * 60 * 1000) // UTC로 변환
    
    // Phase 1: 집계 테이블에서 데이터 조회
    // bucket_date는 DATE 타입이므로 문자열 비교로 충분하지만, KST 기준으로 처리
    const { data: aggregatedStats, error: statsError } = await admin
      .from('marketing_stats_daily')
      .select('*')
      .eq('client_id', clientId)
      .gte('bucket_date', from)
      .lte('bucket_date', to)
    
    if (statsError) {
      console.error('[Marketing Summary] 집계 테이블 조회 오류:', statsError)
      // Fallback: 기존 방식 사용
      return await getSummaryFromRaw(clientId, fromDateUTC, toDateUTC, from, to)
    }
    
    // 집계 테이블에 데이터가 있으면 사용하되, Raw 데이터와 비교하여 누락 확인
    if (aggregatedStats && aggregatedStats.length > 0) {
      // 어제 10시 (KST) 기준점 계산
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0) // 어제 10시 (KST)
      const yesterday10amUTC = new Date(yesterday.getTime() - 9 * 60 * 60 * 1000) // UTC 변환
      
      // 요청 날짜 범위에 어제 10시 이전 데이터가 포함되는지 확인
      const hasPre10amData = fromDateUTC < yesterday10amUTC
      
      // Raw 데이터에서 실제 전환수 확인
      const { data: campaigns } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('client_id', clientId)
      
      let rawTotalConversions = 0
      let rawPre10amConversions = 0
      let rawPost10amConversions = 0
      
      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id)
        
        // 전체 Raw 데이터
        const { count } = await admin
          .from('event_survey_entries')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .gte('created_at', fromDateUTC.toISOString())
          .lte('created_at', toDateUTC.toISOString())
        
        rawTotalConversions = count || 0
        
        // 어제 10시 이전/이후 분리 (어제 10시 이전 데이터가 포함된 경우만)
        if (hasPre10amData) {
          const { count: pre10amCount } = await admin
            .from('event_survey_entries')
            .select('*', { count: 'exact', head: true })
            .in('campaign_id', campaignIds)
            .gte('created_at', fromDateUTC.toISOString())
            .lt('created_at', yesterday10amUTC.toISOString())
          
          rawPre10amConversions = pre10amCount || 0
          
          const { count: post10amCount } = await admin
            .from('event_survey_entries')
            .select('*', { count: 'exact', head: true })
            .in('campaign_id', campaignIds)
            .gte('created_at', yesterday10amUTC.toISOString())
            .lte('created_at', toDateUTC.toISOString())
          
          rawPost10amConversions = post10amCount || 0
        }
      }
      
      // 집계 테이블의 전환수
      const aggregatedTotalConversions = aggregatedStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      
      // 어제 10시 이전 데이터의 집계 테이블 전환수 계산
      let aggregatedPre10amConversions = 0
      if (hasPre10amData) {
        const pre10amBucketDate = new Date(yesterday10amUTC).toISOString().split('T')[0]
        aggregatedPre10amConversions = aggregatedStats
          .filter(s => s.bucket_date < pre10amBucketDate)
          .reduce((sum, s) => sum + (s.conversions || 0), 0)
      }
      
      console.log('[Marketing Summary] 집계 테이블 vs Raw 데이터:', {
        clientId,
        statsCount: aggregatedStats.length,
        aggregatedTotal: aggregatedTotalConversions,
        rawTotal: rawTotalConversions,
        difference: rawTotalConversions - aggregatedTotalConversions,
        hasPre10amData,
        rawPre10amConversions,
        rawPost10amConversions,
        aggregatedPre10amConversions,
        dateRange: { from, to }
      })
      
      // 어제 10시 이전 데이터가 포함된 경우, 집계 테이블의 보정 여부 확인
      // 보정 후: 집계 테이블에 어제 10시 이전 데이터가 충분히 있으면 집계 테이블 사용
      // 보정 전: 집계 테이블이 불완전하면 Raw 데이터 사용
      if (hasPre10amData && rawPre10amConversions > 0) {
        // 집계 테이블의 어제 10시 이전 전환수가 Raw 데이터의 95% 이상이면 보정 완료로 간주
        const isBackfilled = aggregatedPre10amConversions >= rawPre10amConversions * 0.95
        
        if (!isBackfilled) {
          // 보정이 안 된 경우: Raw 데이터 사용
          console.warn('[Marketing Summary] 어제 10시 이전 데이터 보정 필요, Raw 데이터 사용:', {
            aggregatedTotal: aggregatedTotalConversions,
            aggregatedPre10am: aggregatedPre10amConversions,
            rawTotal: rawTotalConversions,
            rawPre10am: rawPre10amConversions,
            missing: rawPre10amConversions - aggregatedPre10amConversions
          })
          return await getSummaryFromRaw(clientId, fromDateUTC, toDateUTC, from, to)
        } else {
          // 보정 완료: 집계 테이블 사용 (전체 검증은 아래에서 수행)
          console.log('[Marketing Summary] 어제 10시 이전 데이터 보정 완료, 집계 테이블 사용:', {
            aggregatedPre10am: aggregatedPre10amConversions,
            rawPre10am: rawPre10amConversions
          })
        }
      }
      
      // 집계 테이블의 전환수가 Raw 데이터보다 5% 이상 적으면 Raw 데이터 사용
      // (집계가 불완전하거나 누락된 데이터가 있을 수 있음)
      if (rawTotalConversions > 0 && aggregatedTotalConversions < rawTotalConversions * 0.95) {
        console.warn('[Marketing Summary] 집계 테이블이 불완전함, Raw 데이터 사용:', {
          aggregatedTotal: aggregatedTotalConversions,
          rawTotal: rawTotalConversions,
          missing: rawTotalConversions - aggregatedTotalConversions
        })
        return await getSummaryFromRaw(clientId, fromDateUTC, toDateUTC, from, to)
      }
      
      // 이미 위에서 계산한 rawTotalConversions와 campaigns를 사용
      return await getSummaryFromAggregated(aggregatedStats, from, to, clientId, rawTotalConversions)
    }
    
    // 집계 테이블에 데이터가 없으면 기존 방식 사용 (Fallback)
    console.log('[Marketing Summary] 집계 테이블 데이터 없음, Fallback 사용')
    return await getSummaryFromRaw(clientId, fromDateUTC, toDateUTC, from, to)
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

/**
 * 집계 테이블에서 요약 데이터 생성
 */
async function getSummaryFromAggregated(
  stats: any[],
  from: string,
  to: string,
  clientId?: string,
  rawTotalConversions?: number
) {
  // 전체 전환 수: Raw 데이터에서 가져온 값 사용 (UTM 누락 항목 포함)
  // 없으면 집계 테이블에서 계산
  const totalConversions = rawTotalConversions !== undefined 
    ? rawTotalConversions 
    : stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
  
  // 전체 Visits: 집계 테이블에서 계산 (Raw 데이터로 보완 가능하지만 일단 집계 테이블 사용)
  let totalVisits = stats.reduce((sum, s) => sum + (s.visits || 0), 0)
  
  // Raw 데이터에서 total_visits 보완 (누락된 visits 포함)
  if (clientId) {
    const admin = createAdminSupabase()
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    const campaignIds = campaigns?.map(c => c.id) || []
    
    if (campaignIds.length > 0) {
    const fromDateUTC = new Date(new Date(`${from}T00:00:00+09:00`).getTime() - 9 * 60 * 60 * 1000)
    const toDateUTC = new Date(new Date(`${to}T23:59:59+09:00`).getTime() - 9 * 60 * 60 * 1000)
    
    const { count: rawVisitsCount } = await admin
      .from('event_access_logs')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('accessed_at', fromDateUTC.toISOString())
      .lte('accessed_at', toDateUTC.toISOString())
    
    // Raw 데이터의 visits가 더 크면 사용 (누락된 visits 포함)
    if (rawVisitsCount && rawVisitsCount > totalVisits) {
      totalVisits = rawVisitsCount
    }
    }
  }
  
  const avgCVR = totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(2) : '0.00'
  
  // 활성 링크 수 조회
  const admin = createAdminSupabase()
  const { data: activeLinks } = await admin
    .from('campaign_link_meta')
    .select('id')
    .eq('client_id', stats[0]?.client_id)
    .eq('status', 'active')
  
  const activeLinksCount = activeLinks?.length || 0
  
  // 링크 메타데이터 조회 (UTM 복원용)
  const linkIdsForUTM = new Set<string>()
  stats.forEach(s => {
    if (s.marketing_campaign_link_id) {
      linkIdsForUTM.add(s.marketing_campaign_link_id)
    }
  })
  
  const linkMetaMap = new Map<string, { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }>()
  if (linkIdsForUTM.size > 0) {
    const { data: linkMetas } = await admin
      .from('campaign_link_meta')
      .select('id, utm_source, utm_medium, utm_campaign')
      .in('id', Array.from(linkIdsForUTM))
    
    linkMetas?.forEach(link => {
      linkMetaMap.set(link.id, {
        utm_source: link.utm_source,
        utm_medium: link.utm_medium,
        utm_campaign: link.utm_campaign,
      })
    })
  }
  
  // Source별 집계 (링크 메타데이터에서 UTM 복원)
  const sourceMap = new Map<string | null, number>()
  stats.forEach(s => {
    let source = s.utm_source || null
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if (!source && s.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(s.marketing_campaign_link_id)
      source = linkMeta?.utm_source || null
    }
    sourceMap.set(source, (sourceMap.get(source) || 0) + (s.conversions || 0))
  })
  const conversions_by_source = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ 
      source, 
      count,
      is_untracked: source === null || source === '__null__',
    }))
    .sort((a, b) => b.count - a.count)
  
  // Medium별 집계 (링크 메타데이터에서 UTM 복원)
  const mediumMap = new Map<string | null, number>()
  stats.forEach(s => {
    let medium = s.utm_medium || null
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if (!medium && s.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(s.marketing_campaign_link_id)
      medium = linkMeta?.utm_medium || null
    }
    mediumMap.set(medium, (mediumMap.get(medium) || 0) + (s.conversions || 0))
  })
  const conversions_by_medium = Array.from(mediumMap.entries())
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count)
  
  // Campaign별 집계 (링크 메타데이터에서 UTM 복원)
  const campaignMap = new Map<string | null, number>()
  stats.forEach(s => {
    let campaign = s.utm_campaign || null
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if (!campaign && s.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(s.marketing_campaign_link_id)
      campaign = linkMeta?.utm_campaign || null
    }
    campaignMap.set(campaign, (campaignMap.get(campaign) || 0) + (s.conversions || 0))
  })
  const conversions_by_campaign = Array.from(campaignMap.entries())
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count)
  
  // 조합별 집계 (conversions와 visits 모두 집계)
  // 집계 테이블의 데이터를 기준으로 사용 (중복 방지)
  // 링크 메타데이터에서 UTM 복원
  const comboMap = new Map<string, { conversions: number; visits: number }>()
  stats.forEach(s => {
    let source = s.utm_source || null
    let medium = s.utm_medium || null
    let campaign = s.utm_campaign || null
    
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if ((!source || !medium || !campaign) && s.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(s.marketing_campaign_link_id)
      if (linkMeta) {
        source = source || linkMeta.utm_source || null
        medium = medium || linkMeta.utm_medium || null
        campaign = campaign || linkMeta.utm_campaign || null
      }
    }
    
    const key = `${source}|${medium}|${campaign}`
    const existing = comboMap.get(key) || { conversions: 0, visits: 0 }
    comboMap.set(key, {
      conversions: existing.conversions + (s.conversions || 0),
      visits: existing.visits + (s.visits || 0),
    })
  })
  
  // 집계 테이블에 있는 조합 키 수집 (중복 방지용)
  const aggregatedComboKeys = new Set(comboMap.keys())
  
  // Raw 데이터에서 UTM 조합별 집계 보완 (집계 테이블에 없는 조합만 추가)
  let campaignIds: string[] = []
  if (clientId) {
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    if (campaigns && campaigns.length > 0) {
      campaignIds = campaigns.map(c => c.id)
      const fromDateUTC = new Date(new Date(`${from}T00:00:00+09:00`).getTime() - 9 * 60 * 60 * 1000)
      const toDateUTC = new Date(new Date(`${to}T23:59:59+09:00`).getTime() - 9 * 60 * 60 * 1000)
      
      const { data: rawEntries } = await admin
        .from('event_survey_entries')
        .select('utm_source, utm_medium, utm_campaign')
        .in('campaign_id', campaignIds)
        .gte('created_at', fromDateUTC.toISOString())
        .lte('created_at', toDateUTC.toISOString())
      
      // Raw 데이터에서 UTM 조합별 집계 (집계 테이블에 없는 조합만 추가)
      rawEntries?.forEach(entry => {
        const source = entry.utm_source || null
        const medium = entry.utm_medium || null
        const campaign = entry.utm_campaign || null
        const key = `${source}|${medium}|${campaign}`
        
        // 집계 테이블에 이미 있는 조합은 건너뛰기 (중복 방지)
        if (aggregatedComboKeys.has(key)) {
          return
        }
        
        const existing = comboMap.get(key) || { conversions: 0, visits: 0 }
        comboMap.set(key, {
          conversions: existing.conversions + 1,
          visits: existing.visits, // visits는 집계 테이블에서만 가져옴
        })
      })
    }
  }
  const conversions_by_combo = Array.from(comboMap.entries())
    .map(([key, data]) => {
      const [source, medium, campaign] = key.split('|')
      const cvr = data.visits > 0 
        ? ((data.conversions / data.visits) * 100).toFixed(2)
        : '0.00'
      return {
        source: source === 'null' || source === '__null__' ? null : source,
        medium: medium === 'null' || medium === '__null__' ? null : medium,
        campaign: campaign === 'null' || campaign === '__null__' ? null : campaign,
        count: data.conversions,
        visits: data.visits,
        cvr: parseFloat(cvr),
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 링크별 집계: Raw 데이터를 기준으로 완전히 재집계 (정확성 보장)
  // 링크 메타데이터 조회 (UTM 매칭용)
  const { data: allLinks } = clientId ? await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign')
    .eq('client_id', clientId) : { data: [] }
  
  // UTM 조합으로 링크 찾기 위한 맵 생성
  const linkByUTM = new Map<string, string>() // "source|medium|campaign" -> linkId
  allLinks?.forEach(link => {
    if (link.utm_source && link.utm_medium && link.utm_campaign) {
      const utmKey = `${link.utm_source}|${link.utm_medium}|${link.utm_campaign}`
      // 같은 UTM을 가진 링크가 여러 개면 첫 번째 것만 사용 (또는 가장 최근 것)
      if (!linkByUTM.has(utmKey)) {
        linkByUTM.set(utmKey, link.id)
      }
    }
  })
  
  const linkMap = new Map<string, { conversions: number; visits: number }>()
  
  if (clientId && campaignIds.length > 0) {
    const fromDateUTC = new Date(new Date(`${from}T00:00:00+09:00`).getTime() - 9 * 60 * 60 * 1000)
    const toDateUTC = new Date(new Date(`${to}T23:59:59+09:00`).getTime() - 9 * 60 * 60 * 1000)
    
    // Conversions 집계 (Raw 데이터에서 직접 집계)
    // marketing_campaign_link_id가 있으면 직접 매칭, 없으면 UTM으로 매칭
    const { data: rawEntries } = await admin
      .from('event_survey_entries')
      .select('marketing_campaign_link_id, utm_source, utm_medium, utm_campaign')
      .in('campaign_id', campaignIds)
      .gte('created_at', fromDateUTC.toISOString())
      .lte('created_at', toDateUTC.toISOString())
    
    // Visits 집계 (Raw 데이터에서 직접 집계)
    // marketing_campaign_link_id가 있으면 직접 매칭, 없으면 UTM으로 매칭
    const { data: rawVisits } = await admin
      .from('event_access_logs')
      .select('marketing_campaign_link_id, utm_source, utm_medium, utm_campaign')
      .in('campaign_id', campaignIds)
      .gte('accessed_at', fromDateUTC.toISOString())
      .lte('accessed_at', toDateUTC.toISOString())
    
    // Raw 데이터에서 링크별 conversions 집계
    rawEntries?.forEach(entry => {
      let linkId: string | null = entry.marketing_campaign_link_id || null
      
      // 링크 ID가 없으면 UTM으로 링크 찾기
      if (!linkId && entry.utm_source && entry.utm_medium && entry.utm_campaign) {
        const utmKey = `${entry.utm_source}|${entry.utm_medium}|${entry.utm_campaign}`
        linkId = linkByUTM.get(utmKey) || null
      }
      
      // 링크 ID가 있으면 집계
      if (linkId) {
        const existing = linkMap.get(linkId) || { conversions: 0, visits: 0 }
        linkMap.set(linkId, {
          conversions: existing.conversions + 1,
          visits: existing.visits,
        })
      }
    })
    
    // Raw 데이터에서 링크별 visits 집계
    rawVisits?.forEach(visit => {
      let linkId: string | null = visit.marketing_campaign_link_id || null
      
      // 링크 ID가 없으면 UTM으로 링크 찾기
      if (!linkId && visit.utm_source && visit.utm_medium && visit.utm_campaign) {
        const utmKey = `${visit.utm_source}|${visit.utm_medium}|${visit.utm_campaign}`
        linkId = linkByUTM.get(utmKey) || null
      }
      
      // 링크 ID가 있으면 집계
      if (linkId) {
        const existing = linkMap.get(linkId) || { conversions: 0, visits: 0 }
        linkMap.set(linkId, {
          conversions: existing.conversions,
          visits: existing.visits + 1,
        })
      }
    })
  } else {
    // Fallback: 집계 테이블에서 가져오기 (campaignIds가 없는 경우)
    stats.forEach(s => {
      if (s.marketing_campaign_link_id) {
        const existing = linkMap.get(s.marketing_campaign_link_id) || { conversions: 0, visits: 0 }
        linkMap.set(s.marketing_campaign_link_id, {
          conversions: existing.conversions + (s.conversions || 0),
          visits: existing.visits + (s.visits || 0),
        })
      }
    })
  }
  
  // 링크 메타데이터는 이미 조회했으므로 재사용
  const linkIds = Array.from(linkMap.keys())
  const conversions_by_link = Array.from(linkMap.entries())
    .map(([linkId, data]) => {
      const linkMeta = allLinks?.find((m: any) => m.id === linkId)
      const cvr = data.visits > 0 
        ? ((data.conversions / data.visits) * 100).toFixed(2)
        : '0.00'
      return {
        link_id: linkId,
        link_name: linkMeta?.name || linkId,
        count: data.conversions,
        visits: data.visits,
        cvr: parseFloat(cvr),
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 추적 메타데이터 (링크 메타데이터에서 UTM 복원 고려)
  const trackedCount = stats.reduce((sum, s) => {
    let hasUTM = !!(s.utm_source || s.utm_medium || s.utm_campaign)
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 확인
    if (!hasUTM && s.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(s.marketing_campaign_link_id)
      hasUTM = !!(linkMeta?.utm_source || linkMeta?.utm_medium || linkMeta?.utm_campaign)
    }
    const hasLink = !!s.marketing_campaign_link_id
    return sum + (hasUTM || hasLink ? (s.conversions || 0) : 0)
  }, 0)
  const untrackedCount = totalConversions - trackedCount
  const trackingSuccessRate = totalConversions > 0 
    ? ((trackedCount / totalConversions) * 100).toFixed(1) + '%'
    : '0.0%'
  
  return NextResponse.json({
    total_conversions: totalConversions,
    total_visits: totalVisits,
    avg_cvr: parseFloat(avgCVR),
    active_links: activeLinksCount,
    conversions_by_source,
    conversions_by_medium,
    conversions_by_campaign,
    conversions_by_combo,
    conversions_by_link,
    tracking_metadata: {
      tracked_count: trackedCount,
      untracked_count: untrackedCount,
      tracking_success_rate: trackingSuccessRate,
    },
    date_range: { from, to },
    _source: 'aggregated' // 디버깅용
  })
}

/**
 * 기존 방식: Raw 데이터에서 집계 (Fallback)
 */
async function getSummaryFromRaw(
  clientId: string,
  fromDate: Date,
  toDate: Date,
  from: string,
  to: string
) {
  const admin = createAdminSupabase()
  
  // 해당 클라이언트의 캠페인 ID 목록
  const { data: campaigns } = await admin
    .from('event_survey_campaigns')
    .select('id')
    .eq('client_id', clientId)
  
  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      total_conversions: 0,
      conversions_by_source: [],
      conversions_by_medium: [],
      conversions_by_campaign: [],
      conversions_by_combo: [],
      conversions_by_link: [],
      tracking_metadata: {
        tracked_count: 0,
        untracked_count: 0,
        tracking_success_rate: '0.0%',
      },
      date_range: { from, to },
      _source: 'raw'
    })
  }
  
  const campaignIds = campaigns.map(c => c.id)
  
  // 모든 엔트리 가져오기
  // created_at은 UTC로 저장되어 있으므로, KST 기준 날짜를 UTC로 변환하여 필터링
  const { data: entries } = await admin
    .from('event_survey_entries')
    .select('utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .in('campaign_id', campaignIds)
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())
  
  const totalConversions = entries?.length || 0
  
  // 링크 메타데이터 조회 (UTM 복원용)
  const linkIdsForUTM = new Set<string>()
  entries?.forEach(item => {
    if (item.marketing_campaign_link_id) {
      linkIdsForUTM.add(item.marketing_campaign_link_id)
    }
  })
  
  const linkMetaMap = new Map<string, { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }>()
  if (linkIdsForUTM.size > 0) {
    const { data: linkMetas } = await admin
      .from('campaign_link_meta')
      .select('id, utm_source, utm_medium, utm_campaign')
      .in('id', Array.from(linkIdsForUTM))
    
    linkMetas?.forEach(link => {
      linkMetaMap.set(link.id, {
        utm_source: link.utm_source,
        utm_medium: link.utm_medium,
        utm_campaign: link.utm_campaign,
      })
    })
  }
  
  // Source별 집계 (링크 메타데이터에서 UTM 복원)
  const sourceMap = new Map<string | null, number>()
  entries?.forEach(item => {
    let source = item.utm_source || null
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if (!source && item.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(item.marketing_campaign_link_id)
      source = linkMeta?.utm_source || null
    }
    
    const hasLinkId = !!item.marketing_campaign_link_id
    const hasUTM = !!(source || item.utm_medium || item.utm_campaign)
    
    if (!hasLinkId && !hasUTM) {
      sourceMap.set('Direct (no tracking)', (sourceMap.get('Direct (no tracking)') || 0) + 1)
    } else {
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    }
  })
  const conversions_by_source = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count, is_untracked: source === 'Direct (no tracking)' }))
    .sort((a, b) => b.count - a.count)
  
  // Medium별 집계 (링크 메타데이터에서 UTM 복원)
  const mediumMap = new Map<string | null, number>()
  entries?.forEach(item => {
    let medium = item.utm_medium || null
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if (!medium && item.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(item.marketing_campaign_link_id)
      medium = linkMeta?.utm_medium || null
    }
    mediumMap.set(medium, (mediumMap.get(medium) || 0) + 1)
  })
  const conversions_by_medium = Array.from(mediumMap.entries())
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count)
  
  // Campaign별 집계 (링크 메타데이터에서 UTM 복원)
  const campaignMap = new Map<string | null, number>()
  entries?.forEach(item => {
    let campaign = item.utm_campaign || null
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if (!campaign && item.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(item.marketing_campaign_link_id)
      campaign = linkMeta?.utm_campaign || null
    }
    campaignMap.set(campaign, (campaignMap.get(campaign) || 0) + 1)
  })
  const conversions_by_campaign = Array.from(campaignMap.entries())
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count)
  
  // 조합별 집계 (conversions) - 링크 메타데이터에서 UTM 복원
  const comboMap = new Map<string, number>()
  entries?.forEach(item => {
    let source = item.utm_source || null
    let medium = item.utm_medium || null
    let campaign = item.utm_campaign || null
    
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 가져오기
    if ((!source || !medium || !campaign) && item.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(item.marketing_campaign_link_id)
      if (linkMeta) {
        source = source || linkMeta.utm_source || null
        medium = medium || linkMeta.utm_medium || null
        campaign = campaign || linkMeta.utm_campaign || null
      }
    }
    
    const key = `${source}|${medium}|${campaign}`
    comboMap.set(key, (comboMap.get(key) || 0) + 1)
  })
  
  // 조합별 Visits 집계 (event_access_logs에서 UTM 조합별로 집계)
  const comboVisitsMap = new Map<string, number>()
  if (campaigns && campaigns.length > 0) {
    const campaignIds = campaigns.map(c => c.id)
    const { data: visitLogs } = await admin
      .from('event_access_logs')
      .select('utm_source, utm_medium, utm_campaign')
      .in('campaign_id', campaignIds)
      .gte('accessed_at', fromDate.toISOString())
      .lte('accessed_at', toDate.toISOString())
    
    visitLogs?.forEach(log => {
      const source = log.utm_source || null
      const medium = log.utm_medium || null
      const campaign = log.utm_campaign || null
      const key = `${source}|${medium}|${campaign}`
      comboVisitsMap.set(key, (comboVisitsMap.get(key) || 0) + 1)
    })
  }
  
  const conversions_by_combo = Array.from(comboMap.entries())
    .map(([key, conversions]) => {
      const [source, medium, campaign] = key.split('|')
      const visits = comboVisitsMap.get(key) || 0
      const cvr = visits > 0 
        ? ((conversions / visits) * 100).toFixed(2)
        : '0.00'
      return {
        source: source === 'null' ? null : source,
        medium: medium === 'null' ? null : medium,
        campaign: campaign === 'null' ? null : campaign,
        count: conversions,
        visits: visits,
        cvr: parseFloat(cvr),
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 링크별 집계 (UTM 매칭 포함)
  // 링크 메타데이터 조회 (UTM 매칭용)
  const { data: allLinks } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign')
    .eq('client_id', clientId)
  
  // UTM 조합으로 링크 찾기 위한 맵 생성
  const linkByUTM = new Map<string, string>() // "source|medium|campaign" -> linkId
  allLinks?.forEach(link => {
    if (link.utm_source && link.utm_medium && link.utm_campaign) {
      const utmKey = `${link.utm_source}|${link.utm_medium}|${link.utm_campaign}`
      if (!linkByUTM.has(utmKey)) {
        linkByUTM.set(utmKey, link.id)
      }
    }
  })
  
  const linkMap = new Map<string, { conversions: number; visits: number }>()
  
  // Conversions 집계
  entries?.forEach(item => {
    let linkId: string | null = item.marketing_campaign_link_id || null
    
    // 링크 ID가 없으면 UTM으로 링크 찾기
    if (!linkId) {
      let source = item.utm_source || null
      let medium = item.utm_medium || null
      let campaign = item.utm_campaign || null
      
      // 링크 메타데이터에서 UTM 복원
      if (!source && item.marketing_campaign_link_id) {
        const linkMeta = linkMetaMap.get(item.marketing_campaign_link_id)
        source = linkMeta?.utm_source || null
        medium = linkMeta?.utm_medium || null
        campaign = linkMeta?.utm_campaign || null
      }
      
      if (source && medium && campaign) {
        const utmKey = `${source}|${medium}|${campaign}`
        linkId = linkByUTM.get(utmKey) || null
      }
    }
    
    if (linkId) {
      const existing = linkMap.get(linkId) || { conversions: 0, visits: 0 }
      linkMap.set(linkId, {
        conversions: existing.conversions + 1,
        visits: existing.visits,
      })
    }
  })
  
  // Visits 집계 (event_access_logs에서)
  const { data: rawVisits } = await admin
    .from('event_access_logs')
    .select('marketing_campaign_link_id, utm_source, utm_medium, utm_campaign')
    .in('campaign_id', campaignIds)
    .gte('accessed_at', fromDate.toISOString())
    .lte('accessed_at', toDate.toISOString())
  
  rawVisits?.forEach(visit => {
    let linkId: string | null = visit.marketing_campaign_link_id || null
    
    // 링크 ID가 없으면 UTM으로 링크 찾기
    if (!linkId && visit.utm_source && visit.utm_medium && visit.utm_campaign) {
      const utmKey = `${visit.utm_source}|${visit.utm_medium}|${visit.utm_campaign}`
      linkId = linkByUTM.get(utmKey) || null
    }
    
    if (linkId) {
      const existing = linkMap.get(linkId) || { conversions: 0, visits: 0 }
      linkMap.set(linkId, {
        conversions: existing.conversions,
        visits: existing.visits + 1,
      })
    }
  })
  
  const conversions_by_link = Array.from(linkMap.entries())
    .map(([linkId, data]) => {
      const linkMeta = allLinks?.find((m: any) => m.id === linkId)
      const cvr = data.visits > 0 
        ? ((data.conversions / data.visits) * 100).toFixed(2)
        : '0.00'
      return {
        link_id: linkId,
        link_name: linkMeta?.name || linkId,
        count: data.conversions,
        visits: data.visits,
        cvr: parseFloat(cvr),
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 추적 메타데이터 (링크 메타데이터에서 UTM 복원 고려)
  let trackedCount = 0
  entries?.forEach(item => {
    let hasUTM = !!(item.utm_source || item.utm_medium || item.utm_campaign)
    // UTM이 없지만 링크가 있으면 링크 메타데이터에서 UTM 확인
    if (!hasUTM && item.marketing_campaign_link_id) {
      const linkMeta = linkMetaMap.get(item.marketing_campaign_link_id)
      hasUTM = !!(linkMeta?.utm_source || linkMeta?.utm_medium || linkMeta?.utm_campaign)
    }
    const hasLinkId = !!item.marketing_campaign_link_id
    if (hasLinkId || hasUTM) trackedCount++
  })
  const untrackedCount = totalConversions - trackedCount
  const trackingSuccessRate = totalConversions > 0 
    ? ((trackedCount / totalConversions) * 100).toFixed(1) + '%'
    : '0.0%'
  
  // 활성 링크 수 조회
  const { data: activeLinks } = await admin
    .from('campaign_link_meta')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'active')
  
  const activeLinksCount = activeLinks?.length || 0
  
  // Visits는 Raw 데이터에서 집계 (event_access_logs)
  let totalVisits = 0
  if (campaigns && campaigns.length > 0) {
    const campaignIds = campaigns.map(c => c.id)
    const { count: visitsCount } = await admin
      .from('event_access_logs')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('accessed_at', fromDate.toISOString())
      .lte('accessed_at', toDate.toISOString())
    
    totalVisits = visitsCount || 0
  }
  
  const avgCVR = totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(2) : '0.00'
  
  return NextResponse.json({
    total_conversions: totalConversions,
    total_visits: totalVisits,
    avg_cvr: parseFloat(avgCVR),
    active_links: activeLinksCount,
    conversions_by_source,
    conversions_by_medium,
    conversions_by_campaign,
    conversions_by_combo,
    conversions_by_link,
    tracking_metadata: {
      tracked_count: trackedCount,
      untracked_count: untrackedCount,
      tracking_success_rate: trackingSuccessRate,
    },
    date_range: { from, to },
    _source: 'raw'
  })
}
