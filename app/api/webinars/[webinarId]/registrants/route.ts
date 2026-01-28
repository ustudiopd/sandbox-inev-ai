import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'
import { getWebinarQuery } from '@/lib/utils/webinar'

export const runtime = 'nodejs'

/**
 * 웨비나 참여자 목록 조회
 * GET /api/webinars/[webinarId]/registrants
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    
    // 권한 확인
    const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
    if (!hasPermission || !webinar) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 디버깅: 웨비나 정보 로그
    console.log('[registrants API] 웨비나 정보:', {
      webinarId,
      webinarId_type: typeof webinar.id,
      registration_campaign_id: webinar.registration_campaign_id,
      registration_campaign_id_type: typeof webinar.registration_campaign_id,
    })
    
    let registrations: any[] = []
    let registrationEntries: any[] = []
    
    // 원프레딕트 웨비나(426307)는 항상 registrations 테이블만 사용
    const isOnePredictWebinar = webinar.slug === '426307'
    
    if (isOnePredictWebinar) {
      // 원프레딕트 웨비나는 registrations 테이블만 사용
      console.log('[registrants API] 원프레딕트 웨비나 → registrations 테이블 사용')
      
      // survey_no와 code6 컬럼이 없을 수 있으므로 안전하게 처리
      let selectFields = 'user_id, nickname, role, registered_via, created_at, registration_data'
      try {
        // 먼저 survey_no와 code6를 포함해서 시도
        const { data: webinarRegistrations, error: registrationsError } = await admin
          .from('registrations')
          .select('user_id, nickname, role, registered_via, created_at, registration_data, survey_no, code6')
          .eq('webinar_id', webinar.id)
          .order('created_at', { ascending: false })
        
        if (registrationsError) {
          // 컬럼이 없으면 survey_no와 code6 없이 재시도
          if (registrationsError.message?.includes('column') || registrationsError.code === '42703') {
            console.log('[registrants API] survey_no/code6 컬럼 없음, 기본 필드만 사용')
            const { data: retryRegistrations, error: retryError } = await admin
              .from('registrations')
              .select('user_id, nickname, role, registered_via, created_at, registration_data')
              .eq('webinar_id', webinar.id)
              .order('created_at', { ascending: false })
            
            if (retryError) {
              return NextResponse.json(
                { success: false, error: retryError.message },
                { status: 500 }
              )
            }
            
            registrations = retryRegistrations || []
          } else {
            return NextResponse.json(
              { success: false, error: registrationsError.message },
              { status: 500 }
            )
          }
        } else {
          registrations = webinarRegistrations || []
        }
      } catch (error: any) {
        console.error('[registrants API] registrations 조회 오류:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to fetch registrations' },
          { status: 500 }
        )
      }
      
      console.log('[registrants API] registrations 테이블 참여자 수:', registrations.length)
    } else if (webinar.registration_campaign_id) {
      // 원프레딕트가 아니고 registration_campaign_id가 있으면 등록 캠페인 데이터 사용
      console.log('[registrants API] 등록 캠페인 데이터 사용:', webinar.registration_campaign_id)
      const { data: entries, error: entriesError } = await admin
        .from('event_survey_entries')
        .select('id, name, company, phone_norm, registration_data, completed_at, created_at, survey_no, code6')
        .eq('campaign_id', webinar.registration_campaign_id)
        .order('completed_at', { ascending: false })
      
      if (entriesError) {
        return NextResponse.json(
          { success: false, error: entriesError.message },
          { status: 500 }
        )
      }
      
      registrationEntries = entries || []
      console.log('[registrants API] 등록 캠페인 참여자 수:', registrationEntries.length)
    } else {
      // registration_campaign_id가 없으면 registrations 테이블 조회
      console.log('[registrants API] registrations 테이블 사용 (registration_campaign_id 없음)')
      
      try {
        // 먼저 survey_no와 code6를 포함해서 시도
        const { data: webinarRegistrations, error: registrationsError } = await admin
          .from('registrations')
          .select('user_id, nickname, role, registered_via, created_at, registration_data, survey_no, code6')
          .eq('webinar_id', webinar.id)
          .order('created_at', { ascending: false })
        
        if (registrationsError) {
          // 컬럼이 없으면 survey_no와 code6 없이 재시도
          if (registrationsError.message?.includes('column') || registrationsError.code === '42703') {
            console.log('[registrants API] survey_no/code6 컬럼 없음, 기본 필드만 사용')
            const { data: retryRegistrations, error: retryError } = await admin
              .from('registrations')
              .select('user_id, nickname, role, registered_via, created_at, registration_data')
              .eq('webinar_id', webinar.id)
              .order('created_at', { ascending: false })
            
            if (retryError) {
              return NextResponse.json(
                { success: false, error: retryError.message },
                { status: 500 }
              )
            }
            
            registrations = retryRegistrations || []
          } else {
            return NextResponse.json(
              { success: false, error: registrationsError.message },
              { status: 500 }
            )
          }
        } else {
          registrations = webinarRegistrations || []
        }
      } catch (error: any) {
        console.error('[registrants API] registrations 조회 오류:', error)
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to fetch registrations' },
          { status: 500 }
        )
      }
      
      console.log('[registrants API] registrations 테이블 참여자 수:', registrations.length)
    }
    
    // 이메일 수집 (원프레딕트 웨비나는 registrations만, 그 외는 registration_campaign_id가 있으면 registrationEntries만, 없으면 registrations만)
    let allEmails: string[] = []
    
    if (isOnePredictWebinar) {
      // 원프레딕트 웨비나는 registrations만 사용
      const userIds = (registrations || []).map((r: any) => r.user_id).filter(Boolean)
      
      // 프로필 정보 조회
      let profilesMap = new Map<string, any>()
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await admin
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds)
        
        if (!profilesError && profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, p)
          })
        }
      }
      
      // 웨비나 등록자의 이메일 수집
      allEmails = Array.from(profilesMap.values())
        .map((p: any) => p.email)
        .filter(Boolean)
        .map((email: string) => email.toLowerCase().trim())
    } else if (webinar.registration_campaign_id) {
      // 등록 페이지 참여자의 이메일만 수집
      allEmails = registrationEntries
        .map((e: any) => e.registration_data?.email)
        .filter(Boolean)
        .map((email: string) => email.toLowerCase().trim())
    } else {
      // 웨비나 등록자의 사용자 ID 수집
      const userIds = (registrations || []).map((r: any) => r.user_id).filter(Boolean)
      
      // 프로필 정보 조회
      let profilesMap = new Map<string, any>()
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await admin
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds)
        
        if (!profilesError && profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, p)
          })
        }
      }
      
      // 웨비나 등록자의 이메일 수집
      allEmails = Array.from(profilesMap.values())
        .map((p: any) => p.email)
        .filter(Boolean)
        .map((email: string) => email.toLowerCase().trim())
    }
    
    // 중복 제거
    const uniqueEmails = Array.from(new Set(allEmails))
    
    // 이메일별 마지막 로그인 정보 조회
    const lastLoginMap = new Map<string, string | null>()
    if (uniqueEmails.length > 0) {
      try {
        // auth.users에서 모든 사용자 조회 (페이지네이션 처리)
        let allUsers: any[] = []
        let page = 1
        const perPage = 1000
        
        while (true) {
          const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
            page,
            perPage,
          })
          
          if (listError) {
            console.error('사용자 목록 조회 오류:', listError)
            break
          }
          
          if (!authUsers?.users || authUsers.users.length === 0) {
            break
          }
          
          allUsers = allUsers.concat(authUsers.users)
          
          // 더 이상 페이지가 없으면 종료
          if (authUsers.users.length < perPage) {
            break
          }
          
          page++
        }
        
        // 이메일별로 매핑
        for (const email of uniqueEmails) {
          const user = allUsers.find((u: any) => u.email?.toLowerCase() === email)
          if (user?.last_sign_in_at) {
            lastLoginMap.set(email, user.last_sign_in_at)
          }
        }
      } catch (error) {
        console.error('마지막 로그인 정보 조회 오류:', error)
      }
    }
    
    // registration_campaign_id가 있고 원프레딕트 웨비나가 아니면 등록 페이지 참여자만, 없으면 웨비나 등록자만 사용
    let registrants: any[] = []
    
    if (webinar.registration_campaign_id && !isOnePredictWebinar) {
      // 등록 페이지 참여자의 이메일 수집
      const entryEmails = registrationEntries
        .map((e: any) => e.registration_data?.email?.toLowerCase()?.trim())
        .filter(Boolean)
      
      // 웨비나의 클라이언트/에이전시 멤버십 정보 조회 (역할 확인용)
      const memberRolesMap = new Map<string, string>()
      
      // 클라이언트 멤버 조회
      if (webinar.client_id) {
        const { data: clientMembers } = await admin
          .from('client_members')
          .select('user_id, role')
          .eq('client_id', webinar.client_id)
        
        if (clientMembers) {
          // 이메일로 매핑하기 위해 프로필 조회
          const memberUserIds = clientMembers.map((m: any) => m.user_id)
          if (memberUserIds.length > 0) {
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
      }
      
      // 에이전시 멤버 조회
      let agencyId = webinar.agency_id
      if (!agencyId && webinar.client_id) {
        const { data: client } = await admin
          .from('clients')
          .select('agency_id')
          .eq('id', webinar.client_id)
          .maybeSingle()
        if (client?.agency_id) {
          agencyId = client.agency_id
        }
      }
      
      if (agencyId) {
        const { data: agencyMembers } = await admin
          .from('agency_members')
          .select('user_id, role')
          .eq('agency_id', agencyId)
        
        if (agencyMembers) {
          const memberUserIds = agencyMembers.map((m: any) => m.user_id)
          if (memberUserIds.length > 0) {
            const { data: memberProfiles } = await admin
              .from('profiles')
              .select('id, email')
              .in('id', memberUserIds)
            
            if (memberProfiles) {
              const profileMap = new Map(memberProfiles.map((p: any) => [p.id, p.email?.toLowerCase()?.trim()]))
              agencyMembers.forEach((member: any) => {
                const email = profileMap.get(member.user_id)
                if (email) {
                  // 가장 높은 역할로 저장 (owner > admin > analyst)
                  const rolePriority: Record<string, number> = {
                    owner: 5,
                    admin: 4,
                    analyst: 2,
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
      }
      
      // 슈퍼 관리자 확인
      const { data: superAdmins } = await admin
        .from('profiles')
        .select('email, is_super_admin')
        .eq('is_super_admin', true)
      
      if (superAdmins) {
        superAdmins.forEach((admin: any) => {
          const email = admin.email?.toLowerCase()?.trim()
          if (email) {
            memberRolesMap.set(email, 'super_admin')
          }
        })
      }
      
      // 등록 페이지 참여자 데이터 포맷팅 (event_survey_entries만 사용)
      registrants = registrationEntries.map((entry: any) => {
        const email = entry.registration_data?.email?.toLowerCase()?.trim()
        const registrationData = entry.registration_data || {}
        
        // 이름 우선순위: entry.name > registration_data.name > registration_data.firstName + lastName > firstName
        let name = entry.name
        if (!name && registrationData) {
          if (registrationData.name) {
            name = registrationData.name
          } else if (registrationData.firstName && registrationData.lastName) {
            name = `${registrationData.lastName}${registrationData.firstName}`
          } else if (registrationData.firstName) {
            name = registrationData.firstName
          } else if (registrationData.lastName) {
            name = registrationData.lastName
          }
        }
        name = name || '익명'
        
        // 역할 결정: registration_data의 role 우선, 없으면 멤버십 확인
        let role = 'attendee'
        if (registrationData.role === '관리자') {
          role = '관리자'
        } else if (email) {
          // 멤버십 확인 (클라이언트 멤버십 우선)
          const memberRole = memberRolesMap.get(email)
          if (memberRole === 'super_admin') {
            role = '관리자'
          } else if (memberRole === 'owner' || memberRole === 'admin') {
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
          id: `entry-${entry.id}`,
          name: name,
          email: entry.registration_data?.email || null,
          role: role,
          registered_via: registrationData.registered_via || 'registration_page',
          registered_at: entry.completed_at || entry.created_at,
          last_login_at: email ? lastLoginMap.get(email) || null : null,
          source: 'registration' as const,
          registration_data: entry.registration_data || null,
          company: entry.company || null,
          phone_norm: entry.phone_norm || null,
          survey_no: entry.survey_no || null,
          code6: entry.code6 || null,
        }
      })
      
      // registrations 테이블의 관리자는 추가하지 않음 (event_survey_entries만 표시)
    } else {
      // 웨비나 등록자 사용자 ID 수집
      const userIds = (registrations || []).map((r: any) => r.user_id).filter(Boolean)
      
      // 프로필 정보 조회
      let profilesMap = new Map<string, any>()
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await admin
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds)
        
        if (!profilesError && profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, p)
          })
        }
      }
      
      // 웨비나의 클라이언트/에이전시 멤버십 정보 조회 (역할 확인용)
      const memberRolesMap = new Map<string, string>()
      
      // 클라이언트 멤버 조회
      if (webinar.client_id) {
        const { data: clientMembers } = await admin
          .from('client_members')
          .select('user_id, role')
          .eq('client_id', webinar.client_id)
        
        if (clientMembers) {
          // 이메일로 매핑하기 위해 프로필 조회
          const memberUserIds = clientMembers.map((m: any) => m.user_id)
          if (memberUserIds.length > 0) {
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
      }
      
      // 에이전시 멤버 조회
      let agencyId = webinar.agency_id
      if (!agencyId && webinar.client_id) {
        const { data: client } = await admin
          .from('clients')
          .select('agency_id')
          .eq('id', webinar.client_id)
          .maybeSingle()
        if (client?.agency_id) {
          agencyId = client.agency_id
        }
      }
      
      if (agencyId) {
        const { data: agencyMembers } = await admin
          .from('agency_members')
          .select('user_id, role')
          .eq('agency_id', agencyId)
        
        if (agencyMembers) {
          const memberUserIds = agencyMembers.map((m: any) => m.user_id)
          if (memberUserIds.length > 0) {
            const { data: memberProfiles } = await admin
              .from('profiles')
              .select('id, email')
              .in('id', memberUserIds)
            
            if (memberProfiles) {
              const profileMap = new Map(memberProfiles.map((p: any) => [p.id, p.email?.toLowerCase()?.trim()]))
              agencyMembers.forEach((member: any) => {
                const email = profileMap.get(member.user_id)
                if (email) {
                  // 가장 높은 역할로 저장 (owner > admin > analyst)
                  const rolePriority: Record<string, number> = {
                    owner: 5,
                    admin: 4,
                    analyst: 2,
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
      }
      
      // 슈퍼 관리자 확인
      const { data: superAdmins } = await admin
        .from('profiles')
        .select('email, is_super_admin')
        .eq('is_super_admin', true)
      
      if (superAdmins) {
        superAdmins.forEach((admin: any) => {
          const email = admin.email?.toLowerCase()?.trim()
          if (email) {
            memberRolesMap.set(email, 'super_admin')
          }
        })
      }
      
      // 웨비나 등록자 데이터 포맷팅
      registrants = (registrations || []).map((reg: any) => {
        const profile = profilesMap.get(reg.user_id) || {}
        const email = profile.email?.toLowerCase()?.trim()
        
        // 역할 결정: DB에 저장된 role 우선, 없으면 멤버십 확인
        let role = reg.role || null
        
        // DB에 role이 없거나 'attendee'인 경우 멤버십 확인
        if (!role || role === 'attendee') {
          const memberRole = email ? memberRolesMap.get(email) : null
          if (memberRole === 'super_admin') {
            role = '관리자'
          } else if (memberRole === 'owner' || memberRole === 'admin') {
            role = '관리자'
          } else if (memberRole === 'operator') {
            role = '운영자'
          } else if (memberRole === 'analyst') {
            role = '분석가'
          } else {
            // 멤버십이 없으면 manual 등록 처리: pd@ustudio.co.kr만 관리자
            if (reg.registered_via === 'manual' && email === 'pd@ustudio.co.kr') {
              role = '관리자'
            } else {
              role = 'attendee'
            }
          }
        }
        
        // registration_data에서 company, phone_norm 추출
        const regData = reg.registration_data || {}
        
        return {
          id: reg.user_id || `reg-${reg.user_id}`,
          name: reg.nickname || profile.display_name || profile.email || '익명',
          email: profile.email || null,
          role: role,
          registered_via: reg.registered_via || 'webinar',
          registered_at: reg.created_at,
          last_login_at: email ? lastLoginMap.get(email) || null : null,
          source: 'webinar' as const,
          registration_data: reg.registration_data || null,
          company: regData.company || null,
          phone_norm: regData.phone_norm || regData.phone || null,
          survey_no: reg.survey_no || null,
          code6: reg.code6 || null,
        }
      })
    }
    
    // 등록일시 기준 내림차순 정렬
    registrants.sort((a, b) => {
      const dateA = new Date(a.registered_at || 0).getTime()
      const dateB = new Date(b.registered_at || 0).getTime()
      return dateB - dateA
    })
    
    return NextResponse.json({
      success: true,
      registrants: registrants || [],
    })
  } catch (error: any) {
    console.error('웨비나 참여자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
