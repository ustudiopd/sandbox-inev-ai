'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClientSupabase } from '@/lib/supabase/client'
import { useMemo } from 'react'

interface UserMenuProps {
  user: any
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClientSupabase(), [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
      >
        로그인
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="사용자 메뉴"
        aria-expanded={isOpen}
      >
        <span className="text-sm text-gray-600 truncate max-w-[120px]">
          {user.email}
        </span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <Link
            href="/settings/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <span className="mr-2">⚙️</span>
            계정 설정
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="mr-2">🚪</span>
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
