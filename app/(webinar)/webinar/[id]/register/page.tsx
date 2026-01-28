import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from '@/lib/utils/webinar'
import { extractUTMParams } from '@/lib/utils/utm'
import OnePredictRegistrationPage from '@/app/event/[...path]/components/OnePredictRegistrationPage'
import type { Metadata } from 'next'

/**
 * 메타데이터 생성 함수
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminSupabase()
  
  try {
    // UUID 또는 slug로 웨비나 조회
    const query = getWebinarQuery(id)
    
    let queryBuilder = admin
      .from('webinars')
      .select('id, slug, title, description, meta_title, meta_description, meta_thumbnail_url, email_thumbnail_url')
    
    if (query.column === 'slug') {
      queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: webinar } = await queryBuilder.maybeSingle()
    
    if (webinar) {
      // 메타데이터 우선순위: meta_title/meta_description > title/description
      const metaTitle = webinar.meta_title || webinar.title || '웨비나'
      const metaDescription = webinar.meta_description || webinar.description || 'EventFlow 웨비나에 참여하세요'
      // 썸네일 우선순위: meta_thumbnail_url > email_thumbnail_url > 기본 이미지
      const thumbnailUrl = webinar.meta_thumbnail_url || webinar.email_thumbnail_url || 'https://eventflow.kr/og-image.png'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
      const webinarPath = webinar.slug || webinar.id
      const canonicalUrl = `${appUrl}/webinar/${webinarPath}/register`
      
      return {
        title: `${metaTitle} | EventFlow 웨비나 등록`,
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
    
    // 426307 slug인 경우 fallback 메타데이터 설정 (웨비나가 DB에 없을 때)
    if (id === '426307') {
      const thumbnailUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/onepredict/thumb4.png'
      return {
        title: '[원프레딕트] 2월 웨비나 | EventFlow 웨비나 등록',
        description: 'AI가 움직이는 공장: AI native factory I - AI Ready Data',
        keywords: '원프레딕트, GuardiOne, 산업 AI, 설비 관리, 디지털 트랜스포메이션, 예지보전, 웨비나',
        metadataBase: new URL('https://eventflow.kr'),
        openGraph: {
          title: '[원프레딕트] 2월 웨비나',
          description: 'AI가 움직이는 공장: AI native factory I - AI Ready Data',
          type: 'website',
          url: 'https://eventflow.kr/webinar/426307/register',
          siteName: '원프레딕트 웨비나',
          images: [
            {
              url: thumbnailUrl,
              width: 1200,
              height: 630,
              alt: '[원프레딕트] 2월 웨비나',
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: '[원프레딕트] 2월 웨비나',
          description: 'AI가 움직이는 공장: AI native factory I - AI Ready Data',
          images: [thumbnailUrl],
        },
        alternates: {
          canonical: 'https://eventflow.kr/webinar/426307/register',
        },
      }
    }
  } catch (error) {
    console.error('[generateMetadata] 웨비나 메타데이터 조회 오류:', error)
  }
  
  return {}
}

export default async function WebinarRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const searchParamsData = await searchParams
  const admin = createAdminSupabase()
  const query = getWebinarQuery(id)
  
  // UTM 파라미터 추출
  const utmParams = extractUTMParams(searchParamsData)
  
  // 426307 slug인 경우 OnePredictRegistrationPage를 표시
  const is426307 = query.column === 'slug' && String(query.value) === '426307'
  
  if (is426307) {
    console.log('[WebinarRegisterPage] 426307 slug 감지 → OnePredictRegistrationPage 표시')
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    
    // 웨비나 데이터 조회 시도 (없어도 페이지는 표시)
    let campaignData = null
    
    try {
      let queryBuilder = admin
        .from('webinars')
        .select('*')
      
      if (query.column === 'slug') {
        queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
      } else {
        queryBuilder = queryBuilder.eq(query.column, query.value)
      }
      
      const { data: webinar, error: webinarError } = await queryBuilder.maybeSingle()
      
      // 웨비나가 있으면 사용
      if (webinar && !webinarError) {
        // registration_campaign_id가 있으면 해당 캠페인 조회
        if (webinar.registration_campaign_id) {
          const { data: campaign } = await admin
            .from('event_survey_campaigns')
            .select('id, title, description, client_id, agency_id, public_path, type')
            .eq('id', webinar.registration_campaign_id)
            .maybeSingle()
          
          if (campaign) {
            campaignData = campaign
            console.log('[WebinarRegisterPage] 웨비나의 registration_campaign_id로 캠페인 찾음:', campaign.id)
          } else {
            // 캠페인을 찾지 못하면 웨비나 데이터 사용
            campaignData = webinar
            console.log('[WebinarRegisterPage] registration_campaign_id 캠페인을 찾지 못함, 웨비나 데이터 사용')
          }
        } else {
          // registration_campaign_id가 없으면 웨비나 데이터 사용
          campaignData = webinar
        }
      } else {
        // 웨비나가 없으면 등록 캠페인에서 데이터 가져오기
        // /426307 경로를 찾지 못하면 /149403 경로의 캠페인 사용 (동일한 웨비나)
        let campaign = null
        
        // 먼저 /426307 경로의 캠페인 찾기
        const { data: campaign426307 } = await admin
          .from('event_survey_campaigns')
          .select('id, title, description, client_id, agency_id, public_path, type')
          .eq('public_path', '/426307')
          .eq('type', 'registration')
          .maybeSingle()
        
        if (campaign426307) {
          campaign = campaign426307
          console.log('[WebinarRegisterPage] /426307 캠페인 찾음:', campaign426307.id)
        } else {
          // /426307이 없으면 /149403 경로의 캠페인 사용
          const { data: campaign149403 } = await admin
            .from('event_survey_campaigns')
            .select('id, title, description, client_id, agency_id, public_path, type')
            .eq('public_path', '/149403')
            .eq('type', 'registration')
            .maybeSingle()
          
          if (campaign149403) {
            campaign = campaign149403
            console.log('[WebinarRegisterPage] /149403 캠페인 찾음 (fallback):', campaign149403.id)
          } else {
            console.warn('[WebinarRegisterPage] 등록 캠페인을 찾을 수 없음 (/426307, /149403 모두 없음)')
          }
        }
        
        if (campaign) {
          campaignData = campaign
        }
      }
    } catch (error) {
      // 에러 발생 시에도 등록 캠페인에서 데이터 가져오기 시도
      console.log('[WebinarRegisterPage] 웨비나 조회 에러:', error)
      let campaign = null
      
      // 먼저 /426307 경로의 캠페인 찾기
      const { data: campaign426307 } = await admin
        .from('event_survey_campaigns')
        .select('id, title, description, client_id, agency_id, public_path, type')
        .eq('public_path', '/426307')
        .eq('type', 'registration')
        .maybeSingle()
      
      if (campaign426307) {
        campaign = campaign426307
        console.log('[WebinarRegisterPage] 에러 처리 중 /426307 캠페인 찾음:', campaign426307.id)
      } else {
        // /426307이 없으면 /149403 경로의 캠페인 사용
        const { data: campaign149403 } = await admin
          .from('event_survey_campaigns')
          .select('id, title, description, client_id, agency_id, public_path, type')
          .eq('public_path', '/149403')
          .eq('type', 'registration')
          .maybeSingle()
        
        if (campaign149403) {
          campaign = campaign149403
          console.log('[WebinarRegisterPage] 에러 처리 중 /149403 캠페인 찾음 (fallback):', campaign149403.id)
        } else {
          console.warn('[WebinarRegisterPage] 에러 처리 중 등록 캠페인을 찾을 수 없음 (/426307, /149403 모두 없음)')
        }
      }
      
      if (campaign) {
        campaignData = campaign
      }
    }
    
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2936E7] mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <OnePredictRegistrationPage campaign={campaignData} baseUrl={baseUrl} utmParams={utmParams} />
      </Suspense>
    )
  }
  
  // 426307이 아니면 404
  notFound()
}
