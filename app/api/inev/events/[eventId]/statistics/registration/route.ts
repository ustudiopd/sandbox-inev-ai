import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

/**
 * Phase 10: Event Dashboard 통계 API - Registration
 * 
 * 엔드포인트: GET /api/inev/events/[eventId]/statistics/registration
 * 
 * 쿼리 파라미터:
 * - from (optional): 시작일 (YYYY-MM-DD, KST)
 * - to (optional): 종료일 (YYYY-MM-DD, KST)
 * 
 * 응답: 등록자 및 참여자 통계
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

    // Leads 집계 (일별 추이 포함)
    let leadsQuery = admin
      .from('leads')
      .select('id, email, created_at')
      .eq('event_id', eventId)

    if (fromDateISO) {
      leadsQuery = leadsQuery.gte('created_at', fromDateISO)
    }
    if (toDateISO) {
      leadsQuery = leadsQuery.lte('created_at', toDateISO)
    }

    const { data: leadsData } = await leadsQuery
    const leads = leadsData || []

    // 일별 등록 추이 계산
    const leadsByDate = new Map<string, number>()
    for (const lead of leads) {
      const date = new Date(lead.created_at).toISOString().split('T')[0]
      leadsByDate.set(date, (leadsByDate.get(date) || 0) + 1)
    }

    const leadsByDateArray = Array.from(leadsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Participations 집계 (일별 추이 포함)
    let participationsQuery = admin
      .from('event_participations')
      .select('id, created_at')
      .eq('event_id', eventId)

    if (fromDateISO) {
      participationsQuery = participationsQuery.gte('created_at', fromDateISO)
    }
    if (toDateISO) {
      participationsQuery = participationsQuery.lte('created_at', toDateISO)
    }

    const { data: participationsData } = await participationsQuery
    const participations = participationsData || []

    // 일별 참여 추이 계산
    const participationsByDate = new Map<string, number>()
    for (const participation of participations) {
      const date = new Date(participation.created_at).toISOString().split('T')[0]
      participationsByDate.set(date, (participationsByDate.get(date) || 0) + 1)
    }

    const participationsByDateArray = Array.from(participationsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 전환율 계산
    const conversionRate = leads.length > 0 ? (participations.length / leads.length) : 0

    // 응답 구조
    const response = {
      event_id: eventId,
      leads: {
        total: leads.length,
        unique_emails: new Set(leads.map((l: any) => l.email)).size,
        by_date: leadsByDateArray,
      },
      participations: {
        total: participations.length,
        by_date: participationsByDateArray,
      },
      conversion_rate: conversionRate,
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
