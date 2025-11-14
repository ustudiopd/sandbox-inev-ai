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
    const { searchParams } = new URL(req.url)
    const kind = searchParams.get('kind') as 'survey' | 'quiz' | null
    const status = searchParams.get('status') as 'draft' | 'open' | 'closed' | null
    
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminSupabase()
    
    // 웨비나 정보 조회
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
    let canViewAll = false
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()
      
      if (profile?.is_super_admin) {
        canViewAll = true
      } else {
        const { data: clientMember } = await supabase
          .from('client_members')
          .select('role')
          .eq('client_id', webinar.client_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (clientMember) {
          canViewAll = true
        } else {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', webinar.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agencyMember) {
            canViewAll = true
          }
        }
      }
    }
    
    // 폼 목록 조회
    let query = supabase
      .from('forms')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false })
    
    if (kind) {
      query = query.eq('kind', kind)
    }
    
    if (status) {
      query = query.eq('status', status)
    } else if (!canViewAll) {
      // 참여자는 open 상태만 조회 가능
      query = query.eq('status', 'open')
    }
    
    const { data: forms, error } = await query
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, forms: forms || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

