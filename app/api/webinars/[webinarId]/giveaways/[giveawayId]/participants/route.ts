import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 추첨 참여자 목록 조회
 * GET /api/webinars/[webinarId]/giveaways/[giveawayId]/participants
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string }> }
) {
  try {
    const { webinarId, giveawayId } = await params
    
    const admin = createAdminSupabase()
    
    // 추첨 존재 확인
    const { data: giveaway, error: giveawayError } = await admin
      .from('giveaways')
      .select('id')
      .eq('id', giveawayId)
      .eq('webinar_id', webinarId)
      .single()
    
    if (giveawayError || !giveaway) {
      return NextResponse.json(
        { error: 'Giveaway not found' },
        { status: 404 }
      )
    }
    
    // 참여자 목록 조회 (프로필 정보 포함, eligible 필드 포함)
    const { data: entries, error: entriesError } = await admin
      .from('giveaway_entries')
      .select(`
        participant_id,
        eligible,
        created_at,
        profiles:participant_id (
          display_name,
          email
        )
      `)
      .eq('giveaway_id', giveawayId)
      .order('created_at', { ascending: false })
    
    if (entriesError) {
      return NextResponse.json(
        { error: entriesError.message },
        { status: 500 }
      )
    }
    
    // 데이터 포맷팅
    const participants = (entries || []).map((entry: any) => ({
      participant_id: entry.participant_id,
      name: entry.profiles?.display_name || '익명',
      email: entry.profiles?.email || null,
      created_at: entry.created_at,
      eligible: entry.eligible !== false, // 기본값 true
    }))
    
    return NextResponse.json({
      success: true,
      participants,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
