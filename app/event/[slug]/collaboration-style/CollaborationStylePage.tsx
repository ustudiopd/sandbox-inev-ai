'use client'

import Image from 'next/image'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

interface CollaborationStylePageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

export default function CollaborationStylePage({ event, pathSlug }: CollaborationStylePageProps) {
  const slug = pathSlug ?? event.slug

  return (
    <div className="w-full relative flex flex-col min-h-screen bg-[#F9F9F9] overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="collaboration-style" />

        <main className="w-full flex justify-center items-center box-border flex-1 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[250px] py-12 sm:py-24 md:py-[150px] pb-12 md:pb-[145px] overflow-x-hidden">
          <div className="flex flex-col md:flex-row items-center w-full max-w-full gap-8 md:gap-[77px] md:ml-[350px]">
            <div className="relative flex-shrink-0 w-full max-w-[278px] mx-auto md:mx-0 md:w-[278px] md:max-w-none">
              <div
                aria-hidden
                className="w-full max-w-[278px] aspect-square rounded-full mx-auto md:mx-auto md:w-[278px] md:h-[278px]"
                style={{
                  borderRadius: '197.5px',
                  background: `lightgray url(${getGcbioImageUrl('page2_photo2.png')}) -87.32px -0.334px / 151.381% 100.12% no-repeat`,
                }}
              />
              {/* 모바일에서만 보이는 데코 이미지 4개 - page2_photo2 옆에 배치 */}
              <div className="md:hidden absolute top-0 left-full ml-4 flex flex-col gap-2">
                {/* deco1.png */}
                <div className="absolute" style={{ width: '60px', height: '23px', left: '-300px', top: '-500px' }}>
                  <Image
                    src={getGcbioImageUrl('deco1.png')}
                    alt=""
                    width={240.193}
                    height={91.15}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
                {/* deco2.png */}
                <div className="relative" style={{ width: '76px', height: '42px' }}>
                  <Image
                    src={getGcbioImageUrl('deco2.png')}
                    alt=""
                    width={303.654}
                    height={167.3}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
                {/* deco3.png */}
                <div className="absolute" style={{ width: '174px', height: '176px', left: '-250px', top: '-120px' }}>
                  <Image
                    src={getGcbioImageUrl('deco3.png')}
                    alt=""
                    width={349}
                    height={353.15}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
                {/* deco4.png */}
                <div className="absolute" style={{ width: '172px', height: '260px', left: '-150px', top: '350px', zIndex: 0 }}>
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
            <div className="relative flex flex-col justify-center items-start flex-1 min-w-0 w-full max-w-full md:min-w-[280px] md:max-w-[437px] px-2 md:px-0 md:pt-[18px]">
            <h1
              className="w-full max-w-full font-['Pretendard'] text-[#111] text-left font-semibold leading-[140%] tracking-[-0.44px] text-2xl sm:text-3xl md:text-[44px]"
            >
              협업 스타일 진단
            </h1>
            <div
              aria-hidden
              className="w-full max-w-full md:w-[437px] h-px bg-black my-6"
            />
            <p
              className="w-full max-w-full font-['Pretendard'] text-[#111] text-left font-semibold leading-[140%] tracking-[-0.48px] text-base sm:text-lg md:text-[24px]"
            >
              당신은 어떤 리더인가요? 지금 한번 알아볼까요?
            </p>
            <div className="relative inline-block mt-8 md:mt-10">
              <div
                className="flex justify-center items-center gap-4 md:gap-6 rounded-[100px] bg-[#111] py-3 px-6 md:py-3 md:px-[39px] w-full max-w-[280px] md:w-[235px]"
              >
                <span
                  className="font-['Pretendard'] text-white text-lg md:text-2xl font-medium leading-[140%]"
                >
                  Click
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="9"
                  height="18"
                  viewBox="0 0 11 19"
                  fill="none"
                  style={{ flexShrink: 0 }}
                  aria-hidden
                >
                  <path
                    d="M0.5 0.5L9.5 9.77835L0.5 18.5"
                    stroke="#FFF"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {/* deco2.png 이미지 - Click 버튼 왼쪽 아래에 배치 */}
              <div
                className="absolute pointer-events-none hidden md:block"
                style={{
                  left: '-413.654px',
                  top: 'calc(100% + 70px)',
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
              {/* deco4.png 이미지 - Click 버튼 오른쪽 위에 배치 */}
              <div
                className="absolute pointer-events-none hidden md:block"
                style={{
                  left: 'calc(100% + 210px)',
                  top: '-280px',
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
          </div>
        </main>
      </div>
    </div>
  )
}
