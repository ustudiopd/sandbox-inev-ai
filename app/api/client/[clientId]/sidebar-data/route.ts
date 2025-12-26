import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'

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

    // 클라이언트 정보
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single()

    // 소속 웨비나 목록 (최근 20개)
    const { data: webinars } = await supabase
      .from('webinars')
      .select('id, title, slug, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      workspace: {
        mode: 'client',
        currentClient: client ? { id: client.id, name: client.name } : null,
        events: (webinars || []).map((w: any) => ({
          id: w.id,
          title: w.title,
          slug: w.slug,
        })),
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
