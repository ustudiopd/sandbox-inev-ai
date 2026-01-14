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

    // 로그인한 사용자인 경우 webinar_live_presence에 기록
    if (user) {
      // 웨비나 등록 확인 (자동 등록)
      const { data: registration } = await admin
        .from('registrations')
        .select('id')
        .eq('webinar_id', webinarId)
        .eq('user_id', user.id)
        .maybeSingle()

      // 등록되어 있지 않으면 자동 등록
      if (!registration) {
        await admin
          .from('registrations')
          .insert({
            webinar_id: webinarId,
            user_id: user.id,
            role: 'attendee',
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
