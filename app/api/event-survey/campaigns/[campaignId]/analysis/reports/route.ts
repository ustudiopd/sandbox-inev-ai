import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 설문조사 분석 보고서 목록 조회
 * GET /api/event-survey/campaigns/[campaignId]/analysis/reports
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
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

    const admin = createAdminSupabase()

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id, agency_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
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

    // 보고서 목록 조회
    const { data: reports, error: reportsError } = await admin
      .from('survey_analysis_reports')
      .select('id, analyzed_at, sample_count, total_questions, report_title, summary, lens, created_at, is_public')
      .eq('campaign_id', campaignId)
      .order('analyzed_at', { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    if (reportsError) {
      return NextResponse.json(
        { error: reportsError.message },
        { status: 500 }
      )
    }

    // 전체 개수 조회
    const { count, error: countError } = await admin
      .from('survey_analysis_reports')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reports: reports || [],
      total: count || 0,
    })
  } catch (error: any) {
    console.error('보고서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

