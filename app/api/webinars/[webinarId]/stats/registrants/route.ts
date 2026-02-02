import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

/**
 * 등록자 통계 API
 * GET /api/webinars/[webinarId]/stats/registrants
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params

    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const admin = createAdminSupabase()
    
    // 실제 웨비나 UUID 사용 (slug가 아닌)
    const actualWebinarId = webinar.id

    // 참여자 관리 API와 동일한 로직 사용
    // 원프레딕트 웨비나(426307)는 항상 registrations 테이블만 사용
    const isOnePredictWebinar = webinar.slug === '426307'
    
    let totalRegistrants = 0
    let registrations: any[] = []
    
    if (isOnePredictWebinar) {
      // 원프레딕트 웨비나는 registrations 테이블만 사용
      const { count } = await admin
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', actualWebinarId)
      
      totalRegistrants = count || 0
      
      // 등록 출처별 통계
      const { data: regs } = await admin
        .from('registrations')
        .select('registered_via')
        .eq('webinar_id', actualWebinarId)
      
      registrations = regs || []
    } else if (webinar.registration_campaign_id) {
      // 등록 캠페인이 있으면 event_survey_entries 테이블 사용
      const { count } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', webinar.registration_campaign_id)
      
      totalRegistrants = count || 0
      
      // 등록 출처별 통계 (event_survey_entries는 registered_via가 없으므로 빈 배열)
      registrations = []
    } else {
      // registration_campaign_id가 없으면 registrations 테이블 조회
      const { count } = await admin
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', actualWebinarId)
      
      totalRegistrants = count || 0
      
      // 등록 출처별 통계
      const { data: regs } = await admin
        .from('registrations')
        .select('registered_via')
        .eq('webinar_id', actualWebinarId)
      
      registrations = regs || []
    }

    const sourceCounts = new Map<string, number>()
    registrations?.forEach((reg) => {
      const source = reg.registered_via || 'unknown'
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1)
    })

    const registrationSources = Array.from(sourceCounts.entries()).map(
      ([source, count]) => ({
        source,
        count,
      })
    )

    // 최대 동시 접속자 (접속 로그 기반)
    const { data: maxAccessLog } = await admin
      .from('webinar_access_logs')
      .select('max_participants')
      .eq('webinar_id', actualWebinarId)
      .order('max_participants', { ascending: false })
      .limit(1)
      .single()

    const maxConcurrentParticipants = maxAccessLog?.max_participants || 0

    return NextResponse.json({
      success: true,
      data: {
        totalRegistrants: totalRegistrants || 0,
        registrationSources,
        maxConcurrentParticipants,
      },
    })
  } catch (error: any) {
    console.error('[Stats Registrants] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '통계 조회 실패' },
      { status: 500 }
    )
  }
}






