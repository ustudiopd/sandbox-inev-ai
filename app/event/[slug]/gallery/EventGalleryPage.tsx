'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Bebas_Neue } from 'next/font/google'
import Event222152Header from '../components/Event222152Header'
import button01 from '../../../../img/gcbio/button_01.png'
import button02 from '../../../../img/gcbio/button_02.png'
import page4Photo1 from '../../../../img/gcbio/page4_archiving_photo1.png'
import page4Photo2 from '../../../../img/gcbio/page4_archiving_photo2.png'
import page4Photo3 from '../../../../img/gcbio/page4_archiving_photo3.png'
import page4Video1 from '../../../../img/gcbio/page4_archiving_video1.png'
import page4Video2_2 from '../../../../img/gcbio/page4_archiving_video2_2.png'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

const GALLERY_SET_GAP = 30
const GALLERY_SET_WIDTH = 400
/** 한 칸 = 세트 너비 + 간격. 반칸 이동 시 사용 */
const GALLERY_HALF_STEP = (GALLERY_SET_WIDTH + GALLERY_SET_GAP) / 2 // 215
const GALLERY_SETS = [
  { src: page4Photo1, subtitle: 'KASBP에서 발표 중인 신수경 GC녹십자 의학본부장' },
  { src: page4Photo2, subtitle: 'KASBP 행사 후 수상자 및 관계자 단체 사진 촬영' },
  { src: page4Photo3, subtitle: 'KASBP에서 발표 중인 허은철 GC녹십자 대표이사' },
  { src: page4Photo1, subtitle: 'KASBP에서 발표 중인 허은철 GC녹십자 대표이사' },
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

const VIDEO_ITEM_WIDTH = 1092
const VIDEO_ITEM_GAP = 30

const VIDEO_HALF_STEP = (VIDEO_ITEM_WIDTH + VIDEO_ITEM_GAP) / 2

export default function EventGalleryPage({ event, pathSlug }: EventGalleryPageProps) {
  const slug = pathSlug ?? event.slug
  const [galleryOffsetX, setGalleryOffsetX] = useState(0)
  const [videoOffsetX, setVideoOffsetX] = useState(0)

  const goPrev = () => {
    setGalleryOffsetX((px) => Math.min(0, px + GALLERY_HALF_STEP))
  }
  const goNext = () => {
    setGalleryOffsetX((px) => Math.max(-(GALLERY_SET_WIDTH + GALLERY_SET_GAP) * (GALLERY_SETS.length - 1), px - GALLERY_HALF_STEP))
  }

  const goPrevVideo = () => {
    setVideoOffsetX((px) => Math.min(0, px + VIDEO_HALF_STEP))
  }
  const goNextVideo = () => {
    setVideoOffsetX((px) => Math.max(-(VIDEO_ITEM_WIDTH + VIDEO_ITEM_GAP), px - VIDEO_HALF_STEP))
  }

  return (
    <div
      className="w-full relative flex flex-col min-h-screen"
      style={{
        background: '#F9F9F9',
      }}
    >
      <div className="w-full max-w-[1920px] mx-auto flex flex-col flex-1 min-w-0">
        <Event222152Header slug={slug} variant="gallery" />

        <main
          className="w-full flex justify-center items-center box-border flex-1"
          style={{
            padding: '150px 250px 145px 250px',
          }}
        >
          <div
            className="flex flex-col justify-center items-center w-full relative"
            style={{ marginTop: '-200px' }}
          >
            <h1
              className={bebasNeue.className}
              style={{
                width: '932px',
                maxWidth: '100%',
                color: '#111',
                textAlign: 'center',
                fontFamily: '"Bebas Neue"',
                fontSize: '70px',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: '130%',
                letterSpacing: '-0.7px',
              }}
            >
              2026 GCBP Leadership Workshop
            </h1>
            <p
              className="font-['Pretendard']"
              style={{
                marginTop: '24px',
                color: '#111',
                textAlign: 'center',
                fontFamily: 'Pretendard',
                fontSize: '24px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.48px',
              }}
            >
              2026 GCBP Leadership Workshop의 추억을 만나보세요.
            </p>
            <span
              className={bebasNeue.className}
              style={{
                position: 'absolute',
                left: '-35px',
                top: '363px',
                color: '#111',
                fontFamily: '"Bebas Neue"',
                fontSize: '50px',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: '140%',
                letterSpacing: '-0.5px',
              }}
            >
              Photo
            </span>
            {/* 갤러리 4세트: 30px 간격 한 줄, 이전/다음 시 전체가 반칸씩 좌우 이동 */}
            <div
              className="absolute"
              style={{ left: '-35px', top: '483px' }}
            >
              <div
                className="flex flex-shrink-0"
                style={{
                  gap: `${GALLERY_SET_GAP}px`,
                  transform: `translateX(${galleryOffsetX}px)`,
                  transition: 'transform 0.3s ease',
                }}
              >
                {GALLERY_SETS.map((set, i) => (
                  <div key={i} className="flex flex-col flex-shrink-0" style={{ width: `${GALLERY_SET_WIDTH}px` }}>
                    <Image
                      src={set.src}
                      alt=""
                      width={GALLERY_SET_WIDTH}
                      height={GALLERY_SET_WIDTH}
                      className="object-cover flex-shrink-0"
                    />
                    <div className="flex flex-col" style={{ marginTop: '26px', gap: '10px' }}>
                      <p
                        className="font-['Pretendard']"
                        style={{
                          width: '400px',
                          color: '#111',
                          fontFamily: 'Pretendard',
                          fontSize: '18px',
                          fontStyle: 'normal',
                          fontWeight: 700,
                          lineHeight: '140%',
                          letterSpacing: '-0.18px',
                          textAlign: 'left',
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                        }}
                      >
                        2025 KASBP 춘계 심포지엄
                      </p>
                      <p
                        className="font-['Pretendard']"
                        style={{
                          width: '400px',
                          color: '#111',
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontStyle: 'normal',
                          fontWeight: 500,
                          lineHeight: '140%',
                          letterSpacing: '-0.16px',
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {set.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <span
              className={bebasNeue.className}
              style={{
                position: 'absolute',
                left: '-35px',
                top: '1141px',
                color: '#111',
                fontFamily: '"Bebas Neue"',
                fontSize: '50px',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: '140%',
                letterSpacing: '-0.5px',
              }}
            >
              Video
            </span>
            <div
              className="absolute"
              style={{ left: '-35px', top: '1261px' }}
            >
              <div
                className="flex flex-shrink-0"
                style={{
                  gap: `${VIDEO_ITEM_GAP}px`,
                  transform: `translateX(${videoOffsetX}px)`,
                  transition: 'transform 0.3s ease',
                }}
              >
                <Image
                  src={page4Video1}
                  alt=""
                  width={VIDEO_ITEM_WIDTH}
                  height={518}
                  className="object-cover flex-shrink-0"
                />
                <Image
                  src={page4Video2_2}
                  alt=""
                  width={VIDEO_ITEM_WIDTH}
                  height={518}
                  className="object-cover flex-shrink-0"
                />
              </div>
            </div>
            <div
              className="absolute"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: '1779px',
                width: '1920px',
                height: '495px',
                background: 'linear-gradient(90deg, #36C618 0%, #FFDF00 50%, #FF4606 100%)',
              }}
            />
            {/* Video 섹션 버튼: 2개 이미지 세트가 함께 좌우 이동 */}
            <div
              className="absolute flex items-center"
              style={{ left: '1187px', top: '1160px', gap: '10px' }}
              role="group"
              aria-label="비디오 이전 / 다음"
            >
              <button
                type="button"
                onClick={goPrevVideo}
                className="p-0 border-0 bg-transparent cursor-pointer"
                aria-label="이전"
              >
                <Image
                  src={button01}
                  alt=""
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </button>
              <button
                type="button"
                onClick={goNextVideo}
                className="p-0 border-0 bg-transparent cursor-pointer"
                aria-label="다음"
              >
                <Image
                  src={button02}
                  alt=""
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </button>
            </div>
            {/* 버튼 모듈: 이전 / 다음 (Photo) */}
            <div
              className="absolute flex items-center"
              style={{ left: '1198px', top: '382px', gap: '10px' }}
              role="group"
              aria-label="이전 / 다음"
            >
              <button
                type="button"
                onClick={goPrev}
                className="p-0 border-0 bg-transparent cursor-pointer"
                aria-label="이전"
              >
                <Image
                  src={button01}
                  alt=""
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="p-0 border-0 bg-transparent cursor-pointer"
                aria-label="다음"
              >
                <Image
                  src={button02}
                  alt=""
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
