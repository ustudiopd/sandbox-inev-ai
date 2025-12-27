import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 설문조사 분석 보고서 상세 조회
 * GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]
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
      .select('*')
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

    // 생성자 정보 조회
    let createdBy = null
    if (report.created_by) {
      const { data: creator } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .eq('id', report.created_by)
        .single()

      createdBy = creator
    }

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        created_by: createdBy,
      },
    })
  } catch (error: any) {
    console.error('보고서 상세 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 설문조사 분석 보고서 삭제
 * DELETE /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; reportId: string }> }
) {
  try {
    const { campaignId, reportId } = await params

    const admin = createAdminSupabase()

    // 보고서 조회
    const { data: report, error: reportError } = await admin
      .from('survey_analysis_reports')
      .select('pdf_storage_path')
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

    // 권한 확인 (owner, admin만 삭제 가능)
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

      if (clientMember && ['owner', 'admin'].includes(clientMember.role)) {
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
        { error: 'Insufficient permissions. Only owners and admins can delete reports.' },
        { status: 403 }
      )
    }

    // PDF 파일 삭제 (있는 경우)
    if (report.pdf_storage_path) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const storageClient = createClient(supabaseUrl, supabaseServiceKey)
        const pathParts = report.pdf_storage_path.split('/')
        const bucket = pathParts[0]
        const filePath = pathParts.slice(1).join('/')

        await storageClient.storage.from(bucket).remove([filePath])
      } catch (storageError) {
        console.error('PDF 파일 삭제 실패 (무시):', storageError)
        // 파일 삭제 실패해도 계속 진행
      }
    }

    // 보고서 삭제
    const { error: deleteError } = await admin
      .from('survey_analysis_reports')
      .delete()
      .eq('id', reportId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    })
  } catch (error: any) {
    console.error('보고서 삭제 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

