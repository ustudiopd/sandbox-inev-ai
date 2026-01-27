import { redirect, notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from '@/lib/utils/webinar'
import WebinarEntry from './components/WebinarEntry'
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
      title: '산업 AI의 미래: 가동 효율 극대화 전략 | 원프레딕트 웨비나',
      description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개',
      keywords: '원프레딕트, GuardiOne, 산업 AI, 설비 관리, 디지털 트랜스포메이션, 예지보전, 웨비나',
      metadataBase: new URL('https://eventflow.kr'),
      openGraph: {
        title: '산업 AI의 미래: 가동 효율 극대화 전략',
        description: '원프레딕트 GuardiOne® 기반 설비 관리 혁신 및 DX 성공 전략 공개',
        type: 'website',
        url: 'https://eventflow.kr/webinar/426307',
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
        canonical: 'https://eventflow.kr/webinar/426307',
      },
    }
  }
  
  return {}
}

/**
 * Supabase 에러 객체를 구조화된 형태로 변환
 * non-enumerable 속성도 포함하여 직렬화 가능하게 만듦
 */
function serializeSupabaseError(error: any): {
  code?: string
  message?: string
  details?: string
  hint?: string
  status?: number
  name?: string
  stack?: string
} {
  if (!error) return {}
  
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    status: error.status,
    name: error.name,
    stack: error.stack,
  }
}

