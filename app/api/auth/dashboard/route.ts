import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 사용자의 역할에 따라 적절한 대시보드 경로를 반환합니다.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('[Dashboard API] 사용자 인증 오류:', userError)
      return NextResponse.json({ dashboard: null, error: '인증 오류: ' + userError.message }, { status: 401 })
    }
    
    if (!user) {
      console.warn('[Dashboard API] 로그인되지 않은 사용자')
      return NextResponse.json({ dashboard: null, error: '로그인이 필요합니다' }, { status: 401 })
    }
    
    console.log('[Dashboard API] 사용자 확인:', { userId: user.id, email: user.email })
    
    // Admin Supabase 사용 (RLS 우회)
    const admin = createAdminSupabase()
    
    // 슈퍼 관리자 확인 (JWT app_metadata 사용 - RLS 재귀 방지)
    let isSuperAdmin = !!user?.app_metadata?.is_super_admin
    
    // JWT에 app_metadata가 없을 경우 fallback: Admin Supabase로 확인
    if (!isSuperAdmin) {
      try {
        // 환경 변수 확인
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[Dashboard API] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다')
          throw new Error('환경 변수 설정 오류')
        }
        
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('[Dashboard API] 프로필 조회 오류:', profileError)
          console.error('[Dashboard API] 프로필 조회 오류 상세:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code,
          })
        }
        
        if (profile?.is_super_admin) {
          isSuperAdmin = true
          // JWT app_metadata 동기화 (재로그인 필요 안내)
          console.warn(`⚠️  사용자 ${user.email}의 JWT에 app_metadata가 없습니다. 재로그인하여 JWT를 갱신하세요.`)
        } else {
          console.log('[Dashboard API] 슈퍼 관리자 권한 없음:', { userId: user.id, email: user.email })
        }
      } catch (error: any) {
        console.error('[Dashboard API] 프로필 확인 오류:', error)
        console.error('[Dashboard API] 프로필 확인 오류 상세:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        })
      }
    }
    
    if (isSuperAdmin) {
      console.log('[Dashboard API] 슈퍼 관리자로 인식:', user.email)
      return NextResponse.json({ dashboard: '/super/dashboard' })
    }
    
    // 에이전시 멤버십 확인 (첫 번째 에이전시) - Admin Supabase 사용
    const { data: agencyMember, error: agencyError } = await admin
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    
    if (agencyError) {
      console.error('[Dashboard API] 에이전시 멤버십 조회 오류:', agencyError)
    }
    
    if (agencyMember) {
      console.log('[Dashboard API] 에이전시 멤버로 인식:', { agencyId: agencyMember.agency_id })
      return NextResponse.json({ dashboard: `/agency/${agencyMember.agency_id}/dashboard` })
    }
    
    // 클라이언트 멤버십 확인 (첫 번째 클라이언트) - Admin Supabase 사용
    const { data: clientMember, error: clientError } = await admin
      .from('client_members')
      .select('client_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    
    if (clientError) {
      console.error('[Dashboard API] 클라이언트 멤버십 조회 오류:', clientError)
    }
    
    if (clientMember) {
      console.log('[Dashboard API] 클라이언트 멤버로 인식:', { clientId: clientMember.client_id })
      return NextResponse.json({ dashboard: `/client/${clientMember.client_id}/dashboard` })
    }
    
    console.warn('[Dashboard API] 접근 가능한 대시보드 없음:', { userId: user.id, email: user.email })
    return NextResponse.json({ dashboard: null, error: '접근 가능한 대시보드가 없습니다. 관리자에게 문의하세요.' })
  } catch (error: any) {
    console.error('[Dashboard API] 예상치 못한 오류:', error)
    return NextResponse.json(
      { dashboard: null, error: '대시보드 조회 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류') },
      { status: 500 }
    )
  }
}

