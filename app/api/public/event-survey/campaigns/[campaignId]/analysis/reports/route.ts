import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 공개 AI 분석 보고서 목록 조회 (인증 불필요)
 * GET /api/public/event-survey/campaigns/[campaignId]/analysis/reports
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const admin = createAdminSupabase()

    // 캠페인 조회 (published 상태만)
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, dashboard_code, status')
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
    const { data: reports, error: reportsError } = await admin
      .from('survey_analysis_reports')
      .select('id, analyzed_at, sample_count, total_questions, report_title, summary, lens, created_at')
      .eq('campaign_id', campaignId)
      .eq('is_public', true)
      .order('analyzed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (reportsError) {
      console.error('공개 보고서 조회 오류:', reportsError)
      return NextResponse.json(
        { error: reportsError.message },
        { status: 500 }
      )
    }

    // 전체 개수 조회
    const { count } = await admin
      .from('survey_analysis_reports')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('is_public', true)

    return NextResponse.json({
      success: true,
      reports: reports || [],
      total: count || 0,
    })
  } catch (error: any) {
    console.error('공개 보고서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

