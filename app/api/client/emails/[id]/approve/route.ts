import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * POST /api/client/emails/[id]/approve
 * 이메일 캠페인 승인 (draft → ready)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 및 원자적 업데이트 (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id, status')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인
    const { user } = await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator'])

    // draft 또는 failed 상태에서 승인 가능 (failed는 재발송을 위해)
    if (campaign.status !== 'draft' && campaign.status !== 'failed') {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태에서는 승인할 수 없습니다` },
        { status: 400 }
      )
    }

    // 원자적 업데이트: draft → ready 또는 failed → ready
    const { data: updatedCampaign, error: updateError } = await admin
      .from('email_campaigns')
      .update({
        status: 'ready',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', campaignId)
      .in('status', ['draft', 'failed']) // 원자적 조건: draft 또는 failed
      .select()
      .single()

    if (updateError || !updatedCampaign) {
      return NextResponse.json(
        { success: false, error: '승인 실패: 상태가 변경되었거나 이미 승인되었습니다' },
        { status: 409 }
      )
    }

    // failed 상태에서 ready로 변경한 경우, 재발송을 위한 로그 기록
    const action = campaign.status === 'failed' ? 'EMAIL_CAMPAIGN_RESET_FOR_RESEND' : 'EMAIL_CAMPAIGN_APPROVE'

    // audit_logs 기록
    const auditPayload: any = { 
      campaign_id: campaignId,
      previous_status: campaign.status,
    }
    if (campaign.status === 'failed') {
      auditPayload.reason = '재발송을 위해 상태 변경'
    }
    
    try {
      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        client_id: campaign.client_id,
        action: action,
        payload: auditPayload,
      })
    } catch (auditError) {
      // audit_logs 기록 실패해도 승인은 성공한 것으로 처리
      console.error('audit_logs 기록 실패:', auditError)
    }

    return NextResponse.json({
      success: true,
      data: { campaign: updatedCampaign },
    })
  } catch (error: any) {
    console.error('이메일 캠페인 승인 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
