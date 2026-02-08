import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * UUID 생성 (서버 사이드용)
 */
function generateSessionId(): string {
  try {
    // 간단한 UUID v4 생성
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  } catch (error) {
    // 폴백: 타임스탬프 기반 ID
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }
}

/**
 * session_id 쿠키 생성/관리 (Phase 0: 서버 중심 전환)
 */
function ensureSessionIdCookie(req: NextRequest, response: NextResponse): void {
  const SESSION_COOKIE_NAME = 'ef_session_id'
  const SESSION_TTL_MINUTES = 30
  
  // 기존 쿠키 확인
  const existingSessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value
  
  if (!existingSessionId || existingSessionId.trim() === '') {
    // 쿠키가 없으면 생성
    const newSessionId = generateSessionId()
    const isSecure = req.nextUrl.protocol === 'https:'
    
    response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
      maxAge: SESSION_TTL_MINUTES * 60, // 초 단위
      path: '/',
      sameSite: 'lax',
      secure: isSecure,
      httpOnly: false, // 클라이언트에서도 읽을 수 있도록
    })
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const response = NextResponse.next()

  // Phase 0: session_id 쿠키 생성/관리 (이벤트/웨비나 경로)
  // 헌법 원칙: 서버 중심 session_id 관리
  if (
    path.startsWith('/event/') ||
    path.startsWith('/webinar/') ||
    path.startsWith('/s/') ||
    path.startsWith('/api/public/')
  ) {
    ensureSessionIdCookie(req, response)
  }

  // /inev-admin/** 로그인 필수 (소속 클라이언트만 API에서 필터됨)
  if (path.startsWith('/inev-admin')) {
    const res = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => req.cookies.get(name)?.value,
          set: (name: string, value: string, options?: any) => { res.cookies.set({ name, value, ...options }) },
          remove: (name: string, options?: any) => { res.cookies.set({ name, value: '', ...options }) },
        } as any,
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(path), req.url))
    return res
  }

  // /super/** 경로 보호
  if (path.startsWith('/super')) {
    // 쿠키에서 세션 확인
    const response = NextResponse.next()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => req.cookies.get(name)?.value,
          set: (name: string, value: string, options?: any) => {
            // middleware에서는 response.cookies만 수정 가능 (req.cookies는 읽기 전용)
            response.cookies.set({ name, value, ...options })
          },
          remove: (name: string, options?: any) => {
            // middleware에서는 response.cookies만 수정 가능 (req.cookies는 읽기 전용)
            response.cookies.set({ name, value: '', ...options })
          },
        } as any,
      }
    )

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // 슈퍼어드민 권한 확인 (JWT app_metadata 사용 - RLS 재귀 방지)
    let isSuperAdmin = !!user?.app_metadata?.is_super_admin

    // JWT에 app_metadata가 없을 경우 fallback: Admin Supabase로 확인
    // (JWT 토큰 갱신 전까지 임시 조치)
    if (!isSuperAdmin) {
      try {
        // 환경 변수 확인
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[Middleware] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다')
          throw new Error('환경 변수 설정 오류')
        }
        
        const { createClient } = await import('@supabase/supabase-js')
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('[Middleware] 프로필 조회 오류:', profileError)
        }
        
        isSuperAdmin = !!profile?.is_super_admin
        
        console.log('[Middleware] 슈퍼 관리자 권한 확인:', { 
          userId: user.id, 
          email: user.email, 
          isSuperAdmin 
        })
      } catch (error: any) {
        console.error('[Middleware] 프로필 확인 오류:', error)
        console.error('[Middleware] 에러 상세:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        })
      }
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      )
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/inev-admin/:path*',
    '/super/:path*',
    '/event/:path*',
    '/webinar/:path*',
    '/s/:path*',
    '/api/public/:path*'
  ]
}

