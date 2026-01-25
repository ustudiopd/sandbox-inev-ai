import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { checkWebinarStatsPermission } from '@/lib/stats/permissions'

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
    
    // 웨비나 등록자 조회
    const { data: registrations, error: registrationsError } = await admin
      .from('registrations')
      .select('user_id, nickname, role, registered_via, created_at')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false })
    
    if (registrationsError) {
      return NextResponse.json(
        { success: false, error: registrationsError.message },
        { status: 500 }
      )
    }
    
    // 등록 페이지 캠페인 참여자도 조회 (registration_campaign_id가 있는 경우)
    let registrationEntries: any[] = []
    if (webinar.registration_campaign_id) {
      const { data: entries, error: entriesError } = await admin
        .from('event_survey_entries')
        .select('id, name, registration_data, completed_at, created_at')
        .eq('campaign_id', webinar.registration_campaign_id)
        .order('completed_at', { ascending: false })
      
      if (!entriesError && entries) {
        registrationEntries = entries
      }
    }
    
    // 사용자 ID 수집 (웨비나 등록자)
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
    
    // 등록 페이지 참여자의 이메일 수집
    const registrationEmails = registrationEntries
      .map((e: any) => e.registration_data?.email)
      .filter(Boolean)
      .map((email: string) => email.toLowerCase().trim())
    
    // 모든 이메일 수집 (웨비나 등록자 + 등록 페이지 참여자)
    const allEmails = Array.from(profilesMap.values())
      .map((p: any) => p.email)
      .filter(Boolean)
      .map((email: string) => email.toLowerCase().trim())
      .concat(registrationEmails)
    
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
    
    // 웨비나 등록자 데이터 포맷팅
    const webinarRegistrants = (registrations || []).map((reg: any) => {
      const profile = profilesMap.get(reg.user_id) || {}
      const email = profile.email?.toLowerCase()?.trim()
      
      return {
        id: reg.user_id || `reg-${reg.user_id}`,
        name: reg.nickname || profile.display_name || profile.email || '익명',
        email: profile.email || null,
        role: reg.role || 'attendee',
        registered_via: reg.registered_via || 'webinar',
        registered_at: reg.created_at,
        last_login_at: email ? lastLoginMap.get(email) || null : null,
        source: 'webinar' as const,
      }
    })
    
    // 등록 페이지 참여자 데이터 포맷팅
    const registrationRegistrants = registrationEntries.map((entry: any) => {
      const email = entry.registration_data?.email?.toLowerCase()?.trim()
      const name = entry.name || entry.registration_data?.name || entry.registration_data?.firstName || '익명'
      
      return {
        id: `entry-${entry.id}`,
        name: name,
        email: entry.registration_data?.email || null,
        role: 'attendee',
        registered_via: 'registration_page',
        registered_at: entry.completed_at || entry.created_at,
        last_login_at: email ? lastLoginMap.get(email) || null : null,
        source: 'registration' as const,
      }
    })
    
    // 두 목록 합치기 (중복 제거: 이메일 기준)
    const registrantsMap = new Map<string, any>()
    
    // 등록 페이지 참여자 먼저 추가
    registrationRegistrants.forEach((reg: any) => {
      if (reg.email) {
        registrantsMap.set(reg.email.toLowerCase(), reg)
      } else {
        registrantsMap.set(reg.id, reg)
      }
    })
    
    // 웨비나 등록자 추가 (이메일이 같으면 웨비나 등록 정보 우선)
    webinarRegistrants.forEach((reg: any) => {
      if (reg.email) {
        const existing = registrantsMap.get(reg.email.toLowerCase())
        if (existing) {
          // 이미 있으면 웨비나 등록 정보로 업데이트 (더 상세한 정보)
          registrantsMap.set(reg.email.toLowerCase(), reg)
        } else {
          registrantsMap.set(reg.email.toLowerCase(), reg)
        }
      } else {
        registrantsMap.set(reg.id, reg)
      }
    })
    
    const registrants = Array.from(registrantsMap.values())
      .sort((a, b) => {
        // 등록일시 기준 내림차순 정렬
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
