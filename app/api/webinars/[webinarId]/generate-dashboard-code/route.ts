import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

/**
 * 6자리 영문숫자 코드 생성 함수
 */
function generateDashboardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 웨비나 dashboard_code 생성 API
 * POST /api/webinars/[webinarId]/generate-dashboard-code
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    
    console.log('[generate-dashboard-code] webinarId:', webinarId)
    
    const admin = createAdminSupabase()
    
    // 웨비나 조회
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id, client_id, agency_id, dashboard_code')
      .eq('id', webinarId)
      .maybeSingle()
    
    console.log('[generate-dashboard-code] webinar query result:', {
      webinar,
      error: webinarError,
      webinarId
    })
    
    if (webinarError) {
      console.error('[generate-dashboard-code] webinar query error:', webinarError)
      return NextResponse.json(
        { error: `Webinar query failed: ${webinarError.message}` },
        { status: 500 }
      )
    }
    
    if (!webinar) {
      console.error('[generate-dashboard-code] webinar not found:', webinarId)
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인
    const { hasPermission } = await checkWebinarStatsPermission(webinarId)
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 이미 dashboard_code가 있으면 그대로 반환
    if (webinar.dashboard_code) {
      return NextResponse.json({
        success: true,
        dashboard_code: webinar.dashboard_code,
        message: 'Dashboard code already exists',
      })
    }
    
    // 고유한 dashboard_code 생성
    let attempts = 0
    const maxAttempts = 100
    let dashboardCode: string | null = null
    
    while (attempts < maxAttempts) {
      const code = generateDashboardCode()
      
      // 웨비나와 캠페인 모두에서 중복 체크
      const { data: existingWebinar } = await admin
        .from('webinars')
        .select('id')
        .eq('dashboard_code', code)
        .maybeSingle()
      
      const { data: existingCampaign } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('dashboard_code', code)
        .maybeSingle()
      
      if (!existingWebinar && !existingCampaign) {
        dashboardCode = code
        break
      }
      
      attempts++
    }
    
    if (!dashboardCode) {
      return NextResponse.json(
        { error: 'Failed to generate unique dashboard code' },
        { status: 500 }
      )
    }
    
    // dashboard_code 업데이트
    const { error: updateError } = await admin
      .from('webinars')
      .update({ dashboard_code: dashboardCode })
      .eq('id', webinarId)
    
    if (updateError) {
      console.error('[generate-dashboard-code] update error:', updateError)
      return NextResponse.json(
        { error: `Failed to update dashboard code: ${updateError.message}` },
        { status: 500 }
      )
    }
    
    console.log('[generate-dashboard-code] dashboard_code 생성 완료:', dashboardCode)
    
    return NextResponse.json({
      success: true,
      dashboard_code: dashboardCode,
      message: 'Dashboard code generated successfully',
    })
  } catch (error: any) {
    console.error('[generate-dashboard-code] 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
