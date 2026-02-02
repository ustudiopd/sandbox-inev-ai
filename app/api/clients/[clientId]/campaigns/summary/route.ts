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
    
    // 집계 테이블에 데이터가 있으면 사용
    if (aggregatedStats && aggregatedStats.length > 0) {
      console.log('[Marketing Summary] 집계 테이블 사용:', {
        clientId,
        statsCount: aggregatedStats.length,
        dateRange: { from, to }
      })
      
      return await getSummaryFromAggregated(aggregatedStats, from, to)
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
  to: string
) {
  // 전체 전환 수
  const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
  
  // Source별 집계
  const sourceMap = new Map<string | null, number>()
  stats.forEach(s => {
    const source = s.utm_source || null
    sourceMap.set(source, (sourceMap.get(source) || 0) + (s.conversions || 0))
  })
  const conversions_by_source = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ 
      source, 
      count,
      is_untracked: source === null || source === '__null__',
    }))
    .sort((a, b) => b.count - a.count)
  
  // Medium별 집계
  const mediumMap = new Map<string | null, number>()
  stats.forEach(s => {
    const medium = s.utm_medium || null
    mediumMap.set(medium, (mediumMap.get(medium) || 0) + (s.conversions || 0))
  })
  const conversions_by_medium = Array.from(mediumMap.entries())
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count)
  
  // Campaign별 집계
  const campaignMap = new Map<string | null, number>()
  stats.forEach(s => {
    const campaign = s.utm_campaign || null
    campaignMap.set(campaign, (campaignMap.get(campaign) || 0) + (s.conversions || 0))
  })
  const conversions_by_campaign = Array.from(campaignMap.entries())
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count)
  
  // 조합별 집계
  const comboMap = new Map<string, number>()
  stats.forEach(s => {
    const source = s.utm_source || null
    const medium = s.utm_medium || null
    const campaign = s.utm_campaign || null
    const key = `${source}|${medium}|${campaign}`
    comboMap.set(key, (comboMap.get(key) || 0) + (s.conversions || 0))
  })
  const conversions_by_combo = Array.from(comboMap.entries())
    .map(([key, count]) => {
      const [source, medium, campaign] = key.split('|')
      return {
        source: source === 'null' || source === '__null__' ? null : source,
        medium: medium === 'null' || medium === '__null__' ? null : medium,
        campaign: campaign === 'null' || campaign === '__null__' ? null : campaign,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 링크별 집계
  const linkMap = new Map<string, number>()
  stats.forEach(s => {
    if (s.marketing_campaign_link_id) {
      linkMap.set(s.marketing_campaign_link_id, 
        (linkMap.get(s.marketing_campaign_link_id) || 0) + (s.conversions || 0))
    }
  })
  
  // 링크 메타데이터 조회
  const linkIds = Array.from(linkMap.keys())
  const admin = createAdminSupabase()
  const { data: linkMetas } = linkIds.length > 0 ? await admin
    .from('campaign_link_meta')
    .select('id, name')
    .in('id', linkIds) : { data: [] }
  
  const conversions_by_link = Array.from(linkMap.entries())
    .map(([linkId, count]) => {
      const linkMeta = linkMetas?.find((m: any) => m.id === linkId)
      return {
        link_id: linkId,
        link_name: linkMeta?.name || linkId,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 추적 메타데이터
  const trackedCount = stats.reduce((sum, s) => {
    const hasUTM = !!(s.utm_source || s.utm_medium || s.utm_campaign)
    const hasLink = !!s.marketing_campaign_link_id
    return sum + (hasUTM || hasLink ? (s.conversions || 0) : 0)
  }, 0)
  const untrackedCount = totalConversions - trackedCount
  const trackingSuccessRate = totalConversions > 0 
    ? ((trackedCount / totalConversions) * 100).toFixed(1) + '%'
    : '0.0%'
  
  return NextResponse.json({
    total_conversions: totalConversions,
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
  
  // Source별 집계
  const sourceMap = new Map<string | null, number>()
  entries?.forEach(item => {
    const hasLinkId = !!item.marketing_campaign_link_id
    const hasUTM = !!(item.utm_source || item.utm_medium || item.utm_campaign)
    
    if (!hasLinkId && !hasUTM) {
      sourceMap.set('Direct (no tracking)', (sourceMap.get('Direct (no tracking)') || 0) + 1)
    } else {
      const key = item.utm_source || null
      sourceMap.set(key, (sourceMap.get(key) || 0) + 1)
    }
  })
  const conversions_by_source = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count, is_untracked: source === 'Direct (no tracking)' }))
    .sort((a, b) => b.count - a.count)
  
  // Medium별 집계
  const mediumMap = new Map<string | null, number>()
  entries?.forEach(item => {
    const key = item.utm_medium || null
    mediumMap.set(key, (mediumMap.get(key) || 0) + 1)
  })
  const conversions_by_medium = Array.from(mediumMap.entries())
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count)
  
  // Campaign별 집계
  const campaignMap = new Map<string | null, number>()
  entries?.forEach(item => {
    const key = item.utm_campaign || null
    campaignMap.set(key, (campaignMap.get(key) || 0) + 1)
  })
  const conversions_by_campaign = Array.from(campaignMap.entries())
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count)
  
  // 조합별 집계
  const comboMap = new Map<string, number>()
  entries?.forEach(item => {
    const source = item.utm_source || null
    const medium = item.utm_medium || null
    const campaign = item.utm_campaign || null
    const key = `${source}|${medium}|${campaign}`
    comboMap.set(key, (comboMap.get(key) || 0) + 1)
  })
  const conversions_by_combo = Array.from(comboMap.entries())
    .map(([key, count]) => {
      const [source, medium, campaign] = key.split('|')
      return {
        source: source === 'null' ? null : source,
        medium: medium === 'null' ? null : medium,
        campaign: campaign === 'null' ? null : campaign,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 링크별 집계
  const linkMap = new Map<string, number>()
  entries?.forEach(item => {
    if (item.marketing_campaign_link_id) {
      linkMap.set(item.marketing_campaign_link_id, (linkMap.get(item.marketing_campaign_link_id) || 0) + 1)
    }
  })
  
  const linkIds = Array.from(linkMap.keys())
  const { data: linkMetas } = linkIds.length > 0 ? await admin
    .from('campaign_link_meta')
    .select('id, name')
    .in('id', linkIds)
    .eq('client_id', clientId) : { data: [] }
  
  const conversions_by_link = Array.from(linkMap.entries())
    .map(([linkId, count]) => {
      const linkMeta = linkMetas?.find((m: any) => m.id === linkId)
      return {
        link_id: linkId,
        link_name: linkMeta?.name || linkId,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)
  
  // 추적 메타데이터
  let trackedCount = 0
  entries?.forEach(item => {
    const hasLinkId = !!item.marketing_campaign_link_id
    const hasUTM = !!(item.utm_source || item.utm_medium || item.utm_campaign)
    if (hasLinkId || hasUTM) trackedCount++
  })
  const untrackedCount = totalConversions - trackedCount
  const trackingSuccessRate = totalConversions > 0 
    ? ((trackedCount / totalConversions) * 100).toFixed(1) + '%'
    : '0.0%'
  
  return NextResponse.json({
    total_conversions: totalConversions,
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
