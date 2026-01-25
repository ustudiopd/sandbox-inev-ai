import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 이미지 업로드 API
 * POST /api/upload
 */
export async function POST(req: Request) {
  try {
    // 인증 확인 (redirect 없이 직접 확인)
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // 프로덕션 환경에서는 인증 필수
    if (process.env.NODE_ENV === 'production' && (!user || authError)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 개발 환경에서는 인증이 없어도 경고만 표시
    if (!user && process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Image upload without authentication (development mode)')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // 이미지 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // 파일명 생성 (uslab/timestamp-random.ext)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const sanitizedFileName = `${timestamp}-${random}.${extension}`
    const filePath = `uslab/${sanitizedFileName}`

    // Supabase Storage에 업로드
    const admin = createAdminSupabase()
    const fileBuffer = await file.arrayBuffer()
    
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('uslab-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Public URL 생성
    const { data: urlData } = admin.storage
      .from('uslab-images')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}
