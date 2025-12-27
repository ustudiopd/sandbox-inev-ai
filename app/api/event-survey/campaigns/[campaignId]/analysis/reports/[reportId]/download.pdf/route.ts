import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 설문조사 분석 보고서 PDF 다운로드
 * GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/download.pdf
 * 
 * 현재는 PDF 생성 기능이 구현되지 않았으므로, MD 다운로드로 폴백합니다.
 * 향후 PDF 생성 기능이 구현되면 이 API를 확장합니다.
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
      .select('pdf_storage_path, pdf_generated_at, analyzed_at')
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

    // PDF 캐시 확인
    if (report.pdf_storage_path) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const storageClient = createClient(supabaseUrl, supabaseServiceKey)
        const pathParts = report.pdf_storage_path.split('/')
        const bucket = pathParts[0]
        const filePath = pathParts.slice(1).join('/')

        const { data, error: downloadError } = await storageClient.storage
          .from(bucket)
          .download(filePath)

        if (!downloadError && data) {
          const arrayBuffer = await data.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const dateStr = new Date(report.analyzed_at).toISOString().split('T')[0]
          const filename = `survey-analysis-${campaignId}-${dateStr}.pdf`

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          })
        }
      } catch (storageError) {
        console.error('PDF 캐시 다운로드 실패:', storageError)
        // 폴백: PDF 생성 시도 또는 MD 다운로드 안내
      }
    }

    // PDF 생성 기능이 아직 구현되지 않았으므로 에러 반환
    // 향후 PDF 생성 기능 구현 시 여기에 추가
    return NextResponse.json(
      {
        error: 'PDF 생성 기능이 아직 구현되지 않았습니다. MD 다운로드를 이용해주세요.',
        code: 'PDF_NOT_IMPLEMENTED',
      },
      { status: 501 }
    )
  } catch (error: any) {
    console.error('PDF 다운로드 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

