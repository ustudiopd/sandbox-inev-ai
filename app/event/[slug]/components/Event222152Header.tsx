'use client'

import Image from 'next/image'
import Link from 'next/link'

interface Event222152HeaderProps {
  slug: string
  variant?: 'default' | 'overview' | 'collaboration-style' | 'session-guide' | 'experience-program' | 'today-menu' | 'gallery'
}

const menuItemClass =
  "text-center text-[8px] lg:text-[10px] xl:text-[12px] font-medium font-['Pretendard'] leading-6 whitespace-nowrap"

export default function Event222152Header({ slug, variant = 'default' }: Event222152HeaderProps) {
  const isOverview = variant === 'overview'
  const isCollaborationStyle = variant === 'collaboration-style'
  const isSessionGuide = variant === 'session-guide'
  const isExperienceProgram = variant === 'experience-program'
  const isTodayMenu = variant === 'today-menu'
  const isGallery = variant === 'gallery'
  const isSubPage = isOverview || isCollaborationStyle || isSessionGuide || isExperienceProgram || isTodayMenu || isGallery

  const headerWrapperClass = isSubPage
    ? 'sticky top-0 h-[80px] w-[1920px] max-w-full mx-auto border-b border-black overflow-hidden z-20'
    : 'w-full h-[80px] left-0 top-0 absolute overflow-hidden border-b border-black bg-[rgba(249,249,249,0.6)] z-40'

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

        {/* 메뉴 - 가운데 정렬, 반응형 */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-4 lg:gap-8 xl:gap-12">
          <div className={`h-8 py-1.5 flex justify-center items-center ${isOverview ? 'border-b-2 border-black' : ''}`}>
            {isOverview ? (
              <span className={`${menuItemClass} text-gray-900`}>행사개요</span>
            ) : (
              <Link
                href={`/event/${slug}/overview`}
                className={`${menuItemClass} text-gray-900 cursor-pointer block w-full h-full flex items-center justify-center`}
                scroll={true}
              >
                행사개요
              </Link>
            )}
          </div>
          <div className={`h-8 py-1.5 flex justify-center items-center ${isCollaborationStyle ? 'border-b-2 border-black' : ''}`}>
            {isCollaborationStyle ? (
              <span className={`${menuItemClass} text-gray-900`}>협업스타일 진단</span>
            ) : (
              <Link
                href={`/event/${slug}/collaboration-style`}
                className={`${menuItemClass} text-gray-700 cursor-pointer block w-full h-full flex items-center justify-center hover:text-gray-900`}
                scroll={true}
              >
                협업스타일 진단
              </Link>
            )}
          </div>
          <div className={`h-8 py-1.5 flex justify-center items-center ${isSessionGuide ? 'border-b-2 border-black' : ''}`}>
            {isSessionGuide ? (
              <span className={`${menuItemClass} text-gray-900`}>세션 안내</span>
            ) : (
              <Link
                href={`/event/${slug}/session-guide`}
                className={`${menuItemClass} text-gray-700 cursor-pointer block w-full h-full flex items-center justify-center hover:text-gray-900`}
                scroll={true}
              >
                세션 안내
              </Link>
            )}
          </div>
          <div className={`h-8 py-1.5 flex justify-center items-center ${isExperienceProgram ? 'pb-[6px] border-b-2 border-black' : ''}`}>
            {isExperienceProgram ? (
              <span className={`${menuItemClass} text-gray-900`}>체험 프로그램</span>
            ) : (
              <Link
                href={`/event/${slug}/experience-program`}
                className={`${menuItemClass} text-gray-700 cursor-pointer block w-full h-full flex items-center justify-center hover:text-gray-900`}
                scroll={true}
              >
                체험 프로그램
              </Link>
            )}
          </div>
          <div className={`h-8 py-1.5 flex justify-center items-center ${isTodayMenu ? 'pb-[6px] border-b-2 border-black' : ''}`}>
            {isTodayMenu ? (
              <span className={`${menuItemClass} text-gray-900`}>오늘의 메뉴</span>
            ) : (
              <Link
                href={`/event/${slug}/menu`}
                className={`${menuItemClass} text-gray-700 cursor-pointer block w-full h-full flex items-center justify-center hover:text-gray-900`}
                scroll={true}
              >
                오늘의 메뉴
              </Link>
            )}
          </div>
          <div className="h-8 py-1.5 flex justify-center items-center">
            {isGallery ? (
              <span className={`${menuItemClass} text-gray-900`}>갤러리</span>
            ) : (
              <Link
                href={`/event/${slug}/gallery`}
                className={`${menuItemClass} text-gray-700 cursor-pointer block w-full h-full flex items-center justify-center hover:text-gray-900`}
                scroll={true}
              >
                갤러리
              </Link>
            )}
          </div>
        </div>

        {/* 메뉴 오른쪽 819px, 홍길동 (0.8배 축소) */}
        <div
          className="absolute top-1/2 hidden h-7 w-[68px] items-center justify-center rounded-[100px] border border-[#111] md:flex"
          style={{
            left: 'calc(50% + 619px)',
            transform: 'translateY(-50%) scale(0.8)',
          }}
        >
          <span
            className="text-center font-['Pretendard'] text-base font-medium leading-[140%] text-[#111]"
            style={{ letterSpacing: '-0.4px' }}
          >
            홍길동
          </span>
        </div>
      </div>
    </div>
  )
}
