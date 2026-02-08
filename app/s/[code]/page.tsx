import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getClientPublicBaseUrl } from '@/lib/utils/client-domain'
import { extractUTMParams, normalizeUTM } from '@/lib/utils/utm'
import { generateSessionId } from '@/lib/utils/session'
import type { Metadata } from 'next'
import { headers } from 'next/headers'

interface PageProps {
  params: Promise<{ code: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const admin = createAdminSupabase()

  // 짧은 링크로 Event 또는 Webinar ID 조회
  const { data: shortLink } = await admin
    .from('short_links')
    .select('event_id, webinar_id')
    .eq('code', code)
    .single()

  if (!shortLink) {
    return {
      title: '이벤트를 찾을 수 없습니다',
    }
  }

  let title = '이벤트'
  let description = 'Inev.ai 이벤트에 참여하세요'

  // Event 기반인 경우
  if (shortLink.event_id) {
    const { data: event } = await admin
      .from('events')
      .select('id, slug, code')
      .eq('id', shortLink.event_id)
      .single()

    if (event) {
      title = `이벤트 ${event.code}`
      description = 'Inev.ai 이벤트에 참여하세요'
    }
  }
  // Webinar 기반인 경우 (호환성)
  else if (shortLink.webinar_id) {
    const { data: webinar } = await admin
      .from('webinars')
      .select('id, slug, title, description')
      .eq('id', shortLink.webinar_id)
      .single()

    if (webinar) {
      title = webinar.title || '웨비나'
      description = webinar.description || 'Inev.ai 웨비나에 참여하세요'
    }
  }

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`
  const shortUrl = `${baseUrl}/s/${code}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shortUrl,
      siteName: 'Inev.ai',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

/**
 * Phase 7: Short Link(/s) 라우트
 * 
 * {public_base_url}/s/{code}?u={email}
 * 
 * 동작:
 * 1. 클릭 로그 저장 (event_access_logs)
 * 2. 307 리다이렉트로 동일 도메인 내 `/entry` 또는 `/event/[slug]/enter`로 전달
 * 3. Entry 페이지는 버튼 클릭 전까지 side effect 없음
 */
export default async function ShortLinkRedirectPage({ 
  params,
  searchParams 
}: PageProps) {
  try {
    const { code } = await params
    const searchParamsData = await searchParams
    const headersList = await headers()
    
    console.log('[ShortLink] 시작:', { code, searchParams: Object.keys(searchParamsData || {}) })
    
    const admin = createAdminSupabase()

    // 짧은 링크로 Event 또는 Webinar ID 조회
    console.log('[ShortLink] 짧은 링크 조회 시작:', code)
    const { data: shortLink, error } = await admin
      .from('short_links')
      .select('event_id, webinar_id, expires_at')
      .eq('code', code)
      .single()

    if (error || !shortLink) {
      console.error('[ShortLink] 짧은 링크 조회 실패:', { error, code })
      redirect('/')
    }
    
    console.log('[ShortLink] 짧은 링크 조회 성공:', { 
      code, 
      event_id: shortLink.event_id,
      webinar_id: shortLink.webinar_id,
      expires_at: shortLink.expires_at 
    })

    // 만료 시간 확인
    if (shortLink.expires_at) {
      const expiresAt = new Date(shortLink.expires_at)
      if (expiresAt < new Date()) {
        console.error('[ShortLink] 만료된 링크:', { code, expires_at: shortLink.expires_at })
        redirect('/')
      }
    }

    let event: { id: string; slug: string; code: string; client_id: string } | null = null
    let webinar: { id: string; slug: string | null; client_id: string } | null = null
    let clientId: string | null = null

    // Event 기반인 경우 (우선)
    if (shortLink.event_id) {
      console.log('[ShortLink] Event 기반 조회:', shortLink.event_id)
      const { data: eventData, error: eventError } = await admin
        .from('events')
        .select('id, slug, code, client_id')
        .eq('id', shortLink.event_id)
        .single()

      if (eventError || !eventData) {
        console.error('[ShortLink] Event 조회 실패:', { error: eventError, eventId: shortLink.event_id })
        redirect('/')
      }

      event = eventData
      clientId = eventData.client_id
    }
    // Webinar 기반인 경우 (호환성)
    else if (shortLink.webinar_id) {
      console.log('[ShortLink] Webinar 기반 조회 (호환성):', shortLink.webinar_id)
      const { data: webinarData, error: webinarError } = await admin
        .from('webinars')
        .select('id, slug, client_id')
        .eq('id', shortLink.webinar_id)
        .single()

      if (webinarError || !webinarData) {
        console.error('[ShortLink] Webinar 조회 실패:', { error: webinarError, webinarId: shortLink.webinar_id })
        redirect('/')
      }

      webinar = webinarData
      clientId = webinarData.client_id
    } else {
      console.error('[ShortLink] event_id 또는 webinar_id가 없음:', shortLink)
      redirect('/')
    }

    // public_base_url 조회 (커스텀 도메인 지원)
    const baseUrl = clientId 
      ? await getClientPublicBaseUrl(clientId)
      : process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'

    // 세션 ID 생성/조회 (클릭 로그용)
    const sessionId = generateSessionId()

    // UTM 파라미터 추출
    const utmParams = extractUTMParams(searchParamsData)
    const normalizedUTM = normalizeUTM(utmParams)

    // 이메일 파라미터 처리: ?u= 또는 ?email=
    let email: string | null = null
    if (searchParamsData?.u) {
      const uValue = Array.isArray(searchParamsData.u) 
        ? searchParamsData.u[0] 
        : searchParamsData.u
      if (uValue && typeof uValue === 'string') {
        email = uValue.trim().toLowerCase()
      }
    } else if (searchParamsData?.email) {
      const emailValue = Array.isArray(searchParamsData.email) 
        ? searchParamsData.email[0] 
        : searchParamsData.email
      if (emailValue && typeof emailValue === 'string') {
        email = emailValue.trim().toLowerCase()
      }
    }

    // 클릭 로그 저장 (event_access_logs)
    try {
      const referrer = headersList.get('referer') || null
      const userAgent = headersList.get('user-agent') || null

      // Event 기반인 경우
      if (event) {
        // Event와 연결된 캠페인 찾기 (등록 캠페인 우선)
        const { data: campaign } = await admin
          .from('event_survey_campaigns')
          .select('id')
          .eq('client_id', clientId)
          .eq('type', 'registration')
          .limit(1)
          .maybeSingle()

        if (campaign) {
          await admin.from('event_access_logs').insert({
            campaign_id: campaign.id,
            session_id: sessionId,
            utm_source: normalizedUTM.utm_source || null,
            utm_medium: normalizedUTM.utm_medium || null,
            utm_campaign: normalizedUTM.utm_campaign || null,
            utm_term: normalizedUTM.utm_term || null,
            utm_content: normalizedUTM.utm_content || null,
            referrer: referrer,
            user_agent: userAgent,
            accessed_at: new Date().toISOString(),
          })
        }
      }
      // Webinar 기반인 경우 (호환성)
      else if (webinar) {
        await admin.from('event_access_logs').insert({
          webinar_id: webinar.id,
          session_id: sessionId,
          utm_source: normalizedUTM.utm_source || null,
          utm_medium: normalizedUTM.utm_medium || null,
          utm_campaign: normalizedUTM.utm_campaign || null,
          utm_term: normalizedUTM.utm_term || null,
          utm_content: normalizedUTM.utm_content || null,
          referrer: referrer,
          user_agent: userAgent,
          accessed_at: new Date().toISOString(),
        })
      }
    } catch (logError) {
      // 클릭 로그 저장 실패는 무시 (graceful failure)
      console.warn('[ShortLink] 클릭 로그 저장 실패 (무시):', logError)
    }

    // 리다이렉트 URL 생성
    const queryParams = new URLSearchParams()
    
    // 이메일 파라미터 추가
    if (email) {
      queryParams.set('email', email)
    }

    // UTM 파라미터 추가
    if (normalizedUTM.utm_source) queryParams.set('utm_source', normalizedUTM.utm_source)
    if (normalizedUTM.utm_medium) queryParams.set('utm_medium', normalizedUTM.utm_medium)
    if (normalizedUTM.utm_campaign) queryParams.set('utm_campaign', normalizedUTM.utm_campaign)
    if (normalizedUTM.utm_term) queryParams.set('utm_term', normalizedUTM.utm_term)
    if (normalizedUTM.utm_content) queryParams.set('utm_content', normalizedUTM.utm_content)

    // cid 파라미터 유지 (있으면)
    if (searchParamsData?.cid) {
      const cidValue = Array.isArray(searchParamsData.cid) 
        ? searchParamsData.cid[0] 
        : searchParamsData.cid
      if (cidValue && typeof cidValue === 'string') {
        queryParams.set('cid', cidValue)
      }
    }

    const queryString = queryParams.toString()

    // 리다이렉트 URL 결정
    let redirectUrl: string

    // Event 기반인 경우: /event/[slug]/enter
    if (event) {
      redirectUrl = queryString 
        ? `/event/${event.slug}/enter?${queryString}`
        : `/event/${event.slug}/enter`
    }
    // Webinar 기반인 경우 (호환성): /webinar/[id]/live
    else if (webinar) {
      const webinarPath = webinar.slug || webinar.id
      redirectUrl = queryString 
        ? `/webinar/${webinarPath}/live?${queryString}`
        : `/webinar/${webinarPath}/live`
    } else {
      redirectUrl = '/'
    }

    console.log('[ShortLink] 리다이렉트 실행:', {
      code,
      redirectUrl,
      baseUrl,
      eventId: event?.id,
      webinarId: webinar?.id,
      email,
    })

    // 307 리다이렉트 (Temporary Redirect)
    // Next.js redirect()는 기본적으로 307을 사용
    redirect(redirectUrl)
  } catch (err: any) {
    console.error('[ShortLink] 예외 발생:', {
      error: err,
      message: err?.message,
      stack: err?.stack
    })
    redirect('/')
  }
}
