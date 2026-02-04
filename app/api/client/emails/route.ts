import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

/**
 * GET /api/client/emails
 * 이메일 캠페인 목록 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const scopeType = searchParams.get('scopeType') // 'webinar' | 'registration_campaign' | 'survey_campaign' | null
    const scopeId = searchParams.get('scopeId') // 특정 scope의 캠페인만 필터링
    const status = searchParams.get('status') // 상태 필터

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId가 필요합니다' },
        { status: 400 }
      )
    }

    // 권한 확인 (조회 권한 포함)
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer'])

    const admin = createAdminSupabase()

    // 쿼리 빌드
    let query = admin
      .from('email_campaigns')
      .select('id, subject, preheader, status, campaign_type, scope_type, scope_id, created_at, updated_at, sent_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // scope 필터
    if (scopeType) {
      query = query.eq('scope_type', scopeType)
    }
    if (scopeId) {
      query = query.eq('scope_id', scopeId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: campaigns, error } = await query

    if (error) {
      console.error('캠페인 목록 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: `캠페인 목록을 불러오는 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    // 각 캠페인에 대해 발송 통계 집계 (email_send_logs에서)
    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign: any) => {
        const { data: logs } = await admin
          .from('email_send_logs')
          .select('status')
          .eq('email_campaign_id', campaign.id)

        const totalRecipients = logs?.length || 0
        const sentCount = logs?.filter((log: any) => log.status === 'sent').length || 0
        const failedCount = logs?.filter((log: any) => log.status === 'failed').length || 0

        return {
          ...campaign,
          total_recipients: totalRecipients,
          sent_count: sentCount,
          failed_count: failedCount,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaignsWithStats || [],
      },
    })
  } catch (error: any) {
    console.error('캠페인 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
