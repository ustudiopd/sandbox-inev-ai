import { NextResponse, NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * inev Phase 4: 온디맨드 세션 Heartbeat (Ping)
 * POST /api/inev/events/[eventId]/ondemand/sessions/ping
 * 
 * D-OD-3: 서버 API가 service role로 UPDATE
 * D-OD-4: is_playing이 true일 때만 watched_seconds 누적
 * D-OD-7: 서버 throttle 필수 (30초 이내면 누적 0)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const {
      session_id: clientSessionId,
      delta_seconds,
      is_playing,
    } = body as {
      session_id?: string
      delta_seconds?: number
      is_playing?: boolean
    }

    if (!clientSessionId || typeof delta_seconds !== 'number' || typeof is_playing !== 'boolean') {
      return NextResponse.json({ error: 'session_id, delta_seconds, and is_playing are required' }, { status: 400 })
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

    // 활성 세션 조회 (D-OD-6: last_seen 기반)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: session, error: sessionErr } = await supabase
      .from('event_playback_sessions')
      .select('id, last_seen_at, watched_seconds, heartbeat_count')
      .eq('event_id', eventId)
      .eq('session_id', session_id)
      .is('exited_at', null)
      .gte('last_seen_at', fiveMinutesAgo)
      .maybeSingle()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Active session not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const lastSeenAt = new Date(session.last_seen_at)
    const secondsSinceLastSeen = Math.floor((Date.now() - lastSeenAt.getTime()) / 1000)

    // 서버 측 Throttle (D-OD-7): 30초 이내면 watched_seconds 누적 0
    let watchedSecondsDelta = 0
    if (secondsSinceLastSeen >= 30) {
      // D-OD-4: is_playing이 true일 때만 누적
      if (is_playing) {
        watchedSecondsDelta = delta_seconds
      }
    }
    // 30초 이내면 watchedSecondsDelta = 0 (last_seen_at만 갱신)

    // 업데이트
    const { data: updatedSession, error: updateErr } = await supabase
      .from('event_playback_sessions')
      .update({
        last_seen_at: now,
        watched_seconds: session.watched_seconds + watchedSecondsDelta,
        heartbeat_count: (session.heartbeat_count || 0) + 1,
        updated_at: now,
      })
      .eq('id', session.id)
      .select('watched_seconds, last_seen_at')
      .single()

    if (updateErr || !updatedSession) {
      console.error('[OnDemandSessionPing] Update error:', updateErr)
      return NextResponse.json({ error: updateErr?.message || 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      watched_seconds: updatedSession.watched_seconds,
      last_seen_at: updatedSession.last_seen_at,
    })
  } catch (error: any) {
    console.error('[OnDemandSessionPing] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
