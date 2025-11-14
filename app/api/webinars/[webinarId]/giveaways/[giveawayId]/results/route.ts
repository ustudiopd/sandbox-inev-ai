import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string }> }
) {
  try {
    const { webinarId, giveawayId } = await params
    
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
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
          .eq('client_id', giveaway.client_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (clientMember) {
          canView = true
        } else {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', giveaway.agency_id)
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
    
    // 당첨자 목록 조회
    const admin = createAdminSupabase()
    const { data: winners, error: winnersError } = await admin
      .from('giveaway_winners')
      .select('id, giveaway_id, participant_id, rank, proof_json, created_at')
      .eq('giveaway_id', giveawayId)
      .order('rank', { ascending: true })
    
    if (winnersError) {
      return NextResponse.json(
        { error: winnersError.message },
        { status: 500 }
      )
    }
    
    // 참여자 수 조회
    const { count: entryCount } = await supabase
      .from('giveaway_entries')
      .select('*', { count: 'exact', head: true })
      .eq('giveaway_id', giveawayId)
      .eq('eligible', true)
    
    // 당첨자 사용자 정보 조회
    const participantIds = (winners || []).map((w: any) => w.participant_id)
    let profilesMap = new Map()
    
    if (participantIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', participantIds)
      
      profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    }
    
    // 당첨자 데이터 포맷팅
    const formattedWinners = (winners || []).map((w: any) => {
      const profile = profilesMap.get(w.participant_id)
      return {
        id: w.id,
        giveaway_id: w.giveaway_id,
        participant_id: w.participant_id,
        rank: w.rank,
        proof: w.proof_json,
        user: profile ? {
          display_name: profile.display_name,
          email: profile.email,
        } : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      results: {
        giveaway,
        winners: formattedWinners,
        entryCount: entryCount || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

