import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * PATCH /api/client/emails/[id]/mark-sent
 * 실패 상태인 캠페인을 발송 완료(성공)로 수동 변경 (재발송 완료 후 사용)
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const admin = createAdminSupabase()

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

    const { user } = await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator'])

    if (campaign.status !== 'failed') {
      return NextResponse.json(
        { success: false, error: '실패 상태인 캠페인만 성공으로 변경할 수 있습니다' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await admin
      .from('email_campaigns')
      .update({ status: 'sent' })
      .eq('id', campaignId)
      .eq('status', 'failed')
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { success: false, error: '상태 변경 실패' },
        { status: 409 }
      )
    }

    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      client_id: campaign.client_id,
      action: 'EMAIL_CAMPAIGN_MARK_SENT',
      payload: { campaign_id: campaignId, reason: '재발송 완료 후 수동 변경' },
    })

    return NextResponse.json({
      success: true,
      data: { campaign: updated, message: '발송 완료(성공)로 변경되었습니다.' },
    })
  } catch (error: any) {
    console.error('캠페인 상태 변경 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
