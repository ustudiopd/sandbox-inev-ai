import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import ConsoleView from './components/ConsoleView'

export default async function ConsolePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminSupabase()
  const { user, supabase } = await requireAuth()
  
  // 웨비나 정보 조회 (RLS 우회)
  const { data: webinar, error } = await admin
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
    .eq('id', id)
    .single()
  
  if (error || !webinar) {
    // 웨비나를 찾을 수 없으면 입장 페이지로 리다이렉트
    redirect(`/webinar/${id}`)
  }
  
  // 권한 확인 (클라이언트 operator 이상 또는 에이전시 owner/admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()
  
  let hasPermission = false
  let userRole = 'viewer'
  
  // 슈퍼 어드민은 항상 접근 가능
  if (profile?.is_super_admin) {
    hasPermission = true
    userRole = 'super_admin'
  } else {
    // 클라이언트 멤버십 확인
    const { data: clientMember } = await supabase
      .from('client_members')
      .select('role')
      .eq('client_id', webinar.client_id)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
      hasPermission = true
      userRole = clientMember.role
    } else {
      // 에이전시 멤버십 확인 (owner/admin만 운영 콘솔 접근 가능)
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
  
  // 권한이 없으면 입장 페이지로 리다이렉트
  if (!hasPermission) {
    redirect(`/webinar/${id}`)
  }
  
  return <ConsoleView webinar={webinar} userRole={userRole} />
}

