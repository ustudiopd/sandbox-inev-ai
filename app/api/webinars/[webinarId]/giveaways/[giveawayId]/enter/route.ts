import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string }> }
) {
  try {
    const { webinarId, giveawayId } = await params
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 추첨 조회
    const { data: giveaway, error: giveawayError } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', giveawayId)
      .eq('webinar_id', webinarId)
      .single()
    
    if (giveawayError || !giveaway) {
      return NextResponse.json(
        { error: 'Giveaway not found' },
        { status: 404 }
      )
    }
    
    if (giveaway.status !== 'open') {
      return NextResponse.json(
        { error: 'Giveaway is not open' },
        { status: 400 }
      )
    }
    
    // 웨비나 등록 확인
    const { data: registration } = await supabase
      .from('registrations')
      .select('webinar_id, user_id')
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!registration) {
      return NextResponse.json(
        { error: 'Not registered to this webinar' },
        { status: 403 }
      )
    }
    
    // 엔트리 생성 (UNIQUE 인덱스로 중복 방지)
    const { data: entry, error: entryError } = await admin
      .from('giveaway_entries')
      .insert({
        giveaway_id: giveawayId,
        participant_id: user.id,
        weight: 1,
        eligible: true,
      })
      .select()
      .single()
    
    if (entryError) {
      if (entryError.code === '23505') {
        return NextResponse.json(
          { error: 'Already entered' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: entryError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, entry })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

