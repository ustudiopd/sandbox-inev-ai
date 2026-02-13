'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
  const buttonRef = useRef<HTMLAnchorElement>(null)
  const [scrollDownTop, setScrollDownTop] = useState<string>('0px')

  const updateScrollDownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const buttonBottom = rect.bottom + scrollTop
      setScrollDownTop(`${buttonBottom}px`)
    }
  }

  useLayoutEffect(() => {
    updateScrollDownPosition()
  }, [])

  useEffect(() => {
    updateScrollDownPosition()
    window.addEventListener('resize', updateScrollDownPosition)
    window.addEventListener('scroll', updateScrollDownPosition)

    return () => {
      window.removeEventListener('resize', updateScrollDownPosition)
      window.removeEventListener('scroll', updateScrollDownPosition)
    }
  }, [])

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
      
      {/* main_deco3.png 이미지 - 오른쪽 상단 */}
      <div
        className="absolute pointer-events-none z-10"
        style={{
          top: '0px',
          right: 0,
          width: '541px',
          height: '568px',
        }}
      >
        <Image
          src={getGcbioImageUrl('main_deco3.png')}
          alt=""
          width={541}
          height={568}
          className="object-contain w-full h-full"
          unoptimized
        />
      </div>
      
      {/* main_deco4.png 이미지 - main_deco3 아래 40px */}
      <div
        className="absolute pointer-events-none z-10"
        style={{
          top: '608px',
          right: '-50px',
          width: '372.439px',
          height: '381px',
        }}
      >
        <Image
          src={getGcbioImageUrl('main_deco4.png')}
          alt=""
          width={372.439}
          height={381}
          className="object-contain w-full h-full"
          unoptimized
        />
      </div>

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
            {/* 첫 번째 SVG: Main_name 이미지 왼쪽 끝에서 154px 왼쪽, 위로 12.5px, 왼쪽으로 70px 추가 이동 */}
            <div className="absolute" style={{ left: '-424px', top: '-12.5px', width: '220px', height: '350px', pointerEvents: 'none' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="197" height="355" viewBox="0 0 197 355" fill="none" style={{ width: '220px', height: '350px' }}>
                <path d="M196.429 4.70653C196.633 4.19357 196.384 3.61181 195.871 3.40714L187.511 0.0718436C186.998 -0.132827 186.417 0.117092 186.212 0.630052C186.007 1.14301 186.257 1.72477 186.77 1.92944L194.201 4.89415L191.236 12.3245C191.031 12.8375 191.281 13.4192 191.794 13.6239C192.307 13.8286 192.889 13.5787 193.094 13.0657L196.429 4.70653ZM-24.5 354.336L-23.5008 354.376C-21.756 311.171 -8.68631 241.81 24.8581 174.281C58.3978 106.761 112.372 41.1357 195.895 5.25474L195.5 4.33594L195.105 3.41713C111.028 39.5362 56.7522 105.578 23.0669 173.391C-10.6137 241.195 -23.744 310.835 -25.4992 354.296L-24.5 354.336Z" fill="black" stroke="#000" strokeWidth="2"/>
              </svg>
            </div>
            {/* 두 번째 SVG: 첫 번째 SVG 기준 위에서 64.5px, 오른쪽에서 95.23px, 왼쪽으로 70px 추가 이동, 아래로 10px 추가 이동 */}
            <div className="absolute" style={{ left: 'calc(-424px + 220px - 95.23px - 30.266px)', top: 'calc(-12.5px + 64.5px - 20px + 10px)', width: '30.266px', height: '30.22px', pointerEvents: 'none' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="31" height="31" viewBox="0 0 31 31" fill="none" style={{ width: '30.266px', height: '30.22px' }}>
                <path d="M15.133 30.2204C23.4908 30.2204 30.2661 23.4554 30.2661 15.1102C30.2661 6.76508 23.4908 0 15.133 0C6.77529 0 0 6.76508 0 15.1102C0 23.4554 6.77529 30.2204 15.133 30.2204Z" fill="#F5D327"/>
              </svg>
            </div>
          </div>
          <p
            className="w-full max-w-[545px] relative"
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
            {/* main_deco1.png 이미지 */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: '-385px',
                top: '-15px',
                width: '352.477px',
                height: '370.5px',
              }}
            >
              <Image
                src={getGcbioImageUrl('main_deco1.png')}
                alt=""
                width={352.477}
                height={370.5}
                className="object-contain w-full h-full"
                unoptimized
              />
            </div>
            {/* main_deco2.png 이미지 */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: '560px',
                top: '-5px',
                width: '342.5px',
                height: '211.816px',
              }}
            >
              <Image
                src={getGcbioImageUrl('main_deco2.png')}
                alt=""
                width={342.5}
                height={211.816}
                className="object-contain w-full h-full"
                unoptimized
              />
            </div>
          </p>
          <div className="w-full max-w-[545px] text-[#111] font-['Pretendard'] text-lg sm:text-xl md:text-2xl font-medium leading-[140%]" style={{ letterSpacing: '-0.48px', marginTop: 10 }}>
            <span className="block">DATE  |  {eventDate}</span>
            <span className="block">LOCATION  |  {location}</span>
          </div>
          <Link
            ref={buttonRef}
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

      {/* Scroll down 아이콘 + 텍스트: X축은 페이지 중앙, Y축은 행사개요 버튼 아래 끝 */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-30" 
        style={{ 
          top: scrollDownTop,
          animation: 'bounceVertical 2s ease-in-out infinite',
        }}
      >
        <style jsx global>{`
          @keyframes bounceVertical {
            0%, 100% {
              transform: translateX(-50%) translateY(0);
            }
            50% {
              transform: translateX(-50%) translateY(10px);
            }
          }
        `}</style>
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="59" viewBox="0 0 25 59" fill="none" className="flex-shrink-0">
          <g clipPath="url(#clip0_148_2105)">
            <path d="M13.8971 0H11.0294C4.92647 0 0 4.91779 0 10.9204V29.2898C0 35.2924 5 40.2102 11.1029 40.2102H13.9706C20.0735 40.2102 25 35.2924 25 29.2898V10.9204C25 4.91779 20.0735 0 13.8971 0ZM22.7941 29.2898C22.7941 34.1353 18.8235 38.0406 13.8971 38.0406H11.0294C6.10294 38.0406 2.13235 34.1353 2.13235 29.2898V10.9204C2.13235 6.07492 6.10294 2.16961 11.0294 2.16961H13.8971C18.8235 2.16961 22.7941 6.07492 22.7941 10.9204V29.2898Z" fill="black"/>
            <path d="M12.4999 8.24414C11.9117 8.24414 11.397 8.75038 11.397 9.32895V17.0672C11.397 17.6458 11.9117 18.152 12.4999 18.152C13.0881 18.152 13.6029 17.6458 13.6029 17.0672V9.32895C13.6029 8.67806 13.0881 8.24414 12.4999 8.24414Z" fill="black"/>
            <path d="M16.9075 51.9214L13.5838 55.1904V45.6676C13.5838 45.099 13.078 44.6016 12.5 44.6016C11.922 44.6016 11.4162 45.099 11.4162 45.6676V55.2615L8.09249 51.9214C7.65896 51.495 7.00867 51.495 6.57514 51.9214C6.14162 52.3478 6.14162 52.9874 6.57514 53.4138L11.7775 58.5306C11.8497 58.6016 11.9942 58.7438 12.1387 58.7438C12.2832 58.8148 12.4277 58.8148 12.5 58.8148C12.5723 58.8148 12.789 58.8148 12.8613 58.7438C13.0058 58.6727 13.1503 58.6016 13.2225 58.5306L18.4249 53.4138C18.8584 52.9874 18.8584 52.3478 18.4249 51.9214C17.9913 51.495 17.341 51.5661 16.9075 51.9214Z" fill="black"/>
          </g>
          <defs>
            <clipPath id="clip0_148_2105">
              <rect width="25" height="58.9412" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <span
          className="font-['Pretendard'] text-center mt-2"
          style={{
            color: '#000',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '140%',
          }}
        >
          Scroll down
        </span>
      </div>

    </div>
  )
}
