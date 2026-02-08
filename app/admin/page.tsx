'use client'

import { useState } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClientSupabase()
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // "admin"을 이메일로 사용하는 경우 처리
      const loginEmail = email === 'admin' ? 'admin@eventlive.ai' : email
      
      const { error: loginError, data } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })
      
      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }
      
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        try {
          const response = await fetch('/api/auth/dashboard')
          const result = await response.json()
          
          if (result.dashboard) {
            router.push(result.dashboard)
            router.refresh()
            return
          }
          
          // 대시보드가 없으면 에러 메시지 표시
          if (result.error) {
            setError(result.error)
          } else {
            setError('접근 권한이 없습니다. 관리자에게 문의하세요.')
          }
        } catch (err) {
          console.error('대시보드 리다이렉트 오류:', err)
          setError('대시보드 접근 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        }
      } else {
        setError('로그인에 실패했습니다.')
      }
      
      setLoading(false)
      return
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Inev.ai
            </h1>
            <p className="text-gray-600">관리자 로그인</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                  <div className="font-semibold mb-1">오류</div>
                  <div>{error}</div>
                  {error.includes('권한') && (
                    <div className="mt-2 text-sm text-red-600">
                      💡 관리자 권한이 설정되지 않았거나 JWT 토큰이 만료되었을 수 있습니다. 
                      관리자에게 문의하거나 재로그인을 시도해주세요.
                    </div>
                  )}
                </div>
              )}
              
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="admin 또는 your@email.com"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    disabled={loading}
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
          </div>
        </div>
      </div>
    </main>
  )
}

