import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

/**
 * Phase 10: Event Dashboard 통계 API - Marketing (무거운 집계)
 * 
 * 엔드포인트: GET /api/inev/events/[eventId]/statistics/marketing
 * 
 * 쿼리 파라미터:
 * - from (optional): 시작일 (YYYY-MM-DD, KST)
 * - to (optional): 종료일 (YYYY-MM-DD, KST)
 * - groupBy (required): utm_source | utm_medium | utm_campaign | cid
 * 
 * 응답: StatsContract 기준 Marketing 통계 데이터 (응답 시간 2초 이내 목표)
 * 탭 클릭 시에만 호출
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
    const groupBy = searchParams.get('groupBy')

    if (!groupBy || !['utm_source', 'utm_medium', 'utm_campaign', 'cid'].includes(groupBy)) {
      return NextResponse.json(
        { error: 'groupBy 파라미터가 필요합니다 (utm_source, utm_medium, utm_campaign, cid 중 하나)' },
        { status: 400 }
      )
    }

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

    // event_visits에서 UTM 파라미터별 집계 (lead_id 포함)
    let query = admin
      .from('event_visits')
      .select(`${groupBy}, id, lead_id, created_at`)
      .eq('event_id', eventId)

    if (fromDateISO) {
      query = query.gte('created_at', fromDateISO)
    }
    if (toDateISO) {
      query = query.lte('created_at', toDateISO)
    }

    const { data: visitsData } = await query
    const visits = visitsData || []

    // groupBy 기준으로 집계
    const breakdownMap = new Map<string, { visits: number; unique_sessions: number; leads: number }>()

    for (const visit of visits) {
      const key = (visit as any)[groupBy] || '(없음)'
      
      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, { visits: 0, unique_sessions: 0, leads: 0 })
      }
      
      const stats = breakdownMap.get(key)!
      stats.visits++
      
      // lead_id가 있으면 leads 카운트 증가
      if ((visit as any).lead_id) {
        stats.leads++
      }
    }

    // breakdown 배열로 변환
    const breakdown = Array.from(breakdownMap.entries()).map(([key, stats]) => ({
      key,
      visits: stats.visits,
      unique_sessions: stats.unique_sessions, // 향후 session_id 추가 시 수정
      leads: stats.leads,
      conversions: stats.visits > 0 ? (stats.leads / stats.visits) : 0,
    })).sort((a, b) => b.visits - a.visits)

    const responseTime = Date.now() - startTime

    // 응답 구조 (StatsContract 기준)
    const response = {
      event_id: eventId,
      date_range: {
        from: fromParam || null,
        to: toParam || null,
      },
      group_by: groupBy,
      breakdown,
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
