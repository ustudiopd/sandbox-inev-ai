'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Event222152HeaderProps {
  slug: string
  variant?: 'default' | 'overview' | 'collaboration-style' | 'session-guide' | 'experience-program' | 'today-menu' | 'gallery' | 'profile'
}

const menuItemClass =
  "text-center text-[9px] lg:text-[11px] xl:text-[13px] font-medium font-['Pretendard'] leading-6 whitespace-nowrap"

const navItems: { path: string; label: string; variant: Event222152HeaderProps['variant'] }[] = [
  { path: 'overview', label: '행사개요', variant: 'overview' },
  { path: 'collaboration-style', label: '협업스타일 진단', variant: 'collaboration-style' },
  { path: 'session-guide', label: '세션 안내', variant: 'session-guide' },
  { path: 'experience-program', label: '체험 프로그램', variant: 'experience-program' },
  { path: 'menu', label: '오늘의 메뉴', variant: 'today-menu' },
  { path: 'gallery', label: '갤러리', variant: 'gallery' },
]

export default function Event222152Header({ slug, variant = 'default' }: Event222152HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isOverview = variant === 'overview'
  const isCollaborationStyle = variant === 'collaboration-style'
  const isSessionGuide = variant === 'session-guide'
  const isExperienceProgram = variant === 'experience-program'
  const isTodayMenu = variant === 'today-menu'
  const isGallery = variant === 'gallery'
  const isProfile = variant === 'profile'
  const isSubPage = isOverview || isCollaborationStyle || isSessionGuide || isExperienceProgram || isTodayMenu || isGallery || isProfile

  const headerWrapperClass = isSubPage
    ? 'sticky top-0 h-[80px] w-full max-w-[1920px] mx-auto border-b border-black z-20 bg-[rgba(249,249,249,0.60)]'
    : `w-full h-[80px] left-0 top-0 absolute border-b border-black bg-[rgba(249,249,249,0.6)] z-40 ${mobileMenuOpen ? 'overflow-visible' : 'overflow-hidden'}`

  const headerBgStyle = isSubPage ? { background: 'rgba(249, 249, 249, 0.60)' } : undefined
  const innerBorderClass = isSubPage ? '' : ''

  return (
    <div className={headerWrapperClass} style={headerBgStyle}>
      <div className={`w-full max-w-[1920px] h-full mx-auto px-4 sm:px-8 md:px-16 lg:px-[250px] relative flex items-center justify-between ${innerBorderClass}`}>
        {/* 홈 버튼 - 메인으로 링크 */}
        <Link href={`/event/${slug}`} className="w-12 h-12 sm:w-14 sm:h-14 relative overflow-hidden flex-shrink-0 block" aria-label="메인으로">
          <Image
            src="/img/gcbio/Home_button.png"
            alt="메인으로"
            className="object-contain"
            fill
            sizes="56px"
            priority
          />
        </Link>

        {/* 데스크톱 메뉴 - 가운데 정렬 */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-4 lg:gap-8 xl:gap-12">
          {navItems.map(({ path, label, variant: v }) => {
            const isActive = variant === v
            return (
              <div key={path} className={`h-8 py-1.5 flex justify-center items-center ${isActive ? 'border-b-2 border-black' : ''}`}>
                {isActive ? (
                  <span className={`${menuItemClass} text-gray-900`}>{label}</span>
                ) : (
                  <Link
                    href={`/event/${slug}/${path}`}
                    className={`${menuItemClass} text-gray-700 cursor-pointer block w-full h-full flex items-center justify-center hover:text-gray-900 ${isActive ? '' : ''}`}
                    scroll={true}
                  >
                    {label}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* 모바일: 햄버거 + 프로필 영역 */}
        <div className="flex md:hidden items-center gap-3">
          <Link
            href={`/event/${slug}/profile`}
            className={`flex h-9 min-w-[72px] items-center justify-center rounded-[100px] border border-[#111] px-3 ${
              isProfile ? 'bg-[#111]' : ''
            }`}
            aria-label="홍길동 프로필"
          >
            <span
              className={`text-center font-['Pretendard'] text-sm font-medium leading-[140%] ${
                isProfile ? 'text-white' : 'text-[#111]'
              }`}
              style={{ letterSpacing: '-0.4px' }}
            >
              홍길동
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="p-2 border-0 bg-transparent cursor-pointer rounded"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {/* 데스크톱: 프로필 링크 */}
        <Link
          href={`/event/${slug}/profile`}
          className={`absolute top-1/2 hidden h-7 w-[68px] items-center justify-center rounded-[100px] border border-[#111] md:flex ${
            isProfile ? 'bg-[#111]' : ''
          }`}
          style={{
            left: 'calc(50% + 619px)',
            transform: 'translateY(-50%) scale(0.8)',
          }}
          aria-label="홍길동 프로필"
        >
          <span
            className={`text-center font-['Pretendard'] text-base font-medium leading-[140%] ${
              isProfile ? 'text-white' : 'text-[#111]'
            }`}
            style={{ letterSpacing: '-0.4px' }}
          >
            홍길동
          </span>
        </Link>
      </div>

      {/* 모바일 메뉴 패널 */}
      {mobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 z-30 border-b border-black bg-[rgba(249,249,249,0.98)] shadow-lg"
          aria-label="메뉴"
        >
          <nav className="flex flex-col py-4 px-4">
            {navItems.map(({ path, label, variant: v }) => {
              const isActive = variant === v
              return (
                <Link
                  key={path}
                  href={`/event/${slug}/${path}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-['Pretendard'] py-3 px-2 text-base font-medium leading-[140%] ${
                    isActive ? 'text-gray-900 border-l-4 border-black pl-4' : 'text-gray-700'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
