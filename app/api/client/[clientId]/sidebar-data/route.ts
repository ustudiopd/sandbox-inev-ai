import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 클라이언트 사이드바 데이터 조회
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    await requireClientMember(clientId)
    const supabase = await createServerSupabase()

    const admin = createAdminSupabase()

    // 클라이언트 정보
    const { data: client } = await admin
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single()

    // 웨비나와 등록 페이지 캠페인을 모두 조회
    const [webinarsResult, campaignsResult] = await Promise.all([
      // 웨비나 목록 (최근 20개)
      admin
        .from('webinars')
        .select('id, title, slug, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20),
      // 설문조사 및 등록 페이지 캠페인 목록 (최근 20개)
      admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, type, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20)
    ])

    const webinars = webinarsResult.data || []
    const campaigns = campaignsResult.data || []

    // 웨비나와 캠페인을 합쳐서 정렬
    const allEvents = [
      ...webinars.map((w: any) => ({
        id: w.id,
        title: w.title,
        slug: w.slug,
        type: 'webinar' as const,
        created_at: w.created_at,
      })),
      ...campaigns.map((c: any) => ({
        id: c.id,
        title: c.title,
        slug: c.public_path, // public_path를 slug로 사용
        public_path: c.public_path,
        type: (c.type || 'survey') as 'survey' | 'registration',
        created_at: c.created_at,
      }))
    ]

    // 생성일 기준으로 정렬 (최신순)
    const events = allEvents.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 20) // 최대 20개만 반환

    return NextResponse.json({
      workspace: {
        mode: 'client',
        currentClient: client ? { id: client.id, name: client.name } : null,
        events,
      },
    })
  } catch (error: any) {
    console.error('클라이언트 사이드바 데이터 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

