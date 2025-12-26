'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useSidebar } from './SidebarContext'
import SidebarTree from './SidebarTree'

interface NavItem {
  name: string
  href: string
  icon: string
  section?: 'overview' | 'manage' | 'current-event' | 'insights' | 'settings'
  hidden?: boolean
  disabled?: boolean
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const supabase = createClientSupabase()
  const { sidebarWidth } = useSidebar()
  const [user, setUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<{
    isSuperAdmin: boolean
    agencies: Array<{ id: string; name: string; role: string }>
    clients: Array<{ id: string; name: string; role: string; agencyId: string; agencyName: string }>
  } | null>(null)
  const [showModeSwitcher, setShowModeSwitcher] = useState(false)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
    
    // 조직 목록 조회
    fetch('/api/user/organizations')
      .then(res => res.json())
      .then(data => {
        setOrganizations(data)
        // 에이전시와 클라이언트 모두 있으면 모드 전환 표시
        if (data.agencies?.length > 0 && data.clients?.length > 0) {
          setShowModeSwitcher(true)
        }
      })
      .catch(err => console.error('조직 목록 조회 실패:', err))
  }, [supabase])
  
  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return
    
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
  
  // 공개 페이지에서는 사이드바 숨김
  const isPublicPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')
  // 슈퍼 관리자 페이지는 별도 사이드바 사용
  const isSuperPage = pathname.includes('/super/')
  if (isPublicPage || isSuperPage) return null
  
  return (
    <>
      {/* 데스크톱 사이드바 */}
      <aside className="hidden lg:flex bg-gradient-to-b from-gray-900 to-gray-800 text-white min-h-screen fixed left-0 top-0 flex-col transition-all duration-300 z-50 w-64">
        <div className="p-6 flex items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            EventFlow
          </Link>
        </div>
        
        {/* 트리 구조 네비게이션 */}
        <SidebarTree organizations={organizations} />
        <div className="p-4 border-t border-gray-700">
          {user && (
            <div className="mb-3 px-4 py-2">
              <p className="text-sm text-gray-400 truncate" title={user.email}>
                {user.email}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 rounded-lg"
          >
            <span className="text-xl flex-shrink-0">🚪</span>
            <span className="font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 모바일 하단 메뉴 - 트리 구조는 데스크톱 전용 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-b from-gray-900 to-gray-800 text-white border-t border-gray-700 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] text-red-400 hover:text-red-300 hover:bg-red-900/20"
            title="로그아웃"
          >
            <span className="text-2xl">🚪</span>
            <span className="text-xs font-medium">로그아웃</span>
          </button>
        </div>
      </nav>
    </>
  )
}

