import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[requireAuth] 인증 오류:', authError)
      console.error('[requireAuth] 인증 오류 상세:', {
        message: authError.message,
        status: authError.status,
      })
    }
    
    if (!user) {
      console.warn('[requireAuth] 사용자가 없습니다 - 로그인 페이지로 리다이렉트')
      redirect('/login')
    }
    
    console.log('[requireAuth] 사용자 확인 완료:', { userId: user.id, email: user.email })
    return { user, supabase }
  } catch (error: any) {
    // NEXT_REDIRECT는 정상적인 리다이렉트이므로 에러로 처리하지 않음
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // 리다이렉트는 그대로 전파
    }
    console.error('[requireAuth] 예상치 못한 오류:', error)
    throw error
  }
}

export async function requireSuperAdmin() {
  try {
    const { user, supabase } = await requireAuth()
    
    if (!user) {
      console.error('[requireSuperAdmin] 사용자가 없습니다')
      redirect('/login')
    }
    
    console.log('[requireSuperAdmin] 사용자 확인:', { userId: user.id, email: user.email })
    
    // JWT app_metadata에서 슈퍼어드민 권한 확인 (RLS 재귀 방지)
    let isSuperAdmin = !!user?.app_metadata?.is_super_admin
    
    console.log('[requireSuperAdmin] JWT app_metadata 확인:', { 
      hasAppMetadata: !!user?.app_metadata,
      isSuperAdminFromJWT: isSuperAdmin 
    })
    
    // JWT에 app_metadata가 없을 경우 fallback: Admin Supabase로 확인
    // (JWT 토큰 갱신 전까지 임시 조치)
    if (!isSuperAdmin) {
      try {
        const { createAdminSupabase } = await import('@/lib/supabase/admin')
        
        // 환경 변수 확인
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[requireSuperAdmin] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다')
          throw new Error('환경 변수 설정 오류')
        }
        
        const admin = createAdminSupabase()
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('[requireSuperAdmin] 프로필 조회 오류:', profileError)
          throw profileError
        }
        
        isSuperAdmin = !!profile?.is_super_admin
        
        console.log('[requireSuperAdmin] DB 프로필 확인 결과:', { 
          isSuperAdmin, 
          profileExists: !!profile 
        })
        
        if (isSuperAdmin) {
          console.warn('⚠️  JWT에 app_metadata가 없습니다. 재로그인하여 JWT 토큰을 갱신하세요.')
        }
      } catch (error: any) {
        console.error('[requireSuperAdmin] 프로필 확인 오류:', error)
        console.error('[requireSuperAdmin] 에러 상세:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        })
        // 에러가 발생해도 계속 진행 (환경 변수 문제일 수 있음)
      }
    }
    
    if (!isSuperAdmin) {
      console.warn('[requireSuperAdmin] 슈퍼 관리자 권한 없음 - 리다이렉트:', { 
        userId: user.id, 
        email: user.email 
      })
      redirect('/')
    }
    
    console.log('[requireSuperAdmin] 슈퍼 관리자 권한 확인 완료:', { userId: user.id, email: user.email })
    
    // 프로필 정보는 필요시에만 조회 (슈퍼어드민은 모든 프로필 접근 가능하므로 선택적)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email, is_super_admin')
      .eq('id', user.id)
      .maybeSingle()
    
    if (profileError) {
      console.warn('[requireSuperAdmin] 프로필 조회 경고 (계속 진행):', profileError)
    }
    
    return { user, supabase, profile }
  } catch (error: any) {
    // NEXT_REDIRECT는 정상적인 리다이렉트이므로 에러로 처리하지 않음
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // 리다이렉트는 그대로 전파
    }
    console.error('[requireSuperAdmin] 예상치 못한 오류:', error)
    console.error('[requireSuperAdmin] 에러 상세:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    redirect('/login')
  }
}

