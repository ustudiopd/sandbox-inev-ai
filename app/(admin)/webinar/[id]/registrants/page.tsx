import { createAdminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getWebinarQuery } from '@/lib/utils/webinar'
import RegistrantsPageClient from './components/RegistrantsPageClient'

export default async function RegistrantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const searchParamsData = await searchParams
  const admin = createAdminSupabase()
  const { user, supabase } = await requireAuth()

  // UUID 또는 slug로 웨비나 조회
  const query = getWebinarQuery(id)

  // 웨비나 정보 조회
  let queryBuilder = admin
    .from('webinars')
    .select(`
      *,
      clients:client_id (
        id,
        name,
        logo_url
      )
    `)
  
  if (query.column === 'slug') {
    // slug는 문자열로 비교 (숫자로 저장되어 있어도 문자열로 변환)
    queryBuilder = queryBuilder.eq('slug', String(query.value)).not('slug', 'is', null)
  } else {
    queryBuilder = queryBuilder.eq(query.column, query.value)
  }
  
  const { data: webinar, error: webinarError } = await queryBuilder.single()

  if (webinarError || !webinar) {
    redirect('/')
  }

  // 권한 확인 (클라이언트 멤버 owner/admin/operator 또는 에이전시 owner/admin 또는 슈퍼 관리자)
  const isSuperAdmin = !!user?.app_metadata?.is_super_admin

  let hasPermission = false
  if (isSuperAdmin) {
    hasPermission = true
  } else {
    // 클라이언트 멤버 확인
    const { data: clientMember } = await supabase
      .from('client_members')
      .select('role')
      .eq('client_id', webinar.client_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
      hasPermission = true
    } else {
      // 에이전시 멤버 확인
      const client = Array.isArray(webinar.clients) ? webinar.clients[0] : webinar.clients
      if (client) {
        const { data: agency } = await supabase
          .from('clients')
          .select('agency_id')
          .eq('id', client.id)
          .single()

        if (agency?.agency_id) {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', agency.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()

          if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
            hasPermission = true
          }
        }
      }
    }
  }

  if (!hasPermission) {
    redirect(`/webinar/${id}`)
  }

  let registrations: any[] = []
  
  // registration_campaign_id가 있으면 등록 캠페인 데이터만 사용 (event_survey_entries만 표시)
  if (webinar.registration_campaign_id) {
    const { data: entries } = await admin
      .from('event_survey_entries')
      .select('id, name, registration_data, completed_at, created_at')
      .eq('campaign_id', webinar.registration_campaign_id)
      .order('completed_at', { ascending: false })
    
    // 클라이언트 멤버십 정보 조회 (역할 확인용)
    const memberRolesMap = new Map<string, string>()
    
    if (webinar.client_id) {
      const { data: clientMembers } = await admin
        .from('client_members')
        .select('user_id, role')
        .eq('client_id', webinar.client_id)
      
      if (clientMembers && clientMembers.length > 0) {
        const memberUserIds = clientMembers.map((m: any) => m.user_id)
        const { data: memberProfiles } = await admin
          .from('profiles')
          .select('id, email')
          .in('id', memberUserIds)
        
        if (memberProfiles) {
          const profileMap = new Map(memberProfiles.map((p: any) => [p.id, p.email?.toLowerCase()?.trim()]))
          clientMembers.forEach((member: any) => {
            const email = profileMap.get(member.user_id)
            if (email) {
              // 가장 높은 역할로 저장 (owner > admin > operator > analyst > viewer)
              const rolePriority: Record<string, number> = {
                owner: 5,
                admin: 4,
                operator: 3,
                analyst: 2,
                viewer: 1,
              }
              const currentPriority = rolePriority[memberRolesMap.get(email) || ''] || 0
              const newPriority = rolePriority[member.role] || 0
              if (newPriority > currentPriority) {
                memberRolesMap.set(email, member.role)
              }
            }
          })
        }
      }
    }
    
    // 등록 캠페인 데이터를 registrations 형식으로 변환
    registrations = (entries || []).map((entry: any) => {
      const email = entry.registration_data?.email?.toLowerCase()?.trim()
      const registrationData = entry.registration_data || {}
      
      // 역할 결정: registration_data의 role 우선, 없으면 멤버십 확인
      let role = 'attendee'
      if (registrationData.role === '관리자') {
        role = '관리자'
      } else if (email) {
        // 멤버십 확인 (클라이언트 멤버십 우선)
        const memberRole = memberRolesMap.get(email)
        if (memberRole === 'owner' || memberRole === 'admin') {
          role = '관리자'
        } else if (memberRole === 'operator') {
          role = '운영자'
        } else if (memberRole === 'analyst') {
          role = '분석가'
        }
        // 멤버십이 없으면 하드코딩된 이메일 체크 (pd@ustudio.co.kr만, eventflow@onepredict.com은 클라이언트 멤버십으로 처리)
        else if (email === 'pd@ustudio.co.kr') {
          role = '관리자'
        }
      }
      
      return {
        id: entry.id,
        webinar_id: webinar.id,
        user_id: null,
        nickname: entry.name || registrationData.name || registrationData.firstName || '익명',
        role: role,
        registered_via: registrationData.registered_via || 'registration_page',
        created_at: entry.completed_at || entry.created_at,
        profiles: email ? {
          id: null,
          email: entry.registration_data?.email,
          display_name: entry.name || registrationData.name || registrationData.firstName || '익명',
        } : null,
      }
    })
  } else {
    // registration_campaign_id가 없으면 registrations 테이블 조회
    const { data: webinarRegistrations } = await admin
      .from('registrations')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          display_name
        )
      `)
      .eq('webinar_id', webinar.id)
      .order('created_at', { ascending: false })
    
    // 클라이언트 멤버십 정보 조회 (역할 확인용)
    const memberRolesMap = new Map<string, string>()
    
    if (webinar.client_id) {
      const { data: clientMembers } = await admin
        .from('client_members')
        .select('user_id, role')
        .eq('client_id', webinar.client_id)
      
      if (clientMembers && clientMembers.length > 0) {
        const memberUserIds = clientMembers.map((m: any) => m.user_id)
        const { data: memberProfiles } = await admin
          .from('profiles')
          .select('id, email')
          .in('id', memberUserIds)
        
        if (memberProfiles) {
          const profileMap = new Map(memberProfiles.map((p: any) => [p.id, p.email?.toLowerCase()?.trim()]))
          clientMembers.forEach((member: any) => {
            const email = profileMap.get(member.user_id)
            if (email) {
              // 가장 높은 역할로 저장 (owner > admin > operator > analyst > viewer)
              const rolePriority: Record<string, number> = {
                owner: 5,
                admin: 4,
                operator: 3,
                analyst: 2,
                viewer: 1,
              }
              const currentPriority = rolePriority[memberRolesMap.get(email) || ''] || 0
              const newPriority = rolePriority[member.role] || 0
              if (newPriority > currentPriority) {
                memberRolesMap.set(email, member.role)
              }
            }
          })
        }
      }
    }
    
    // DB에 저장된 role을 우선 사용, 없으면 멤버십 확인
    registrations = (webinarRegistrations || []).map((reg: any) => {
      let role = reg.role || 'attendee'
      const email = reg.profiles?.email?.toLowerCase()?.trim()
      
      // DB에 role이 없거나 'attendee'인 경우 멤버십 확인
      if (!reg.role || reg.role === 'attendee') {
        if (email) {
          const memberRole = memberRolesMap.get(email)
          if (memberRole === 'owner' || memberRole === 'admin') {
            role = '관리자'
          } else if (memberRole === 'operator') {
            role = '운영자'
          } else if (memberRole === 'analyst') {
            role = '분석가'
          }
          // 멤버십이 없으면 하드코딩된 이메일 체크 (pd@ustudio.co.kr만)
          else if (email === 'pd@ustudio.co.kr') {
            role = '관리자'
          }
        }
      }
      
      return {
        ...reg,
        role: role,
      }
    })
  }

  return (
    <RegistrantsPageClient
      webinar={webinar}
      registrations={registrations || []}
    />
  )
}






