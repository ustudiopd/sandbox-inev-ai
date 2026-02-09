import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'
import { normalizeUTM } from '@/lib/utils/utm'
import { getClientPublicBaseUrl } from '@/lib/utils/client-domain'

export const runtime = 'nodejs'

/**
 * 이벤트 기반 UTM 링크 수정
 * PUT /api/inev/events/[eventId]/utm-links/[linkId]
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string; linkId: string }> }
) {
  try {
    const { eventId, linkId } = await params

    if (!eventId || !linkId) {
      return NextResponse.json(
        { error: 'eventId와 linkId가 필요합니다' },
        { status: 400 }
      )
    }

    const auth = await getInevAuth(req)
    if (auth instanceof NextResponse) return auth

    const admin = createAdminSupabase()

    // Event 조회하여 client_id 확인
    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, client_id, slug')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인
    const forbidden = ensureClientAccess(event.client_id, auth.allowedClientIds)
    if (forbidden) return forbidden

    // 기존 링크 확인
    const { data: existingLink, error: existingError } = await admin
      .from('campaign_link_meta')
      .select('*')
      .eq('id', linkId)
      .eq('event_id', eventId)
      .single()

    if (existingError || !existingLink) {
      return NextResponse.json(
        { error: '링크를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const {
      name,
      landing_variant,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      start_date,
      status,
    } = body

    // UTM 파라미터 정규화
    const normalizedUTM = normalizeUTM({
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    })

    // 업데이트 데이터 준비
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
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
      .select()
      .single()

    if (updateError) {
      console.error('링크 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: 'Failed to update link', details: updateError.message },
        { status: 500 }
      )
    }

    // 업데이트된 링크 URL 생성
    const baseUrl = await getClientPublicBaseUrl(event.client_id)
    const landingPath = updatedLink.landing_variant === 'welcome'
      ? `/${event.slug}`
      : updatedLink.landing_variant === 'register'
      ? `/${event.slug}/register`
      : `/${event.slug}`

    // 공유용 URL (cid만 포함)
    const shareParams = new URLSearchParams()
    if (updatedLink.cid) {
      shareParams.set('cid', updatedLink.cid)
    }
    const shareUrl = `${baseUrl}${landingPath}?${shareParams.toString()}`

    // 광고용 URL (cid + UTM 포함)
    const utmParams = new URLSearchParams()
    if (updatedLink.cid) {
      utmParams.set('cid', updatedLink.cid)
    }
    if (updatedLink.utm_source) utmParams.set('utm_source', updatedLink.utm_source)
    if (updatedLink.utm_medium) utmParams.set('utm_medium', updatedLink.utm_medium)
    if (updatedLink.utm_campaign) utmParams.set('utm_campaign', updatedLink.utm_campaign)
    if (updatedLink.utm_term) utmParams.set('utm_term', updatedLink.utm_term)
    if (updatedLink.utm_content) utmParams.set('utm_content', updatedLink.utm_content)

    const campaignUrl = `${baseUrl}${landingPath}?${utmParams.toString()}`

    return NextResponse.json({
      ...updatedLink,
      url: campaignUrl,
      share_url: shareUrl,
      campaign_url: campaignUrl,
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
 * 이벤트 기반 UTM 링크 삭제 (soft delete: archived)
 * DELETE /api/inev/events/[eventId]/utm-links/[linkId]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string; linkId: string }> }
) {
  try {
    const { eventId, linkId } = await params

    if (!eventId || !linkId) {
      return NextResponse.json(
        { error: 'eventId와 linkId가 필요합니다' },
        { status: 400 }
      )
    }

    const auth = await getInevAuth(req)
    if (auth instanceof NextResponse) return auth

    const admin = createAdminSupabase()

    // Event 조회하여 client_id 확인
    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, client_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: '이벤트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인
    const forbidden = ensureClientAccess(event.client_id, auth.allowedClientIds)
    if (forbidden) return forbidden

    // 링크 삭제 (soft delete: status를 archived로 변경)
    const { error: deleteError } = await admin
      .from('campaign_link_meta')
      .update({ status: 'archived' })
      .eq('id', linkId)
      .eq('event_id', eventId)

    if (deleteError) {
      console.error('링크 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete link', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}
