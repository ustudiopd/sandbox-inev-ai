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
    const body = await req.json().catch(() => ({}))
    const { selectedEmails, resendFailedOnly } = body as { selectedEmails?: string[]; resendFailedOnly?: boolean }

    const admin = createAdminSupabase()

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

    const { user } = await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator'])

    const isResendFailed = Boolean(resendFailedOnly) && (campaign.status === 'sent' || campaign.status === 'failed')

    if (isResendFailed) {
      if (!selectedEmails?.length) {
        return NextResponse.json(
          { success: false, error: '실패한 수신자 재발송 시 선택된 이메일이 필요합니다' },
          { status: 400 }
        )
      }
    } else {
      if (campaign.status !== 'ready') {
        return NextResponse.json(
          { success: false, error: `${campaign.status} 상태에서는 발송할 수 없습니다` },
          { status: 400 }
        )
      }

      const { data: lockedCampaign, error: lockError } = await admin
        .from('email_campaigns')
        .update({
          status: 'sending',
          sending_started_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .eq('status', 'ready')
        .select()
        .single()

      if (lockError || !lockedCampaign) {
        return NextResponse.json(
          { success: false, error: '발송 실패: 상태가 변경되었거나 이미 발송 중입니다' },
          { status: 409 }
        )
      }
    }

    try {
      // 대상자 조회
      const audienceQuery = (campaign.audience_query_json || {}) as any
      console.log('[EmailSend] 대상자 조회 시작:', { campaignId, audienceQuery })
      let recipients: any[]
      try {
        recipients = await getAudience(audienceQuery, admin)
        console.log('[EmailSend] 대상자 조회 완료:', { count: recipients.length })
      } catch (audienceError: any) {
        console.error('[EmailSend] 대상자 조회 실패:', audienceError)
        // 대상자 조회 실패 시 failed로 전이
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
          error: `대상자 조회 실패: ${audienceError.message || '알 수 없는 오류'}`,
          created_by: user.id,
        })

        return NextResponse.json({
          success: false,
          error: `대상자 조회 실패: ${audienceError.message || '알 수 없는 오류'}`,
        })
      }

      // 선택된 이메일이 있으면 필터링 (요청 body 또는 audience_query_json에서)
      const emailsToFilter = selectedEmails || audienceQuery.selected_emails
      if (emailsToFilter && Array.isArray(emailsToFilter) && emailsToFilter.length > 0) {
        const selectedSet = new Set(emailsToFilter.map((email: string) => email.toLowerCase().trim()))
        recipients = recipients.filter(r => selectedSet.has(r.email.toLowerCase().trim()))
      }

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
      console.log('[EmailSend] 발송 정책 조회 시작:', { clientId: campaign.client_id })
      let emailPolicy
      try {
        emailPolicy = await getCampaignEmailPolicy(campaign.client_id, {
          from_domain: campaign.from_domain,
          from_localpart: campaign.from_localpart,
          from_name: campaign.from_name,
          reply_to: campaign.reply_to,
        })
        console.log('[EmailSend] 발송 정책 조회 완료:', { from: emailPolicy.from, replyTo: emailPolicy.replyTo })
      } catch (policyError: any) {
        console.error('[EmailSend] 발송 정책 조회 실패:', policyError)
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
          error: `발송 정책 조회 실패: ${policyError.message || '알 수 없는 오류'}`,
          created_by: user.id,
        })

        return NextResponse.json({
          success: false,
          error: `발송 정책 조회 실패: ${policyError.message || '알 수 없는 오류'}`,
        })
      }

      // 배치 발송
      console.log('[EmailSend] 배치 발송 시작:', { recipientCount: recipients.length })
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

      const total = recipients.length
      const failureRate = total > 0 ? failed / total : 0
      const finalStatus = failureRate >= 0.5 ? 'failed' : 'sent'
      
      console.log('[EmailSend] 배치 발송 완료:', { total, success, failed, finalStatus })

      if (!isResendFailed) {
        await admin
          .from('email_campaigns')
          .update({
            status: finalStatus,
            sent_at: new Date().toISOString(),
          })
          .eq('id', campaignId)
      }

      await admin.from('email_runs').insert({
        email_campaign_id: campaignId,
        run_type: 'send',
        status: finalStatus === 'sent' ? 'success' : 'failed',
        provider: 'resend',
        meta_json: {
          total,
          success,
          failed,
          resend_failed_only: isResendFailed,
        },
        error: finalStatus === 'failed' ? `실패율 ${(failureRate * 100).toFixed(1)}%` : null,
        created_by: user.id,
      })

      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        client_id: campaign.client_id,
        action: isResendFailed ? 'EMAIL_CAMPAIGN_RESEND_FAILED' : 'EMAIL_CAMPAIGN_SEND',
        payload: {
          campaign_id: campaignId,
          total,
          success,
          failed,
          final_status: finalStatus,
          resend_failed_only: isResendFailed,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          campaign: { status: isResendFailed ? campaign.status : finalStatus },
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
      console.error('[EmailSend] 발송 중 에러 발생:', sendError)
      if (!isResendFailed) {
        await admin
          .from('email_campaigns')
          .update({ status: 'failed' })
          .eq('id', campaignId)
      }
      await admin.from('email_runs').insert({
        email_campaign_id: campaignId,
        run_type: 'send',
        status: 'failed',
        provider: 'resend',
        error: sendError.message || '알 수 없는 오류',
        created_by: user.id,
      })

      // 에러를 다시 throw하지 않고 응답 반환
      return NextResponse.json(
        { success: false, error: sendError.message || 'Internal server error' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('이메일 발송 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
