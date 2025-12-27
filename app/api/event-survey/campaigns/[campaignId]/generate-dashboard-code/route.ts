import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 6자리 영문숫자 코드 생성 함수
function generateDashboardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * dashboard_code 생성 API
 * POST /api/event-survey/campaigns/[campaignId]/generate-dashboard-code
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    
    console.log('[generate-dashboard-code] campaignId:', campaignId)
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id, agency_id, dashboard_code')
      .eq('id', campaignId)
      .maybeSingle()
    
    console.log('[generate-dashboard-code] campaign query result:', {
      campaign,
      error: campaignError,
      campaignId
    })
    
    if (campaignError) {
      console.error('[generate-dashboard-code] campaign query error:', campaignError)
      return NextResponse.json(
        { error: `Campaign query failed: ${campaignError.message}` },
        { status: 500 }
      )
    }
    
    if (!campaign) {
      console.error('[generate-dashboard-code] campaign not found:', campaignId)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
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
      
      if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
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
    
    // 이미 dashboard_code가 있으면 그대로 반환
    if (campaign.dashboard_code) {
      return NextResponse.json({
        success: true,
        dashboard_code: campaign.dashboard_code,
        message: 'Dashboard code already exists',
      })
    }
    
    // 고유한 dashboard_code 생성
    let attempts = 0
    const maxAttempts = 100
    let dashboardCode: string | null = null
    
    while (attempts < maxAttempts) {
      const code = generateDashboardCode()
      
      const { data: existing } = await admin
        .from('event_survey_campaigns')
        .select('id')
        .eq('dashboard_code', code)
        .maybeSingle()
      
      if (!existing) {
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
      .from('event_survey_campaigns')
      .update({ dashboard_code: dashboardCode })
      .eq('id', campaignId)
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      dashboard_code: dashboardCode,
      message: 'Dashboard code generated successfully',
    })
  } catch (error: any) {
    console.error('dashboard_code 생성 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

