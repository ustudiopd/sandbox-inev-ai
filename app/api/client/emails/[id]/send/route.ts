import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { sendCampaignBatch, getCampaignEmailPolicy } from '@/lib/email/send-campaign'
import { getAudience } from '@/lib/email/audience-query'

export const runtime = 'nodejs'

/**
 * POST /api/client/emails/[id]/send
 * 실제 이메일 발송
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 및 원자적 lock (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id, status, subject, body_md, variables_json, audience_query_json, from_domain, from_localpart, from_name, reply_to, header_image_url, footer_text')
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

    // ready 상태에서만 발송 가능
    if (campaign.status !== 'ready') {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태에서는 발송할 수 없습니다` },
        { status: 400 }
      )
    }

    // 원자적 lock: ready → sending
    const { data: lockedCampaign, error: lockError } = await admin
      .from('email_campaigns')
      .update({
        status: 'sending',
        sending_started_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'ready') // 원자적 조건
      .select()
      .single()

    if (lockError || !lockedCampaign) {
      return NextResponse.json(
        { success: false, error: '발송 실패: 상태가 변경되었거나 이미 발송 중입니다' },
        { status: 409 }
      )
    }

    try {
      // 대상자 조회
      const audienceQuery = (campaign.audience_query_json || {}) as any
      const recipients = await getAudience(audienceQuery, admin)

      if (recipients.length === 0) {
        // 대상자가 없으면 failed로 전이
        await admin
          .from('email_campaigns')
          .update({
            status: 'failed',
          })
          .eq('id', campaignId)

        await admin.from('email_runs').insert({
          email_campaign_id: campaignId,
          run_type: 'send',
          status: 'failed',
          provider: 'resend',
          error: '대상자가 없습니다',
          created_by: user.id,
        })

        return NextResponse.json({
          success: false,
          error: '발송 대상자가 없습니다',
        })
      }

      // 발송 정책 조회
      const emailPolicy = await getCampaignEmailPolicy(campaign.client_id, {
        from_domain: campaign.from_domain,
        from_localpart: campaign.from_localpart,
        from_name: campaign.from_name,
        reply_to: campaign.reply_to,
      })

      // 배치 발송
      const variables = (campaign.variables_json || {}) as Record<string, string>
      const { success, failed } = await sendCampaignBatch(campaignId, recipients, {
        campaignId,
        subject: campaign.subject,
        bodyMd: campaign.body_md,
        variables,
        from: emailPolicy.from,
        replyTo: emailPolicy.replyTo,
        headerImageUrl: campaign.header_image_url,
        footerText: campaign.footer_text,
      })

      // 결과에 따라 상태 전이
      const total = recipients.length
      const failureRate = failed / total

      const finalStatus = failureRate >= 0.5 ? 'failed' : 'sent'

      await admin
        .from('email_campaigns')
        .update({
          status: finalStatus,
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

      // email_runs에 로그 기록 (서버 전용)
      await admin.from('email_runs').insert({
        email_campaign_id: campaignId,
        run_type: 'send',
        status: finalStatus === 'sent' ? 'success' : 'failed',
        provider: 'resend',
        meta_json: {
          total,
          success,
          failed,
        },
        error: finalStatus === 'failed' ? `실패율 ${(failureRate * 100).toFixed(1)}%` : null,
        created_by: user.id,
      })

      // audit_logs 기록
      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        client_id: campaign.client_id,
        action: 'EMAIL_CAMPAIGN_SEND',
        payload: {
          campaign_id: campaignId,
          total,
          success,
          failed,
          final_status: finalStatus,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          campaign: { status: finalStatus },
          run: {
            status: finalStatus === 'sent' ? 'success' : 'failed',
            meta_json: {
              total,
              success,
              failed,
            },
          },
        },
      })
    } catch (sendError: any) {
      // 발송 중 오류 발생 시 failed로 전이
      await admin
        .from('email_campaigns')
        .update({
          status: 'failed',
        })
        .eq('id', campaignId)

      await admin.from('email_runs').insert({
        email_campaign_id: campaignId,
        run_type: 'send',
        status: 'failed',
        provider: 'resend',
        error: sendError.message || '알 수 없는 오류',
        created_by: user.id,
      })

      throw sendError
    }
  } catch (error: any) {
    console.error('이메일 발송 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
