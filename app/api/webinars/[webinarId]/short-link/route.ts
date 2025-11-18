import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/guards'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { user } = await requireAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { webinarId } = await params
    if (!webinarId) {
      return NextResponse.json(
        { error: 'Webinar ID is required' },
        { status: 400 }
      )
    }

    const admin = createAdminSupabase()

    // 웨비나 존재 확인 및 권한 확인
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, title, agency_id, client_id, created_by')
      .eq('id', webinarId)
      .single()

    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }

    // 권한 확인: 웨비나 생성자, 에이전시 멤버, 클라이언트 멤버, 또는 슈퍼어드민
    const isSuperAdmin = user.app_metadata?.is_super_admin === true
    const isCreator = webinar.created_by === user.id

    let hasAccess = isSuperAdmin || isCreator

    if (!hasAccess && webinar.agency_id) {
      const { data: agencyMember } = await admin
        .from('agency_members')
        .select('id')
        .eq('agency_id', webinar.agency_id)
        .eq('user_id', user.id)
        .single()
      hasAccess = !!agencyMember
    }

    if (!hasAccess && webinar.client_id) {
      const { data: clientMember } = await admin
        .from('client_members')
        .select('id')
        .eq('client_id', webinar.client_id)
        .eq('user_id', user.id)
        .single()
      hasAccess = !!clientMember
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 기존 짧은 링크 확인
    const { data: existingLink } = await admin
      .from('short_links')
      .select('code')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingLink) {
      const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://must.ai.kr'}/webinar/${existingLink.code}`
      return NextResponse.json({
        code: existingLink.code,
        shortUrl,
        fullUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://must.ai.kr'}/webinar/${webinarId}`,
        webinarTitle: webinar.title,
      })
    }

    // 새 짧은 링크 생성 (함수 호출)
    const { data: codeResult, error: codeError } = await admin
      .rpc('generate_short_code')

    if (codeError || !codeResult) {
      return NextResponse.json(
        { error: 'Failed to generate short code' },
        { status: 500 }
      )
    }

    const code = codeResult as string

    // short_links 테이블에 저장
    const { data: savedLink, error: saveError } = await admin
      .from('short_links')
      .insert({
        code,
        webinar_id: webinarId,
        created_by: user.id,
      })
      .select('code')
      .single()

    if (saveError || !savedLink) {
      return NextResponse.json(
        { error: 'Failed to save short link' },
        { status: 500 }
      )
    }

    const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://must.ai.kr'}/webinar/${savedLink.code}`

    return NextResponse.json({
      code: savedLink.code,
      shortUrl,
      fullUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://must.ai.kr'}/webinar/${webinarId}`,
      webinarTitle: webinar.title,
    })
  } catch (error: any) {
    console.error('Short link creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

