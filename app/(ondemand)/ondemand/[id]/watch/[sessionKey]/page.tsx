import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import { requireOnDemandAuth, getOnDemandAuth } from '@/lib/utils/ondemand-auth'
import OnDemandPlayerPage from './components/OnDemandPlayerPage'

/**
 * 온디맨드 영상 시청 페이지
 * 실제 DB 데이터 기반
 */
export default async function OnDemandPlayerPageRoute({
  params,
}: {
  params: Promise<{ id: string; sessionKey: string }>
}) {
  const { id, sessionKey } = await params
  const admin = createAdminSupabase()
  
  // UUID 또는 slug로 온디맨드 조회
  const query = getOnDemandQuery(id)
  
  try {
    // 온디맨드 정보 조회 (type='ondemand'만)
    let queryBuilder = admin
      .from('webinars')
      .select('*')
      .eq('type', 'ondemand')
    
    if (query.column === 'slug') {
      queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
    } else {
      queryBuilder = queryBuilder.eq(query.column, query.value)
    }
    
    const { data: ondemand, error: ondemandError } = await queryBuilder.maybeSingle()
    
    if (ondemandError || !ondemand) {
      notFound()
    }
    
    // 인증 확인 (인증되지 않은 경우 자동으로 로그인 페이지로 리다이렉트)
    // 등록 여부 재확인은 건너뛰어 성능 최적화 (인증 쿠키는 등록 확인 후에만 설정되므로 안전)
    const authData = await requireOnDemandAuth(ondemand.id, ondemand.slug, true)
    
    // 페이지 로딩 시 설문 제출 여부 미리 확인 (인덱스 활용하여 빠른 조회)
    let surveyStatus: { submitted: boolean; survey_no?: number; code6?: string } | null = null
    if (authData) {
      try {
        const userEmail = authData.email.toLowerCase().trim()
        const { data: existing } = await admin
          .from('ondemand_survey_responses')
          .select('survey_no, code6')
          .eq('webinar_id', ondemand.id)
          .eq('email', userEmail)
          .limit(1)
          .maybeSingle()
        
        if (existing) {
          surveyStatus = {
            submitted: true,
            survey_no: existing.survey_no,
            code6: existing.code6,
          }
        } else {
          surveyStatus = {
            submitted: false,
          }
        }
      } catch (error) {
        // 설문 확인 실패해도 페이지는 정상 동작하도록
        console.error('[OnDemandPlayerPageRoute] 설문 제출 여부 확인 오류:', error)
        surveyStatus = { submitted: false }
      }
    }
    
    // settings에서 세션 정보 추출
    const settings = ondemand.settings as any
    const sessions = settings?.ondemand?.sessions || []
    
    // 요청한 세션 찾기
    const session = sessions.find((s: any) => s.session_key === sessionKey)
    
    if (!session) {
      notFound()
    }
    
    // 클라이언트 정보 조회
    let clientData = null
    if (ondemand.client_id) {
      const { data: client } = await admin
        .from('clients')
        .select('id, name, logo_url, brand_config')
        .eq('id', ondemand.client_id)
        .maybeSingle()
      
      clientData = client
    }
    
    const ondemandData = {
      ...ondemand,
      sessions,
      clients: clientData || undefined,
    }
    
    return <OnDemandPlayerPage webinar={ondemandData} session={session} initialSurveyStatus={surveyStatus} />
  } catch (error) {
    console.error('[OnDemandPlayerPageRoute] 페이지 로드 오류:', error)
    notFound()
  }
}
