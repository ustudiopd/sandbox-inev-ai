import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * GET /api/client/emails/[id]
 * 이메일 캠페인 상세 조회
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, subject, preheader, body_md, status, campaign_type, client_id, created_at, updated_at, sent_at, variables_json, header_image_url, footer_text, reply_to')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인 (조회 권한 포함)
    await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator', 'analyst', 'viewer'])

    return NextResponse.json({
      success: true,
      data: { campaign },
    })
  } catch (error: any) {
    console.error('이메일 캠페인 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/client/emails/[id]
 * 이메일 캠페인 수정
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await req.json()
    const { subject, preheader, body_md, header_image_url, footer_text, scheduled_send_at, selected_emails, reply_to } = body

    const admin = createAdminSupabase()

    // 캠페인 조회 (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id, status')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인
    const { user } = await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator'])

    // IDOR 방지: campaignId가 해당 clientId에 속하는지 검증
    if (campaign.client_id !== campaign.client_id) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // draft 또는 ready 상태에서만 수정 가능
    if (campaign.status !== 'draft' && campaign.status !== 'ready') {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태에서는 수정할 수 없습니다` },
        { status: 400 }
      )
    }

    // 업데이트
    const updateData: any = {}
    if (subject !== undefined) updateData.subject = subject
    if (preheader !== undefined) updateData.preheader = preheader || null
    if (body_md !== undefined) updateData.body_md = body_md
    if (header_image_url !== undefined) updateData.header_image_url = header_image_url || null
    if (footer_text !== undefined) updateData.footer_text = footer_text || null
    if (scheduled_send_at !== undefined) updateData.scheduled_send_at = scheduled_send_at || null
    if (reply_to !== undefined) updateData.reply_to = reply_to || null
    
    // 예약 발송 시 선택된 이메일 목록 저장 (audience_query_json에 메타데이터로 추가)
    if (selected_emails !== undefined && Array.isArray(selected_emails)) {
      // 기존 audience_query_json 조회
      const { data: currentCampaign } = await admin
        .from('email_campaigns')
        .select('audience_query_json')
        .eq('id', campaignId)
        .single()
      
      if (currentCampaign) {
        const audienceQuery = (currentCampaign.audience_query_json || {}) as any
        audienceQuery.selected_emails = selected_emails
        updateData.audience_query_json = audienceQuery
      }
    }

    const { data: updatedCampaign, error: updateError } = await admin
      .from('email_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('캠페인 수정 실패:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    // audit_logs 기록
    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      client_id: campaign.client_id,
      action: 'EMAIL_CAMPAIGN_UPDATE',
      payload: {
        campaign_id: campaignId,
        updated_fields: Object.keys(updateData),
      },
    })

    return NextResponse.json({
      success: true,
      data: { campaign: updatedCampaign },
    })
  } catch (error: any) {
    console.error('이메일 캠페인 수정 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/client/emails/[id]
 * 이메일 캠페인 삭제
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const admin = createAdminSupabase()

    // 캠페인 조회 (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id, status, subject')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인 (owner/admin만 삭제 가능)
    const { user } = await requireClientMember(campaign.client_id, ['owner', 'admin'])

    // 삭제 가능한 상태 확인: draft, ready, canceled만 삭제 가능
    // sending, sent, failed 상태는 로그 보존을 위해 삭제 불가
    if (!['draft', 'ready', 'canceled'].includes(campaign.status)) {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태의 캠페인은 삭제할 수 없습니다. 로그 보존을 위해 발송 중이거나 발송 완료된 캠페인은 삭제할 수 없습니다.` },
        { status: 400 }
      )
    }

    // 삭제 실행 (cascade로 email_runs, email_send_logs도 함께 삭제됨)
    const { error: deleteError } = await admin
      .from('email_campaigns')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      console.error('캠페인 삭제 실패:', deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      )
    }

    // audit_logs 기록
    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      client_id: campaign.client_id,
      action: 'EMAIL_CAMPAIGN_DELETE',
      payload: {
        campaign_id: campaignId,
        campaign_subject: campaign.subject,
        campaign_status: campaign.status,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: '캠페인이 삭제되었습니다' },
    })
  } catch (error: any) {
    console.error('이메일 캠페인 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
