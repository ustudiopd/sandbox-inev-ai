'use client'

import { useState } from 'react'
import Link from 'next/link'

interface UnifiedListItemProps {
  item: {
    type: 'webinar' | 'ondemand' | 'survey' | 'registration'
    id: string
    slug?: string | null
    title: string
    project_name?: string | null
    start_time?: string | null
    public_path?: string
    created_at: string
  }
  clientId: string
}

export default function UnifiedListItem({ item, clientId }: UnifiedListItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isWebinar = item.type === 'webinar'
  const isOnDemand = item.type === 'ondemand'
  const isRegistration = item.type === 'registration'
  
  // 웨비나/온디맨드의 경우: slug 사용
  let webinarSlug = null
  if (isWebinar || isOnDemand) {
    webinarSlug = item.slug || item.id
  }
  
  const actions = isWebinar ? [
    { label: '공개페이지', href: `/webinar/${webinarSlug}`, target: '_blank', color: 'blue' },
    { label: '콘솔', href: `/client/${clientId}/webinars/${item.id}`, color: 'purple' },
    { label: '통계', href: `/client/${clientId}/webinars/${item.id}?tab=stats`, color: 'blue' },
    { label: '관리자 접속', href: `/webinar/${webinarSlug}/live?admin=true`, color: 'green' },
  ] : isOnDemand ? [
    { label: '공개페이지', href: `/ondemand/${webinarSlug}`, target: '_blank', color: 'teal' },
    { label: '세션 목록', href: `/ondemand/${webinarSlug}/watch`, target: '_blank', color: 'teal' },
    { label: '콘솔', href: `/client/${clientId}/webinars/${item.id}`, color: 'purple' },
  ] : [
    { label: '공개페이지', href: `/event${item.public_path}`, target: '_blank', color: 'blue' },
    { label: '콘솔', href: `/client/${clientId}/surveys/${item.id}`, color: 'purple' },
    { label: '통계', href: `/client/${clientId}/surveys/${item.id}`, color: 'blue' },
    { label: '관리자 접속', href: `/event${item.public_path}`, target: '_blank', color: 'green' },
  ]
  
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white',
      green: 'bg-green-600 hover:bg-green-700 text-white',
      teal: 'bg-teal-600 hover:bg-teal-700 text-white',
    }
    return colors[color] || colors.blue
  }
  
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`px-2 py-1 text-xs font-semibold rounded flex-shrink-0 ${
            isWebinar 
              ? 'bg-blue-100 text-blue-800' 
              : isOnDemand
              ? 'bg-teal-100 text-teal-800'
              : isRegistration
              ? 'bg-cyan-100 text-cyan-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            {isWebinar ? '웨비나' : isOnDemand ? '온디맨드' : isRegistration ? '등록' : '설문'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 truncate">
              {!isWebinar && item.public_path === '/149403' 
                ? 'AI 특허리서치 실무 활용 웨비나'
                : isWebinar && webinarSlug === '149402'
                ? 'Wert 웨비나'
                : isWebinar && webinarSlug === '149404'
                ? '0206wert웨비나'
                : (isWebinar && item.project_name ? item.project_name : item.title)}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
              {isWebinar || isOnDemand
                ? (webinarSlug ? `경로: /${webinarSlug}` : (item.start_time ? new Date(item.start_time).toLocaleString('ko-KR') : '일정 미정'))
                : (item.public_path ? `경로: ${item.public_path}` : new Date(item.created_at).toLocaleString('ko-KR'))
              }
            </div>
          </div>
        </div>
        
        {/* 모바일: Kebab 메뉴 버튼 */}
        <div className="md:hidden flex justify-end">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
            aria-label="메뉴 열기"
          >
            <span className="text-xl">⋯</span>
          </button>
        </div>
        
        {/* 데스크톱: 기존 버튼 레이아웃 */}
        <div className="hidden md:flex gap-2 items-center">
          {actions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              target={action.target}
              className={`px-4 py-2 ${getColorClasses(action.color)} rounded-lg transition-colors text-sm font-medium whitespace-nowrap min-h-[44px] flex items-center justify-center`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
      
      {/* 모바일 Bottom Sheet */}
      {isMenuOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl shadow-lg z-50 md:hidden animate-slide-up">
            <div className="p-4">
              {/* 드래그 핸들 */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              
              {/* 액션 목록 */}
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    target={action.target}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-4 py-3 ${getColorClasses(action.color)} rounded-lg min-h-[44px] flex items-center transition-colors`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
              
              {/* 닫기 버튼 */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-full mt-4 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px] flex items-center justify-center font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </>
  )
}

