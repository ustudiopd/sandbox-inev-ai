'use client'

import Link from 'next/link'
import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

interface EventProfilePageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  pathSlug?: string
}

export default function EventProfilePage({ event, pathSlug }: EventProfilePageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="profile" />
        <main className="w-full flex-1 flex flex-col items-center px-4 sm:px-6 pt-16 sm:pt-24 md:pt-[140px] pb-12">
          <div className="w-full max-w-[1060px] mx-auto">
            {/* About Me 가운데 정렬 */}
            <div className="flex justify-center w-full mb-8 sm:mb-12">
              <h1 className={`${bebasNeue.className} text-[#111] text-center text-3xl sm:text-4xl md:text-[48px] font-bold leading-[130%] tracking-[-0.48px]`}>
                About Me
              </h1>
            </div>
            {/* 원 4개: 모바일 세로 가운데 정렬, sm 이상 가로 배치 */}
            <div className="flex flex-col sm:flex-row flex-nowrap items-center justify-center gap-4 sm:gap-5 overflow-x-visible sm:overflow-x-auto">
            {[
              { borderColor: '#F5D327', label: '부서 소속', value: '디자인팀', labelWidth: 142 },
              { borderColor: '#006FB7', label: '이름(동명이인 1,2로 표시)', value: '홍길동(1)', labelWidth: 172 },
              { borderColor: '#EC1F23', label: '조 편성 내용', value: '-', labelWidth: 142 },
              { borderColor: '#45B652', label: '협업 진단 테스트 결과', value: '-', labelWidth: 142 },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-full border flex-shrink-0 w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] md:w-[240px] md:h-[240px] px-4 sm:px-5 md:px-6 py-6 sm:py-7 md:py-8"
                style={{
                  border: `1px solid ${item.borderColor}`,
                  borderRadius: '50%',
                }}
              >
                <span className="font-['Pretendard'] text-center max-w-full text-[#111] text-xs sm:text-sm font-medium leading-[140%] tracking-[-0.32px] whitespace-nowrap">
                  {item.label}
                </span>
                <span className="font-['Pretendard'] text-center text-[#111] text-base sm:text-lg md:text-[22px] font-semibold leading-[140%] tracking-[-0.48px] whitespace-nowrap">
                  {item.value}
                </span>
              </div>
            ))}
            </div>
            {/* 원 세트 아래 98px · Home 버튼 → 메인 홈 */}
            <Link
              href={`/event/${slug}`}
              className="mt-12 sm:mt-16 flex items-center justify-center w-full max-w-[500px] mx-auto h-14 rounded-[100px] bg-[#111] font-['Pretendard'] text-white text-base font-bold"
              aria-label="메인 홈으로"
            >
              Home
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
