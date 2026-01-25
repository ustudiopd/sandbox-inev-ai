import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import ConsoleView from '@/app/(admin)/webinar/[id]/console/components/ConsoleView'

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; webinarId: string }>
}) {
  const { clientId, webinarId } = await params
  const admin = createAdminSupabase()
  const { user, supabase } = await requireAuth()
  
  // 웨비나 정보 조회 (UUID로 조회)
  const { data: webinar, error: webinarError } = await admin
    .from('webinars')
    .select(`
      *,
      clients:client_id (
        id,
        name,
        logo_url,
        brand_config
      )
    `)
    .eq('id', webinarId)
    .single()
  
  if (webinarError || !webinar) {
    redirect(`/client/${clientId}/webinars`)
  }
  
  // 클라이언트 ID 일치 확인
  if (webinar.client_id !== clientId) {
    redirect(`/client/${clientId}/webinars`)
  }
  
  // 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()
  
  let hasPermission = false
  let userRole = 'viewer'
  
  // 슈퍼 관리자는 항상 허용
  if (profile?.is_super_admin) {
    hasPermission = true
    userRole = 'super_admin'
  } else {
    // 클라이언트 멤버십 확인
    const { data: clientMember } = await supabase
      .from('client_members')
      .select('role')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (clientMember && ['owner', 'admin', 'operator', 'analyst', 'viewer'].includes(clientMember.role)) {
      hasPermission = true
      userRole = clientMember.role
    } else {
      // 에이전시 멤버십 확인
      if (webinar.agency_id) {
        const { data: agencyMember } = await supabase
          .from('agency_members')
          .select('role')
          .eq('agency_id', webinar.agency_id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
          hasPermission = true
          userRole = agencyMember.role
        }
      }
    }
  }
  
  if (!hasPermission) {
    redirect(`/client/${clientId}/webinars`)
  }
  
  return <ConsoleView webinar={webinar} userRole={userRole} />
}
