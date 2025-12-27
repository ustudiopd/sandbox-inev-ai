import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 설문조사 분석 보고서 MD 다운로드
 * GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/download.md
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; reportId: string }> }
) {
  try {
    const { campaignId, reportId } = await params

    const admin = createAdminSupabase()

    // 보고서 조회
    const { data: report, error: reportError } = await admin
      .from('survey_analysis_reports')
      .select('report_content_full_md, report_content, analyzed_at')
      .eq('id', reportId)
      .eq('campaign_id', campaignId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // 캠페인 조회 (권한 확인용)
    const { data: campaign } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id, agency_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // 권한 확인
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()

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

      if (
        clientMember &&
        ['owner', 'admin', 'operator', 'analyst', 'viewer'].includes(clientMember.role)
      ) {
        hasPermission = true
      } else {
        const { data: agencyMember } = await supabase
          .from('agency_members')
          .select('role')
          .eq('agency_id', campaign.agency_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
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

    // 다운로드할 내용 선택 (v2가 있으면 v2, 없으면 v1)
    const content = report.report_content_full_md || report.report_content || ''

    // 파일명 생성
    const dateStr = new Date(report.analyzed_at).toISOString().split('T')[0]
    const filename = `survey-analysis-${campaignId}-${dateStr}.md`

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('MD 다운로드 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

