import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { extractUTMParams } from '@/lib/utils/utm'
import QRCodeDisplay from './components/QRCodeDisplay'
import SurveyPage from './components/SurveyPage'
import DonePageClient from './components/DonePageClient'
import RegistrationPage from './components/RegistrationPage'
import WelcomePage from './components/WelcomePage'
import WebinarFormWertPage from '@/app/webinarform/wert/page'
import OnePredictRegistrationPage from './components/OnePredictRegistrationPage'
import OnePredictWebinarPage from './components/OnePredictWebinarPage'
import OnePredictEnterPage from './components/OnePredictEnterPage'
import OnePredictWebinarLivePage from './components/OnePredictWebinarLivePage'
import type { Metadata } from 'next'

/**
 * 메타데이터 생성 함수
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>
}): Promise<Metadata> {
  const { path } = await params
  
  if (!path || path.length === 0) {
    return {}
  }
  
  const lastPath = path[path.length - 1]
  const isSubPath = ['survey', 'register', 'done', 'display'].includes(lastPath)
  const publicPath = '/' + (isSubPath ? path.slice(0, -1) : path).join('/')
  
  // 캠페인 메타데이터 조회
  try {
    const admin = createAdminSupabase()
    const { data: campaign } = await admin
      .from('event_survey_campaigns')
      .select('id, title, meta_title, meta_description, meta_thumbnail_url, public_path')
      .eq('public_path', publicPath)
      .eq('status', 'published')
      .maybeSingle()
    
    if (campaign) {
      // 메타데이터 우선순위: meta_title/meta_description > title
      const metaTitle = campaign.meta_title || campaign.title || '이벤트'
      const metaDescription = campaign.meta_description || `${campaign.title} - EventFlow 이벤트에 참여하세요`
      const thumbnailUrl = campaign.meta_thumbnail_url || 'https://eventflow.kr/og-image.png'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
      const canonicalUrl = `${appUrl}/event${publicPath}`
      
      return {
        title: `${metaTitle} | EventFlow`,
        description: metaDescription,
        metadataBase: new URL(appUrl),
        openGraph: {
          title: metaTitle,
          description: metaDescription,
          type: 'website',
          url: canonicalUrl,
          siteName: 'EventFlow',
          images: [
            {
              url: thumbnailUrl,
              width: 1200,
              height: 630,
              alt: metaTitle,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: metaTitle,
          description: metaDescription,
          images: [thumbnailUrl],
        },
        alternates: {
          canonical: canonicalUrl,
        },
      }
    }
  } catch (error) {
    console.error('[generateMetadata] 캠페인 메타데이터 조회 오류:', error)
  }
  
  // 149403 페이지에 대한 메타데이터 (fallback)
  if (publicPath === '/149403' || publicPath === '149403') {
    const thumbnailUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/thumb.png'
    return {
      title: '실제 고객사례로 알아보는 AI 특허리서치 실무 활용 웨비나 | keywert Insight',
      description: '2026년 2월 6일(금) 오후 2시-3시 30분, 온라인 LIVE로 진행되는 무료 웨비나. IP팀·특허사무소·R&D팀의 키워트 인사이트 활용 방식을 실제 고객사례를 통해 알아보세요.',
      keywords: 'AI 특허리서치, 키워트 인사이트, 특허 분석, IP팀, 특허사무소, R&D, 웨비나, keywert Insight',
      metadataBase: new URL('https://eventflow.kr'),
      openGraph: {
        title: '실제 고객사례로 알아보는 AI 특허리서치 실무 활용 웨비나',
        description: '2026년 2월 6일(금) 오후 2시-3시 30분, 온라인 LIVE | 무료 참가 | IP팀·특허사무소·R&D팀의 키워트 인사이트 활용 방식을 실제 고객사례를 통해 알아보세요.',
        type: 'website',
        url: 'https://eventflow.kr/event/149403',
        siteName: 'keywert Insight',
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: 'AI 특허리서치 실무 활용 웨비나',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: '실제 고객사례로 알아보는 AI 특허리서치 실무 활용 웨비나',
        description: '2026년 2월 6일(금) 오후 2시-3시 30분, 온라인 LIVE | 무료 참가',
        images: [thumbnailUrl],
      },
      alternates: {
        canonical: 'https://eventflow.kr/event/149403',
      },
    }
  }
  
  // 426307 페이지에 대한 메타데이터
  if (publicPath === '/426307' || publicPath === '426307') {
    const thumbnailUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/onepredict/fb0be79a9dfc8.jpg'
    return {
      title: '산업 AI의 미래: 가동 효율 극대화 전략 | 원프레딕트 웨비나',
      description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개',
      keywords: '원프레딕트, GuardiOne, 산업 AI, 설비 관리, 디지털 트랜스포메이션, 예지보전, 웨비나',
      metadataBase: new URL('https://eventflow.kr'),
      openGraph: {
        title: '산업 AI의 미래: 가동 효율 극대화 전략',
        description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개',
        type: 'website',
        url: 'https://eventflow.kr/event/426307',
        siteName: '원프레딕트 웨비나',
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: '원프레딕트 웨비나',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: '산업 AI의 미래: 가동 효율 극대화 전략',
        description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개',
        images: [thumbnailUrl],
      },
      alternates: {
        canonical: 'https://eventflow.kr/event/426307',
      },
    }
  }
  
  return {}
}

/**
 * 이벤트 공개 페이지 catch-all 라우트 (설문조사 + 등록 페이지)
 * 
 * URL 구조:
 * - /event/{public_path} -> 시작 페이지
 * - /event/{public_path}/survey -> 설문 페이지 (type='survey')
 * - /event/{public_path}/register -> 등록 페이지 (type='registration')
 * - /event/{public_path}/done -> 완료 페이지
 * - /event/{public_path}/display -> 디스플레이 페이지
 */
