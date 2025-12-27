import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 보고서 공개/비공개 토글
 * POST /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/toggle-public
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; reportId: string }> }
) {
  try {
    const { campaignId, reportId } = await params
    const { isPublic } = await req.json().catch(() => ({ isPublic: null }))

    if (typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { error: 'isPublic (boolean) is required' },
        { status: 400 }
      )
    }

    const admin = createAdminSupabase()

    // 인증 확인 (API 라우트용)
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id, agency_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // 보고서 조회
    const { data: report, error: reportError } = await admin
      .from('survey_analysis_reports')
      .select('id, campaign_id')
      .eq('id', reportId)
      .eq('campaign_id', campaignId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // 권한 확인

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    let hasPermission = false

    if (profile?.is_super_admin) {
      hasPermission = true
    } else {
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', campaign.client_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientMember && ['owner', 'admin', 'operator', 'analyst'].includes(clientMember.role)) {
        hasPermission = true
      } else if (campaign.agency_id) {
        const { data: agencyMember } = await supabase
          .from('agency_members')
          .select('role')
          .eq('agency_id', campaign.agency_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (agencyMember && ['owner', 'admin', 'operator', 'analyst'].includes(agencyMember.role)) {
          hasPermission = true
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // 공개 상태 업데이트
    const { data: updatedReport, error: updateError } = await admin
      .from('survey_analysis_reports')
      .update({ is_public: isPublic })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('보고서 공개 상태 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: 'Failed to update report visibility' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        id: updatedReport.id,
        is_public: updatedReport.is_public,
      },
    })
  } catch (error: any) {
    console.error('보고서 공개 상태 토글 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