export async function requireAgencyMember(agencyId: string, roles: string[] = ['owner', 'admin']) {
  const { user, supabase } = await requireAuth()
  
  // JWT app_metadata에서 슈퍼어드민 권한 확인 (RLS 재귀 방지)
  const isSuperAdmin = !!user?.app_metadata?.is_super_admin
  
  if (isSuperAdmin) {
    // 프로필 정보는 필요시에만 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email, is_super_admin')
      .eq('id', user.id)
      .maybeSingle()
    return { user, supabase, profile, role: 'super_admin' as const }
  }
  
  const { data: member } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', agencyId)
    .eq('user_id', user.id)
    .maybeSingle()
  
  if (!member || !roles.includes(member.role)) {
    redirect('/')
  }
  
  // 프로필 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, is_super_admin')
    .eq('id', user.id)
    .maybeSingle()
  
  return { user, supabase, profile, role: member.role }
}

export async function requireClientMember(clientId: string, roles: string[] = ['owner', 'admin', 'operator', 'member']) {
  try {
    const { user, supabase } = await requireAuth()
    
    if (!user) {
      console.error('[requireClientMember] 사용자가 없습니다')
      redirect('/login')
    }
    
    if (!clientId) {
      console.error('[requireClientMember] clientId가 없습니다')
      redirect('/')
    }
    
    console.log('[requireClientMember] 사용자 확인:', { userId: user.id, email: user.email, clientId })
    
    // JWT app_metadata에서 슈퍼어드민 권한 확인 (RLS 재귀 방지)
    const isSuperAdmin = !!user?.app_metadata?.is_super_admin
    
    // RLS 무한 재귀 문제 방지를 위해 Admin Supabase 사용
    const { createAdminSupabase } = await import('@/lib/supabase/admin')
    const admin = createAdminSupabase()
    
    if (isSuperAdmin) {
      console.log('[requireClientMember] 슈퍼 어드민으로 접근 허용:', { userId: user.id, clientId })
      // 프로필 정보는 Admin Supabase로 조회 (RLS 우회)
      const { data: profile } = await admin
        .from('profiles')
        .select('display_name, email, is_super_admin')
        .eq('id', user.id)
        .maybeSingle()
      return { user, supabase, profile, role: 'super_admin' as const }
    }
    
    // 프로필 정보 조회 (Admin Supabase 사용 - RLS 무한 재귀 방지)
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, email, is_super_admin')
      .eq('id', user.id)
      .maybeSingle()
    
    // 클라이언트 멤버십 확인
    const { data: member, error: memberError } = await supabase
      .from('client_members')
      .select('role')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (memberError) {
      console.error('[requireClientMember] 클라이언트 멤버십 조회 오류:', memberError)
    }
    
    if (member && roles.includes(member.role)) {
      console.log('[requireClientMember] 클라이언트 멤버로 접근 허용:', { userId: user.id, clientId, role: member.role })
      return { user, supabase, profile, role: member.role }
    }
    
    // 클라이언트 멤버가 아니면, 에이전시 멤버인지 확인
    // 클라이언트가 속한 에이전시의 멤버라면 접근 허용
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .maybeSingle()
    
    if (clientError) {
      console.error('[requireClientMember] 클라이언트 조회 오류:', clientError)
    }
    
    if (client && client.agency_id) {
      const { data: agencyMember, error: agencyMemberError } = await supabase
        .from('agency_members')
        .select('role')
        .eq('agency_id', client.agency_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (agencyMemberError) {
        console.error('[requireClientMember] 에이전시 멤버십 조회 오류:', agencyMemberError)
      }
      
      if (agencyMember) {
        console.log('[requireClientMember] 에이전시 멤버로 접근 허용:', { userId: user.id, clientId, agencyId: client.agency_id, role: agencyMember.role })
        // 에이전시 멤버는 클라이언트 대시보드에 접근 가능 (viewer 역할로 처리)
        return { user, supabase, profile, role: 'viewer' as const }
      }
    }
    
    // 권한이 없으면 홈으로 리다이렉트
    console.warn('[requireClientMember] 권한 없음 - 리다이렉트:', { userId: user.id, email: user.email, clientId })
    redirect('/')
  } catch (error: any) {
    // NEXT_REDIRECT는 정상적인 리다이렉트이므로 에러로 처리하지 않음
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // 리다이렉트는 그대로 전파
    }
    console.error('[requireClientMember] 오류 발생:', error)
    console.error('[requireClientMember] 에러 상세:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      clientId,
    })
    redirect('/')
  }
}

