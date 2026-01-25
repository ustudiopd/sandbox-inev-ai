'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClientSupabase } from '@/lib/supabase/client'
import { useMemo } from 'react'

interface MenuItem {
  name: string
  href: string
  icon: string
  active?: boolean
}

interface MobileMenuProps {
  items: MenuItem[]
  user: any
  onClose: () => void
}

export default function MobileMenu({ items, user, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLAnchorElement>(null)
  const supabase = useMemo(() => createClientSupabase(), [])

  useEffect(() => {
    // ESC 키로 닫기
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // 포커스를 첫 번째 메뉴 항목으로 이동
    if (firstItemRef.current) {
      firstItemRef.current.focus()
    }

    document.addEventListener('keydown', handleEscape)
    // 배경 요소에 aria-hidden 설정
    const mainContent = document.querySelector('main')
    if (mainContent) {
      mainContent.setAttribute('aria-hidden', 'true')
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden')
      }
    }
  }, [onClose])

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
        await supabase.auth.signOut()
      }

      window.location.href = '/'
    } catch (error: any) {
      console.error('로그아웃 오류:', error)
      alert('로그아웃 중 오류가 발생했습니다')
      window.location.href = '/'
    }
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 드로어 메뉴 */}
      <nav
        ref={menuRef}
        className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-40 transform transition-transform"
        aria-label="메인 네비게이션"
        aria-hidden="false"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="메뉴 닫기"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* 메뉴 항목 */}
          <div className="flex-1 overflow-y-auto py-4">
            {items.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                ref={index === 0 ? firstItemRef : undefined}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors
                  ${item.active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </div>

          {/* 사용자 정보 및 로그아웃 */}
          {user && (
            <div className="border-t border-gray-200 p-4">
              <div className="mb-3 px-2">
                <p className="text-sm text-gray-600 truncate" title={user.email}>
                  {user.email}
                </p>
              </div>
              <Link
                href="/settings/profile"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">⚙️</span>
                <span className="font-medium">계정 설정</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
