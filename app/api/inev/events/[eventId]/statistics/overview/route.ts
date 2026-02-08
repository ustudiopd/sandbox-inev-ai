import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

/**
 * Phase 10: Event Dashboard 통계 API - Overview (가벼운 KPI)
 * 
 * 엔드포인트: GET /api/inev/events/[eventId]/statistics/overview
 * 
 * 쿼리 파라미터:
 * - from (optional): 시작일 (YYYY-MM-DD, KST)
 * - to (optional): 종료일 (YYYY-MM-DD, KST)
 * 
 * 응답: StatsContract 기준 가벼운 통계 데이터 (응답 시간 1초 이내 목표)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId가 필요합니다' },
        { status: 400 }
      )
    }

    const admin = createAdminSupabase()

    // Event 조회하여 client_id 확인 (RLS 보안)
    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, client_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인 (RLS 보안)
    await requireClientMember(event.client_id)

    // 쿼리 파라미터 파싱
    const searchParams = req.nextUrl.searchParams
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    // 기간 필터 처리 (KST → UTC 변환)
    let fromDateISO: string | null = null
    let toDateISO: string | null = null

    if (fromParam) {
      const fromKST = new Date(`${fromParam}T00:00:00+09:00`)
      fromDateISO = fromKST.toISOString()
    }

    if (toParam) {
      const toKST = new Date(`${toParam}T23:59:59+09:00`)
      toDateISO = toKST.toISOString()
    }

    const startTime = Date.now()

    // 병렬 쿼리로 성능 최적화 (가벼운 집계만)
    const [
      leadsResult,
      visitsResult,
      surveyResponsesResult,
      participationsResult,
      shortlinkClicksResult,
    ] = await Promise.allSettled([
      // Leads 집계 (중복 이메일 제거)
      (async () => {
        let query = admin
          .from('leads')
          .select('email, created_at')
          .eq('event_id', eventId)

        if (fromDateISO) {
          query = query.gte('created_at', fromDateISO)
        }
        if (toDateISO) {
          query = query.lte('created_at', toDateISO)
        }

        const { data: leadsData } = await query
        const leads = leadsData || []
        const total = leads.length
        const uniqueEmails = new Set(leads.map((l: any) => l.email)).size

        return { total, unique_emails: uniqueEmails }
      })(),

      // Visits 집계 (event_visits 기준)
      (async () => {
        let query = admin
          .from('event_visits')
          .select('id, created_at')
          .eq('event_id', eventId)

        if (fromDateISO) {
          query = query.gte('created_at', fromDateISO)
        }
        if (toDateISO) {
          query = query.lte('created_at', toDateISO)
        }

        const { data: visitsData } = await query
        const visits = visitsData || []
        const total = visits.length
        // session_id가 없으므로 unique_sessions는 0으로 설정 (향후 session_id 추가 시 수정)
        const uniqueSessions = 0

        return { total, unique_sessions: uniqueSessions }
      })(),

      // Survey Responses 집계
      (async () => {
        let query = admin
          .from('event_survey_responses')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)

        if (fromDateISO) {
          query = query.gte('created_at', fromDateISO)
        }
        if (toDateISO) {
          query = query.lte('created_at', toDateISO)
        }

        const { count } = await query
        return { total: count || 0 }
      })(),

      // Participations 집계
      (async () => {
        let query = admin
          .from('event_participations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)

        if (fromDateISO) {
          query = query.gte('created_at', fromDateISO)
        }
        if (toDateISO) {
          query = query.lte('created_at', toDateISO)
        }

        const { count } = await query
        return { total: count || 0 }
      })(),

      // ShortLink 클릭 집계 (event_access_logs 기준, 간접 연결)
      (async () => {
        // event_survey_campaigns를 통해 연결
        const { data: campaignsData } = await admin
          .from('event_survey_campaigns')
          .select('id')
          .eq('client_id', event.client_id)

        const campaignIds = (campaignsData || []).map((c: any) => c.id)

        if (campaignIds.length === 0) {
          return { total: 0, unique_sessions: 0 }
        }

        let query = admin
          .from('event_access_logs')
          .select('id, session_id, accessed_at')
          .in('campaign_id', campaignIds)

        if (fromDateISO) {
          query = query.gte('accessed_at', fromDateISO)
        }
        if (toDateISO) {
          query = query.lte('accessed_at', toDateISO)
        }

        const { data: logsData } = await query
        const logs = logsData || []
        const total = logs.length
        const uniqueSessions = new Set(logs.map((l: any) => l.session_id).filter(Boolean)).size

        return { total, unique_sessions: uniqueSessions }
      })(),
    ])

    // 결과 추출 및 에러 처리
    const leads = leadsResult.status === 'fulfilled' ? leadsResult.value : { total: 0, unique_emails: 0 }
    const visits = visitsResult.status === 'fulfilled' ? visitsResult.value : { total: 0, unique_sessions: 0 }
    const surveyResponses = surveyResponsesResult.status === 'fulfilled' ? surveyResponsesResult.value : { total: 0 }
    const participations = participationsResult.status === 'fulfilled' ? participationsResult.value : { total: 0 }
    const shortlinkClicks = shortlinkClicksResult.status === 'fulfilled' ? shortlinkClicksResult.value : { total: 0, unique_sessions: 0 }

    // 에러 로깅
    if (leadsResult.status === 'rejected') {
      console.error('[Statistics API] Leads 집계 오류:', leadsResult.reason)
    }
    if (visitsResult.status === 'rejected') {
      console.error('[Statistics API] Visits 집계 오류:', visitsResult.reason)
    }
    if (surveyResponsesResult.status === 'rejected') {
      console.error('[Statistics API] Survey Responses 집계 오류:', surveyResponsesResult.reason)
    }
    if (participationsResult.status === 'rejected') {
      console.error('[Statistics API] Participations 집계 오류:', participationsResult.reason)
    }
    if (shortlinkClicksResult.status === 'rejected') {
      console.error('[Statistics API] ShortLink Clicks 집계 오류:', shortlinkClicksResult.reason)
    }

    const responseTime = Date.now() - startTime

    // 응답 구조 (StatsContract 기준)
    const response = {
      event_id: eventId,
      leads,
      visits,
      survey_responses: surveyResponses,
      participations,
      shortlink_clicks: shortlinkClicks,
      _metadata: {
        response_time_ms: responseTime,
        generated_at: new Date().toISOString(),
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Statistics API] 오류:', error)
    
    // NEXT_REDIRECT는 정상적인 리다이렉트이므로 에러로 처리하지 않음
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    return NextResponse.json(
      { error: '통계를 불러오는데 실패했습니다', details: error.message },
      { status: 500 }
    )
  }
}
