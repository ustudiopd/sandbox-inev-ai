'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getGcbioImageUrl } from '../lib/gcbio-images'

interface Event222152HeaderProps {
  slug: string
  variant?: 'default' | 'overview' | 'collaboration-style' | 'session-guide' | 'experience-program' | 'gallery'
}

const menuItemClass =
  "text-center text-[8px] lg:text-[10px] xl:text-[12px] font-medium font-['Pretendard'] leading-6 whitespace-nowrap"

export default function Event222152Header({ slug, variant = 'default' }: Event222152HeaderProps) {
  const isOverview = variant === 'overview'
  const isCollaborationStyle = variant === 'collaboration-style'
  const isSessionGuide = variant === 'session-guide'
  const isExperienceProgram = variant === 'experience-program'
  const isGallery = variant === 'gallery'
  const isSubPage = isOverview || isCollaborationStyle || isSessionGuide || isExperienceProgram || isGallery

  const headerWrapperClass = isSubPage
    ? 'sticky top-0 w-full max-w-[1920px] h-[80px] mx-auto border border-black overflow-hidden z-20'
    : 'w-full h-[80px] left-0 top-0 absolute bg-white border-b border-gray-200 overflow-hidden z-10'

  const headerBgStyle = isSubPage ? { background: 'rgba(249, 249, 249, 0.60)' } : undefined
  const innerBorderClass = isSubPage ? '' : 'border border-black'

  return (
    <div className={headerWrapperClass} style={headerBgStyle}>
      <div className={`w-full max-w-[1920px] h-full mx-auto px-4 sm:px-8 md:px-16 lg:px-[250px] relative flex items-center justify-between ${innerBorderClass}`}>
        {/* 로고 영역 - 메인으로 링크 */}
        <Link href={`/event/${slug}`} className="w-24 sm:w-32 md:w-40 h-7 sm:h-8 md:h-9 relative overflow-hidden flex-shrink-0 block">
          <Image
            src={getGcbioImageUrl('gcbio_logo.png', 2)}
            alt="GC Biopharma"
            className="object-contain"
            fill
            sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
            priority
          />
        </Link>

        {/* 메뉴 - 가운데 정렬, 반응형 */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-4 lg:gap-8 xl:gap-12">
          <div className="h-8 py-1.5 flex justify-center items-center">
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
          <div className="h-8 py-1.5 flex justify-center items-center">
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
          <div className="h-8 py-1.5 flex justify-center items-center">
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
          <div className="h-8 py-1.5 flex justify-center items-center">
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
          <div className="h-8 py-1.5 flex justify-center items-center">
            <div className={`${menuItemClass} text-gray-700`}>오늘의 메뉴</div>
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

        {/* 사용자 영역 */}
        <div className="w-20 sm:w-24 md:w-32 flex items-center justify-end flex-shrink-0">
          <div className="w-10 sm:w-12 md:w-14 h-5 sm:h-5 md:h-6 rounded-[100px] border border-gray-300 bg-transparent flex items-center justify-center">
            <div className="text-center text-gray-700 text-[9px] sm:text-[10px] md:text-[11px] font-medium font-['Pretendard'] leading-5 whitespace-nowrap">
              홍길동
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
