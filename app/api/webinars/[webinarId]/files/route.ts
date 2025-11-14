import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    // 웨비나 정보 조회
    const admin = createAdminSupabase()
    const { data: webinar } = await admin
      .from('webinars')
      .select('agency_id, client_id')
      .eq('id', webinarId)
      .single()
    
    if (!webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인 (운영자 또는 참여자)
    let canView = false
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()
      
      if (profile?.is_super_admin) {
        canView = true
      } else {
        const { data: clientMember } = await supabase
          .from('client_members')
          .select('role')
          .eq('client_id', webinar.client_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (clientMember) {
          canView = true
        } else {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', webinar.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agencyMember) {
            canView = true
          } else {
            // 참여자 확인
            const { data: registration } = await supabase
              .from('registrations')
              .select('webinar_id, user_id')
              .eq('webinar_id', webinarId)
              .eq('user_id', user.id)
              .maybeSingle()
            
            if (registration) {
              canView = true
            }
          }
        }
      }
    }
    
    if (!canView) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 파일 목록 조회
    const { data: files, error } = await supabase
      .from('webinar_files')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, files: files || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

