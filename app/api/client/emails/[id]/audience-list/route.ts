import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getAudience } from '@/lib/email/audience-query'

export const runtime = 'nodejs'

/**
 * GET /api/client/emails/[id]/audience-list
 * 전체 대상자 목록 조회
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id, audience_query_json')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인 (조회 권한 포함)
    await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator', 'analyst', 'viewer'])

    // 전체 대상자 조회
    const audienceQuery = (campaign.audience_query_json || {}) as any
    const recipients = await getAudience(audienceQuery, admin)

    return NextResponse.json({
      success: true,
      data: {
        recipients,
        totalCount: recipients.length,
      },
    })
  } catch (error: any) {
    console.error('대상자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
