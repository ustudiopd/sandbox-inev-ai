'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ALLOWED_NEXT_PREFIXES = ['/inev-admin', '/agency/', '/client/', '/super/']

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || ''
  const safeNext = nextUrl && ALLOWED_NEXT_PREFIXES.some((p) => nextUrl.startsWith(p)) ? nextUrl : null
  const supabase = createClientSupabase()
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // "admin"을 이메일로 사용하는 경우 처리
    // Supabase Auth는 이메일 형식을 요구하므로, "admin"을 "admin@eventlive.ai"로 변환
    const loginEmail = email === 'admin' ? 'admin@eventlive.ai' : email
    
    const { error, data } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })
    
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }
    
    // 사용자 역할에 따라 적절한 대시보드로 리다이렉트
    if (data.user) {
      // 성능 최적화: 슈퍼 관리자는 JWT에서 즉시 확인하여 빠른 리다이렉트
      const isSuperAdmin = !!data.user.app_metadata?.is_super_admin
      if (isSuperAdmin) {
        const redirectTo = safeNext || '/super/dashboard'
        router.push(redirectTo)
        router.refresh()
        return
      }
      
      try {
        // API를 통해 대시보드 경로 가져오기 (서버 사이드에서 RLS 정책 적용)
        // 슈퍼 관리자가 아닌 경우에만 API 호출 (성능 개선)
        const response = await fetch('/api/auth/dashboard')
        const result = await response.json()
        
        // 가입되지 않은 계정인 경우
        if (result.error === 'NOT_REGISTERED') {
          alert('가입되지 않은 계정입니다. 회원가입을 진행해주세요.')
          // 로그아웃 처리
          await supabase.auth.signOut()
          // 메인 페이지로 리다이렉트
          router.push('/')
          router.refresh()
          setLoading(false)
          return
        }
        
        if (result.dashboard) {
          // next 파라미터가 허용 목록에 있으면 해당 경로로 복귀 (예: /inev-admin)
          const redirectTo = safeNext || result.dashboard
          router.push(redirectTo)
          router.refresh()
          return
        }
      } catch (err) {
        console.error('대시보드 리다이렉트 오류:', err)
      }
    }
    
    // 대시보드가 없으면 홈으로 (홈페이지에서 다시 확인)
    router.push('/')
    router.refresh()
    setLoading(false)
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            로그인
          </h1>
          <p className="text-gray-600">Inev.ai에 오신 것을 환영합니다</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="admin 또는 your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="/reset-password" className="block text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors">
            비밀번호를 잊으셨나요?
          </a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
          <div className="text-center">
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

