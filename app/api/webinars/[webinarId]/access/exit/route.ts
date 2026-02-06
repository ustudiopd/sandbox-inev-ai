import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * 웨비나 퇴장 기록 API
 * POST /api/webinars/[webinarId]/access/exit
 * 
 * 웨비나 페이지를 떠날 때 호출하여 퇴장 시간과 체류 시간을 기록
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
    
    // 세션 ID 받기
    const body = await request.json().catch(() => ({}))
    const sessionId = body.sessionId

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '세션 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 웨비나 존재 확인
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id')
      .eq('id', webinarId)
      .single()

    if (webinarError || !webinar) {
      return NextResponse.json(
        { success: false, error: '웨비나를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 해당 세션의 가장 최근 활성 세션 찾기 (exited_at이 null인 것)
    const { data: activeSession, error: findError } = await admin
      .from('webinar_user_sessions')
      .select('id, entered_at')
      .eq('webinar_id', webinarId)
      .eq('session_id', sessionId)
      .is('exited_at', null)
      .order('entered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error('[Access Exit] 세션 조회 오류:', findError)
      return NextResponse.json(
        { success: false, error: '세션 조회 실패' },
        { status: 500 }
      )
    }

    // 활성 세션이 있으면 퇴장 시간 업데이트
    if (activeSession) {
      const exitedAt = new Date().toISOString()
      
      const { error: updateError } = await admin
        .from('webinar_user_sessions')
        .update({
          exited_at: exitedAt,
          updated_at: exitedAt,
        })
        .eq('id', activeSession.id)

      if (updateError) {
        console.error('[Access Exit] 세션 업데이트 오류:', updateError)
        return NextResponse.json(
          { success: false, error: '퇴장 기록 실패' },
          { status: 500 }
        )
      }

      // duration_seconds는 트리거에서 자동 계산됨
      return NextResponse.json({
        success: true,
        sessionId,
        exitedAt,
      })
    }

    // 활성 세션이 없으면 이미 퇴장한 것으로 간주
    return NextResponse.json({
      success: true,
      sessionId,
      message: '이미 퇴장 처리된 세션입니다.',
    })
  } catch (error: any) {
    console.error('[Access Exit] 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
