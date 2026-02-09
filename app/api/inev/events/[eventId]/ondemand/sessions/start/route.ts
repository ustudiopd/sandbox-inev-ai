import { NextResponse, NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * inev Phase 4: 온디맨드 세션 시작
 * POST /api/inev/events/[eventId]/ondemand/sessions/start
 * 
 * D-OD-3: 서버 API가 service role로 INSERT
 * D-OD-9: source_visit_id 자동 연결
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
      lead_id,
      content_id,
      source_visit_id: clientSourceVisitId,
      user_agent,
      device_hint,
    } = body as {
      session_id?: string
      lead_id?: string
      content_id?: string
      source_visit_id?: string
      user_agent?: string
      device_hint?: string
    }

    if (!clientSessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    // 이벤트 존재 확인 및 module_ondemand 확인
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, client_id, module_ondemand')
      .eq('id', eventId)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.module_ondemand) {
      return NextResponse.json({ error: 'On-demand module not enabled' }, { status: 400 })
    }

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

    // 활성 세션 확인 (D-OD-6: last_seen 기반)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existingSession } = await supabase
      .from('event_playback_sessions')
      .select('id')
      .eq('event_id', eventId)
      .eq('session_id', session_id)
      .is('exited_at', null)
      .gte('last_seen_at', fiveMinutesAgo)
      .maybeSingle()

    if (existingSession) {
      // 기존 활성 세션 반환 (재입장)
      return NextResponse.json({
        success: true,
        session_id: session_id,
        playback_session_id: existingSession.id,
      })
    }

    // source_visit_id 자동 연결 (D-OD-9)
    let source_visit_id = clientSourceVisitId || null
    if (!source_visit_id) {
      // event_id + session_id + 최근 10분 기준으로 가장 최근 visit 찾기
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: recentVisit } = await supabase
        .from('event_visits')
        .select('id')
        .eq('event_id', eventId)
        .eq('session_id', session_id)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentVisit) {
        source_visit_id = recentVisit.id
      }
    }

    // 새 세션 생성
    const { data: newSession, error: insertErr } = await supabase
      .from('event_playback_sessions')
      .insert({
        event_id: eventId,
        lead_id: lead_id || null,
        session_id: session_id,
        content_id: content_id || null,
        source_visit_id: source_visit_id,
        user_agent_hash: user_agent ? hashString(user_agent) : null,
        device_hint: device_hint || null,
        entered_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr || !newSession) {
      console.error('[OnDemandSessionStart] Insert error:', insertErr)
      return NextResponse.json({ error: insertErr?.message || 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session_id: session_id,
      playback_session_id: newSession.id,
    })
  } catch (error: any) {
    console.error('[OnDemandSessionStart] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// 간단한 문자열 해시 함수 (user_agent_hash용)
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
