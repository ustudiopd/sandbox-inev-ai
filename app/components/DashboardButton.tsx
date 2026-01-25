'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

interface DashboardButtonProps {
  className?: string
}

export default function DashboardButton({ className = '' }: DashboardButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // API를 통해 대시보드 경로 가져오기
      const response = await fetch('/api/auth/dashboard')
      const { dashboard, error } = await response.json()

      if (error) {
        alert(error)
        setLoading(false)
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
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-8 py-3.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? '로딩 중...' : '대시보드로 이동'} <ArrowRight className="ml-2 w-4 h-4" />
    </button>
  )
}
