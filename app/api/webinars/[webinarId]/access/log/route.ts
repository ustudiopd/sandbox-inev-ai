import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

/**
 * 웨비나 접속자 수 로그 저장 API
 * POST /api/webinars/[webinarId]/access/log
 * 
 * 현재 접속자 수를 webinar_access_logs에 저장 (5분 버킷으로 누적)
 * 크론 작업이 자동으로 실행하지만, 수동으로도 호출 가능
 */
export async function POST(
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

    // 활성 기준: last_seen_at >= now() - 3분
    const activeSince = new Date(Date.now() - 3 * 60 * 1000).toISOString()

    // 현재 접속자 수 집계
    const { data: activePresences, error: presenceError } = await admin
      .from('webinar_live_presence')
      .select('user_id')
      .eq('webinar_id', webinarId)
      .gte('last_seen_at', activeSince)

    if (presenceError) {
      console.error('[Access Log] 접속자 수 집계 실패:', presenceError)
      return NextResponse.json(
        { success: false, error: '접속자 수 집계 실패' },
        { status: 500 }
      )
    }

    const participantCount = activePresences?.length || 0

    // 5분 버킷으로 저장
    const sampledAt = new Date().toISOString()
    const snapshotsJsonb = [{
      webinar_id: webinarId,
      participant_count: participantCount,
    }]

    const { error: batchError } = await admin.rpc(
      'record_webinar_access_snapshot_batch',
      {
        _snapshots: snapshotsJsonb as any,
        _sampled_at: sampledAt,
      }
    )

    if (batchError) {
      console.error('[Access Log] 기록 실패:', batchError)
      return NextResponse.json(
        { success: false, error: '로그 저장 실패' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      participantCount,
      sampledAt,
    })
  } catch (error: any) {
    console.error('[Access Log] 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
