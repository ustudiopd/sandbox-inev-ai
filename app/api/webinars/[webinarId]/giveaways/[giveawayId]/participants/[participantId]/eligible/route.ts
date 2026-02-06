import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

/**
 * 추첨 참여자 eligible 상태 업데이트
 * PUT /api/webinars/[webinarId]/giveaways/[giveawayId]/participants/[participantId]/eligible
 * body: { eligible: boolean }
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string; participantId: string }> }
) {
  try {
    const { webinarId, giveawayId, participantId } = await params
    const { eligible } = await req.json()
    
    const { user } = await requireAuth()
    const admin = createAdminSupabase()
    
    // 추첨 존재 확인
    const { data: giveaway, error: giveawayError } = await admin
      .from('giveaways')
      .select('id, webinar_id, client_id, agency_id')
      .eq('id', giveawayId)
      .eq('webinar_id', webinarId)
      .single()
    
    if (giveawayError || !giveaway) {
      return NextResponse.json(
        { error: 'Giveaway not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인 (관리자만 가능)
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    
    let hasPermission = profile?.is_super_admin || false
    
    if (!hasPermission) {
      // 클라이언트 멤버 또는 에이전시 멤버 확인
      const { data: clientMember } = await admin
        .from('client_members')
        .select('role')
        .eq('client_id', giveaway.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
        hasPermission = true
      } else if (giveaway.agency_id) {
        const { data: agencyMember } = await admin
          .from('agency_members')
          .select('role')
          .eq('agency_id', giveaway.agency_id)
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
    
    // 엔트리 존재 확인 및 업데이트
    const { data: entry, error: updateError } = await admin
      .from('giveaway_entries')
      .update({ eligible: eligible === true })
      .eq('giveaway_id', giveawayId)
      .eq('participant_id', participantId)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      entry,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
