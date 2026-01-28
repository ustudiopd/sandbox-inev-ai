import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { getWebinarIdFromIdOrSlug } from '@/lib/utils/webinar-query'

export const runtime = 'nodejs'

/**
 * 웨비나 메타 썸네일 이미지 업로드
 * POST /api/webinars/[webinarId]/meta-thumbnail/upload
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId: idOrSlug } = await params
    
    const admin = createAdminSupabase()
    
    // UUID 또는 slug로 실제 웨비나 ID 조회
    const actualWebinarId = await getWebinarIdFromIdOrSlug(idOrSlug)
    
    if (!actualWebinarId) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 웨비나 정보 조회
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('client_id, agency_id')
      .eq('id', actualWebinarId)
      .single()
    
    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    
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
      
      if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인
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
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // FormData에서 파일 추출
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }
    
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }
    
    // 파일명 생성 (webinarId-meta-thumbnail.확장자)
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const filePath = `${actualWebinarId}-meta-thumbnail.${fileExtension}`
    
    // Supabase Storage에 업로드 (webinar-thumbnails 버킷)
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('webinar-thumbnails')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // 기존 파일 덮어쓰기
      })
    
    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }
    
    // Public URL 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      )
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/${filePath}`
    
    // 웨비나에 메타 썸네일 URL 저장
    const { error: updateError } = await admin
      .from('webinars')
      .update({ meta_thumbnail_url: publicUrl })
      .eq('id', actualWebinarId)
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
