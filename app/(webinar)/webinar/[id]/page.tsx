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
      .select('id, slug, title, description, youtube_url, start_time, end_time, access_policy, client_id, is_public')
    
    if (query.column === 'slug') {
      // slug는 문자열로 비교
      const slugValue = String(query.value)
      console.log('[WebinarPage][server] slug 조회 시도:', { 
        slugValue, 
        originalValue: query.value, 
        type: typeof query.value 
      })
      queryBuilder = queryBuilder.eq('slug', slugValue).not('slug', 'is', null)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: webinar, error } = await queryBuilder.single()
    
    // 에러 처리: 구조화된 에러 정보 로깅
    if (error) {
      const errorInfo = serializeSupabaseError(error)
      console.error('[WebinarPage][server] 웨비나 조회 실패:', {
        id,
        queryColumn: query.column,
        queryValue: query.value,
        ...errorInfo
      })
      
      // PGRST116: 결과가 0행 (웨비나 없음) → 404
      if (error.code === 'PGRST116') {
        console.log('[WebinarPage][server] 웨비나를 찾을 수 없음 → 404')
        notFound()
      }
      
      // 기타 에러는 서버 오류로 처리
      console.error('[WebinarPage][server] 서버 오류 발생 → 메인으로 리다이렉트')
      redirect('/')
    }
    
    // 데이터 없음 체크
    if (!webinar) {
      console.error('[WebinarPage][server] 웨비나 조회 실패 (데이터 없음):', {
        id,
        queryColumn: query.column,
        queryValue: query.value,
      })
      notFound()
    }
    
    // 디버깅: 쿼리 결과 상세 로깅
    console.log('[WebinarPage][server] 웨비나 조회 성공:', {
      id: webinar.id,
      slug: webinar.slug,
      title: webinar.title,
      is_public: webinar.is_public,
      access_policy: webinar.access_policy,
    })
    
    // 클라이언트 정보는 별도로 조회 (관계 쿼리 문제 방지)
    let clientData = null
    if (webinar.client_id) {
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
    
    // 클라이언트 정보 추가
    const webinarData = {
      ...webinar,
      clients: clientData || undefined, // null을 undefined로 변환
    }
    
    // 결정 포인트 A: 6자리 slug는 식별자일 뿐, 접근 정책은 별개
    // Admin Supabase로 조회했으므로 RLS 우회됨
    // 실제 접근 제어는 WebinarEntry 컴포넌트에서 access_policy에 따라 처리
    return <WebinarEntry webinar={webinarData} />
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
    
    // 개발 환경에서는 더 자세한 정보 제공
    if (process.env.NODE_ENV === 'development') {
      console.error('[WebinarPage][server] 전체 에러 객체:', catchError)
    }
    
    redirect('/')
  }
}
