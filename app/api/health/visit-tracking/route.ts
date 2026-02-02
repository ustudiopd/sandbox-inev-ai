import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Visit 추적 시스템 스모크 테스트 API
 * GET /api/health/visit-tracking?campaignId=...
 * 
 * 운영자가 버튼 한 번으로 Visit 추적 시스템이 정상 작동하는지 확인할 수 있는 엔드포인트
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId query parameter is required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // (a) Visit RPC가 호출 가능한지 확인 (event_access_logs 테이블 접근 가능)
    let visitTableAccessible = false
    try {
      const { error: testError } = await admin
        .from('event_access_logs')
        .select('id')
        .limit(1)
      
      visitTableAccessible = !testError
    } catch (error) {
      visitTableAccessible = false
    }
    
    // (b) 최근 10분간 visit insert가 정상 발생했는지 확인
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    let recentVisitsCount = 0
    let recentVisitsError: any = null
    
    try {
      const { count, error: countError } = await admin
        .from('event_access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .gte('accessed_at', tenMinutesAgo)
      
      if (!countError) {
        recentVisitsCount = count || 0
      } else {
        recentVisitsError = countError
      }
    } catch (error: any) {
      recentVisitsError = error
    }
    
    // 캠페인 존재 여부 확인
    let campaignExists = false
    try {
      const { data: campaign } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('id', campaignId)
        .maybeSingle()
      
      campaignExists = !!campaign
    } catch (error) {
      // 무시
    }
    
    const health = {
      campaignId,
      campaignExists,
      visitTableAccessible,
      recentVisits: {
        count: recentVisitsCount,
        period: '10 minutes',
        error: recentVisitsError?.message || null
      },
      status: visitTableAccessible ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(health, {
      status: visitTableAccessible ? 200 : 503
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
