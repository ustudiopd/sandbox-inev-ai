import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * 공개 대시보드용 통계 조회 API
 * GET /api/public/event-survey/campaigns/[campaignId]/stats
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const admin = createAdminSupabase()

    // 캠페인 존재 확인
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .eq('status', 'published')
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // 통계 정보 조회
    const { count: completedCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    const { count: verifiedCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .not('verified_at', 'is', null)

    const { count: prizeRecordedCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .not('prize_recorded_at', 'is', null)

    return NextResponse.json({
      success: true,
      stats: {
        total_completed: completedCount || 0,
        total_verified: verifiedCount || 0,
        total_prize_recorded: prizeRecordedCount || 0,
      },
    })
  } catch (error: any) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
