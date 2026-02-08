import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

/**
 * Phase 10: Event Dashboard 통계 API - Survey
 * 
 * 엔드포인트: GET /api/inev/events/[eventId]/statistics/survey
 * 
 * 쿼리 파라미터:
 * - from (optional): 시작일 (YYYY-MM-DD, KST)
 * - to (optional): 종료일 (YYYY-MM-DD, KST)
 * 
 * 응답: 설문 응답 통계
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

    // Survey Responses 집계
    let query = admin
      .from('event_survey_responses')
      .select('id, created_at')
      .eq('event_id', eventId)

    if (fromDateISO) {
      query = query.gte('created_at', fromDateISO)
    }
    if (toDateISO) {
      query = query.lte('created_at', toDateISO)
    }

    const { data: responsesData } = await query
    const responses = responsesData || []

    // 일별 응답 추이 계산
    const responsesByDate = new Map<string, number>()
    for (const response of responses) {
      const date = new Date(response.created_at).toISOString().split('T')[0]
      responsesByDate.set(date, (responsesByDate.get(date) || 0) + 1)
    }

    const responsesByDateArray = Array.from(responsesByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 응답 구조
    const response = {
      event_id: eventId,
      responses: {
        total: responses.length,
        by_date: responsesByDateArray,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Statistics API] 오류:', error)
    
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    return NextResponse.json(
      { error: '통계를 불러오는데 실패했습니다', details: error.message },
      { status: 500 }
    )
  }
}
