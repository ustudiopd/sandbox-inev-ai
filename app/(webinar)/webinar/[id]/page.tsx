import { redirect, notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getWebinarQuery } from '@/lib/utils/webinar'
import WebinarEntry from './components/WebinarEntry'

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
      .select('id, slug, title, description, youtube_url, start_time, end_time, access_policy, client_id, is_public, registration_campaign_id, email_template_text, email_thumbnail_url')
    
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
    
    // 149404, 149405 slug인 경우 등록 캠페인에서 데이터 가져오기
    const is149404 = query.column === 'slug' && query.value === '149404'
    const is149405 = query.column === 'slug' && query.value === '149405'
    const isWertSlug = is149404 || is149405
    
    const { data: webinar, error } = await queryBuilder.single()
    
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
        is149404: is149404,
        is149405: is149405,
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
        is149404: is149404 || false,
      }
      
      // 실제 에러 속성 확인 및 추가
      const hasErrorProperties = 
        (error.code !== undefined && error.code !== null) ||
        (error.message !== undefined && error.message !== null) ||
        (error.details !== undefined && error.details !== null) ||
        (error.hint !== undefined && error.hint !== null)
      
      // 149404, 149405이고 PGRST116 에러인 경우는 등록 캠페인에서 데이터 가져오기
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
          is149404: is149404 || false,
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
        // 149404, 149405는 등록 캠페인에서 데이터 가져오기 (아래에서 처리)
      } else {
        // 기타 에러는 서버 오류로 처리
        console.error('[WebinarPage][server] 서버 오류 발생 → 메인으로 리다이렉트')
        redirect('/')
      }
    }
    
    // 데이터 없음 체크: 149402, 149404, 149405는 등록 캠페인에서 데이터 가져오기
    let finalWebinar = webinar
    if (!webinar && isWertSlug) {
      // 149402는 /149402 등록 캠페인에서, 149404는 /149403 등록 캠페인에서, 149405는 /149405 등록 캠페인에서 데이터 가져오기
      const is149402 = String(id) === '149402' || id === '149402'
      const campaignPath = is149402 ? '/149402' : is149404 ? '/149403' : '/149405'
      const slugValue = is149402 ? '149402' : is149404 ? '149404' : '149405'
      console.log(`[WebinarPage][server] ${slugValue} 웨비나가 없음 - ${campaignPath} 등록 캠페인에서 데이터 가져오기`)
      
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, title, client_id, agency_id, public_path, type')
        .eq('public_path', campaignPath)
        .eq('type', 'registration')
        .maybeSingle()
      
      if (campaignError || !campaign) {
        console.error(`[WebinarPage][server] ${campaignPath} 등록 캠페인 조회 실패:`, campaignError)
        notFound()
      }
      
      // 등록 캠페인 정보로 웨비나 데이터 구성
      finalWebinar = {
        id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
        slug: slugValue,
        title: campaign.title || '웨비나',
        description: '',
        youtube_url: '',
        start_time: '2026-02-06T14:00:00Z',
        end_time: '2026-02-06T15:30:00Z',
        access_policy: 'name_email_auth',
        client_id: campaign.client_id,
        agency_id: campaign.agency_id,
        registration_campaign_id: campaign.id,
        is_public: true,
        email_template_text: null,
        email_thumbnail_url: null,
      } as any
      
      if (finalWebinar) {
        console.log('[WebinarPage][server] 등록 캠페인에서 웨비나 데이터 구성 완료:', {
          slug: finalWebinar.slug,
          title: finalWebinar.title,
          registration_campaign_id: finalWebinar.registration_campaign_id,
        })
      }
    } else if (!webinar) {
      console.error('[WebinarPage][server] 웨비나 조회 실패 (데이터 없음):', {
        id,
        queryColumn: query.column,
        queryValue: query.value,
        message: `웨비나를 찾을 수 없습니다. ${query.column}="${query.value}"로 조회했지만 결과가 없습니다.`
      })
      notFound()
    }
    
    // finalWebinar가 null인 경우는 이미 notFound()로 처리되었으므로 타입 가드
    if (!finalWebinar) {
      notFound()
    }
    
    // 디버깅: 쿼리 결과 상세 로깅
    console.log('[WebinarPage][server] 웨비나 조회 성공:', {
      id: finalWebinar.id,
      slug: finalWebinar.slug,
      title: finalWebinar.title,
      is_public: finalWebinar.is_public,
      access_policy: finalWebinar.access_policy,
      registration_campaign_id: finalWebinar.registration_campaign_id,
      client_id: finalWebinar.client_id,
      isTemporaryUUID: finalWebinar.id === '00000000-0000-0000-0000-000000000000',
      source: finalWebinar.id === '00000000-0000-0000-0000-000000000000' ? '등록 캠페인에서 생성' : 'webinars 테이블에서 조회',
    })
    
    // 클라이언트 정보는 별도로 조회 (관계 쿼리 문제 방지)
    let clientData = null
    if (finalWebinar.client_id) {
      const { data: client, error: clientError } = await admin
        .from('clients')
        .select('id, name, logo_url, brand_config')
        .eq('id', finalWebinar.client_id)
        .single()
      
      if (clientError) {
        const clientErrorInfo = serializeSupabaseError(clientError)
        console.warn('[WebinarPage][server] 클라이언트 정보 조회 실패:', clientErrorInfo)
        // 클라이언트 정보는 선택적이므로 계속 진행
      } else {
        clientData = client
      }
    }
    
    // 등록 페이지 캠페인 정보 조회 (registration_campaign_id가 있는 경우 또는 WERT slug인 경우)
    let registrationCampaignData = null
    if (finalWebinar.registration_campaign_id) {
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, public_path, title, client_id, agency_id')
        .eq('id', finalWebinar.registration_campaign_id)
        .maybeSingle()
      
      if (campaignError) {
        console.warn('[WebinarPage][server] 등록 페이지 캠페인 조회 실패:', campaignError)
      } else if (campaign) {
        registrationCampaignData = campaign
      }
    } else if (isWertSlug) {
      // 149402, 149404, 149405인데 registration_campaign_id가 없으면 등록 캠페인 조회
      const is149402 = String(finalWebinar.slug) === '149402' || finalWebinar.slug === 149402
      const is149404 = String(finalWebinar.slug) === '149404' || finalWebinar.slug === 149404
      const is149405 = String(finalWebinar.slug) === '149405' || finalWebinar.slug === 149405
      const campaignPath = is149402 ? '/149402' : is149404 ? '/149403' : '/149405'
      const { data: campaign, error: campaignError } = await admin
        .from('event_survey_campaigns')
        .select('id, public_path, title, client_id, agency_id')
        .eq('public_path', campaignPath)
        .eq('type', 'registration')
        .maybeSingle()
      
      if (!campaignError && campaign) {
        registrationCampaignData = campaign
        // 웨비나에 registration_campaign_id 설정 (다음 조회를 위해)
        finalWebinar.registration_campaign_id = campaign.id
      }
    }
    
    // 클라이언트 정보 및 등록 페이지 캠페인 정보 추가
    const webinarData = {
      ...finalWebinar,
      clients: clientData || undefined, // null을 undefined로 변환
      registration_campaign: registrationCampaignData || undefined,
    }
    
    // 결정 포인트 A: 6자리 slug는 식별자일 뿐, 접근 정책은 별개
    // Admin Supabase로 조회했으므로 RLS 우회됨
    // 실제 접근 제어는 WebinarEntry 컴포넌트에서 access_policy에 따라 처리
    
    // 서버 사이드에서 WERT 페이지 여부 확인하여 SSR/CSR 일치 보장
    const isWertPage = String(webinarData.slug) === '149402' || webinarData.slug === 149402 || String(webinarData.slug) === '149404' || webinarData.slug === 149404 || String(webinarData.slug) === '149405' || webinarData.slug === 149405 || !!webinarData.registration_campaign_id
    
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
