import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
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
    
    return <OnDemandPlayerPage webinar={ondemandData} session={session} />
  } catch (error) {
    console.error('[OnDemandPlayerPageRoute] 페이지 로드 오류:', error)
    notFound()
  }
}
