'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import YouTubePlayer from '@/components/media/YouTubePlayer'
import VimeoPlayer from '@/components/media/VimeoPlayer'

interface Session {
  session_key: string
  title: string
  description?: string
  thumbnail_url?: string | null
  provider: string
  asset_id: string
  vimeo_hash?: string // Vimeo 비공개 비디오 해시
  order: number
  speaker?: string
  category_label?: string
  product_label?: string
}

interface OnDemandWebinar {
  id: string
  slug?: string | null
  title: string
  description?: string
  sessions: Session[]
  clients?: {
    id: string
    name: string
    logo_url?: string | null
  } | null
}

interface OnDemandPlayerPageProps {
  webinar: OnDemandWebinar
  session: Session
}

/**
 * 온디맨드 영상 시청 페이지 컴포넌트
 * Phase 1: Mock 데이터 기반 UI
 * 플레이어 + CTA + QnA placeholder
 */
/**
 * 썸네일 URL 생성 함수
 */
function getThumbnailUrl(session: Session): string | null {
  // 썸네일 URL이 있으면 사용
  if (session.thumbnail_url) {
    return session.thumbnail_url
  }
  
  // provider와 asset_id로 썸네일 생성
  if (session.provider === 'youtube' && session.asset_id) {
    return `https://img.youtube.com/vi/${session.asset_id}/maxresdefault.jpg`
  }
  
  if (session.provider === 'vimeo' && session.asset_id) {
    // Vimeo 썸네일: Vumbnail 서비스 사용
    return `https://vumbnail.com/${session.asset_id}.jpg`
  }
  
  return null
}

