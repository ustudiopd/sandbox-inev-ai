import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'
import { normalizeUTM } from '@/lib/utils/utm'
import { generateCID } from '@/lib/utils/cid'
import { getClientPublicBaseUrl } from '@/lib/utils/client-domain'

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
    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
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
    
    // 각 링크의 전환 수 및 Visits 집계 및 URL 생성
    // 변경사항:
    // - conversions: CID 기준 전환 count 유지
    // - visits: event_survey_entries에서 해당 CID의 DISTINCT(session_id)로 계산
    // - event_access_logs 기반 visits 사용 중단
    const linksWithStats = await Promise.all(
      (links || []).map(async (link) => {
        // 날짜 범위 설정
        const fromDateTime = fromDate ? new Date(fromDate) : null
        const toDateTime = toDate ? new Date(toDate) : null
        if (fromDateTime) {
          fromDateTime.setHours(0, 0, 0, 0)
        }
        if (toDateTime) {
          toDateTime.setHours(23, 59, 59, 999)
        }
        
        // Conversions: CID 기준 전환 count (registration_data->cid에서 직접 조회)
        // CID 기준으로 모든 전환을 가져온 후 메모리에서 필터링 (JSONB 필드 직접 조회 제한)
        let conversionCount = 0
        let entries: any[] = []
        
        if (link.cid) {
          // CID 기준으로 조회: campaign_id로 먼저 필터링한 후 registration_data에서 CID 확인
          let entriesQuery = admin
            .from('event_survey_entries')
            .select('id, registration_data')
            .eq('campaign_id', link.target_campaign_id)
          
          if (fromDateTime) {
            entriesQuery = entriesQuery.gte('created_at', fromDateTime.toISOString())
          }
          if (toDateTime) {
            entriesQuery = entriesQuery.lte('created_at', toDateTime.toISOString())
          }
          
          const { data: entriesData, error: entriesError } = await entriesQuery
          
          if (!entriesError && entriesData) {
            // 메모리에서 CID로 필터링
            entries = entriesData.filter(entry => {
              const entryCid = entry.registration_data?.cid
              return entryCid === link.cid
            })
            conversionCount = entries.length
          }
        } else {
          // CID가 없는 링크는 marketing_campaign_link_id로 조회
          let entriesQuery = admin
            .from('event_survey_entries')
            .select('id')
            .eq('marketing_campaign_link_id', link.id)
          
          if (fromDateTime) {
            entriesQuery = entriesQuery.gte('created_at', fromDateTime.toISOString())
          }
          if (toDateTime) {
            entriesQuery = entriesQuery.lte('created_at', toDateTime.toISOString())
          }
          
          const { count, data: entriesData, error: entriesError } = await entriesQuery
          
          if (!entriesError) {
            conversionCount = count || 0
            entries = entriesData || []
          }
        }
        
        // Visits: event_access_logs에서 해당 CID의 DISTINCT(session_id)로 계산
        // 전환 여부와 관계없이 해당 CID로 방문한 모든 세션 카운트
        let visitsCount = 0
        
        if (link.cid) {
          // event_access_logs에서 해당 CID를 가진 모든 방문 기록 조회 (전환 여부 무관)
          let visitsQuery = admin
            .from('event_access_logs')
            .select('session_id')
            .eq('cid', link.cid)
            .eq('campaign_id', link.target_campaign_id)
            .not('session_id', 'is', null)
          
          if (fromDateTime) {
            visitsQuery = visitsQuery.gte('accessed_at', fromDateTime.toISOString())
          }
          if (toDateTime) {
            visitsQuery = visitsQuery.lte('accessed_at', toDateTime.toISOString())
          }
          
          const { data: visitLogs, error: visitsError } = await visitsQuery
          
          if (!visitsError && visitLogs) {
            // DISTINCT session_id 카운트 (전환 여부 무관, 모든 방문 포함)
            const uniqueSessionIds = new Set(visitLogs.map(log => log.session_id).filter(Boolean))
            visitsCount = uniqueSessionIds.size
          }
        } else {
          // CID가 없는 링크는 marketing_campaign_link_id로 조회
          let visitsQuery = admin
            .from('event_access_logs')
            .select('session_id')
            .eq('campaign_id', link.target_campaign_id)
            .eq('marketing_campaign_link_id', link.id)
            .not('session_id', 'is', null)
          
          if (fromDateTime) {
            visitsQuery = visitsQuery.gte('accessed_at', fromDateTime.toISOString())
          }
          if (toDateTime) {
            visitsQuery = visitsQuery.lte('accessed_at', toDateTime.toISOString())
          }
          
          const { data: visitLogs, error: visitsError } = await visitsQuery
          
          if (!visitsError && visitLogs) {
            const uniqueSessionIds = new Set(visitLogs.map(log => log.session_id).filter(Boolean))
            visitsCount = uniqueSessionIds.size
          }
        }
        
        // CVR 계산
        const cvr = visitsCount > 0
          ? ((conversionCount / visitsCount) * 100).toFixed(2)
          : '0.00'
        
        // 타겟 캠페인 정보 조회
        const { data: targetCampaign } = await admin
          .from('event_survey_campaigns')
          .select('public_path')
          .eq('id', link.target_campaign_id)
          .single()
        
        // URL 생성 (public_base_url 사용)
        const baseUrl = await getClientPublicBaseUrl(clientId)
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
          conversion_count: conversionCount || 0,
          visits_count: visitsCount || 0,
          cvr: parseFloat(cvr),
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
    
    // URL 생성 (public_base_url 사용)
    const baseUrl = await getClientPublicBaseUrl(clientId)
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
