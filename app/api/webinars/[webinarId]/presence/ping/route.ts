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
 * - Body 없음
 * - 응답: 204 No Content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const supabase = await createServerSupabase()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
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
      // RPC 함수 호출 (60초 이내 중복 업데이트 억제 포함)
      const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
        _webinar_id: webinarId,
      })

      if (rpcError) {
        console.error('[Presence Ping] RPC 오류:', rpcError)
        return NextResponse.json(
          { success: false, error: 'Presence 업데이트 실패' },
          { status: 500 }
        )
      }

      // 성공: 204 No Content
      return new NextResponse(null, { status: 204 })
    }

    // 등록되지 않은 경우, 관리자 권한 확인
    const admin = createAdminSupabase()
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
    return new NextResponse(null, { status: 204 })

    // RPC 함수 호출 (60초 이내 중복 업데이트 억제 포함)
    const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
      _webinar_id: webinarId,
    })

    if (rpcError) {
      console.error('[Presence Ping] RPC 오류:', rpcError)
      return NextResponse.json(
        { success: false, error: 'Presence 업데이트 실패' },
        { status: 500 }
      )
    }

    // 성공: 204 No Content
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('[Presence Ping] 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}






