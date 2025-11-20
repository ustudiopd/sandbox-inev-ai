import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; fileId: string }> }
) {
  try {
    const { webinarId, fileId } = await params
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
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
    
    // 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    
    let hasPermission = false
    
    if (profile?.is_super_admin) {
      hasPermission = true
    } else {
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', file.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator', 'member'].includes(clientMember.role)) {
        hasPermission = true
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Storage에서 파일 삭제
    const { error: storageError } = await admin.storage
      .from('webinar-files')
      .remove([file.file_path])
    
    if (storageError) {
      // Storage 삭제 실패해도 DB는 삭제 (일관성 유지)
      console.error('Storage delete error:', storageError)
    }
    
    // DB에서 파일 삭제
    const { error: deleteError } = await admin
      .from('webinar_files')
      .delete()
      .eq('id', fileId)
    
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        agency_id: file.agency_id,
        client_id: file.client_id,
        webinar_id: webinarId,
        action: 'FILE_DELETE',
        payload: { file_id: fileId, file_name: file.file_name },
      })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

