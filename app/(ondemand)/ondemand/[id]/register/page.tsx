import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import { notFound } from 'next/navigation'
import OnDemandRegisterPage from '../components/OnDemandRegisterPage'

/**
 * 온디맨드 등록 페이지
 */
export default async function OnDemandRegisterPageRoute({
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
      clients: clientData || undefined,
    }
    
    return <OnDemandRegisterPage webinar={ondemandData} />
  } catch (error) {
    console.error('[OnDemandRegisterPageRoute] 페이지 로드 오류:', error)
    notFound()
  }
}
