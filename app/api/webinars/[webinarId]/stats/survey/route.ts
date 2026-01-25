import { NextRequest, NextResponse } from 'next/server'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * 웨비나 설문조사 통계 API
 * GET /api/webinars/[webinarId]/stats/survey
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const admin = createAdminSupabase()

    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 웨비나에 연결된 설문조사 캠페인 확인
    if (!webinar.registration_campaign_id) {
      return NextResponse.json({
        success: true,
        data: {
          hasCampaign: false,
          totalCompleted: 0,
          totalVerified: 0,
          totalPrizeRecorded: 0,
        },
      })
    }

    // 설문조사 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, status')
      .eq('id', webinar.registration_campaign_id)
      .maybeSingle()

    if (campaignError || !campaign) {
      return NextResponse.json({
        success: true,
        data: {
          hasCampaign: false,
          totalCompleted: 0,
          totalVerified: 0,
          totalPrizeRecorded: 0,
        },
      })
    }

    // 통계 정보 조회
    const { count: completedCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)

    const { count: verifiedCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .not('verified_at', 'is', null)

    const { count: prizeRecordedCount } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .not('prize_recorded_at', 'is', null)

    return NextResponse.json({
      success: true,
      data: {
        hasCampaign: true,
        campaignTitle: campaign.title,
        campaignStatus: campaign.status,
        totalCompleted: completedCount || 0,
        totalVerified: verifiedCount || 0,
        totalPrizeRecorded: prizeRecordedCount || 0,
      },
    })
  } catch (error: any) {
    console.error('[Stats Survey] 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || '설문조사 통계 조회 실패' },
      { status: 500 }
    )
  }
}
