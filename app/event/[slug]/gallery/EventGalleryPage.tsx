'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import { getGcbioImageUrl } from '../lib/gcbio-images'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

const GALLERY_SET_GAP = 30
const GALLERY_SET_WIDTH = 400
/** 한 칸 = 세트 너비 + 간격. 반칸 이동 시 사용 */
const GALLERY_HALF_STEP = (GALLERY_SET_WIDTH + GALLERY_SET_GAP) / 2 // 215
const GALLERY_SETS = [
  { src: 'page5_photo1.png', subtitle: 'KASBP에서 발표 중인 신수경 GC녹십자 의학본부장' },
  { src: 'page5_photo2.png', subtitle: 'KASBP 행사 후 수상자 및 관계자 단체 사진 촬영' },
  { src: 'page5_photo3.png', subtitle: 'KASBP에서 발표 중인 허은철 GC녹십자 대표이사' },
  { src: 'page5_photo1.png', subtitle: 'KASBP에서 발표 중인 신수경 GC녹십자 의학본부장' },
]

interface EventGalleryPageProps {
  event: {
    id: string
    code: string
    slug: string
  }
  /** URL 경로의 slug (헤더 링크가 현재 주소와 맞도록) */
  pathSlug?: string
}

/** 가시 영역 1682px에 두 장+간격이 들어가도록 (826*2+30=1682) → 슬라이더가 이미지를 잘라내지 않음 */
const VIDEO_ITEM_WIDTH = 826
const VIDEO_ITEM_HEIGHT = 418
const VIDEO_ITEM_GAP = 30

const VIDEO_HALF_STEP = (VIDEO_ITEM_WIDTH + VIDEO_ITEM_GAP) / 2
const GALLERY_MAX_OFFSET = -(GALLERY_SET_WIDTH + GALLERY_SET_GAP) * (GALLERY_SETS.length - 1)
const VIDEO_MAX_OFFSET = -(VIDEO_ITEM_WIDTH + VIDEO_ITEM_GAP)

