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
    <div className="w-full relative flex flex-col min-h-screen" style={{ background: '#F9F9F9' }}>
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="profile" />
        <main className="w-full flex-1 flex flex-col items-center px-4" style={{ paddingTop: '140px' }}>
          <div className="relative w-full" style={{ minHeight: '200px' }}>
            {/* About Me 가운데 정렬 */}
            <div className="flex justify-center w-full">
              <h1
                className={bebasNeue.className}
                style={{
                  color: '#111',
                  textAlign: 'center',
                  fontFamily: '"Bebas Neue"',
                  fontSize: '48px',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '130%',
                  letterSpacing: '-0.48px',
                }}
              >
                About Me
              </h1>
            </div>
            {/* 원 4개 한 세트: 페이지 가운데 정렬 (총 너비 240*4 + 20*3 = 1020px) */}
            {[
              { borderColor: '#F5D327', label: '부서 소속', value: '디자인팀', labelWidth: 142 },
              { borderColor: '#006FB7', label: '이름(동명이인 1,2로 표시)', value: '홍길동(1)', labelWidth: 172 },
              { borderColor: '#EC1F23', label: '조 편성 내용', value: '-', labelWidth: 142 },
              { borderColor: '#45B652', label: '협업 진단 테스트 결과', value: '-', labelWidth: 142 },
            ].map((item, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center rounded-full border"
                style={{
                  width: '240px',
                  padding: '89px 79px',
                  gap: '5px',
                  aspectRatio: '240 / 239',
                  borderRadius: '200px',
                  border: `1px solid ${item.borderColor}`,
                  left: `calc(50% - 510px + ${(240 + 20) * i}px)`,
                  top: '131px',
                }}
              >
                <span
                  className="font-['Pretendard'] text-center"
                  style={{
                    width: `${item.labelWidth}px`,
                    color: '#111',
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.32px',
                  }}
                >
                  {item.label}
                </span>
                <span
                  className="font-['Pretendard'] text-center"
                  style={{
                    width: '142px',
                    color: '#111',
                    fontFamily: 'Pretendard',
                    fontSize: '24px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '140%',
                    letterSpacing: '-0.48px',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
            {/* 원 세트 아래 98px · Home 버튼 → 메인 홈 */}
            <Link
              href={`/event/${slug}`}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: '470px',
                width: '500px',
                height: '60px',
                borderRadius: '100px',
                background: '#111',
              }}
              aria-label="메인 홈으로"
            >
              <span
                className="font-['Pretendard'] text-center"
                style={{
                  width: '143px',
                  color: '#FFF',
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 700,
                  lineHeight: '100%',
                }}
              >
                Home
              </span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
