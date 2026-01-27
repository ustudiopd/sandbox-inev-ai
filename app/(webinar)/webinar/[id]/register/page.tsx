import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from '@/lib/utils/webinar'
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
  
  // 426307 slug인 경우 메타데이터 설정
  if (id === '426307') {
    const thumbnailUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/onepredict/fb0be79a9dfc8.jpg'
    return {
      title: '산업 AI의 미래: 가동 효율 극대화 전략 | 원프레딕트 웨비나 등록',
      description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개 - 웨비나 등록',
      keywords: '원프레딕트, GuardiOne, 산업 AI, 설비 관리, 디지털 트랜스포메이션, 예지보전, 웨비나',
      metadataBase: new URL('https://eventflow.kr'),
      openGraph: {
        title: '산업 AI의 미래: 가동 효율 극대화 전략',
        description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개',
        type: 'website',
        url: 'https://eventflow.kr/webinar/426307/register',
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
        canonical: 'https://eventflow.kr/webinar/426307/register',
      },
    }
  }
  
  return {}
}

export default async function WebinarRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminSupabase()
  const query = getWebinarQuery(id)
  
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
        campaignData = webinar
      } else {
        // 웨비나가 없으면 등록 캠페인에서 데이터 가져오기
        const { data: campaign } = await admin
          .from('event_survey_campaigns')
          .select('id, title, description, client_id, agency_id, public_path, type')
          .eq('public_path', '/426307')
          .eq('type', 'registration')
          .maybeSingle()
        
        if (campaign) {
          campaignData = campaign
        }
      }
    } catch (error) {
      // 에러 발생 시에도 등록 캠페인에서 데이터 가져오기 시도
      console.log('[WebinarRegisterPage] 웨비나 조회 에러:', error)
      const { data: campaign } = await admin
        .from('event_survey_campaigns')
        .select('id, title, description, client_id, agency_id, public_path, type')
        .eq('public_path', '/426307')
        .eq('type', 'registration')
        .maybeSingle()
      
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
        <OnePredictRegistrationPage campaign={campaignData} baseUrl={baseUrl} />
      </Suspense>
    )
  }
  
  // 426307이 아니면 404
  notFound()
}