export default async function WebinarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminSupabase()
  
  // Next.js 동적 라우트는 자동으로 URL 디코딩하므로, id는 이미 디코딩된 상태
  // UUID 또는 slug로 웨비나 조회
  const query = getWebinarQuery(id)
  
  // 서버 사이드 로그 (터미널에 출력됨)
  console.log('[WebinarPage][server] 조회 시작:', {
    id,
    queryColumn: query.column,
    queryValue: query.value,
    isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  })
  
  try {
    // 웨비나 정보 조회
    // Admin Supabase (Service Role Key)를 사용하여 RLS 우회
    // 결정 포인트 A: 6자리 slug는 식별자일 뿐, 접근 정책은 별개
    // 따라서 Admin으로 조회하되, 노출 필드는 최소화 (보안 고려)
    // email_thumbnail_url은 마이그레이션 054에서 추가되므로 선택적으로 처리
    let queryBuilder = admin
      .from('webinars')
      .select('id, slug, title, description, youtube_url, start_time, end_time, webinar_start_time, access_policy, client_id, is_public, registration_campaign_id, email_template_text, email_thumbnail_url')
    
    if (query.column === 'slug') {
      // slug는 문자열로 비교
      const slugValue = String(query.value)
      console.log('[WebinarPage][server] slug 조회 시도:', { 
        slugValue, 
        originalValue: query.value, 
        type: typeof query.value 
      })
      queryBuilder = queryBuilder.eq('slug', slugValue)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    // 149402 또는 426307 slug인 경우 등록 캠페인에서 데이터 가져오기
    const is149402 = query.column === 'slug' && query.value === '149402'
    const is426307 = query.column === 'slug' && String(query.value) === '426307'
    const isWertSlug = is149402 || is426307
    
    // 426307은 등록 페이지로 리다이렉트 (당분간 숨김 처리)
    if (is426307) {
      console.log('[WebinarPage] 426307 slug 감지 → 등록 페이지로 리다이렉트')
      redirect('/webinar/426307/register')
    }
    
    // 아래 코드는 사용하지 않지만 참고용으로 남겨둠 (주석 처리)
    /*
    if (is426307) {
      console.log('[WebinarPage] 426307 slug 감지 → OnePredictWebinarPage 표시')
      const { headers } = await import('next/headers')
      const headersList = await headers()
      const host = headersList.get('host') || 'localhost:3000'
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      const baseUrl = `${protocol}://${host}`
      
      // 웨비나 데이터 조회 시도
      let webinarData = null
      try {
        const { data: webinar, error: webinarError } = await queryBuilder.single()
        
        if (webinar && !webinarError) {
          // 웨비나가 데이터베이스에 존재하는 경우
          console.log('[WebinarPage] 웨비나 데이터베이스에서 조회 성공:', webinar.id)
          webinarData = webinar
        } else {
          // 웨비나가 없으면 등록 캠페인에서 데이터 가져오기
          console.log('[WebinarPage] 웨비나가 없음 - 등록 캠페인에서 데이터 가져오기')
          const { data: campaign } = await admin
            .from('event_survey_campaigns')
            .select('id, title, description, client_id, agency_id, public_path, type')
            .eq('public_path', '/426307')
            .eq('type', 'registration')
            .maybeSingle()
          
          if (campaign) {
            webinarData = {
              id: '00000000-0000-0000-0000-000000000000',
              slug: '426307',
              title: campaign.title || '웨비나',
              description: campaign.description || '',
              youtube_url: '',
              start_time: null,
              end_time: null,
              access_policy: 'name_email_auth',
              client_id: campaign.client_id,
              is_public: true,
              registration_campaign_id: campaign.id,
            }
            console.log('[WebinarPage] 등록 캠페인에서 데이터 가져옴')
          }
        }
      } catch (error) {
        // 에러 발생 시에도 등록 캠페인에서 데이터 가져오기 시도
        console.log('[WebinarPage] 웨비나 조회 에러 - 등록 캠페인에서 데이터 가져오기:', error)
        const { data: campaign } = await admin
          .from('event_survey_campaigns')
          .select('id, title, description, client_id, agency_id, public_path, type')
          .eq('public_path', '/426307')
          .eq('type', 'registration')
          .maybeSingle()
        
        if (campaign) {
          webinarData = {
            id: '00000000-0000-0000-0000-000000000000',
            slug: '426307',
            title: campaign.title || '웨비나',
            description: campaign.description || '',
            youtube_url: '',
            start_time: null,
            end_time: null,
            access_policy: 'name_email_auth',
            client_id: campaign.client_id,
            is_public: true,
            registration_campaign_id: campaign.id,
          }
        }
      }
      
      // 웨비나 데이터가 없어도 페이지는 표시 (campaign이 null일 수 있음)
      const { default: OnePredictWebinarPage } = await import('@/app/event/[...path]/components/OnePredictWebinarPage')
      const { Suspense } = await import('react')
      
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2936E7] mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        }>
          <OnePredictWebinarPage campaign={webinarData} baseUrl={baseUrl} />
        </Suspense>
      )
    }
    */
    
    let { data: webinar, error } = await queryBuilder.single()
    
    // 디버깅: 웨비나 조회 결과 확인
    if (webinar) {
      console.log('[WebinarPage][server] webinars 테이블에서 웨비나 조회 성공:', {
        id: webinar.id,
        slug: webinar.slug,
        title: webinar.title,
        source: 'webinars 테이블',
      })
    } else if (error) {
      console.log('[WebinarPage][server] webinars 테이블 조회 결과:', {
        errorCode: error.code,
        errorMessage: error.message,
        willUseCampaign: isWertSlug,
      })
    }
    
    // 에러 처리: 구조화된 에러 정보 로깅
    if (error) {
      // 에러 정보 구조화 (순환 참조 방지)
      const errorInfo: any = {
        id: id || 'undefined',
        queryColumn: query.column || 'undefined',
        queryValue: query.value || 'undefined',
      }
      
      // 실제 에러 속성 확인 및 추가
      const hasErrorProperties = 
        (error.code !== undefined && error.code !== null) ||
        (error.message !== undefined && error.message !== null) ||
        (error.details !== undefined && error.details !== null) ||
        (error.hint !== undefined && error.hint !== null)
      
      // 149402 또는 426307이고 PGRST116 에러인 경우는 등록 캠페인에서 데이터 가져오기
      const isExpectedError = isWertSlug && (error?.code === 'PGRST116' || error?.message?.includes('No rows') || error?.message?.includes('0 rows'))
      
      if (hasErrorProperties) {
        if (error.code !== undefined && error.code !== null) errorInfo.errorCode = String(error.code)
        if (error.message !== undefined && error.message !== null) errorInfo.errorMessage = String(error.message)
        if (error.details !== undefined && error.details !== null) errorInfo.errorDetails = String(error.details)
        if (error.hint !== undefined && error.hint !== null) errorInfo.errorHint = String(error.hint)
        if ((error as any).status !== undefined && (error as any).status !== null) errorInfo.errorStatus = Number((error as any).status)
        if (error.name !== undefined && error.name !== null) errorInfo.errorName = String(error.name)
        
        // 예상된 에러는 경고로, 그 외는 에러로 로깅
        if (isExpectedError) {
          console.log('[WebinarPage][server] WERT 웨비나 조회 실패 - 등록 캠페인에서 데이터 가져오기:', {
            id,
            queryColumn: query.column,
            queryValue: query.value,
          })
        } else {
          console.error('[WebinarPage][server] 웨비나 조회 실패 - 상세 정보:', JSON.stringify(errorInfo, null, 2))
        }
      } else {
        // 에러 객체가 있지만 속성이 없는 경우
        const errorKeys = error ? Object.keys(error) : []
        const errorString = error ? String(error) : 'null'
        
        console.warn('[WebinarPage][server] 웨비나 조회 실패 - 에러 객체는 있지만 상세 정보 없음:', {
          id: id || 'undefined',
          queryColumn: query.column || 'undefined',
          queryValue: query.value || 'undefined',
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          errorKeys,
          errorString,
          errorExists: !!error,
        })
      }
      
      // PGRST116: 결과가 0행 (웨비나 없음)
      if (error?.code === 'PGRST116' || error?.message?.includes('No rows') || error?.message?.includes('0 rows')) {
        if (!isWertSlug) {
          console.log('[WebinarPage][server] 웨비나를 찾을 수 없음 → 404')
          notFound()
        }
        // 149402는 등록 캠페인에서 데이터 가져오기 (아래에서 처리)
      } else {
        // 기타 에러는 서버 오류로 처리
        console.error('[WebinarPage][server] 서버 오류 발생 → 메인으로 리다이렉트')
        redirect('/')
      }
    }
    
    // 데이터 없음 체크 - 426307 또는 149402인 경우 등록 캠페인에서 데이터 가져오기
    if (!webinar) {
      if (isWertSlug) {
        // 426307 또는 149402는 등록 캠페인에서 데이터 가져오기
        const campaignPath = is426307 ? '/426307' : '/149403'
        const slugValue = is426307 ? '426307' : '149402'
        console.log(`[WebinarPage] ${slugValue} 웨비나가 없음 - ${campaignPath} 등록 캠페인에서 데이터 가져오기`)
        
        // 등록 캠페인 조회
        const { data: campaign, error: campaignError } = await admin
          .from('event_survey_campaigns')
          .select('id, title, description, client_id, agency_id, public_path, type')
          .eq('public_path', campaignPath)
          .eq('type', 'registration')
          .maybeSingle()
        
        if (campaignError || !campaign) {
          console.error(`[WebinarPage] ${campaignPath} 등록 캠페인 조회 실패:`, campaignError)
          notFound()
        }
        
        // 등록 캠페인 정보로 웨비나 데이터 구성
        const webinarFromCampaign = {
          id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
          slug: slugValue,
          title: campaign.title || '웨비나',
          description: campaign.description || '',
          youtube_url: '',
          start_time: null,
          end_time: null,
          webinar_start_time: null,
          access_policy: 'name_email_auth',
          client_id: campaign.client_id,
          is_public: true,
          registration_campaign_id: campaign.id,
          email_template_text: null,
          email_thumbnail_url: null,
        } as any
        
        console.log('[WebinarPage] 등록 캠페인에서 웨비나 데이터 구성 완료')
        
        // webinar 변수를 등록 캠페인에서 가져온 데이터로 설정
        webinar = webinarFromCampaign
        error = null // 에러 초기화
        
        // 나머지 코드는 아래에서 계속 실행됨
      } else {
        console.error('[WebinarPage][server] 웨비나 조회 실패 (데이터 없음):', {
          id,
          queryColumn: query.column,
          queryValue: query.value,
          message: `웨비나를 찾을 수 없습니다. ${query.column}="${query.value}"로 조회했지만 결과가 없습니다.`
        })
        notFound()
      }
    }
    
    // 디버깅: 쿼리 결과 상세 로깅
    if (webinar) {
      console.log('[WebinarPage][server] 웨비나 조회 성공:', {
        id: webinar.id,
        slug: webinar.slug,
        title: webinar.title,
        is_public: webinar.is_public,
        access_policy: webinar.access_policy,
        registration_campaign_id: webinar.registration_campaign_id,
        client_id: webinar.client_id,
        source: 'webinars 테이블에서 조회',
      })
    }
    
    // 클라이언트 정보는 별도로 조회 (관계 쿼리 문제 방지)
    let clientData = null
    if (webinar && webinar.client_id) {
      const { data: client, error: clientError } = await admin
        .from('clients')
        .select('id, name, logo_url, brand_config')
        .eq('id', webinar.client_id)
        .single()
      
      if (clientError) {
        const clientErrorInfo = serializeSupabaseError(clientError)
        console.warn('[WebinarPage][server] 클라이언트 정보 조회 실패:', clientErrorInfo)
        // 클라이언트 정보는 선택적이므로 계속 진행
      } else {
        clientData = client
      }
    }
    
    // webinar가 null이면 404
    if (!webinar) {
      notFound()
    }
    
    // 등록 페이지 캠페인 정보 조회 (registration_campaign_id가 있는 경우)
    let registrationCampaignData = null
    if (webinar.registration_campaign_id) {
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, public_path, title, client_id, agency_id')
        .eq('id', webinar.registration_campaign_id)
        .maybeSingle()
      
      if (campaignError) {
        console.warn('[WebinarPage][server] 등록 페이지 캠페인 조회 실패:', campaignError)
      } else if (campaign) {
        registrationCampaignData = campaign
      }
    }
    
    // 클라이언트 정보 및 등록 페이지 캠페인 정보 추가
    const webinarData = {
      ...webinar,
      clients: clientData || undefined, // null을 undefined로 변환
      registration_campaign: registrationCampaignData || undefined,
    }
    
    // 결정 포인트 A: 6자리 slug는 식별자일 뿐, 접근 정책은 별개
    // Admin Supabase로 조회했으므로 RLS 우회됨
    // 실제 접근 제어는 WebinarEntry 컴포넌트에서 access_policy에 따라 처리
    
    // 서버 사이드에서 WERT 페이지 여부 확인하여 SSR/CSR 일치 보장
    const isWertPage = String(webinarData.slug) === '149402' || String(webinarData.slug) === '426307' || !!webinarData.registration_campaign_id
    
    return <WebinarEntry webinar={webinarData} isWertPage={isWertPage} />
  } catch (catchError: any) {
    // Next.js의 redirect()/notFound()는 내부적으로 예외를 던짐
    // 이 예외는 재던지기하여 정상 동작하도록 함
    if (catchError && typeof catchError === 'object') {
      // Next.js 특수 에러인지 확인
      const errorMessage = String(catchError.message || catchError)
      if (errorMessage.includes('NEXT_REDIRECT') || errorMessage.includes('NEXT_NOT_FOUND')) {
        // Next.js 리다이렉트/404 예외는 재던지기
        throw catchError
      }
    }
    
    // 일반 예외는 로깅 후 리다이렉트
    const errorInfo = serializeSupabaseError(catchError)
    console.error('[WebinarPage][server] 웨비나 조회 중 예외 발생:', {
      id,
      queryColumn: query.column,
      queryValue: query.value,
      ...errorInfo,
      errorType: typeof catchError,
      errorConstructor: catchError?.constructor?.name,
    })
    
    // 개발 환경에서는 더 자세한 정보 제공 (순환 참조 방지)
    if (process.env.NODE_ENV === 'development') {
      const devErrorInfo: any = {}
      if (catchError?.code) devErrorInfo.code = catchError.code
      if (catchError?.message) devErrorInfo.message = catchError.message
      if (catchError?.details) devErrorInfo.details = catchError.details
      if (catchError?.hint) devErrorInfo.hint = catchError.hint
      if (catchError?.status) devErrorInfo.status = catchError.status
      if (catchError?.name) devErrorInfo.name = catchError.name
      if (catchError?.stack) devErrorInfo.stack = catchError.stack
      
      if (Object.keys(devErrorInfo).length > 0) {
        console.error('[WebinarPage][server] 개발 환경 에러 상세:', devErrorInfo)
      }
    }
    
    redirect('/')
  }
}
