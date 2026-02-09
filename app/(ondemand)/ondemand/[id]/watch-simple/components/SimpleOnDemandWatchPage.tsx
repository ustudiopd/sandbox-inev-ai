'use client'

import { notFound } from 'next/navigation'

interface SimpleOnDemandWatchPageProps {
  webinar: any
  session: any
}

/**
 * 온디맨드 간단 시청 페이지 컴포넌트
 * TODO: 구현 필요
 */
export default function SimpleOnDemandWatchPage({ webinar, session }: SimpleOnDemandWatchPageProps) {
  // 임시 구현
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-black text-lg">SimpleOnDemandWatchPage - 구현 필요</div>
    </div>
  )
}
