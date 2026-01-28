import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'
import { normalizeUTM } from '@/lib/utils/utm'
import { generateCID } from '@/lib/utils/cid'

export const runtime = 'nodejs'

/**
 * 캠페인 링크 목록 조회
 * GET /api/clients/[clientId]/campaigns/links
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    
    // 권한 확인
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer', 'member'])
    
    const admin = createAdminSupabase()
    
    // 링크 목록 조회
    const { data: links, error } = await admin
      .from('campaign_link_meta')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('링크 목록 조회 오류:', error)
      return NextResponse.json(
        { error: 'Failed to fetch links', details: error.message },
        { status: 500 }
      )
    }
    
    // 각 링크의 전환 수 집계 및 URL 생성
    const linksWithStats = await Promise.all(
      (links || []).map(async (link) => {
        const { count } = await admin
          .from('event_survey_entries')
          .select('*', { count: 'exact', head: true })
          .eq('marketing_campaign_link_id', link.id)
        
        // 타겟 캠페인 정보 조회
        const { data: targetCampaign } = await admin
          .from('event_survey_campaigns')
          .select('public_path')
          .eq('id', link.target_campaign_id)
          .single()
        
        // URL 생성 (항상 eventflow.kr 사용)
        const baseUrl = 'https://eventflow.kr'
        const landingPath = link.landing_variant === 'welcome' 
          ? targetCampaign?.public_path || ''
          : link.landing_variant === 'survey'
          ? `${targetCampaign?.public_path}/survey`
          : `${targetCampaign?.public_path}/register`
        
        // 공유용 URL (cid만 포함)
        const shareParams = new URLSearchParams()
        if (link.cid) {
          shareParams.set('cid', link.cid)
        }
        const shareUrl = `${baseUrl}/event${landingPath}?${shareParams.toString()}`
        
        // 광고용 URL (cid + UTM 포함)
        const utmParams = new URLSearchParams()
        // cid를 첫 번째 파라미터로 추가
        if (link.cid) {
          utmParams.set('cid', link.cid)
        }
        if (link.utm_source) utmParams.set('utm_source', link.utm_source)
        if (link.utm_medium) utmParams.set('utm_medium', link.utm_medium)
        if (link.utm_campaign) utmParams.set('utm_campaign', link.utm_campaign)
        if (link.utm_term) utmParams.set('utm_term', link.utm_term)
        if (link.utm_content) utmParams.set('utm_content', link.utm_content)
        
        const campaignUrl = `${baseUrl}/event${landingPath}?${utmParams.toString()}`
        
        return {
          ...link,
          conversion_count: count || 0,
          url: campaignUrl, // 기본 URL (광고용)
          share_url: shareUrl, // 공유용 URL (cid만)
          campaign_url: campaignUrl, // 광고용 URL (cid + UTM)
        }
      })
    )
    
    return NextResponse.json({ links: linksWithStats })
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

/**
 * 새 캠페인 링크 생성
 * POST /api/clients/[clientId]/campaigns/links
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    
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
    } = body
    
    // 필수 필드 검증
    if (!name || !target_campaign_id) {
      return NextResponse.json(
        { error: 'name and target_campaign_id are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 타겟 캠페인이 해당 클라이언트 소속인지 확인
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
    
    // UTM 파라미터 정규화
    const normalizedUTM = normalizeUTM({
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    })
    
    // cid 생성 (중복 체크 포함)
    let cid: string
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      cid = generateCID()
      
      // 중복 체크
      const { data: existingLink } = await admin
        .from('campaign_link_meta')
        .select('id')
        .eq('client_id', clientId)
        .eq('cid', cid)
        .maybeSingle()
      
      if (!existingLink) {
        break // 중복 없음
      }
      
      attempts++
    }
    
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'cid 생성에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }
    
    // 링크 생성
    const { data: link, error: linkError } = await admin
      .from('campaign_link_meta')
      .insert({
        client_id: clientId,
        name: name.trim(),
        target_campaign_id,
        landing_variant: landing_variant || 'register',
        cid: cid!,
        utm_source: normalizedUTM.utm_source || null,
        utm_medium: normalizedUTM.utm_medium || null,
        utm_campaign: normalizedUTM.utm_campaign || null,
        utm_term: normalizedUTM.utm_term || null,
        utm_content: normalizedUTM.utm_content || null,
        start_date: start_date || null,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()
    
    if (linkError) {
      console.error('링크 생성 오류:', linkError)
      
      // 중복 이름 오류 처리
      if (linkError.code === '23505') {
        // cid 중복인지 이름 중복인지 확인
        if (linkError.message.includes('cid')) {
          return NextResponse.json(
            { error: 'cid 중복이 발생했습니다. 다시 시도해주세요.' },
            { status: 400 }
          )
        }
        return NextResponse.json(
          { error: '이미 같은 이름의 링크가 있습니다' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create link', details: linkError.message },
        { status: 500 }
      )
    }
    
    // 생성된 링크 URL 생성
    const { data: targetCampaign } = await admin
      .from('event_survey_campaigns')
      .select('public_path')
      .eq('id', target_campaign_id)
      .single()
    
    // URL 생성 (항상 eventflow.kr 사용)
    const baseUrl = 'https://eventflow.kr'
    const landingPath = landing_variant === 'welcome' 
      ? targetCampaign?.public_path || ''
      : landing_variant === 'survey'
      ? `${targetCampaign?.public_path}/survey`
      : `${targetCampaign?.public_path}/register`
    
    // 공유용 URL (cid만 포함)
    const shareParams = new URLSearchParams()
    shareParams.set('cid', link.cid)
    const shareUrl = `${baseUrl}/event${landingPath}?${shareParams.toString()}`
    
    // 광고용 URL (cid + UTM 포함)
    const utmParams = new URLSearchParams()
    // cid를 첫 번째 파라미터로 추가 (명세서 요구사항)
    utmParams.set('cid', link.cid)
    if (normalizedUTM.utm_source) utmParams.set('utm_source', normalizedUTM.utm_source)
    if (normalizedUTM.utm_medium) utmParams.set('utm_medium', normalizedUTM.utm_medium)
    if (normalizedUTM.utm_campaign) utmParams.set('utm_campaign', normalizedUTM.utm_campaign)
    if (normalizedUTM.utm_term) utmParams.set('utm_term', normalizedUTM.utm_term)
    if (normalizedUTM.utm_content) utmParams.set('utm_content', normalizedUTM.utm_content)
    
    const campaignUrl = `${baseUrl}/event${landingPath}?${utmParams.toString()}`
    
    return NextResponse.json({
      ...link,
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
