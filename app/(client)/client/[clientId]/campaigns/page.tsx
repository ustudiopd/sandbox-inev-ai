import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import CampaignsPageClient from './components/CampaignsPageClient'

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  try {
    const { clientId } = await params
    
    // 권한 확인 (다른 클라이언트 페이지와 동일한 가드 사용)
    await requireClientMember(clientId)
    
    const admin = createAdminSupabase()
    
    // 클라이언트 정보 조회 (생성일 포함)
    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, name, created_at')
      .eq('id', clientId)
      .single()
    
    if (clientError || !client) {
      return <div>클라이언트를 찾을 수 없습니다.</div>
    }
    
    return <CampaignsPageClient 
      clientId={clientId} 
      clientName={client.name}
      clientCreatedAt={client.created_at}
    />
  } catch (error: any) {
    // NEXT_REDIRECT는 정상적인 리다이렉트이므로 에러로 처리하지 않음
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // 리다이렉트는 그대로 전파
    }
    console.error('[CampaignsPage] 페이지 로드 오류:', error)
    throw error
  }
}