export default function OnDemandPlayerPage({ webinar, session }: OnDemandPlayerPageProps) {
  const [showQnA, setShowQnA] = useState(false)
  const webinarPath = webinar.slug || webinar.id
  
  // 비디오 URL 생성
  const videoUrl = session.provider === 'youtube' 
    ? `https://www.youtube.com/watch?v=${session.asset_id}`
    : session.asset_id
  
  // 다른 세션 목록
  const otherSessions = webinar.sessions
    .filter((s) => s.session_key !== session.session_key)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  
  return (
    <div className="min-h-screen bg-[#171D28]">
      {/* Hero Section with Video */}
      <div className="relative w-full bg-[#171D28] min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:h-[928px]">
        {/* Full width background wrapper */}
        <div className="absolute inset-0 w-full bg-[#171D28]"></div>
        {/* Content container with max-width */}
        <div className="relative w-full max-w-[1600px] mx-auto h-full">
          {/* Background Image */}
          <div className="absolute inset-0 w-full z-0">
            <img
              src="/img/hpe/bg_b_928.png"
              alt="HPE Webinar Series Background"
              className="w-full h-full object-cover object-left"
              style={{ 
                objectFit: 'cover',
                objectPosition: 'left center'
              }}
            />
          </div>
          
          {/* Shape Layer */}
          <div className="absolute inset-0 z-[1]">
            <div 
              className="absolute inset-0 min-[1601px]:left-0 max-[1600px]:left-1/2 max-[1600px]:-translate-x-1/2"
              style={{ width: '1600px', minWidth: '1600px' }}
            >
              <Image
                src="/img/hpe/rec_2.png"
                alt="HPE Shape"
                fill
                className="object-cover object-left"
                priority
                sizes="1600px"
              />
            </div>
          </div>
          
          {/* HPE Logo, Home Icon and Category - 한 줄로 배치 */}
          <div className="absolute top-4 sm:top-8 md:top-12 left-4 sm:left-6 lg:left-8 z-20 flex items-center gap-3 sm:gap-4 md:gap-6">
            <Image
              src="/img/hpe/hpe_logo.png"
              alt="HPE"
              width={120}
              height={40}
              className="object-contain w-20 h-7 sm:w-24 sm:h-8 md:w-[120px] md:h-10"
              priority
            />
            <Link href={`/ondemand/${webinarPath}/watch`}>
              <Image
                src="/img/hpe/ic_5.png"
                alt="홈으로"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                priority
              />
            </Link>
            {session.category_label && (
              <span className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium">
                {session.category_label}
              </span>
            )}
          </div>
          
          {/* Video Player */}
          <div className="absolute z-20 w-full" style={{ top: '80px' }}>
            <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:gap-6 lg:gap-6 w-full max-w-[1070px] mx-auto pb-0 lg:pb-0">
                
                {/* Video Player */}
                <div className="bg-black rounded-lg shadow-2xl overflow-hidden w-full" style={{ aspectRatio: '16/9' }}>
                  <div className="relative w-full h-full">
                    {session.provider === 'vimeo' ? (
                      <VimeoPlayer
                        videoId={session.asset_id}
                        hash={session.vimeo_hash}
                        width="100%"
                        height="100%"
                        autoplay={false}
                        muted={false}
                        className="w-full h-full"
                      />
                    ) : (
                      <YouTubePlayer
                        url={videoUrl}
                        width="100%"
                        height="100%"
                        autoplay={false}
                        muted={false}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>
                
                {/* Description and Presenter Info */}
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-12 mt-2 sm:mt-4 lg:mt-6 mb-0 lg:mb-0">
                  {/* Description */}
                  <div className="w-full lg:w-[680px]">
                    <p className="text-white text-sm sm:text-base leading-relaxed text-left">
                      {session.description || 'AI 워크로드는 성능, 네트워크 설계, 운영 측면에서 기존의 방식으로는 감당하기 어려운 복잡성을 만들어 내며, 네트워크는 이러한 AI 데이터센터의 핵심 기반이 됩니다. HPE Juniper Networking의 데이터센터 솔루션은 개방형 유연성과 통합 AIOps를 통해 운영을 단순화하고 비용과 복잡성을 줄이며, 검증된 솔루션 성능으로 보안과 안정성을 갖춘 AI 데이터센터 구축을 가속화할 수 있습니다.'}
                    </p>
                  </div>
                  
                  {/* Presenter Introduction */}
                  <div className="flex-shrink-0 flex flex-row lg:flex-col items-center lg:items-end gap-3 lg:gap-0 w-full lg:w-auto">
                    <div className="bg-[#00AB84] text-black px-4 py-2 rounded-full text-sm font-medium lg:mb-4 text-center whitespace-nowrap">
                      발표자 소개
                    </div>
                    <div className="flex flex-row lg:flex-col items-center lg:items-center gap-2 lg:gap-2 text-left lg:text-center">
                      {session.speaker && (
                        <>
                          <p className="text-white text-sm sm:text-base font-medium">
                            {session.speaker}
                          </p>
                          <span className="text-white text-sm sm:text-base lg:hidden">|</span>
                        </>
                      )}
                      <p className="text-white text-xs sm:text-sm">
                        HPE Networking
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box Section */}
      <div className="pt-8 pb-0 sm:pt-10 sm:pb-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full flex justify-center">
            {/* Desktop Info Box */}
            <div className="hidden lg:block w-full max-w-[1070px] h-40 relative bg-[#171D28] mx-auto">
              {/* Ticket Image */}
              <img className="w-32 h-20 left-[354.80px] top-[48.37px] absolute" src="/img/hpe/ticket.png" alt="Movie Ticket" />
              
              {/* Left Text */}
              <div className="w-72 left-[29.51px] top-[30.46px] absolute justify-start">
                <span className="text-white text-base font-medium leading-6">해당 온라인 행사에 참여 및 설문조사에 참여하신분들을 대상으로 '</span>
                <span className="text-emerald-500 text-base font-medium leading-6">메가박스 2인 관람권' 기프트콘</span>
                <span className="text-white text-base font-medium leading-6">을 발송해 드립니다.<br/><br/></span>
                <span className="text-white text-sm font-normal leading-[8.38px]">(100분 무작위 추첨, 행사 종료 후 일괄 지급)</span>
              </div>
              
              {/* Divider 1 */}
              <div className="w-[0.76px] h-28 left-[760px] top-[30.08px] absolute opacity-25 bg-gray-400"></div>
              
              {/* Divider 2 */}
              <div className="w-[0.76px] h-28 left-[910px] top-[30.08px] absolute opacity-25 bg-gray-400"></div>
              
              {/* Divider 3 - 플레이어 끝선에 맞춤 */}
              <div className="w-[0.76px] h-28 left-[1059.24px] top-[30.08px] absolute opacity-25 bg-gray-400"></div>
              
              {/* Meeting Request Text */}
              <div className="w-32 left-[771px] top-[118.07px] absolute text-center text-emerald-500 text-xs font-normal">온/오프라인 미팅 신청</div>
              
              {/* Survey Text */}
              <div className="w-14 left-[953px] top-[118.07px] absolute text-center text-emerald-500 text-xs font-normal">설문조사</div>
              
              {/* Meeting Icon */}
              <img className="w-16 h-16 left-[803px] top-[33.13px] absolute" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
              
              {/* Survey Icon */}
              <img className="w-16 h-16 left-[953px] top-[31.61px] absolute" src="/img/hpe/ic_2.png" alt="설문조사" />
            </div>
            
            {/* Mobile Info Box */}
            <div className="lg:hidden w-full bg-[#171D28] rounded-lg p-3 sm:p-6">
              {/* Text Section */}
              <div className="text-center mb-3 sm:mb-4">
                <p className="text-white text-sm sm:text-base leading-relaxed mb-1 sm:mb-2">
                  해당 온라인 행사에 참여 및 설문조사에 참여하신분들을 대상으로{' '}
                  <span className="text-emerald-500">메가박스 2인 관람권' 기프트콘</span>
                  을 발송해 드립니다.
                </p>
                <p className="text-white text-xs text-gray-400">
                  (100분 무작위 추첨, 행사 종료 후 일괄 지급)
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-row gap-6 sm:gap-8 justify-center items-center pt-3 sm:pt-4 border-t border-gray-700">
                {/* Meeting Button */}
                <div className="flex flex-col items-center gap-2">
                  <img className="w-12 h-12 sm:w-16 sm:h-16" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
                  <span className="text-emerald-500 text-xs font-normal">온/오프라인 미팅 신청</span>
                </div>
                
                {/* 구분줄 */}
                <div className="w-[0.76px] h-16 opacity-25 bg-gray-400"></div>
                
                {/* Survey Button */}
                <div className="flex flex-col items-center gap-2">
                  <img className="w-12 h-12 sm:w-16 sm:h-16" src="/img/hpe/ic_2.png" alt="설문조사" />
                  <span className="text-emerald-500 text-xs font-normal">설문조사</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-gray-900 text-white" style={{ height: '113px' }}>
        <div className="max-w-[1600px] mx-auto h-full flex items-center justify-center">
          <p className="text-center text-sm">© Copyright 2026 Hewlett Packard Enterprise Development LP.</p>
        </div>
      </footer>
    </div>
  )
}
