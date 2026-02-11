'use client'

import Image from 'next/image'
import Link from 'next/link'
import Event222152Header from './Event222152Header'

interface Event222152LandingProps {
  event: {
    id: string
    code: string
    slug: string
    title: string | null
    event_date: string | null
    event_start_date: string | null
    event_end_date: string | null
    event_date_type: 'single' | 'range'
  }
  /** URL 경로에 사용된 slug (링크가 현재 주소와 일치하도록) */
  pathSlug?: string
}

export default function Event222152Landing({ event, pathSlug }: Event222152LandingProps) {
  const formatEventDate = () => {
    if (event.event_date_type === 'single' && event.event_date) {
      const date = new Date(event.event_date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const days = ['일', '월', '화', '수', '목', '금', '토']
      const dayName = days[date.getDay()]
      return `${year}. ${month}. ${day}(${dayName})`
    }
    return '2026. 03. 05(목)'
  }
  const eventDate = formatEventDate()
  const location = '노보텔 앰배서더 서울 용산 한라홀 3F'

  return (
    <div className="w-full min-h-screen relative bg-white overflow-x-hidden">
      <Event222152Header slug={pathSlug ?? event.slug} variant="default" />

      {/* 메인 콘텐츠 - min-h로 스크롤 가능하게 (absolute 콘텐츠 높이 반영) */}
      <div className="w-full min-h-screen min-h-[900px] flex items-center justify-center pt-[80px] px-4 sm:px-6 md:px-8 relative z-20">
        <div className="w-full max-w-[560px] inline-flex flex-col justify-start items-center gap-6 sm:gap-8 md:gap-10 overflow-hidden" />
        {/* Main_name 이미지 + DATE/LOCATION, 위치 (350, 180), 이미지 아래 40px 간격 */}
        <div
          className="absolute z-30 flex flex-col"
          style={{ left: 350, top: 180 }}
        >
          <Image
            src="/img/gcbio/Main_name.png"
            alt="GC"
            width={377}
            height={406.575}
            className="object-contain"
          />
          <div
            className="w-[545px] text-[#111] font-['Pretendard'] text-2xl font-medium leading-[140%] mt-10"
            style={{ letterSpacing: '-0.48px' }}
          >
            <span className="block">DATE  |  {eventDate}</span>
            <span className="block">LOCATION  |  {location}</span>
          </div>
          {/* LOCATION 아래 68px, 행사개요 버튼 → 행사개요 페이지 */}
          <Link
            href={`/event/${pathSlug ?? event.slug}/overview`}
            className="mt-[68px] flex w-[235px] items-center justify-center gap-[25px] rounded-[100px] bg-[#111] py-3 px-[39px] hover:opacity-90 transition-opacity"
          >
            <span
              className="text-white font-['Pretendard'] text-2xl font-medium leading-[140%]"
              style={{ letterSpacing: '-0.48px' }}
            >
              행사개요
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="9"
              height="18"
              viewBox="0 0 11 19"
              fill="none"
              className="flex-shrink-0"
              aria-hidden
            >
              <path
                d="M0.5 0.5L9.5 9.77835L0.5 18.5"
                stroke="white"
                strokeLinecap="round"
                strokeWidth={1}
              />
            </svg>
          </Link>
        </div>
        {/* Main_name 오른쪽 308px, Main_poster: 552x769 */}
        <div
          className="absolute z-30"
          style={{ left: 350 + 377 + 308, top: 142 }}
        >
          <Image
            src="/img/gcbio/Main_poster.png"
            alt=""
            width={552}
            height={769}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  )
}
