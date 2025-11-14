import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; fileId: string }> }
) {
  try {
    const { webinarId, fileId } = await params
    
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminSupabase()
    
    // 파일 정보 조회
    const { data: file, error: fileError } = await admin
      .from('webinar_files')
      .select('*')
      .eq('id', fileId)
      .eq('webinar_id', webinarId)
      .single()
    
    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
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
          .eq('client_id', file.client_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (clientMember) {
          canView = true
        } else {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', file.agency_id)
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
    
    // 서명된 다운로드 URL 생성 (1시간 유효)
    const { data: signedUrl, error: urlError } = await admin.storage
      .from('webinar-files')
      .createSignedUrl(file.file_path, 3600) // 1시간
    
    if (urlError) {
      return NextResponse.json(
        { error: urlError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      downloadUrl: signedUrl.signedUrl,
      fileName: file.file_name,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

