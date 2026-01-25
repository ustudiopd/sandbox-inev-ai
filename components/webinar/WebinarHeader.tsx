'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface WebinarHeaderProps {
  webinar: {
    id: string
    title: string
    slug?: string | null
    client_id: string
    clients?: {
      id: string
      name: string
      logo_url?: string | null
    } | null
  }
}

export default function WebinarHeader({ webinar }: WebinarHeaderProps) {
  const pathname = usePathname()
  const webinarSlug = webinar.slug || webinar.id

  // 현재 활성 탭 확인 (콘솔 페이지인지 확인)
  const isConsole = pathname.includes('/console')

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm fixed top-16 left-0 right-0 z-40 h-[144px]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* 상단: 클라이언트로 돌아가기 링크 */}
        <div className="mb-2">
          <Link
            href={`/client/${webinar.client_id}/dashboard`}
            className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium inline-flex items-center gap-1"
          >
            <span>←</span>
            <span>클라이언트로 돌아가기</span>
          </Link>
        </div>

        {/* 웨비나 제목 및 로고 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-0.5">
                {webinar.title}
              </h1>
              <p className="text-xs text-gray-600">웨비나 관리</p>
            </div>
            {webinar.clients?.logo_url && (
              <img
                src={webinar.clients.logo_url}
                alt={webinar.clients.name}
                className="h-10 w-auto"
              />
            )}
          </div>
        </div>

        {/* 서브 메뉴 탭 */}
        <div className="flex items-center gap-1 border-b border-gray-200 -mb-3">
          <Link
            href={`/webinar/${webinarSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
          >
            <span className="mr-2">🌐</span>
            공개페이지
          </Link>
          <Link
            href={`/webinar/${webinarSlug}/live?admin=true&from=console`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
          >
            <span className="mr-2">👤</span>
            관리자 접속
          </Link>
        </div>
      </div>
    </div>
  )
}
