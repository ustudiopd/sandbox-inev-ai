import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * GET /api/client/emails/[id]/failed-recipients
 * 발송 실패한 수신자 목록 조회 (email_send_logs 기준)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const admin = createAdminSupabase()

    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator', 'analyst', 'viewer'])

    const { data: logs, error: logsError } = await admin
      .from('email_send_logs')
      .select('recipient_email, error_message')
      .eq('email_campaign_id', campaignId)
      .eq('status', 'failed')
      .order('created_at', { ascending: true })

    if (logsError) {
      return NextResponse.json(
        { success: false, error: logsError.message || '실패 목록 조회 실패' },
        { status: 500 }
      )
    }

    const recipients = (logs || []).map((row) => ({
      email: row.recipient_email,
      error_message: row.error_message || undefined,
    }))

    return NextResponse.json({
      success: true,
      data: {
        recipients,
        totalCount: recipients.length,
      },
    })
  } catch (error: any) {
    console.error('실패 수신자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
