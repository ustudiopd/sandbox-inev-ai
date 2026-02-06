import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarIdFromIdOrSlug } from '@/lib/utils/webinar-query'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Presence Ping API
 * 라이브 웨비나 참가자가 주기적으로 호출하여 접속 상태를 업데이트
 * 
 * POST /api/webinars/[webinarId]/presence/ping
 * - 인증 필수
 * - 등록된 사용자 또는 관리자 허용
 * - Body (옵션): { session_id?: string } - 세션 추적 활성화 시
 * - 응답: 204 No Content
 * 
 * 하위호환성: session_id가 없어도 기존처럼 동작 (presence만 업데이트)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // Body에서 session_id 옵션 필드 읽기 (하위호환: 없어도 됨)
    let sessionId: string | undefined
    try {
      const body = await request.json().catch(() => ({}))
      sessionId = body.session_id
    } catch {
      // Body가 없거나 파싱 실패해도 무시 (기존 동작 유지)
    }

    // 웨비나 등록 확인 (RLS 정책에서도 체크하지만, 명시적으로 확인)
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id)
      .maybeSingle()

    // 등록되어 있으면 통과
    if (registration) {
      // 실제 웨비나 UUID 가져오기 (slug일 수 있음)
      const actualWebinarId = await getWebinarIdFromIdOrSlug(webinarId)
      if (!actualWebinarId) {
        return NextResponse.json(
          { success: false, error: '웨비나를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      // 1. 기존 presence ping 처리 (변경 없음)
      const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
        _webinar_id: actualWebinarId,
      })

      if (rpcError) {
        console.error('[Presence Ping] RPC 오류:', rpcError)
        return NextResponse.json(
          { success: false, error: 'Presence 업데이트 실패' },
          { status: 500 }
        )
      }

      // 2. session_id가 있으면 세션 heartbeat 업데이트 (옵션)
      if (sessionId) {
        const now = new Date().toISOString()
        
        // 활성 세션 찾기 (exited_at이 null이고 같은 session_id)
        const { data: activeSession, error: findError } = await admin
          .from('webinar_user_sessions')
          .select('id, last_heartbeat_at, watched_seconds_raw')
          .eq('webinar_id', actualWebinarId)
          .eq('session_id', sessionId)
          .is('exited_at', null)
          .order('entered_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!findError && activeSession) {
          // Δt 계산 (heartbeat 간격)
          let deltaSeconds = 0
          if (activeSession.last_heartbeat_at) {
            const lastHeartbeat = new Date(activeSession.last_heartbeat_at).getTime()
            const nowTime = Date.now()
            const deltaMs = nowTime - lastHeartbeat
            
            // Δt Cap: 최대 360초(6분) - heartbeat 주기(120초)의 3배
            const deltaCapSeconds = 360
            deltaSeconds = Math.min(Math.floor(deltaMs / 1000), deltaCapSeconds)
          } else {
            // 첫 heartbeat: entered_at부터의 시간 (최대 cap)
            const { data: sessionInfo } = await admin
              .from('webinar_user_sessions')
              .select('entered_at')
              .eq('id', activeSession.id)
              .single()
            
            if (sessionInfo?.entered_at) {
              const enteredAt = new Date(sessionInfo.entered_at).getTime()
              const nowTime = Date.now()
              const deltaMs = nowTime - enteredAt
              const deltaCapSeconds = 360
              deltaSeconds = Math.min(Math.floor(deltaMs / 1000), deltaCapSeconds)
            }
          }

          // watched_seconds_raw 누적 및 last_heartbeat_at 업데이트
          const newWatchedSeconds = (activeSession.watched_seconds_raw || 0) + deltaSeconds

          const { error: updateError } = await admin
            .from('webinar_user_sessions')
            .update({
              last_heartbeat_at: now,
              watched_seconds_raw: newWatchedSeconds,
              updated_at: now,
            })
            .eq('id', activeSession.id)

          if (updateError) {
            console.error('[Presence Ping] 세션 업데이트 오류:', updateError)
            // 세션 업데이트 실패해도 presence ping은 성공했으므로 계속 진행
          }
        }
      }

      // 성공: 204 No Content
      return new NextResponse(null, { status: 204 })
    }

    // 등록되지 않은 경우, 관리자 권한 확인
    // admin은 이미 위에서 선언됨 (25번 줄)
    const actualWebinarId = await getWebinarIdFromIdOrSlug(webinarId)
    
    if (!actualWebinarId) {
      return NextResponse.json(
        { success: false, error: '웨비나를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 웨비나 정보 조회
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('agency_id, client_id')
      .eq('id', actualWebinarId)
      .single()

    if (webinarError || !webinar) {
      return NextResponse.json(
        { success: false, error: '웨비나를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    let isAdmin = false

    // 1. 슈퍼 관리자 확인
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_super_admin) {
      isAdmin = true
    }

    // 2. 에이전시 멤버십 확인
    if (!isAdmin && webinar.agency_id) {
      const { data: agencyMember } = await admin
        .from('agency_members')
        .select('user_id')
        .eq('agency_id', webinar.agency_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (agencyMember) {
        isAdmin = true
      }
    }

    // 3. 클라이언트 멤버십 확인
    if (!isAdmin && webinar.client_id) {
      const { data: clientMember } = await admin
        .from('client_members')
        .select('user_id')
        .eq('client_id', webinar.client_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientMember) {
        isAdmin = true
      }
    }

    // 관리자가 아니면 403 반환
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: '웨비나에 등록되지 않았습니다.' },
        { status: 403 }
      )
    }

    // 관리자는 RPC 호출 없이 성공 반환 (presence는 등록된 사용자만 추적)
    // 하지만 session_id가 있으면 세션 heartbeat는 업데이트 (관리자도 세션 추적 가능)
    if (sessionId) {
      const now = new Date().toISOString()
      
      // 활성 세션 찾기 (exited_at이 null이고 같은 session_id)
      const { data: activeSession, error: findError } = await admin
        .from('webinar_user_sessions')
        .select('id, last_heartbeat_at, watched_seconds_raw')
        .eq('webinar_id', actualWebinarId)
        .eq('session_id', sessionId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!findError && activeSession) {
        // Δt 계산 (heartbeat 간격)
        let deltaSeconds = 0
        if (activeSession.last_heartbeat_at) {
          const lastHeartbeat = new Date(activeSession.last_heartbeat_at).getTime()
          const nowTime = Date.now()
          const deltaMs = nowTime - lastHeartbeat
          
          // Δt Cap: 최대 360초(6분) - heartbeat 주기(120초)의 3배
          const deltaCapSeconds = 360
          deltaSeconds = Math.min(Math.floor(deltaMs / 1000), deltaCapSeconds)
        } else {
          // 첫 heartbeat: entered_at부터의 시간 (최대 cap)
          const { data: sessionInfo } = await admin
            .from('webinar_user_sessions')
            .select('entered_at')
            .eq('id', activeSession.id)
            .single()
          
          if (sessionInfo?.entered_at) {
            const enteredAt = new Date(sessionInfo.entered_at).getTime()
            const nowTime = Date.now()
            const deltaMs = nowTime - enteredAt
            const deltaCapSeconds = 360
            deltaSeconds = Math.min(Math.floor(deltaMs / 1000), deltaCapSeconds)
          }
        }

        // watched_seconds_raw 누적 및 last_heartbeat_at 업데이트
        const newWatchedSeconds = (activeSession.watched_seconds_raw || 0) + deltaSeconds

        const { error: updateError } = await admin
          .from('webinar_user_sessions')
          .update({
            last_heartbeat_at: now,
            watched_seconds_raw: newWatchedSeconds,
            updated_at: now,
          })
          .eq('id', activeSession.id)

        if (updateError) {
          console.error('[Presence Ping] 세션 업데이트 오류:', updateError)
          // 세션 업데이트 실패해도 계속 진행
        }
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('[Presence Ping] 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}






