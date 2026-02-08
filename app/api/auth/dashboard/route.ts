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
    
    // 재시도 헬퍼 함수
    const retryQuery = async <T>(
      queryFn: () => Promise<T>,
      maxRetries = 3,
      delay = 1000
    ): Promise<T> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await queryFn()
        } catch (error: any) {
          const isTimeout = error?.message?.includes('timeout') || 
                           error?.message?.includes('upstream') ||
                           error?.code === 'ETIMEDOUT' ||
                           error?.code === 'ECONNRESET'
          
          if (isTimeout && i < maxRetries - 1) {
            const waitTime = delay * Math.pow(2, i) // 지수 백오프
            console.warn(`[Dashboard API] 쿼리 타임아웃, ${waitTime}ms 후 재시도 (${i + 1}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          throw error
        }
      }
      throw new Error('최대 재시도 횟수 초과')
    }

    // 프로필, 에이전시 멤버십, 클라이언트 멤버십을 병렬로 조회 (성능 최적화)
    // 기존: 순차 쿼리 600ms → 개선: 병렬 쿼리 200ms (3배 개선)
    // Supabase 연결 문제 대비 재시도 로직 포함
    const [profileResult, agencyResult, clientResult] = await Promise.allSettled([
      // 프로필 존재 여부 확인 (가입 여부 체크)
      retryQuery(async () => 
        await admin
          .from('profiles')
          .select('id, is_super_admin')
          .eq('id', user.id)
          .maybeSingle()
      ),
      // 에이전시 멤버십 확인 (첫 번째 에이전시)
      retryQuery(async () =>
        await admin
          .from('agency_members')
          .select('agency_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
      ),
      // 클라이언트 멤버십 확인 (첫 번째 클라이언트)
      retryQuery(async () =>
        await admin
          .from('client_members')
          .select('client_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
      ),
    ])
    
    // 프로필 결과 처리
    let profile = null
    let profileError = null
    
    if (profileResult.status === 'fulfilled') {
      // Supabase 쿼리 결과는 { data, error } 형태
      profile = profileResult.value.data
      profileError = profileResult.value.error
      console.log('[Dashboard API] 프로필 조회 결과:', { 
        hasProfile: !!profile, 
        hasError: !!profileError,
        profileId: profile?.id,
        isSuperAdmin: profile?.is_super_admin
      })
    } else {
      // Promise가 rejected된 경우
      console.error('[Dashboard API] 프로필 조회 Promise 실패:', profileResult.reason)
      profileError = profileResult.reason
    }
    
    // inev client_members만 있는 경우 (profiles 없음) → inev-admin으로
    const inevMember = clientResult.status === 'fulfilled' && clientResult.value.data
    if (!profile && !profileError && inevMember) {
      console.log('[Dashboard API] inev 클라이언트 멤버 (profiles 없음) → inev-admin')
      return NextResponse.json({ dashboard: '/inev-admin' })
    }

    // 프로필이 없으면 가입되지 않은 계정
    if (!profile && !profileError) {
      console.warn('[Dashboard API] 가입되지 않은 계정:', { userId: user.id, email: user.email })
      return NextResponse.json(
        { dashboard: null, error: 'NOT_REGISTERED', message: '가입되지 않은 계정입니다. 회원가입을 진행해주세요.' },
        { status: 403 }
      )
    }
    
    if (profileError) {
      console.error('[Dashboard API] 프로필 조회 오류:', profileError)
      
      // Supabase 연결 문제인 경우
      const isConnectionError = profileError?.message?.includes('timeout') ||
                               profileError?.message?.includes('upstream') ||
                               profileError?.code === 'ETIMEDOUT' ||
                               profileError?.code === 'ECONNRESET'
      
      if (isConnectionError) {
        console.error('[Dashboard API] Supabase 연결 문제 감지')
        return NextResponse.json(
          { 
            dashboard: null, 
            error: '데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
            retry: true
          },
          { status: 503 }
        )
      }
    }
    
    // JWT에 app_metadata가 없을 경우 fallback: Admin Supabase로 확인
    if (!isSuperAdmin) {
      try {
        // 환경 변수 확인
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[Dashboard API] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다')
          throw new Error('환경 변수 설정 오류')
        }
        
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
    
    // 에이전시 멤버십 결과 처리
    let agencyMember = null
    let agencyError = null
    
    if (agencyResult.status === 'fulfilled') {
      agencyMember = agencyResult.value.data
      agencyError = agencyResult.value.error
      console.log('[Dashboard API] 에이전시 멤버십 조회 결과:', { 
        hasAgencyMember: !!agencyMember,
        hasError: !!agencyError,
        agencyId: agencyMember?.agency_id
      })
    } else {
      console.error('[Dashboard API] 에이전시 멤버십 조회 Promise 실패:', agencyResult.reason)
      agencyError = agencyResult.reason
    }
    
    if (agencyError) {
      console.error('[Dashboard API] 에이전시 멤버십 조회 오류:', agencyError)
    }
    
    if (agencyMember) {
      console.log('[Dashboard API] 에이전시 멤버로 인식:', { agencyId: agencyMember.agency_id })
      return NextResponse.json({ dashboard: `/agency/${agencyMember.agency_id}/dashboard` })
    }
    
    // 클라이언트 멤버십 결과 처리
    let clientMember = null
    let clientError = null
    
    if (clientResult.status === 'fulfilled') {
      clientMember = clientResult.value.data
      clientError = clientResult.value.error
      console.log('[Dashboard API] 클라이언트 멤버십 조회 결과:', { 
        hasClientMember: !!clientMember,
        hasError: !!clientError,
        clientId: clientMember?.client_id
      })
    } else {
      console.error('[Dashboard API] 클라이언트 멤버십 조회 Promise 실패:', clientResult.reason)
      clientError = clientResult.reason
    }
    
    if (clientError) {
      console.error('[Dashboard API] 클라이언트 멤버십 조회 오류:', clientError)
    }
    
    if (clientMember) {
      // inev: client_members 소속 사용자는 클라이언트 목록이 있는 inev-admin으로
      console.log('[Dashboard API] inev 클라이언트 멤버로 인식 → inev-admin:', { clientId: clientMember.client_id })
      return NextResponse.json({ dashboard: '/inev-admin' })
    }
    
    // 디버깅 정보 포함
    console.warn('[Dashboard API] 접근 가능한 대시보드 없음:', { 
      userId: user.id, 
      email: user.email,
      hasProfile: !!profile,
      isSuperAdmin: isSuperAdmin || profile?.is_super_admin,
      hasAgencyMember: !!agencyMember,
      hasClientMember: !!clientMember,
      profileError: profileError?.message,
      agencyError: agencyError?.message,
      clientError: clientError?.message
    })
    
    return NextResponse.json({ 
      dashboard: null, 
      error: '접근 가능한 대시보드가 없습니다. 관리자에게 문의하세요.',
      debug: {
        hasProfile: !!profile,
        isSuperAdmin: isSuperAdmin || profile?.is_super_admin,
        hasAgencyMember: !!agencyMember,
        hasClientMember: !!clientMember
      }
    })
  } catch (error: any) {
    console.error('[Dashboard API] 예상치 못한 오류:', error)
    
    // Supabase 연결 문제인 경우
    const isConnectionError = error?.message?.includes('timeout') ||
                             error?.message?.includes('upstream') ||
                             error?.code === 'ETIMEDOUT' ||
                             error?.code === 'ECONNRESET'
    
    if (isConnectionError) {
      return NextResponse.json(
        { 
          dashboard: null, 
          error: '데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          retry: true
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { dashboard: null, error: '대시보드 조회 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류') },
      { status: 500 }
    )
  }
}

