import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; userId: string }> }
) {
  try {
    const { webinarId, userId } = await params
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 웨비나 정보 조회
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('agency_id, client_id')
      .eq('id', webinarId)
      .single()
    
    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인 (클라이언트 operator 이상 또는 에이전시 owner/admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    
    let hasPermission = false
    
    if (profile?.is_super_admin) {
      hasPermission = true
    } else {
      // 클라이언트 멤버십 확인
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', webinar.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator', 'member'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인
        if (webinar.agency_id) {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', webinar.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
            hasPermission = true
          }
        }
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 등록정보 조회
    const { data: registration, error: regError } = await admin
      .from('registrations')
      .select('nickname, registration_data')
      .eq('webinar_id', webinarId)
      .eq('user_id', userId)
      .maybeSingle()
    
    // 프로필 정보 조회
    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      .select('id, display_name, email')
      .eq('id', userId)
      .maybeSingle()
    
    return NextResponse.json({
      registration: registration || null,
      profile: profileData || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
