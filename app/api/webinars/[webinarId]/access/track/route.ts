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
      // P0-PR1: registrations.id 제거 - 복합 PK이므로 webinar_id, user_id로 확인
      const { data: registration, error: regError } = await admin
        .from('registrations')
        .select('webinar_id, user_id')
        .eq('webinar_id', webinarId)
        .eq('user_id', user.id)
        .maybeSingle()
      
      // P0-PR1: 에러 발생 시 즉시 종료 (Fail-fast)
      if (regError) {
        console.error('[Access Track] 등록 조회 실패:', regError)
        return NextResponse.json(
          { success: false, error: '등록 정보를 확인할 수 없습니다.' },
          { status: 500 }
        )
      }

      // 등록되어 있지 않으면 자동 등록 (manual 등록)
      // P0-PR3: 409를 정상 흐름으로 흡수 - upsert 사용으로 멱등성 보장
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
        
        // P0-PR3: upsert 사용 - 동시 요청 시 409 에러 대신 정상 흐름으로 수렴
        const { error: upsertRegError } = await admin
          .from('registrations')
          .upsert({
            webinar_id: webinarId,
            user_id: user.id,
            role: role,
            registered_via: 'manual',
          }, {
            onConflict: 'webinar_id,user_id',
            ignoreDuplicates: false, // 중복 시 UPDATE 수행 (멱등성 보장)
          })
        
        // P0-PR3: upsert는 409를 발생시키지 않으므로 에러는 다른 원인만 처리
        if (upsertRegError && upsertRegError.code !== '23505') {
          // 409가 아닌 다른 에러만 로깅 (409는 정상 흐름으로 처리됨)
          console.error('[Access Track] 등록 upsert 실패 (409 제외):', upsertRegError)
        }
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
    // UPSERT 사용: (webinar_id, session_id) UNIQUE 제약으로 중복 row 생성 방지
    const enteredAt = new Date().toISOString()
    const { error: upsertError } = await admin
      .from('webinar_user_sessions')
      .upsert({
        webinar_id: webinarId,
        user_id: user?.id || null,
        session_id: sessionId,
        entered_at: enteredAt,
        exited_at: null, // 재입장 시 exited_at을 null로 리셋
        user_agent: request.headers.get('user-agent') || null,
        referrer: request.headers.get('referer') || null,
        ip_address: ipAddress,
        agency_id: webinar.agency_id,
        client_id: webinar.client_id,
        updated_at: enteredAt,
      }, {
        onConflict: 'webinar_id,session_id',
      })
    
    if (upsertError) {
      console.error('[Access Track] 세션 UPSERT 오류:', upsertError)
      // UNIQUE 제약 위반은 정상적인 경우일 수 있음 (동시 요청)
      // 하지만 다른 오류는 로그로 기록
      if (upsertError.code !== '23505') {
        console.error('[Access Track] UPSERT 실패 상세:', JSON.stringify(upsertError, null, 2))
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
