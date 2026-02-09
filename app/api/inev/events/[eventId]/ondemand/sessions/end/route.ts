import { NextResponse, NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * inev Phase 4: 온디맨드 세션 종료
 * POST /api/inev/events/[eventId]/ondemand/sessions/end
 * 
 * D-OD-3: 서버 API가 service role로 UPDATE
 * D-OD-5: exited_at만 설정 (추가 시청시간 추정 누적 금지)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { session_id: clientSessionId } = body as { session_id?: string }

    if (!clientSessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    // session_id 추출 (쿠키에서 보완)
    let session_id = clientSessionId
    if (!session_id || typeof session_id !== 'string' || session_id.trim() === '') {
      const cookieSessionId = request.cookies.get('ef_session_id')?.value
      if (cookieSessionId && cookieSessionId.trim() !== '') {
        session_id = cookieSessionId
      } else {
        return NextResponse.json({ error: 'session_id required' }, { status: 400 })
      }
    }

    // 활성 세션 조회
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: session, error: sessionErr } = await supabase
      .from('event_playback_sessions')
      .select('id, watched_seconds')
      .eq('event_id', eventId)
      .eq('session_id', session_id)
      .is('exited_at', null)
      .gte('last_seen_at', fiveMinutesAgo)
      .maybeSingle()

    if (sessionErr || !session) {
      // 세션이 없어도 성공으로 처리 (best-effort)
      return NextResponse.json({
        success: true,
        total_watched_seconds: 0,
      })
    }

    // D-OD-5: exited_at만 설정 (추가 시청시간 추정 누적 금지)
    const now = new Date().toISOString()
    const { error: updateErr } = await supabase
      .from('event_playback_sessions')
      .update({
        exited_at: now,
        updated_at: now,
      })
      .eq('id', session.id)

    if (updateErr) {
      console.error('[OnDemandSessionEnd] Update error:', updateErr)
      // 에러가 나도 성공으로 처리 (best-effort)
    }

    return NextResponse.json({
      success: true,
      total_watched_seconds: session.watched_seconds,
    })
  } catch (error: any) {
    console.error('[OnDemandSessionEnd] Error:', error)
    // 에러가 나도 성공으로 처리 (best-effort)
    return NextResponse.json({
      success: true,
      total_watched_seconds: 0,
    })
  }
}
