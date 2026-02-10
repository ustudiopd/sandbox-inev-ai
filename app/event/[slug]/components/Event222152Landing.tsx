'use client'

import Image from 'next/image'
import Event222152Header from './Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

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
  // 날짜 포맷팅
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
    // 기본값
    return '2026. 03. 05(목)'
  }

  const eventDate = formatEventDate()
  const location = '노보텔 앰배서더 서울 용산 한라홀 3F'

  return (
    <div className="w-full min-h-screen relative bg-white overflow-hidden">
      <Event222152Header slug={pathSlug ?? event.slug} variant="default" />

      {/* 메인 콘텐츠 */}
      <div className="w-full min-h-screen flex items-center justify-center pt-[80px] px-4 sm:px-6 md:px-8 relative z-20">
        <div className="w-full max-w-[560px] inline-flex flex-col justify-start items-center gap-6 sm:gap-8 md:gap-10 overflow-hidden">
          {/* 타이틀 이미지 */}
          <Image
            src={getGcbioImageUrl('Title_black.png')}
            alt="CROSS-FUNCTIONAL Collaboration"
            className="w-full max-w-[400px] h-auto object-contain"
            width={400}
            height={86}
            sizes="(max-width: 768px) 100vw, 400px"
          />
          
          {/* 날짜 및 장소 - DATE / LOCATION 각각 한 줄 */}
          <div className="self-stretch text-center text-gray-800 text-base sm:text-lg md:text-xl lg:text-2xl font-medium font-['Pretendard'] leading-6 sm:leading-7 md:leading-8">
            <span className="block">DATE  |  {eventDate}</span>
            <span className="block">LOCATION  |  {location}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
