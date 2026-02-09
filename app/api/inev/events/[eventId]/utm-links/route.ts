import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'
import { normalizeUTM } from '@/lib/utils/utm'
import { generateCID } from '@/lib/utils/cid'
import { getClientPublicBaseUrl } from '@/lib/utils/client-domain'

export const runtime = 'nodejs'

/**
 * 이벤트 기반 UTM 링크 목록 조회
 * GET /api/inev/events/[eventId]/utm-links
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId가 필요합니다' },
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

    // 링크 목록 조회 (event_id 기준)
    let links: any[] = []
    let error: any = null

    // 먼저 event_id로 조회 시도
    const result = await admin
      .from('campaign_link_meta')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    links = result.data || []
    error = result.error

    // event_id 컬럼이 없거나 에러가 발생한 경우 (예: 컬럼이 존재하지 않음)
    if (error) {
      // 에러 코드가 42703 (undefined_column)인 경우, event_id 컬럼이 없는 것
      if (error.code === '42703' || error.message?.includes('column') && error.message?.includes('event_id')) {
        console.warn('event_id 컬럼이 없습니다. 마이그레이션을 적용하세요: supabase/inev/008_add_event_id_to_campaign_link_meta.sql')
        // 빈 배열 반환 (마이그레이션이 필요함을 암시)
        links = []
      } else {
        // 다른 에러인 경우
        console.error('링크 목록 조회 오류:', error)
        return NextResponse.json(
          { 
            error: 'Failed to fetch links', 
            details: error.message,
            code: error.code,
            hint: error.hint || 'event_id 컬럼이 없을 수 있습니다. 마이그레이션을 확인하세요.'
          },
          { status: 500 }
        )
      }
    }

    // 각 링크의 통계 및 URL 생성
    const linksWithStats = await Promise.all(
      (links || []).map(async (link) => {
        // Visits 집계 (event_visits에서 UTM 파라미터 매칭)
        // event_visits에는 cid가 직접 저장되지 않으므로, UTM 파라미터로 매칭
        let visitsCount = 0
        let uniqueSessions = 0

        try {
          // event_visits에서 이벤트의 방문 수 조회 (UTM 파라미터로 필터링)
          let visitsQuery = admin
            .from('event_visits')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)

          // UTM 파라미터로 필터링 (정확한 매칭)
          if (link.utm_source) {
            visitsQuery = visitsQuery.eq('utm_source', link.utm_source)
          }
          if (link.utm_medium) {
            visitsQuery = visitsQuery.eq('utm_medium', link.utm_medium)
          }
          if (link.utm_campaign) {
            visitsQuery = visitsQuery.eq('utm_campaign', link.utm_campaign)
          }

          const { count: visitsTotal, error: visitsError } = await visitsQuery
          
          if (!visitsError && visitsTotal !== null) {
            visitsCount = visitsTotal
            uniqueSessions = visitsCount // event_visits에는 session_id가 없으므로 총 방문 수 사용
          }
        } catch (err) {
          console.error('Visits 집계 오류:', err)
          // 에러가 발생해도 계속 진행 (통계는 0으로 표시)
        }

        // Leads 집계 (leads에서 marketing_campaign_link_id 기준)
        const { count: leadsCount } = await admin
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('marketing_campaign_link_id', link.id)

        // URL 생성
        const baseUrl = await getClientPublicBaseUrl(event.client_id)
        const landingPath = link.landing_variant === 'welcome'
          ? `/${event.slug}`
          : link.landing_variant === 'register'
          ? `/${event.slug}/register`
          : `/${event.slug}`

        // 공유용 URL (cid만 포함)
        const shareParams = new URLSearchParams()
        if (link.cid) {
          shareParams.set('cid', link.cid)
        }
        const shareUrl = `${baseUrl}${landingPath}?${shareParams.toString()}`

        // 광고용 URL (cid + UTM 포함)
        const utmParams = new URLSearchParams()
        if (link.cid) {
          utmParams.set('cid', link.cid)
        }
        if (link.utm_source) utmParams.set('utm_source', link.utm_source)
        if (link.utm_medium) utmParams.set('utm_medium', link.utm_medium)
        if (link.utm_campaign) utmParams.set('utm_campaign', link.utm_campaign)
        if (link.utm_term) utmParams.set('utm_term', link.utm_term)
        if (link.utm_content) utmParams.set('utm_content', link.utm_content)

        const campaignUrl = `${baseUrl}${landingPath}?${utmParams.toString()}`

        return {
          ...link,
          url: campaignUrl,
          share_url: shareUrl,
          campaign_url: campaignUrl,
          visits_count: visitsCount,
          unique_sessions: uniqueSessions,
          leads_count: leadsCount || 0,
          cvr: visitsCount > 0 ? ((leadsCount || 0) / visitsCount) : 0,
        }
      })
    )

    return NextResponse.json(linksWithStats)
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

/**
 * 이벤트 기반 UTM 링크 생성
 * POST /api/inev/events/[eventId]/utm-links
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId가 필요합니다' },
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
    } = body

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: 'name이 필요합니다' },
        { status: 400 }
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
        .eq('client_id', event.client_id)
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
        client_id: event.client_id,
        name: name.trim(),
        event_id: eventId,
        target_type: 'event',
        landing_variant: landing_variant || 'welcome',
        cid: cid!,
        utm_source: normalizedUTM.utm_source || null,
        utm_medium: normalizedUTM.utm_medium || null,
        utm_campaign: normalizedUTM.utm_campaign || null,
        utm_term: normalizedUTM.utm_term || null,
        utm_content: normalizedUTM.utm_content || null,
        start_date: start_date || null,
        status: 'active',
        created_by: auth.userId || null,
      })
      .select()
      .single()

    if (linkError) {
      console.error('링크 생성 오류:', linkError)

      // 중복 이름 오류 처리
      if (linkError.code === '23505') {
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
    const baseUrl = await getClientPublicBaseUrl(event.client_id)
    const landingPath = landing_variant === 'welcome'
      ? `/${event.slug}`
      : landing_variant === 'register'
      ? `/${event.slug}/register`
      : `/${event.slug}`

    // 공유용 URL (cid만 포함)
    const shareParams = new URLSearchParams()
    shareParams.set('cid', link.cid)
    const shareUrl = `${baseUrl}${landingPath}?${shareParams.toString()}`

    // 광고용 URL (cid + UTM 포함)
    const utmParams = new URLSearchParams()
    utmParams.set('cid', link.cid)
    if (normalizedUTM.utm_source) utmParams.set('utm_source', normalizedUTM.utm_source)
    if (normalizedUTM.utm_medium) utmParams.set('utm_medium', normalizedUTM.utm_medium)
    if (normalizedUTM.utm_campaign) utmParams.set('utm_campaign', normalizedUTM.utm_campaign)
    if (normalizedUTM.utm_term) utmParams.set('utm_term', normalizedUTM.utm_term)
    if (normalizedUTM.utm_content) utmParams.set('utm_content', normalizedUTM.utm_content)

    const campaignUrl = `${baseUrl}${landingPath}?${utmParams.toString()}`

    return NextResponse.json({
      ...link,
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
