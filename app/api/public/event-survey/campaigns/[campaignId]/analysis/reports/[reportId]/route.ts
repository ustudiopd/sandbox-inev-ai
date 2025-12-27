import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 공개 AI 분석 보고서 상세 조회 (인증 불필요)
 * GET /api/public/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; reportId: string }> }
) {
  try {
    const { campaignId, reportId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 (published 상태만)
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .eq('status', 'published')
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or not published' },
        { status: 404 }
      )
    }

    // 공개 보고서만 조회
    const { data: report, error: reportError } = await admin
      .from('survey_analysis_reports')
      .select('*')
      .eq('id', reportId)
      .eq('campaign_id', campaignId)
      .eq('is_public', true)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found or not public' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        analyzed_at: report.analyzed_at,
        sample_count: report.sample_count,
        total_questions: report.total_questions,
        report_title: report.report_title,
        summary: report.summary,
        lens: report.lens,
        report_content_md: report.report_content_md,
        report_content_full_md: report.report_content_full_md,
        statistics_snapshot: report.statistics_snapshot,
        references_used: report.references_used,
        created_at: report.created_at,
      },
    })
  } catch (error: any) {
    console.error('공개 보고서 상세 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

