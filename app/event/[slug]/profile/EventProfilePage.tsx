'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

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
            {/* 프로필 표: About Me로부터 33px 아래 */}
            <div className="mt-[33px] w-full max-w-[588px] mx-auto">
              {[
                { label: '부서 소속', value: '디자인팀', subLabel: null },
                { label: '부서 소속', value: '디자인팀', subLabel: null },
                { label: '이름', value: '홍길동(1)', subLabel: '(동명이인 1,2로 표시)' },
                { label: '조 편성 내용', value: '-', subLabel: null },
                { label: '협업 진단\n테스트 결과', value: '-', subLabel: null },
              ].map((item, i) => (
                <div key={i} className="flex flex-row w-full">
                  {/* 왼쪽 열: 라벨 */}
                  <div
                    className={`flex flex-shrink-0 relative ${item.subLabel ? 'flex-col' : 'justify-center items-center'}`}
                    style={{
                      width: '171px',
                      height: '70px',
                      padding: '14px',
                      gap: '10px',
                      borderTop: i === 0 ? '2px solid #949494' : '1px solid #949494',
                      borderBottom: i === 4 ? '2px solid #949494' : '1px solid #949494',
                      background: '#E9E9E9',
                      color: '#111',
                      textAlign: 'center',
                      fontFamily: 'Pretendard',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: '171px',
                        height: item.subLabel ? '22px' : 'auto',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#111',
                        textAlign: 'center',
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '140%',
                        letterSpacing: '-0.32px',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {item.label}
                    </span>
                    {item.subLabel && (
                      <span
                        style={{
                          width: '171px',
                          height: '22px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#111',
                          textAlign: 'center',
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          lineHeight: '140%',
                          letterSpacing: '-0.28px',
                        }}
                      >
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                  {/* 오른쪽 열: 값 */}
                  <div
                    className="flex items-center flex-1 relative"
                    style={{
                      width: '417px',
                      height: '70px',
                      padding: '14px 16px',
                      gap: '10px',
                      borderTop: i === 0 ? '2px solid #949494' : '1px solid #949494',
                      borderBottom: i === 4 ? '2px solid #949494' : '1px solid #949494',
                    }}
                  >
                    <span
                      style={{
                        width: '385px',
                        flexShrink: 0,
                        color: '#000',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '140%',
                        letterSpacing: '-0.28px',
                        textAlign: 'left',
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* 원 세트 아래 98px · Home 버튼 → 메인 홈 */}
            <div className="relative mt-12 sm:mt-16 flex justify-center w-full max-w-[500px] mx-auto">
              <Link
                href={`/event/${slug}`}
                className="flex items-center justify-center w-full h-14 rounded-[100px] bg-[#111] font-['Pretendard'] text-white text-base font-bold"
                aria-label="메인 홈으로"
              >
                Home
              </Link>
              {/* deco2.png 이미지 - Home 버튼 왼쪽 아래에 배치 */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '-363.654px',
                  top: 'calc(100% - 30px)',
                  width: '303.654px',
                  height: '167.3px',
                }}
              >
                <Image
                  src={getGcbioImageUrl('deco2.png')}
                  alt=""
                  width={303.654}
                  height={167.3}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
              {/* deco4.png 이미지 - Home 버튼 오른쪽 위에 배치 */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: 'calc(100% + 200px)',
                  top: '-370px',
                  width: '344px',
                  height: '521px',
                }}
              >
                <Image
                  src={getGcbioImageUrl('deco4.png')}
                  alt=""
                  width={344}
                  height={521}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
