'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'
import { useEffect, useState, useMemo } from 'react'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const supabase = useMemo(() => createClientSupabase(), [])
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [supabase])
  
  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setDashboardLoading(true)
    
    try {
      // API를 통해 대시보드 경로 가져오기 (DashboardButton과 동일한 로직)
      const response = await fetch('/api/auth/dashboard')
      const { dashboard, error } = await response.json()
      
      if (error) {
        alert(error)
        setDashboardLoading(false)
        return
      }
      
      if (dashboard) {
        router.push(dashboard)
        router.refresh()
        return
      }
      
      // 대시보드가 없으면 홈으로
      alert('접근 가능한 대시보드가 없습니다.')
    } catch (err) {
      console.error('대시보드 리다이렉트 오류:', err)
      alert('대시보드 접근 중 오류가 발생했습니다.')
    } finally {
      setDashboardLoading(false)
    }
  }
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 오류:', error)
        alert('로그아웃 중 오류가 발생했습니다: ' + error.message)
        return
      }
      
      // 세션이 제대로 삭제되었는지 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // 세션이 남아있으면 강제로 삭제
        await supabase.auth.signOut()
      }
      
      // 메인 페이지로 리다이렉트 (강제 새로고침)
      window.location.href = '/'
    } catch (error: any) {
      console.error('로그아웃 오류:', error)
      alert('로그아웃 중 오류가 발생했습니다')
      // 에러가 발생해도 메인 페이지로 이동 시도
      window.location.href = '/'
    }
  }
  
  const isPublicPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isUnsubscribePage = pathname.startsWith('/unsubscribe')
  
  // 수신거부 페이지는 헤더 숨김
  if (isUnsubscribePage) {
    return null
  }
  
  if (isPublicPage) {
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              EventFlow
            </Link>
            <div className="flex gap-4">
              {user ? (
                <>
                  <button
                    onClick={handleDashboardClick}
                    disabled={dashboardLoading}
                    className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dashboardLoading ? '로딩 중...' : '대시보드'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link href="/admin" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  관리자 접속
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    )
  }
  
  return null
}

