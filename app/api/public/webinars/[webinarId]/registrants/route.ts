import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * 웨비나 공개 대시보드용 참여자 목록 조회 API
 * GET /api/public/webinars/[webinarId]/registrants
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const admin = createAdminSupabase()

    // 웨비나 존재 확인
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, dashboard_code')
      .eq('id', webinarId)
      .maybeSingle()

    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }

    // dashboard_code가 없으면 접근 불가
    if (!webinar.dashboard_code) {
      return NextResponse.json(
        { error: 'Dashboard not available' },
        { status: 403 }
      )
    }

    // 참여자 목록 조회 (registrations 테이블)
    const { data: registrations, error: registrationsError } = await admin
      .from('registrations')
      .select('user_id, nickname, role, registered_via, created_at, registration_data, survey_no, code6')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false })

    if (registrationsError) {
      console.error('참여자 목록 조회 오류:', registrationsError)
      return NextResponse.json(
        { error: registrationsError.message },
        { status: 500 }
      )
    }

    // 프로필 정보 조회
    const userIds = (registrations || []).map((r: any) => r.user_id).filter(Boolean)
    let profilesMap = new Map<string, any>()
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)
      
      if (!profilesError && profiles) {
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, p)
        })
      }
    }

    // 참여자 데이터 포맷팅
    const registrants = (registrations || []).map((reg: any) => {
      const profile = profilesMap.get(reg.user_id) || {}
      const regData = reg.registration_data || {}
      
      return {
        id: reg.user_id || `reg-${reg.user_id}`,
        name: reg.nickname || profile.display_name || profile.email || '익명',
        email: profile.email || regData.email || null,
        registered_at: reg.created_at,
        registration_data: reg.registration_data || null,
        company: regData.company || null,
        phone_norm: regData.phone_norm || regData.phone || null,
        survey_no: reg.survey_no || null,
        code6: reg.code6 || null,
      }
    })

    return NextResponse.json({
      success: true,
      registrants: registrants || [],
    })
  } catch (error: any) {
    console.error('참여자 목록 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
