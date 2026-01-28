'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import UserMenu from './UserMenu'
import MobileMenu from './MobileMenu'
import TopNavMenu from './TopNavMenu'

interface MenuItem {
  name: string
  href: string
  icon: string
  active?: boolean
}

interface TopNavProps {
  organizations?: {
    isSuperAdmin: boolean
    agencies: Array<{ id: string; name: string; role: string }>
    clients: Array<{ id: string; name: string; role: string; agencyId: string; agencyName: string }>
  } | null
}

export default function TopNav({ organizations: propOrganizations }: TopNavProps = {}) {
  const pathname = usePathname()
  const params = useParams()
  const supabase = useMemo(() => createClientSupabase(), [])
  const [user, setUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<{
    isSuperAdmin: boolean
    agencies: Array<{ id: string; name: string; role: string }>
    clients: Array<{ id: string; name: string; role: string; agencyId: string; agencyName: string }>
  } | null>(propOrganizations || null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    // prop으로 organizations가 전달되지 않은 경우에만 API 호출
    if (!propOrganizations) {
      fetch('/api/user/organizations')
        .then(res => res.json())
        .then(data => {
          setOrganizations(data)
        })
        .catch(err => console.error('조직 목록 조회 실패:', err))
    }
  }, [supabase, propOrganizations])

  // 웨비나 관리 페이지인지 확인
  const isWebinarAdminPage = pathname.includes('/webinar/') && 
    (pathname.includes('/console') || pathname.includes('/registrants') || pathname.includes('/stats'))
  
  // 웨비나 ID 추출
  const webinarId = isWebinarAdminPage ? pathname.match(/\/webinar\/([^\/]+)/)?.[1] : null

  // 역할별 메뉴 구성
  const getMenuItems = (): MenuItem[] => {
    if (!organizations) return []

    // 웨비나 관리 페이지는 WebinarHeader에서 처리하므로 여기서는 기본 메뉴만 표시
    // (WebinarHeader가 별도로 생성될 예정)
    if (isWebinarAdminPage) {
      // 웨비나 관리 페이지에서는 클라이언트로 돌아가기 링크만 표시
      // clientId는 WebinarHeader에서 처리
      return []
    }

    // 슈퍼 관리자 메뉴
    if (organizations.isSuperAdmin) {
      return [
        { name: '대시보드', href: '/super/dashboard', icon: '📊' },
        { name: '에이전시 관리', href: '/super/agencies', icon: '🏢' },
        { name: '클라이언트 관리', href: '/super/clients', icon: '👥' },
        { name: '감사 로그', href: '/super/audit-logs', icon: '📋' },
        { name: '전사 통계', href: '/super/statistics', icon: '📈' },
      ]
    }

    // 에이전시 메뉴
    const agencyId = params?.agencyId as string
    if (agencyId && organizations.agencies?.some(a => a.id === agencyId)) {
      return [
        { name: '대시보드', href: `/agency/${agencyId}/dashboard`, icon: '📊' },
        { name: '클라이언트', href: `/agency/${agencyId}/clients`, icon: '👥' },
        { name: '리포트', href: `/agency/${agencyId}/reports`, icon: '📈' },
        { name: '도메인', href: `/agency/${agencyId}/domains`, icon: '🌐' },
      ]
    }

    // 클라이언트 메뉴
    const clientId = params?.clientId as string
    if (clientId && organizations.clients?.some(c => c.id === clientId)) {
      return [
        { name: '대시보드', href: `/client/${clientId}/dashboard`, icon: '📊' },
        { name: '가입계정관리', href: `/client/${clientId}/accounts`, icon: '👥' },
        { name: '브랜딩', href: `/client/${clientId}/settings/branding`, icon: '🎨' },
        { name: '광고/캠페인', href: `/client/${clientId}/campaigns`, icon: '📈' },
      ]
    }

    return []
  }

  const menuItems = getMenuItems().map(item => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(item.href + '/'),
  }))

  return (
    <>
      <nav 
        className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md h-16 border-b border-gray-200"
        aria-label="메인 네비게이션"
      >
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          {/* 로고 */}
          <Link 
            href="/" 
            className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            EventFlow
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map(item => (
              <TopNavMenu key={item.href} item={item} />
            ))}
            <UserMenu user={user} />
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="메뉴 열기"
            aria-expanded={mobileMenuOpen}
          >
            <span className="text-2xl">☰</span>
          </button>
        </div>
      </nav>

      {/* 모바일 드로어 */}
      {mobileMenuOpen && (
        <MobileMenu
          items={menuItems}
          user={user}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
