/**
 * Phase 2: 통합 Overview API
 * GET /api/clients/[clientId]/statistics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 
 * 목적: 여러 집계 테이블을 조합하여 클라이언트 전체 통계를 제공
 * 원칙: 집계 테이블이 준비된 다음에 "조립"만 하는 얇은 API
 */

import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { clientId } = await params
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
    
    // 권한 확인
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer', 'member'])
    
    const admin = createAdminSupabase()
    
    // 날짜 범위 설정
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    
    // 병렬로 여러 통계 조회
    const [
      marketingStats,
      webinarStats,
      campaignStats,
      linkStats
    ] = await Promise.all([
      getMarketingStats(admin, clientId, from, to),
      getWebinarStats(admin, clientId, fromDate, toDate),
      getCampaignStats(admin, clientId, fromDate, toDate),
      getLinkStats(admin, clientId, from, to)
    ])
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      client_id: clientId,
      date_range: { from, to },
      
      // 마케팅 통계
      marketing: marketingStats,
      
      // 웨비나 통계
      webinars: webinarStats,
      
      // 캠페인 통계
      campaigns: campaignStats,
      
      // 링크 통계
      links: linkStats,
      
      // 전체 요약
      summary: {
        total_conversions: marketingStats.total_conversions || 0,
        total_visits: marketingStats.total_visits || 0,
        total_webinars: webinarStats.total_webinars || 0,
        total_campaigns: campaignStats.total_campaigns || 0,
        total_links: linkStats.total_links || 0,
      },
      
      // 성능 메타데이터
      _metadata: {
        response_time_ms: responseTime,
        data_sources: {
          marketing: marketingStats._source || 'unknown',
          webinars: webinarStats._source || 'unknown',
          campaigns: campaignStats._source || 'unknown',
          links: linkStats._source || 'unknown',
        },
        generated_at: new Date().toISOString(),
      }
    })
  } catch (err: any) {
    console.error('[Overview API] 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

/**
 * 마케팅 통계 조회 (집계 테이블 기반)
 */
async function getMarketingStats(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  from: string,
  to: string
) {
  try {
    // Phase 1: 집계 테이블에서 데이터 조회
    const { data: aggregatedStats, error: statsError } = await admin
      .from('marketing_stats_daily')
      .select('*')
      .eq('client_id', clientId)
      .gte('bucket_date', from)
      .lte('bucket_date', to)
    
    if (statsError) {
      console.error('[Overview] 마케팅 통계 집계 테이블 조회 오류:', statsError)
      return {
        total_conversions: 0,
        total_visits: 0,
        _source: 'error'
      }
    }
    
    if (aggregatedStats && aggregatedStats.length > 0) {
      const totalConversions = aggregatedStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      const totalVisits = aggregatedStats.reduce((sum, s) => sum + (s.visits || 0), 0)
      
      return {
        total_conversions: totalConversions,
        total_visits: totalVisits,
        _source: 'aggregated'
      }
    }
    
    // Fallback: Raw 데이터에서 집계
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    if (!campaigns || campaigns.length === 0) {
      return {
        total_conversions: 0,
        total_visits: 0,
        _source: 'raw'
      }
    }
    
    const campaignIds = campaigns.map(c => c.id)
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    
    const { count: conversionsCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
    
    const { count: visitsCount } = await admin
      .from('event_access_logs')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('accessed_at', fromDate.toISOString())
      .lte('accessed_at', toDate.toISOString())
    
    return {
      total_conversions: conversionsCount || 0,
      total_visits: visitsCount || 0,
      _source: 'raw'
    }
  } catch (error: any) {
    console.error('[Overview] 마케팅 통계 조회 오류:', error)
    return {
      total_conversions: 0,
      total_visits: 0,
      _source: 'error'
    }
  }
}

/**
 * 웨비나 통계 조회
 */
async function getWebinarStats(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  fromDate: Date,
  toDate: Date
) {
  try {
    // 웨비나 목록 조회
    const { data: webinars, error: webinarsError } = await admin
      .from('webinars')
      .select('id, title, start_time, created_at')
      .eq('client_id', clientId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
    
    if (webinarsError) {
      console.error('[Overview] 웨비나 조회 오류:', webinarsError)
      return {
        total_webinars: 0,
        _source: 'error'
      }
    }
    
    // 등록자 수 집계
    let totalRegistrants = 0
    if (webinars && webinars.length > 0) {
      const webinarIds = webinars.map(w => w.id)
      const { count: registrantsCount } = await admin
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .in('webinar_id', webinarIds)
      
      totalRegistrants = registrantsCount || 0
    }
    
    return {
      total_webinars: webinars?.length || 0,
      total_registrants: totalRegistrants,
      _source: 'raw'
    }
  } catch (error: any) {
    console.error('[Overview] 웨비나 통계 조회 오류:', error)
    return {
      total_webinars: 0,
      total_registrants: 0,
      _source: 'error'
    }
  }
}

/**
 * 캠페인 통계 조회
 */
async function getCampaignStats(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  fromDate: Date,
  toDate: Date
) {
  try {
    const { data: campaigns, error: campaignsError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, type, created_at')
      .eq('client_id', clientId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
    
    if (campaignsError) {
      console.error('[Overview] 캠페인 조회 오류:', campaignsError)
      return {
        total_campaigns: 0,
        _source: 'error'
      }
    }
    
    // 전환 수 집계
    let totalConversions = 0
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id)
      const { count: conversionsCount } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
      
      totalConversions = conversionsCount || 0
    }
    
    return {
      total_campaigns: campaigns?.length || 0,
      total_conversions: totalConversions,
      _source: 'raw'
    }
  } catch (error: any) {
    console.error('[Overview] 캠페인 통계 조회 오류:', error)
    return {
      total_campaigns: 0,
      total_conversions: 0,
      _source: 'error'
    }
  }
}

/**
 * 링크 통계 조회
 */
async function getLinkStats(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  from: string,
  to: string
) {
  try {
    // 링크 목록 조회
    const { data: links, error: linksError } = await admin
      .from('campaign_link_meta')
      .select('id, name, status')
      .eq('client_id', clientId)
    
    if (linksError) {
      console.error('[Overview] 링크 조회 오류:', linksError)
      return {
        total_links: 0,
        _source: 'error'
      }
    }
    
    // 집계 테이블에서 링크별 통계 조회
    const { data: linkStats, error: statsError } = await admin
      .from('marketing_stats_daily')
      .select('marketing_campaign_link_id, conversions, visits')
      .eq('client_id', clientId)
      .in('marketing_campaign_link_id', (links || []).map(l => l.id).filter(Boolean))
      .gte('bucket_date', from)
      .lte('bucket_date', to)
    
    let totalLinkConversions = 0
    let totalLinkVisits = 0
    
    if (linkStats && !statsError) {
      totalLinkConversions = linkStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      totalLinkVisits = linkStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    }
    
    return {
      total_links: links?.length || 0,
      active_links: links?.filter(l => l.status === 'active').length || 0,
      total_conversions: totalLinkConversions,
      total_visits: totalLinkVisits,
      _source: statsError ? 'raw' : 'aggregated'
    }
  } catch (error: any) {
    console.error('[Overview] 링크 통계 조회 오류:', error)
    return {
      total_links: 0,
      active_links: 0,
      total_conversions: 0,
      total_visits: 0,
      _source: 'error'
    }
  }
}
