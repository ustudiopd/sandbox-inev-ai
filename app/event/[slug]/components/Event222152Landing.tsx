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

      {/* 메인 콘텐츠 — 반응형: 모바일 세로 스택, 데스크톱 가로 배치 */}
      <div className="w-full min-h-screen flex flex-col lg:flex-row items-center justify-center pt-[150px] lg:pt-[80px] px-4 sm:px-6 md:px-8 pb-12 relative z-20">
        {/* 왼쪽: Main_name + DATE/LOCATION + 행사개요 버튼 — 모바일에서 먼저, 데스크톱 왼쪽 */}
        <div className="w-full max-w-[560px] flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-1">
          <div className="w-full max-w-[377px] aspect-[377/406.575] relative">
            <Image
              src="/img/gcbio/Main_name.png"
              alt="GC"
              width={377}
              height={406.575}
              className="object-contain w-full h-full"
            />
          </div>
          <p
            className="w-full max-w-[545px]"
            style={{
              marginTop: 25,
              color: '#111',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 42,
              fontStyle: 'normal',
              fontWeight: 700,
              lineHeight: '130%',
            }}
          >
            2026 GCBP Leadership Workshop
          </p>
          <div className="w-full max-w-[545px] text-[#111] font-['Pretendard'] text-lg sm:text-xl md:text-2xl font-medium leading-[140%]" style={{ letterSpacing: '-0.48px', marginTop: 10 }}>
            <span className="block">DATE  |  {eventDate}</span>
            <span className="block">LOCATION  |  {location}</span>
          </div>
          <Link
            href={`/event/${pathSlug ?? event.slug}/overview`}
            className="mt-3 md:mt-12 flex w-full max-w-[235px] mx-auto lg:mx-0 items-center justify-center gap-[25px] rounded-[100px] bg-[#111] py-3 px-[39px] hover:opacity-90 transition-opacity"
          >
            <span className="text-white font-['Pretendard'] text-lg md:text-2xl font-medium leading-[140%]" style={{ letterSpacing: '-0.48px' }}>
              행사개요
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="18" viewBox="0 0 11 19" fill="none" className="flex-shrink-0" aria-hidden>
              <path d="M0.5 0.5L9.5 9.77835L0.5 18.5" stroke="white" strokeLinecap="round" strokeWidth={1} />
            </svg>
          </Link>
        </div>
        {/* 오른쪽: Main_poster — 모바일에서는 행사개요 버튼 아래, 데스크톱에서는 옆 */}
        <div className="w-full max-w-[552px] flex-shrink-0 mt-8 lg:mt-0 lg:ml-8 xl:ml-16 order-2 lg:order-2">
          <div className="w-full aspect-[552/769] relative">
            <Image
              src="/img/gcbio/Main_poster.png"
              alt=""
              width={552}
              height={769}
              className="object-contain w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
