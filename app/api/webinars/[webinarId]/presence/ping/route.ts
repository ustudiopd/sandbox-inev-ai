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
    console.log(`[Presence Ping API] 요청 받음: webinarId=${webinarId}`)
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log(`[Presence Ping API] 인증 실패: webinarId=${webinarId}, error=${authError?.message || 'user 없음'}`)
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    console.log(`[Presence Ping API] 인증 성공: webinarId=${webinarId}, user_id=${user.id}`)

    // Body에서 session_id 옵션 필드 읽기 (하위호환: 없어도 됨)
    let sessionId: string | undefined
    try {
      const body = await request.json().catch(() => ({}))
      sessionId = body.session_id
    } catch {
      // Body가 없거나 파싱 실패해도 무시 (기존 동작 유지)
    }

    // 실제 웨비나 UUID 가져오기 (slug일 수 있음) - 먼저 조회
    const actualWebinarId = await getWebinarIdFromIdOrSlug(webinarId)
    if (!actualWebinarId) {
      return NextResponse.json(
        { success: false, error: '웨비나를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 웨비나 등록 확인 (admin 클라이언트 사용 - RLS 우회)
    // actualWebinarId를 사용하여 등록 확인
    let { data: registration } = await admin
      .from('registrations')
      .select('id')
      .eq('webinar_id', actualWebinarId)
      .eq('user_id', user.id)
      .maybeSingle()

    // 등록되어 있지 않으면 자동 등록 시도 (access/track과 동일한 로직)
    if (!registration) {
      console.log(`[Presence Ping] 등록 없음, 자동 등록 시도: user_id=${user.id}, webinar_id=${actualWebinarId}`)
      
      // 웨비나 정보 조회 (agency_id, client_id 필요)
      const { data: webinar } = await admin
        .from('webinars')
        .select('agency_id, client_id')
        .eq('id', actualWebinarId)
        .single()

      if (webinar) {
        // 사용자 이메일 확인
        const { data: profile } = await admin
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single()
        
        // pd@ustudio.co.kr 계정만 관리자로 설정, 나머지는 참여자
        const isPdAccount = profile?.email?.toLowerCase() === 'pd@ustudio.co.kr'
        const role = isPdAccount ? '관리자' : 'attendee'
        
        // 자동 등록 시도
        const { error: registerError } = await admin
          .from('registrations')
          .insert({
            webinar_id: actualWebinarId,
            user_id: user.id,
            role: role,
            registered_via: 'manual',
          })
        
        if (!registerError) {
          console.log(`[Presence Ping] 자동 등록 성공: user_id=${user.id}, webinar_id=${actualWebinarId}`)
          registration = { id: 'auto-registered' } // 등록 완료 표시
        } else {
          // 중복 키 에러는 무시 (동시 요청 시 발생 가능)
          if (registerError.code === '23505') {
            console.log(`[Presence Ping] 중복 등록 (정상): user_id=${user.id}, webinar_id=${actualWebinarId}`)
            // 중복이면 등록이 이미 있다는 뜻이므로 다시 조회 (admin 클라이언트 사용)
            const { data: existingReg } = await admin
              .from('registrations')
              .select('id')
              .eq('webinar_id', actualWebinarId)
              .eq('user_id', user.id)
              .maybeSingle()
            if (existingReg) {
              registration = existingReg
            }
          } else {
            console.error('[Presence Ping] 자동 등록 실패:', registerError)
            console.error('[Presence Ping] 등록 실패 상세:', JSON.stringify(registerError, null, 2))
            // 자동 등록 실패해도 일단 presence ping은 허용 (하위 호환성)
            // 등록은 WebinarView의 자동 등록 로직에서 처리될 수 있음
            console.log(`[Presence Ping] 자동 등록 실패했지만 presence ping 허용 (하위 호환): user_id=${user.id}`)
            registration = { id: 'auto-register-failed' } // 임시로 등록된 것으로 표시
          }
        }
      } else {
        console.error(`[Presence Ping] 웨비나 정보 조회 실패: webinar_id=${actualWebinarId}`)
        // 웨비나 정보 조회 실패해도 heartbeat는 허용 (하위 호환성)
        registration = { id: 'webinar-info-failed' } // 임시로 등록된 것으로 표시
      }
    }

    // 등록이 있으면 presence ping RPC 호출, 없어도 heartbeat는 업데이트 가능
    // session_id가 있으면 heartbeat 업데이트는 항상 진행
    if (registration) {
      // 실제 등록이 있는지 다시 확인 (임시 등록 표시가 아닌 경우)
      if (registration.id === 'auto-register-failed' || registration.id === 'auto-registered') {
        // 실제 등록이 있는지 다시 확인
        const { data: actualRegistration } = await admin
          .from('registrations')
          .select('id')
          .eq('webinar_id', actualWebinarId)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (!actualRegistration) {
          console.log(`[Presence Ping] 실제 등록 없음, RPC 호출 스킵: user_id=${user.id}`)
          // 등록이 없어도 heartbeat만 업데이트 (presence는 스킵)
        } else {
          // 실제 등록이 있으면 presence ping RPC 호출
          const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
            _webinar_id: actualWebinarId,
          })

          if (rpcError) {
            console.error('[Presence Ping] RPC 오류:', rpcError)
            // RPC 실패해도 heartbeat는 계속 진행
          }
        }
      } else {
        // 실제 등록이 있으면 presence ping RPC 호출
        const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
          _webinar_id: actualWebinarId,
        })

        if (rpcError) {
          console.error('[Presence Ping] RPC 오류:', rpcError)
          // RPC 실패해도 heartbeat는 계속 진행
        }
      }

      // 2. session_id가 있으면 세션 heartbeat 업데이트 (옵션)
      // 최적화: SELECT 제거, RPC 함수로 조건부 UPDATE 1번만 실행
      if (sessionId) {
        const now = new Date().toISOString()
        console.log(`[Presence Ping] 받은 값: webinarId=${actualWebinarId}, sessionId=${sessionId}, userId=${user.id}`)
        
        // 서버측 throttle 체크 (최소 갱신 간격 60초)
        const { data: throttleCheck, error: throttleError } = await admin.rpc('check_heartbeat_throttle', {
          p_webinar_id: actualWebinarId,
          p_session_id: sessionId,
          p_min_interval_seconds: 60, // 60초 최소 간격
        })

        if (throttleError) {
          console.error('[Presence Ping] Throttle 체크 오류:', throttleError)
        } else {
          console.log(`[Presence Ping] Throttle 체크 결과: ${throttleCheck}`)
        }

        // throttle 체크 통과 시에만 heartbeat 업데이트
        if (throttleCheck) {
          // RPC 함수로 SELECT 없이 UPDATE ... WHERE ... RETURNING 처리
          const { data: heartbeatResult, error: heartbeatError } = await admin.rpc('update_session_heartbeat', {
            p_webinar_id: actualWebinarId,
            p_session_id: sessionId,
            p_now: now,
          })

          if (heartbeatError) {
            console.error('[Presence Ping] 세션 heartbeat 업데이트 오류:', heartbeatError)
            // 세션 업데이트 실패해도 presence ping은 성공했으므로 계속 진행
          } else if (heartbeatResult && !heartbeatResult.success) {
            // 세션이 없거나 이미 종료됨 (정상적인 경우일 수 있음)
            const updatedRows = heartbeatResult.updated_rows || 0
            console.log(`[Presence Ping] DB 업데이트 실패: updatedRows=${updatedRows}, reason=${heartbeatResult.reason}`)
          } else if (heartbeatResult && heartbeatResult.success) {
            const updatedRows = heartbeatResult.updated_rows || 1
            console.log(`[Presence Ping] DB 업데이트 성공: updatedRows=${updatedRows}, watched_seconds_raw=${heartbeatResult.watched_seconds_raw}`)
          }
        } else {
          // throttle: 최소 간격 이내이므로 업데이트 스킵
          console.log('[Presence Ping] Throttle: 최소 간격 이내, 업데이트 스킵 (updatedRows=0)')
        }
      } else {
        console.log('[Presence Ping] session_id가 없어 heartbeat 업데이트 스킵')
      }

      // 성공: 204 No Content
      return new NextResponse(null, { status: 204 })
    }

    // 등록이 없어도 session_id가 있으면 heartbeat만 업데이트 (하위 호환성)
    if (sessionId) {
      const now = new Date().toISOString()
      console.log(`[Presence Ping] 받은 값: webinarId=${actualWebinarId}, sessionId=${sessionId}, userId=${user.id}`)
      console.log(`[Presence Ping] 등록 없지만 heartbeat 업데이트 진행`)
      
      // 서버측 throttle 체크 (최소 갱신 간격 60초)
      const { data: throttleCheck, error: throttleError } = await admin.rpc('check_heartbeat_throttle', {
        p_webinar_id: actualWebinarId,
        p_session_id: sessionId,
        p_min_interval_seconds: 60, // 60초 최소 간격
      })

      if (throttleError) {
        console.error('[Presence Ping] Throttle 체크 오류:', throttleError)
      } else {
        console.log(`[Presence Ping] Throttle 체크 결과: ${throttleCheck}`)
      }

      // throttle 체크 통과 시에만 heartbeat 업데이트
      if (throttleCheck) {
        // RPC 함수로 SELECT 없이 UPDATE ... WHERE ... RETURNING 처리
        const { data: heartbeatResult, error: heartbeatError } = await admin.rpc('update_session_heartbeat', {
          p_webinar_id: actualWebinarId,
          p_session_id: sessionId,
          p_now: now,
        })

        if (heartbeatError) {
          console.error('[Presence Ping] 세션 heartbeat 업데이트 오류:', heartbeatError)
        } else if (heartbeatResult && !heartbeatResult.success) {
          const updatedRows = heartbeatResult.updated_rows || 0
          console.log(`[Presence Ping] DB 업데이트 실패: updatedRows=${updatedRows}, reason=${heartbeatResult.reason}`)
        } else if (heartbeatResult && heartbeatResult.success) {
          const updatedRows = heartbeatResult.updated_rows || 1
          console.log(`[Presence Ping] DB 업데이트 성공: updatedRows=${updatedRows}, watched_seconds_raw=${heartbeatResult.watched_seconds_raw}`)
        }
      } else {
        console.log('[Presence Ping] Throttle: 최소 간격 이내, 업데이트 스킵 (updatedRows=0)')
      }

      // heartbeat 업데이트 완료, 204 반환
      return new NextResponse(null, { status: 204 })
    }

    // 등록되지 않은 경우, 관리자 권한 확인
    // admin은 이미 위에서 선언됨 (25번 줄)
    // actualWebinarId는 이미 위에서 조회됨

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
      console.error(`[Presence Ping] 403 Forbidden: user_id=${user.id}, webinar_id=${actualWebinarId}`)
      console.error(`[Presence Ping] 등록 확인: registration=${registration ? '있음' : '없음'}`)
      console.error(`[Presence Ping] 관리자 확인: isAdmin=${isAdmin}`)
      return NextResponse.json(
        { success: false, error: '웨비나에 등록되지 않았습니다.' },
        { status: 403 }
      )
    }

    // 관리자는 RPC 호출 없이 성공 반환 (presence는 등록된 사용자만 추적)
    // 하지만 session_id가 있으면 세션 heartbeat는 업데이트 (관리자도 세션 추적 가능)
    // 최적화: SELECT 제거, RPC 함수로 조건부 UPDATE 1번만 실행
    if (sessionId) {
      const now = new Date().toISOString()
      console.log(`[Presence Ping] 받은 값: webinarId=${actualWebinarId}, sessionId=${sessionId}, userId=${user.id} (관리자)`)
      
      // 서버측 throttle 체크 (최소 갱신 간격 60초)
      const { data: throttleCheck, error: throttleError } = await admin.rpc('check_heartbeat_throttle', {
        p_webinar_id: actualWebinarId,
        p_session_id: sessionId,
        p_min_interval_seconds: 60, // 60초 최소 간격
      })

      if (throttleError) {
        console.error('[Presence Ping] 관리자 - Throttle 체크 오류:', throttleError)
      } else {
        console.log(`[Presence Ping] 관리자 - Throttle 체크 결과: ${throttleCheck}`)
      }

      // throttle 체크 통과 시에만 heartbeat 업데이트
      if (throttleCheck) {
        // RPC 함수로 SELECT 없이 UPDATE ... WHERE ... RETURNING 처리
        const { data: heartbeatResult, error: heartbeatError } = await admin.rpc('update_session_heartbeat', {
          p_webinar_id: actualWebinarId,
          p_session_id: sessionId,
          p_now: now,
        })

        if (heartbeatError) {
          console.error('[Presence Ping] 관리자 - 세션 heartbeat 업데이트 오류:', heartbeatError)
          // 세션 업데이트 실패해도 계속 진행
        } else if (heartbeatResult && !heartbeatResult.success) {
          // 세션이 없거나 이미 종료됨 (정상적인 경우일 수 있음)
          const updatedRows = heartbeatResult.updated_rows || 0
          console.log(`[Presence Ping] 관리자 - DB 업데이트 실패: updatedRows=${updatedRows}, reason=${heartbeatResult.reason}`)
        } else if (heartbeatResult && heartbeatResult.success) {
          const updatedRows = heartbeatResult.updated_rows || 1
          console.log(`[Presence Ping] 관리자 - DB 업데이트 성공: updatedRows=${updatedRows}, watched_seconds_raw=${heartbeatResult.watched_seconds_raw}`)
        }
      } else {
        // throttle: 최소 간격 이내이므로 업데이트 스킵
        console.log('[Presence Ping] 관리자 - Throttle: 최소 간격 이내, 업데이트 스킵 (updatedRows=0)')
      }
    } else {
      console.log('[Presence Ping] 관리자 - session_id가 없어 heartbeat 업데이트 스킵')
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






