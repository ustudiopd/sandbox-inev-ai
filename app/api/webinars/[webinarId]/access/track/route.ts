import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * 웨비나 접속 페이지 접속 기록 API
 * POST /api/webinars/[webinarId]/access/track
 * 
 * 웨비나 접속 페이지(/webinar/[id])에 접속할 때 호출하여 접속 기록을 남김
 * 세션 ID를 생성하고, 활성 세션으로 추적
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()

    // 인증 확인 (게스트도 가능)
    const { data: { user } } = await supabase.auth.getUser()
    
    // 세션 ID 생성 (클라이언트에서 전달받거나 새로 생성)
    const body = await request.json().catch(() => ({}))
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // 웨비나 존재 확인
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, client_id, agency_id')
      .eq('id', webinarId)
      .single()

    if (webinarError || !webinar) {
      return NextResponse.json(
        { success: false, error: '웨비나를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // IP 주소 추출 (프록시 헤더 고려)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null

    // 로그인한 사용자인 경우 webinar_live_presence에 기록
    if (user) {
      // 웨비나 등록 확인 (자동 등록)
      const { data: registration } = await admin
        .from('registrations')
        .select('id')
        .eq('webinar_id', webinarId)
        .eq('user_id', user.id)
        .maybeSingle()

      // 등록되어 있지 않으면 자동 등록 (manual 등록)
      if (!registration) {
        // 사용자 이메일 확인
        const { data: profile } = await admin
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single()
        
        // pd@ustudio.co.kr 계정만 관리자로 설정, 나머지는 참여자
        const isPdAccount = profile?.email?.toLowerCase() === 'pd@ustudio.co.kr'
        const role = isPdAccount ? '관리자' : 'attendee'
        
        await admin
          .from('registrations')
          .insert({
            webinar_id: webinarId,
            user_id: user.id,
            role: role,
            registered_via: 'manual',
          })
      }

      // 접속 기록 저장 (webinar_live_presence)
      await admin
        .from('webinar_live_presence')
        .upsert({
          webinar_id: webinarId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          agency_id: webinar.agency_id,
          client_id: webinar.client_id,
        }, {
          onConflict: 'webinar_id,user_id',
        })
    }

    // 모든 사용자(로그인/게스트)의 접속 세션 기록 (webinar_user_sessions)
    // 같은 sessionId로 이미 세션이 있으면 새로 생성하지 않음 (중복 방지)
    const { data: existingSession, error: findSessionError } = await admin
      .from('webinar_user_sessions')
      .select('id, entered_at, last_heartbeat_at')
      .eq('webinar_id', webinarId)
      .eq('session_id', sessionId)
      .is('exited_at', null) // 진행 중인 세션만 확인
      .order('entered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findSessionError) {
      console.error('[Access Track] 세션 조회 오류:', findSessionError)
    }

    if (!existingSession) {
      // 진행 중인 세션이 없으면 새로 생성
      const enteredAt = new Date().toISOString()
      const { error: insertError } = await admin
        .from('webinar_user_sessions')
        .insert({
          webinar_id: webinarId,
          user_id: user?.id || null,
          session_id: sessionId,
          entered_at: enteredAt,
          user_agent: request.headers.get('user-agent') || null,
          referrer: request.headers.get('referer') || null,
          ip_address: ipAddress,
          agency_id: webinar.agency_id,
          client_id: webinar.client_id,
        })
      
      if (insertError) {
        console.error('[Access Track] 세션 생성 오류:', insertError)
      }
    } else {
      // 기존 세션이 있으면 last_heartbeat_at만 업데이트 (세션 갱신)
      // 단, access/track은 단순 접속 기록이므로 heartbeat는 presence/ping에서 처리
      // 여기서는 세션이 살아있음을 확인만 함
      const { error: updateError } = await admin
        .from('webinar_user_sessions')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSession.id)
      
      if (updateError) {
        console.error('[Access Track] 세션 업데이트 오류:', updateError)
      }
    }

    // 세션 정보 반환
    return NextResponse.json({
      success: true,
      sessionId,
      userId: user?.id || null,
    })
  } catch (error: any) {
    console.error('[Access Track] 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
