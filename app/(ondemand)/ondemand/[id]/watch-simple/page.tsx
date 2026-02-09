import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import { requireOnDemandAuth } from '@/lib/utils/ondemand-auth'
import SimpleOnDemandWatchPage from './components/SimpleOnDemandWatchPage'

/**
 * 온디맨드 간단 시청 페이지 (채팅/QnA 없이 유튜브 플레이어만)
 */
export default async function SimpleOnDemandWatchPageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    await requireOnDemandAuth(ondemand.id, ondemand.slug, true)
    
    // settings에서 세션 정보 추출
    const settings = ondemand.settings as any
    const sessions = settings?.ondemand?.sessions || []
    
    // 첫 번째 세션 사용 (또는 메인 세션)
    const mainSession = sessions.find((s: any) => s.session_key === 'main') || sessions[0]
    
    if (!mainSession) {
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
    
    return <SimpleOnDemandWatchPage webinar={ondemandData} session={mainSession} />
  } catch (error) {
    console.error('[SimpleOnDemandWatchPageRoute] 페이지 로드 오류:', error)
    notFound()
  }
}