export default function EventGalleryPage({ event, pathSlug }: EventGalleryPageProps) {
  const slug = pathSlug ?? event.slug
  const [galleryOffsetX, setGalleryOffsetX] = useState(0)
  const [videoOffsetX, setVideoOffsetX] = useState(0)

  const goPrev = () => {
    setGalleryOffsetX((px) => Math.min(0, px + GALLERY_HALF_STEP))
  }
  const goNext = () => {
    setGalleryOffsetX((px) => Math.max(GALLERY_MAX_OFFSET, px - GALLERY_HALF_STEP))
  }
  const goPrevVideo = () => {
    setVideoOffsetX((px) => Math.min(0, px + VIDEO_HALF_STEP))
  }
  const goNextVideo = () => {
    setVideoOffsetX((px) => Math.max(VIDEO_MAX_OFFSET, px - VIDEO_HALF_STEP))
  }

  const galleryCanPrev = galleryOffsetX < 0
  const galleryCanNext = galleryOffsetX > GALLERY_MAX_OFFSET
  const videoCanPrev = videoOffsetX < 0
  const videoCanNext = videoOffsetX > VIDEO_MAX_OFFSET

  return (
    <>
      {/* 헤더 - sticky로 상단 고정 */}
      <div className="sticky top-0 z-50 w-full">
        <Event222152Header slug={slug} variant="gallery" />
      </div>
      {/* 배너 이미지 - 헤더 위치까지 올려서 헤더 뒤에 살짝 보이도록 */}
      <div className="relative w-full flex justify-center items-center overflow-hidden" style={{ width: '100%', height: '360px', marginTop: '-80px' }}>
        <Image
          src={getGcbioImageUrl('banner4.png')}
          alt=""
          width={1927}
          height={360}
          className="w-full h-full object-cover object-center"
          unoptimized
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: '70px' }}>
          <h1
            className={`${bebasNeue.className} w-full max-w-[932px] text-center text-3xl sm:text-4xl md:text-5xl lg:text-[70px] leading-[130%] tracking-[-0.7px] px-2`}
            style={{ color: '#FFF' }}
          >
            2026 GCBP Leadership Workshop
          </h1>
          <p 
            className="font-['Pretendard'] mt-6 text-center text-base sm:text-lg md:text-2xl font-medium leading-[140%] tracking-[-0.48px] px-2"
            style={{ color: '#FFF' }}
          >
            2026 GCBP Leadership Workshop의 추억을 만나보세요.
          </p>
        </div>
      </div>
      <div className="w-full relative flex flex-col bg-[#F9F9F9] overflow-x-hidden min-h-screen">
        <main className="w-full max-w-[1920px] mx-auto flex justify-center items-center box-border px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[250px] pt-0 sm:pt-0 md:pt-[50px] pb-12 md:pb-[145px] overflow-x-hidden md:min-h-[1654px]">
          <div
            className="flex flex-col justify-center items-center w-full relative mt-[50px] md:mt-[-1250px] overflow-visible"
          >
            {/* 모바일: Photo 레이블과 버튼 같은 줄(Y축 맞춤), PC: md:contents로 플로우 복원 */}
            <div className="flex flex-row items-center justify-between w-full px-4 mt-8 md:contents">
              <span
                className={`${bebasNeue.className} block mt-0 text-[#111] text-4xl md:text-5xl font-bold leading-[140%] tracking-[-0.5px] self-start ml-0 md:mt-0 md:ml-0 md:absolute md:left-[-35px] md:top-[-57px]`}
              >
                Photo
              </span>
              {/* Photo 버튼: 모바일에서는 Photo와 같은 줄 오른쪽 끝 */}
              <div
                className="flex items-center justify-center gap-2 mt-0 self-end md:mt-4 md:self-auto md:absolute md:left-[1198px] md:top-[-38px] md:justify-start"
                style={{ gap: '10px' }}
                role="group"
                aria-label="이전 / 다음"
              >
                <button
                  type="button"
                  onClick={goPrev}
                  className="p-0 border-0 bg-transparent cursor-pointer disabled:cursor-default"
                  aria-label="이전"
                  disabled={!galleryCanPrev}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="15.5" stroke={galleryCanPrev ? '#747474' : '#D9D9D9'} />
                    <path d="M21.5 16H10M10 16L15 12M10 16L15 20" stroke={galleryCanPrev ? '#747474' : '#D9D9D9'} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="p-0 border-0 bg-transparent cursor-pointer disabled:cursor-default"
                  aria-label="다음"
                  disabled={!galleryCanNext}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="15.5" stroke={galleryCanNext ? '#747474' : '#D9D9D9'} />
                    <path d="M10 16H21.5M21.5 16L16.5 12M21.5 16L16.5 20" stroke={galleryCanNext ? '#747474' : '#D9D9D9'} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            {/* 갤러리: 모바일 가로 스크롤, 데스크톱 절대위치 */}
            <div className="w-full overflow-x-auto md:overflow-x-hidden px-4 mt-4 md:px-0 md:absolute md:left-[-35px] md:top-[63px] md:w-[min(1682px,calc(50%+722px))]">
              <div
                className="flex flex-shrink-0 gap-4 md:gap-[30px]"
                style={{
                  transform: `translateX(${galleryOffsetX}px)`,
                  transition: 'transform 0.3s ease',
                }}
              >
                {GALLERY_SETS.map((set, i) => (
                  <div key={i} className="flex flex-col flex-shrink-0 w-[260px] min-w-[260px] md:w-[400px] md:min-w-0">
                    <div className="flex-shrink-0 overflow-hidden w-full aspect-square">
                      <Image
                        src={getGcbioImageUrl(set.src)}
                        alt=""
                        width={GALLERY_SET_WIDTH}
                        height={GALLERY_SET_WIDTH}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex flex-col mt-4 md:mt-[26px] gap-2 md:gap-[10px]">
                      <p className="font-['Pretendard'] w-full max-w-full text-[#111] text-base md:text-lg font-bold leading-[140%] tracking-[-0.18px] text-left break-words">
                        2025 KASBP 춘계 심포지엄
                      </p>
                      <p className="font-['Pretendard'] w-full max-w-full text-[#111] text-[11px] md:text-base font-medium leading-[140%] tracking-[-0.16px] text-left whitespace-nowrap">
                        {set.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 모바일: Video 레이블과 버튼 같은 줄(Y축 맞춤), PC: md:contents로 플로우 복원 */}
            <div className="flex flex-row items-center justify-between w-full px-4 mt-12 md:contents">
              <span
                className={`${bebasNeue.className} block mt-0 text-[#111] text-4xl md:text-5xl font-bold leading-[140%] tracking-[-0.5px] self-start ml-0 md:mt-0 md:ml-0 md:absolute md:left-[-35px] md:top-[721px]`}
              >
                Video
              </span>
              {/* Video 섹션 버튼: 모바일에서는 Video와 같은 줄 오른쪽 끝 */}
              <div
                className="flex items-center justify-center gap-2 mt-0 self-end md:mt-4 md:self-auto md:absolute md:left-[1187px] md:top-[740px] md:justify-start"
                style={{ gap: '10px' }}
                role="group"
                aria-label="비디오 이전 / 다음"
              >
                <button
                  type="button"
                  onClick={goPrevVideo}
                  className="p-0 border-0 bg-transparent cursor-pointer disabled:cursor-default"
                  aria-label="이전"
                  disabled={!videoCanPrev}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="15.5" stroke={videoCanPrev ? '#747474' : '#D9D9D9'} />
                    <path d="M21.5 16H10M10 16L15 12M10 16L15 20" stroke={videoCanPrev ? '#747474' : '#D9D9D9'} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNextVideo}
                  className="p-0 border-0 bg-transparent cursor-pointer disabled:cursor-default"
                  aria-label="다음"
                  disabled={!videoCanNext}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="15.5" stroke={videoCanNext ? '#747474' : '#D9D9D9'} />
                    <path d="M10 16H21.5M21.5 16L16.5 12M21.5 16L16.5 20" stroke={videoCanNext ? '#747474' : '#D9D9D9'} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Main_poster 배경 이미지: 비디오 이미지들 뒤에 배치 */}
            <div
              className="hidden md:block absolute"
              style={{
                left: '565px',
                top: '601px',
                width: '490px',
                height: '684px',
                opacity: 0.1,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            >
              <img
                src={getGcbioImageUrl('Main_poster.png')}
                alt=""
                width={490}
                height={684}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            {/* 그라데이션: 데스크톱만 절대위치, 모바일 숨김 */}
            <div
              className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[1159px] w-[1920px] h-[495px] z-0"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(90deg, #36C618 0%, #FFDF00 50%, #FF4606 100%)',
              }}
            />
            {/* Video 슬라이드 */}
            <div className="w-full overflow-x-auto md:overflow-x-hidden px-4 mt-4 md:px-0 md:absolute md:left-[-35px] md:top-[841px] md:w-[min(1682px,calc(50%+722px))] z-[2]">
              <div
                className="flex flex-shrink-0 gap-4 md:gap-[30px]"
                style={{
                  transform: `translateX(${videoOffsetX}px)`,
                  transition: 'transform 0.3s ease',
                }}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-[320px] min-w-[320px] aspect-[826/418] md:w-[826px] md:min-w-0 md:h-[418px]">
                  <Image
                    src={getGcbioImageUrl('page5_video1.png')}
                    alt=""
                    width={VIDEO_ITEM_WIDTH}
                    height={VIDEO_ITEM_HEIGHT}
                    className="object-contain w-full h-full"
                  />
                </div>
                <div className="flex-shrink-0 flex items-center justify-center w-[320px] min-w-[320px] aspect-[826/418] md:w-[826px] md:min-w-0 md:h-[418px]">
                  <Image
                    src={getGcbioImageUrl('Frame 24_1.png')}
                    alt=""
                    width={VIDEO_ITEM_WIDTH}
                    height={VIDEO_ITEM_HEIGHT}
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
