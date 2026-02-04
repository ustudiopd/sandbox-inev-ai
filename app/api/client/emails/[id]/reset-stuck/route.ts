import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * POST /api/client/emails/[id]/reset-stuck
 * sending 고착 상태 복구
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
      .select('id, client_id, status, sending_started_at')
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

    // sending 상태이고 1시간 이상 경과한 경우만 가능
    if (campaign.status !== 'sending') {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태에서는 복구할 수 없습니다` },
        { status: 400 }
      )
    }

    if (!campaign.sending_started_at) {
      return NextResponse.json(
        { success: false, error: 'sending_started_at이 설정되지 않았습니다' },
        { status: 400 }
      )
    }

    const startedAt = new Date(campaign.sending_started_at)
    const now = new Date()
    const hoursElapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60)

    if (hoursElapsed < 1) {
      return NextResponse.json(
        { success: false, error: '1시간이 경과하지 않았습니다. 아직 발송 중일 수 있습니다.' },
        { status: 400 }
      )
    }

    // failed 상태로 전이
    const { data: updatedCampaign, error: updateError } = await admin
      .from('email_campaigns')
      .update({
        status: 'failed',
      })
      .eq('id', campaignId)
      .eq('status', 'sending') // 원자적 조건
      .select()
      .single()

    if (updateError || !updatedCampaign) {
      return NextResponse.json(
        { success: false, error: '복구 실패: 상태가 변경되었습니다' },
        { status: 409 }
      )
    }

    // email_runs에 실패 로그 기록 (서버 전용)
    await admin.from('email_runs').insert({
      email_campaign_id: campaignId,
      run_type: 'send',
      status: 'failed',
      provider: 'resend',
      error: `sending 고착 복구: ${hoursElapsed.toFixed(1)}시간 경과`,
      created_by: user.id,
    })

    // audit_logs 기록
    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      client_id: campaign.client_id,
      action: 'EMAIL_CAMPAIGN_RESET_STUCK',
      payload: {
        campaign_id: campaignId,
        hours_elapsed: hoursElapsed,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        campaign: { status: 'failed' },
        message: 'Stuck sending 상태가 failed로 전이되었습니다',
      },
    })
  } catch (error: any) {
    console.error('고착 상태 복구 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
