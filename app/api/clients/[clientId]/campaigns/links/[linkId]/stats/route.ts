import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

export const runtime = 'nodejs'

/**
 * 링크별 상세 통계 조회 (Phase 1: 집계 테이블 기반)
 * GET /api/clients/[clientId]/campaigns/links/[linkId]/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 
 * Phase 1 개선: marketing_stats_daily 테이블에서 집계 데이터를 읽어서 응답
 * Fallback: 집계 테이블에 데이터가 없으면 기존 방식(raw 집계) 사용
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string; linkId: string }> }
) {
  try {
    const { clientId, linkId } = await params
    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const toDate = searchParams.get('to') || new Date().toISOString()
    
    // 권한 확인
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer', 'member'])
    
    const admin = createAdminSupabase()
    
    // 링크 존재 확인
    const { data: link, error: linkError } = await admin
      .from('campaign_link_meta')
      .select('id, name, target_campaign_id')
      .eq('id', linkId)
      .eq('client_id', clientId)
      .single()
    
    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }
    
    // 날짜 범위 정규화 (YYYY-MM-DD)
    const normalizeDate = (dateStr: string): string => {
      return new Date(dateStr).toISOString().split('T')[0]
    }
    const from = normalizeDate(fromDate)
    const to = normalizeDate(toDate)
    
    // Phase 1: 집계 테이블에서 데이터 조회
    const { data: aggregatedStats, error: statsError } = await admin
      .from('marketing_stats_daily')
      .select('*')
      .eq('client_id', clientId)
      .eq('marketing_campaign_link_id', linkId)
      .gte('bucket_date', from)
      .lte('bucket_date', to)
    
    if (statsError) {
      console.error('[Link Stats] 집계 테이블 조회 오류:', statsError)
      // Fallback: 기존 방식 사용
      return await getLinkStatsFromRaw(clientId, linkId, link, fromDate, toDate)
    }
    
    // 집계 테이블에 데이터가 있으면 사용
    if (aggregatedStats && aggregatedStats.length > 0) {
      console.log('[Link Stats] 집계 테이블 사용:', {
        linkId,
        statsCount: aggregatedStats.length
      })
      
      return await getLinkStatsFromAggregated(link, aggregatedStats, from, to)
    }
    
    // 집계 테이블에 데이터가 없으면 기존 방식 사용 (Fallback)
    console.log('[Link Stats] 집계 테이블 데이터 없음, Fallback 사용')
    return await getLinkStatsFromRaw(clientId, linkId, link, fromDate, toDate)
  } catch (err: any) {
    console.error('링크 통계 조회 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

/**
 * 집계 테이블에서 링크 통계 생성
 */
async function getLinkStatsFromAggregated(
  link: any,
  stats: any[],
  from: string,
  to: string
) {
  // 전체 집계
  const totalVisits = stats.reduce((sum, s) => sum + (s.visits || 0), 0)
  const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
  const cvr = totalVisits > 0 
    ? ((totalConversions / totalVisits) * 100).toFixed(2)
    : '0.00'
  
  // 일별 데이터 생성
  const dailyMap = new Map<string, { visits: number; conversions: number }>()
  stats.forEach(s => {
    const date = s.bucket_date
    const existing = dailyMap.get(date) || { visits: 0, conversions: 0 }
    dailyMap.set(date, {
      visits: existing.visits + (s.visits || 0),
      conversions: existing.conversions + (s.conversions || 0)
    })
  })
  
  // 날짜 범위 생성
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const dailyData: Array<{ date: string; visits: number; conversions: number }> = []
  
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayStats = dailyMap.get(dateStr) || { visits: 0, conversions: 0 }
    dailyData.push({
      date: dateStr,
      visits: dayStats.visits,
      conversions: dayStats.conversions,
    })
  }
  
  return NextResponse.json({
    link_id: link.id,
    link_name: link.name,
    stats: {
      visits: totalVisits,
      conversions: totalConversions,
      cvr: parseFloat(cvr),
    },
    daily_data: dailyData,
    date_range: {
      from,
      to,
    },
    _source: 'aggregated'
  })
}

/**
 * 기존 방식: Raw 데이터에서 집계 (Fallback)
 */
async function getLinkStatsFromRaw(
  clientId: string,
  linkId: string,
  link: any,
  fromDate: string,
  toDate: string
) {
  const admin = createAdminSupabase()
  const targetCampaignId = link.target_campaign_id
  
  // Visits 집계
  const { count: visitsCount } = await admin
    .from('event_access_logs')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', targetCampaignId)
    .eq('marketing_campaign_link_id', linkId)
    .gte('accessed_at', fromDate)
    .lte('accessed_at', toDate)
  
  // Conversions 집계
  const { count: conversionsCount } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .eq('marketing_campaign_link_id', linkId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
  
  // CVR 계산
  const cvr = visitsCount && visitsCount > 0 
    ? ((conversionsCount || 0) / visitsCount * 100).toFixed(2)
    : '0.00'
  
  // 일별 전환 추이 데이터
  const { data: dailyConversions } = await admin
    .from('event_survey_entries')
    .select('created_at')
    .eq('marketing_campaign_link_id', linkId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: true })
  
  // 일별 집계
  const dailyMap = new Map<string, number>()
  dailyConversions?.forEach(entry => {
    const date = new Date(entry.created_at).toISOString().split('T')[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
  })
  
  // 날짜 범위 생성
  const from = new Date(fromDate)
  const to = new Date(toDate)
  const dailyData: Array<{ date: string; conversions: number; visits: number }> = []
  
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dailyData.push({
      date: dateStr,
      conversions: dailyMap.get(dateStr) || 0,
      visits: 0, // Raw 방식에서는 visits 일별 집계 생략 (성능상)
    })
  }
  
  // 일별 Visits 추이 데이터 (선택적, 성능 고려)
  const { data: dailyVisits } = await admin
    .from('event_access_logs')
    .select('accessed_at')
    .eq('campaign_id', targetCampaignId)
    .eq('marketing_campaign_link_id', linkId)
    .gte('accessed_at', fromDate)
    .lte('accessed_at', toDate)
    .order('accessed_at', { ascending: true })
  
  const visitsDailyMap = new Map<string, number>()
  dailyVisits?.forEach(visit => {
    const date = new Date(visit.accessed_at).toISOString().split('T')[0]
    visitsDailyMap.set(date, (visitsDailyMap.get(date) || 0) + 1)
  })
  
  // Visits 데이터를 dailyData에 병합
  const combinedDailyData = dailyData.map(item => ({
    ...item,
    visits: visitsDailyMap.get(item.date) || 0,
  }))
  
  return NextResponse.json({
    link_id: linkId,
    link_name: link.name,
    stats: {
      visits: visitsCount || 0,
      conversions: conversionsCount || 0,
      cvr: parseFloat(cvr),
    },
    daily_data: combinedDailyData,
    date_range: {
      from: fromDate,
      to: toDate,
    },
    _source: 'raw'
  })
}
