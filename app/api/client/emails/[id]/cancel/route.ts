import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * POST /api/client/emails/[id]/cancel
 * 이메일 캠페인 취소 (ready → canceled)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 (IDOR 방지)
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

    // ready 상태에서만 취소 가능
    if (campaign.status !== 'ready') {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태에서는 취소할 수 없습니다` },
        { status: 400 }
      )
    }

    // 원자적 업데이트: ready → canceled
    const { data: updatedCampaign, error: updateError } = await admin
      .from('email_campaigns')
      .update({
        status: 'canceled',
      })
      .eq('id', campaignId)
      .eq('status', 'ready') // 원자적 조건
      .select()
      .single()

    if (updateError || !updatedCampaign) {
      return NextResponse.json(
        { success: false, error: '취소 실패: 상태가 변경되었습니다' },
        { status: 409 }
      )
    }

    // audit_logs 기록
    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      client_id: campaign.client_id,
      action: 'EMAIL_CAMPAIGN_CANCEL',
      payload: { campaign_id: campaignId },
    })

    return NextResponse.json({
      success: true,
      data: {
        campaign: updatedCampaign,
        message: '캠페인이 취소되었습니다',
      },
    })
  } catch (error: any) {
    console.error('이메일 캠페인 취소 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