export default async function SurveyPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { path } = await params
  const searchParamsData = searchParams ? await searchParams : {}
  
  // UTM 파라미터 추출 (서버 사이드)
  const utmParams = extractUTMParams(searchParamsData)
  
  // 경로가 없으면 404
  if (!path || path.length === 0) {
    notFound()
  }
  
  // public_path 구성
  // 예: /event/test/survey -> public_path = /test, subPath = survey
  // 예: /event/test -> public_path = /test, subPath = null
  // 예: /event/2025/triz/triz_1211_booth/survey -> public_path = /2025/triz/triz_1211_booth, subPath = survey
  
  // dashboard 경로 처리: /event/{public_path}/dashboard/{code}
  // 예: /event/345870/dashboard/PLZXW5 -> /event/dashboard/PLZXW5로 리다이렉트
  if (path.length >= 2 && path[path.length - 2] === 'dashboard') {
    const dashboardCode = path[path.length - 1]
    
    // dashboard 페이지로 리다이렉트
    return redirect(`/event/dashboard/${dashboardCode}`)
  }
  
  // 마지막 경로가 survey, register, done, display, enter, webinar 중 하나면 subPath로 처리
  const lastPath = path[path.length - 1]
  const isSubPath = ['survey', 'register', 'done', 'display', 'enter', 'webinar'].includes(lastPath)
  
  const subPath = isSubPath ? lastPath : null
  const publicPath = '/' + (isSubPath ? path.slice(0, -1) : path).join('/')
  
  
  const admin = createAdminSupabase()
  
  // 디버깅: public_path 확인
  console.log('[SurveyPublicPage] 경로 정보:', {
    path,
    subPath,
    publicPath,
    constructedPath: publicPath
  })
  
  // public_path로 캠페인 조회 (슬래시 포함/미포함 모두 시도)
  let campaign = null
  let campaignError: any = null
  
  // 먼저 슬래시 포함 경로로 시도
  console.log('[SurveyPublicPage] 슬래시 포함 경로로 조회:', publicPath)
  const { data: campaignWithSlash, error: errorWithSlash } = await admin
    .from('event_survey_campaigns')
    .select(`
      *,
      forms:form_id (
        id,
        title,
        kind,
        status
      )
    `)
    .eq('public_path', publicPath)
    .eq('status', 'published')
    .maybeSingle()
  
  console.log('[SurveyPublicPage] 슬래시 포함 조회 결과:', {
    found: !!campaignWithSlash,
    error: errorWithSlash,
    campaign: campaignWithSlash ? { id: campaignWithSlash.id, title: campaignWithSlash.title, public_path: campaignWithSlash.public_path, status: campaignWithSlash.status } : null
  })
  
  if (campaignWithSlash) {
    campaign = campaignWithSlash
  } else {
    // 슬래시 없이 저장된 경우를 대비해 슬래시 없는 경로로도 시도
    const publicPathWithoutSlash = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
    console.log('[SurveyPublicPage] 슬래시 없는 경로로 조회:', publicPathWithoutSlash)
    
    const { data: campaignWithoutSlash, error: errorWithoutSlash } = await admin
      .from('event_survey_campaigns')
      .select(`
        *,
        forms:form_id (
          id,
          title,
          kind,
          status
        )
      `)
      .eq('public_path', publicPathWithoutSlash)
      .eq('status', 'published')
      .maybeSingle()
    
  console.log('[SurveyPublicPage] 슬래시 없는 조회 결과:', JSON.stringify({
    found: !!campaignWithoutSlash,
    error: errorWithoutSlash ? { message: errorWithoutSlash.message, code: errorWithoutSlash.code, details: errorWithoutSlash.details } : null,
    campaign: campaignWithoutSlash ? { id: campaignWithoutSlash.id, title: campaignWithoutSlash.title, public_path: campaignWithoutSlash.public_path, status: campaignWithoutSlash.status } : null,
    searchedPath: publicPathWithoutSlash
  }, null, 2))
    
    if (campaignWithoutSlash) {
      campaign = campaignWithoutSlash
    }
    
    // 캠페인을 찾지 못한 경우, 상태 무관 조회 결과 사용
    if (!campaign) {
      // 상태 무관하게 조회해보기 (디버깅용)
      // 숫자만 있는 경우 짧은 링크와 충돌 가능성 확인
      const isNumericOnly = /^\d+$/.test(publicPathWithoutSlash)
      
      console.log('[SurveyPublicPage] 상태 무관 조회 시작:', {
        publicPath,
        publicPathWithoutSlash,
        isNumericOnly
      })
      
      // OR 쿼리 대신 각각 조회해보기
      const { data: campaignsWithSlash } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, status')
        .eq('public_path', publicPath)
        .limit(10)
      
      const { data: campaignsWithoutSlash } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, status')
        .eq('public_path', publicPathWithoutSlash)
        .limit(10)
      
      const allCampaigns = [
        ...(campaignsWithSlash || []),
        ...(campaignsWithoutSlash || [])
      ]
      
      // 중복 제거
      const uniqueCampaigns = Array.from(
        new Map(allCampaigns.map(c => [c.id, c])).values()
      )
      
      console.log('[SurveyPublicPage] 상태 무관 조회 결과:', JSON.stringify({
        found: uniqueCampaigns.length,
        campaigns: uniqueCampaigns.map(c => ({ 
          id: c.id, 
          title: c.title, 
          public_path: c.public_path, 
          status: c.status 
        })),
        searchedPaths: [publicPath, publicPathWithoutSlash],
        isNumericOnly,
        warning: isNumericOnly ? '6자리 숫자는 짧은 링크(/s/[code])와 충돌할 수 있습니다' : null
      }, null, 2))
      
      // 숫자만 있는 경우, 짧은 링크 테이블도 확인해보기
      if (isNumericOnly) {
        const { data: shortLink } = await admin
          .from('short_links')
          .select('code, webinar_id')
          .eq('code', publicPathWithoutSlash)
          .maybeSingle()
        
        if (shortLink) {
          console.log('[SurveyPublicPage] 짧은 링크 충돌 감지:', JSON.stringify({
            code: shortLink.code,
            webinar_id: shortLink.webinar_id,
            message: '이 코드는 짧은 링크로 사용 중입니다. 다른 public_path를 사용하세요.'
          }, null, 2))
        }
      }
      
      // 모든 캠페인 목록 조회 (디버깅용)
      const { data: allCampaignsDebug } = await admin
        .from('event_survey_campaigns')
        .select('id, title, public_path, status')
        .limit(20)
      
      console.log('[SurveyPublicPage] 최근 캠페인 목록 (디버깅용):', JSON.stringify({
        total: allCampaignsDebug?.length || 0,
        campaigns: allCampaignsDebug?.map(c => ({
          id: c.id,
          title: c.title,
          public_path: c.public_path,
          status: c.status
        }))
      }, null, 2))
      
      // 상태 무관 조회에서 캠페인을 찾았으면 사용 (draft 상태도 허용)
      if (uniqueCampaigns.length > 0) {
        const foundCampaignId = uniqueCampaigns[0].id
        // form_id를 포함해서 다시 조회
        const { data: fullCampaign } = await admin
          .from('event_survey_campaigns')
          .select(`*, forms:form_id (id, title, kind, status)`)
          .eq('id', foundCampaignId)
          .single()
        
        if (fullCampaign) {
          campaign = fullCampaign
          console.log('[SurveyPublicPage] 상태 무관 조회에서 캠페인 찾음 (draft 상태 허용):', {
            id: campaign.id,
            status: campaign.status,
            form_id: campaign.form_id
          })
        } else {
          campaign = uniqueCampaigns[0]
        }
      } else {
        campaignError = errorWithoutSlash || errorWithSlash || { message: 'Campaign not found' }
      }
    }
  }
  
  const campaignType = campaign?.type || 'survey' // 기본값은 'survey'
  
  // subPath에 따라 다른 페이지 렌더링
  if (!subPath) {
    // 149403은 WebinarFormWertPage를 보여줌 (캠페인 조회 실패해도 표시)
    if (publicPath === '/149403' || publicPath === '149403') {
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4da8da] mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <WebinarFormWertPage />
        </Suspense>
      )
    }
    
    // 426307은 /register로 리다이렉트
    if (publicPath === '/426307' || publicPath === '426307') {
      // UTM 파라미터가 있으면 함께 전달
      const utmQueryString = Object.keys(utmParams).length > 0
        ? '?' + new URLSearchParams(utmParams as Record<string, string>).toString()
        : ''
      return redirect(`/event/426307/register${utmQueryString}`)
    }
    
    // 445870는 WelcomePage를 보여주고, 345870만 설문 페이지로 리다이렉트
    if (publicPath === '/445870') {
      // WelcomePage 표시
      const headersList = await headers()
      const host = headersList.get('host') || 'localhost:3000'
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      const baseUrl = `${protocol}://${host}`
      
      const isDraft = campaign?.status === 'draft'
      
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <WelcomePage campaign={campaign} baseUrl={baseUrl} isDraft={isDraft} campaignType={campaignType} />
        </Suspense>
      )
    }
    
    // registration 타입인 경우 설문 페이지로 리다이렉트하지 않음
    if (campaignType === 'registration') {
      // 등록 페이지로 리다이렉트하지 않고 메인 페이지를 보여줌
      // 또는 WelcomePage를 보여줄 수도 있음
      const headersList = await headers()
      const host = headersList.get('host') || 'localhost:3000'
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      const baseUrl = `${protocol}://${host}`
      
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <WelcomePage campaign={campaign} baseUrl={baseUrl} isDraft={campaign.status === 'draft'} campaignType={campaignType} />
        </Suspense>
      )
    }
    
    // 캠페인을 찾지 못한 경우 404 (특정 경로는 제외)
    if (campaignError || !campaign) {
      const errorInfo = {
        publicPath,
        publicPathWithoutSlash: publicPath.startsWith('/') ? publicPath.slice(1) : publicPath,
        error: campaignError ? {
          message: campaignError.message,
          code: campaignError.code,
          details: campaignError.details,
          hint: campaignError.hint
        } : null,
        searchedPaths: [publicPath, publicPath.startsWith('/') ? publicPath.slice(1) : publicPath],
        pathArray: path
      }
      console.error('[SurveyPublicPage] 캠페인 조회 실패:', JSON.stringify(errorInfo, null, 2))
      notFound()
    }
    
    console.log('[SurveyPublicPage] 캠페인 조회 성공:', JSON.stringify({
      campaignId: campaign.id,
      title: campaign.title,
      public_path: campaign.public_path,
      status: campaign.status,
      type: campaign.type || 'survey'
    }, null, 2))
    
    // 345870는 설문 페이지로 바로 리다이렉트
    return redirect(`/event${publicPath}/survey`)
  } else if (subPath === 'survey') {
    // 설문 페이지
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <SurveyPage campaign={campaign} baseUrl={baseUrl} utmParams={utmParams} />
      </Suspense>
    )
  } else if (subPath === 'done') {
    // 완료 페이지
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <DonePageClient campaign={campaign} baseUrl={baseUrl} />
      </Suspense>
    )
  } else if (subPath === 'register') {
    // 426307의 등록 페이지는 OnePredictRegistrationPage를 사용 (웨비나 정보 직접 사용)
    if (publicPath === '/426307' || publicPath === '426307') {
      const headersList = await headers()
      const host = headersList.get('host') || 'localhost:3000'
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      const baseUrl = `${protocol}://${host}`
      
      // 웨비나 정보를 직접 사용 (캠페인 없이)
      // 웨비나 slug 426307 조회하여 웨비나 정보를 campaign처럼 전달
      let campaignData = null
      try {
        const { data: webinar } = await admin
          .from('webinars')
          .select('id, slug, title, description, client_id, agency_id')
          .eq('slug', '426307')
          .maybeSingle()
        
        if (webinar) {
          // 웨비나 정보를 campaign 형태로 변환
          campaignData = {
            id: webinar.id, // 웨비나 ID를 campaign ID로 사용
            title: webinar.title,
            description: webinar.description,
            client_id: webinar.client_id,
            agency_id: webinar.agency_id,
            public_path: '/426307',
            type: 'registration',
          }
          console.log('[SurveyPublicPage] 웨비나 426307 정보 사용:', webinar.id)
        }
      } catch (error) {
        console.error('[SurveyPublicPage] 웨비나 조회 오류:', error)
      }
      
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <OnePredictRegistrationPage campaign={campaignData} baseUrl={baseUrl} utmParams={utmParams} />
        </Suspense>
      )
    }
    
    // 등록 페이지 (type='registration'인 경우만)
    if (campaignType !== 'registration') {
      notFound()
    }
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <RegistrationPage campaign={campaign} baseUrl={baseUrl} utmParams={utmParams} />
      </Suspense>
    )
  } else if (subPath === 'enter') {
    // 426307의 입장 페이지는 OnePredictEnterPage를 사용
    if (publicPath === '/426307' || publicPath === '426307') {
      const headersList = await headers()
      const host = headersList.get('host') || 'localhost:3000'
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      const baseUrl = `${protocol}://${host}`
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <OnePredictEnterPage campaign={campaign} baseUrl={baseUrl} />
        </Suspense>
      )
    }
    notFound()
  } else if (subPath === 'webinar') {
    // 426307의 웨비나 라이브 페이지는 OnePredictWebinarLivePage를 사용
    if (publicPath === '/426307' || publicPath === '426307') {
      const headersList = await headers()
      const host = headersList.get('host') || 'localhost:3000'
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      const baseUrl = `${protocol}://${host}`
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <OnePredictWebinarLivePage campaign={campaign} baseUrl={baseUrl} />
        </Suspense>
      )
    }
    notFound()
  } else if (subPath === 'display') {
    // 디스플레이 페이지
    return <DisplayPage campaign={campaign} />
  } else {
    // 알 수 없는 경로
    notFound()
  }
}


// 디스플레이 페이지 컴포넌트 (임시)
function DisplayPage({ campaign }: { campaign: any }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8">{campaign.title}</h1>
        <div className="text-4xl mb-8">
          <div className="mb-4">QR 코드를 스캔하여</div>
          <div>설문조사에 참여하세요</div>
        </div>
        <div className="text-2xl text-gray-400">
          /event{campaign.public_path}
        </div>
      </div>
    </div>
  )
}

