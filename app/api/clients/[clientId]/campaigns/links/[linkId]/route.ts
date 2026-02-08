import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'
import { normalizeUTM } from '@/lib/utils/utm'
import { getClientPublicBaseUrl } from '@/lib/utils/client-domain'

export const runtime = 'nodejs'

/**
 * 캠페인 링크 수정
 * PUT /api/clients/[clientId]/campaigns/links/[linkId]
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ clientId: string; linkId: string }> }
) {
  try {
    const { clientId, linkId } = await params
    
    // 권한 확인 (analyst 이상)
    const { user } = await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst'])
    
    const body = await req.json()
    const {
      name,
      target_campaign_id,
      landing_variant,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      start_date,
      status,
    } = body
    
    const admin = createAdminSupabase()
    
    // 링크 소유권 확인
    const { data: existingLink, error: linkError } = await admin
      .from('campaign_link_meta')
      .select('*')
      .eq('id', linkId)
      .eq('client_id', clientId)
      .single()
    
    if (linkError || !existingLink) {
      return NextResponse.json(
        { error: 'Link not found or access denied' },
        { status: 404 }
      )
    }
    
    // 타겟 캠페인 변경 시 소유권 확인
    if (target_campaign_id && target_campaign_id !== existingLink.target_campaign_id) {
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id')
        .eq('id', target_campaign_id)
        .eq('client_id', clientId)
        .single()
      
      if (campaignError || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        )
      }
    }
    
    // UTM 파라미터 정규화
    const normalizedUTM = normalizeUTM({
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    })
    
    // 업데이트 데이터 구성
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (target_campaign_id !== undefined) updateData.target_campaign_id = target_campaign_id
    if (landing_variant !== undefined) updateData.landing_variant = landing_variant
    if (utm_source !== undefined) updateData.utm_source = normalizedUTM.utm_source || null
    if (utm_medium !== undefined) updateData.utm_medium = normalizedUTM.utm_medium || null
    if (utm_campaign !== undefined) updateData.utm_campaign = normalizedUTM.utm_campaign || null
    if (utm_term !== undefined) updateData.utm_term = normalizedUTM.utm_term || null
    if (utm_content !== undefined) updateData.utm_content = normalizedUTM.utm_content || null
    if (start_date !== undefined) updateData.start_date = start_date || null
    if (status !== undefined) updateData.status = status
    
    // 링크 업데이트
    const { data: updatedLink, error: updateError } = await admin
      .from('campaign_link_meta')
      .update(updateData)
      .eq('id', linkId)
      .eq('client_id', clientId)
      .select()
      .single()
    
    if (updateError) {
      console.error('링크 업데이트 오류:', updateError)
      
      // 중복 이름 오류 처리
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: '이미 같은 이름의 링크가 있습니다' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update link', details: updateError.message },
        { status: 500 }
      )
    }
    
    // 업데이트된 링크 URL 생성
    const { data: targetCampaign } = await admin
      .from('event_survey_campaigns')
      .select('public_path')
      .eq('id', updatedLink.target_campaign_id)
      .single()
    
    // URL 생성 (public_base_url 사용)
    const baseUrl = await getClientPublicBaseUrl(clientId)
    const landingPath = updatedLink.landing_variant === 'welcome' 
      ? targetCampaign?.public_path || ''
      : updatedLink.landing_variant === 'survey'
      ? `${targetCampaign?.public_path}/survey`
      : `${targetCampaign?.public_path}/register`
    
    // 공유용 URL (cid만 포함)
    const shareParams = new URLSearchParams()
    if (updatedLink.cid) {
      shareParams.set('cid', updatedLink.cid)
    }
    const shareUrl = `${baseUrl}/event${landingPath}?${shareParams.toString()}`
    
    // 광고용 URL (cid + UTM 포함)
    const utmParams = new URLSearchParams()
    // cid를 첫 번째 파라미터로 추가
    if (updatedLink.cid) {
      utmParams.set('cid', updatedLink.cid)
    }
    if (updatedLink.utm_source) utmParams.set('utm_source', updatedLink.utm_source)
    if (updatedLink.utm_medium) utmParams.set('utm_medium', updatedLink.utm_medium)
    if (updatedLink.utm_campaign) utmParams.set('utm_campaign', updatedLink.utm_campaign)
    if (updatedLink.utm_term) utmParams.set('utm_term', updatedLink.utm_term)
    if (updatedLink.utm_content) utmParams.set('utm_content', updatedLink.utm_content)
    
    const campaignUrl = `${baseUrl}/event${landingPath}?${utmParams.toString()}`
    
    return NextResponse.json({
      ...updatedLink,
      url: campaignUrl, // 기본 URL (광고용)
      share_url: shareUrl, // 공유용 URL (cid만)
      campaign_url: campaignUrl, // 광고용 URL (cid + UTM)
    })
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

/**
 * 캠페인 링크 삭제 (soft delete: archived)
 * DELETE /api/clients/[clientId]/campaigns/links/[linkId]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ clientId: string; linkId: string }> }
) {
  try {
    const { clientId, linkId } = await params
    
    // 권한 확인 (analyst 이상)
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst'])
    
    const admin = createAdminSupabase()
    
    // 링크 소유권 확인 및 soft delete (archived)
    const { data: deletedLink, error } = await admin
      .from('campaign_link_meta')
      .update({ status: 'archived' })
      .eq('id', linkId)
      .eq('client_id', clientId)
      .select()
      .single()
    
    if (error || !deletedLink) {
      return NextResponse.json(
        { error: 'Link not found or access denied' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, link: deletedLink })
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}
