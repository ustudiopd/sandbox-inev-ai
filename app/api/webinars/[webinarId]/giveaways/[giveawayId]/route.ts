import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

// 추첨 수정
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string }> }
) {
  try {
    const { webinarId, giveawayId } = await params
    const { name, winnersCount, status } = await req.json()
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 추첨 조회
    const { data: giveaway, error: giveawayError } = await admin
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
    
    // 권한 확인 (클라이언트 operator 이상 또는 에이전시 owner/admin)
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
        .eq('client_id', giveaway.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인 (owner/admin만 추첨 수정/삭제 가능)
        if (giveaway.agency_id) {
          const { data: agencyMember } = await supabase
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
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 추첨 수정
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (winnersCount !== undefined) updateData.winners_count = winnersCount
    if (status !== undefined) updateData.status = status
    
    const { data: updatedGiveaway, error: updateError } = await admin
      .from('giveaways')
      .update(updateData)
      .eq('id', giveawayId)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        agency_id: giveaway.agency_id,
        client_id: giveaway.client_id,
        webinar_id: webinarId,
        action: 'GIVEAWAY_UPDATE',
        payload: { giveaway_id: giveawayId },
      })
    
    return NextResponse.json({ success: true, giveaway: updatedGiveaway })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// 추첨 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; giveawayId: string }> }
) {
  try {
    const { webinarId, giveawayId } = await params
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 추첨 조회
    const { data: giveaway, error: giveawayError } = await admin
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
    
    // 권한 확인 (클라이언트 operator 이상 또는 에이전시 owner/admin)
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
        .eq('client_id', giveaway.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인 (owner/admin만 추첨 수정/삭제 가능)
        if (giveaway.agency_id) {
          const { data: agencyMember } = await supabase
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
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 추첨 삭제 (CASCADE로 관련 데이터도 삭제됨)
    const { error: deleteError } = await admin
      .from('giveaways')
      .delete()
      .eq('id', giveawayId)
    
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
        agency_id: giveaway.agency_id,
        client_id: giveaway.client_id,
        webinar_id: webinarId,
        action: 'GIVEAWAY_DELETE',
        payload: { giveaway_id: giveawayId },
      })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

