'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import YouTubePlayer from '@/components/media/YouTubePlayer'
import VimeoPlayer from '@/components/media/VimeoPlayer'
import OnDemandSurveyModal from './OnDemandSurveyModal'

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
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const webinarPath = webinar.slug || webinar.id
  
  // Supabase Storage URL 생성
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const hpeVideoBgImageUrl = `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/webinar_video_bg.png`
  
  // 비디오 URL 생성
  const videoUrl = session.provider === 'youtube' 
    ? `https://www.youtube.com/watch?v=${session.asset_id}`
    : session.asset_id
  
  // 다른 세션 목록
  const otherSessions = webinar.sessions
    .filter((s) => s.session_key !== session.session_key)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  
  return (
    <div className="min-h-screen bg-[#171F32]">
      {/* Hero Section with Video - 1600x928 / 태블릿: 높이 조정 / PC: 자연스러운 전환 / 996px 구간 수정 / 1600px 줄어들 때 정보섹션과 동일 타이밍 / 742px 구간 수정 */}
      <div
        className="relative bg-[#171F32] min-h-[500px] sm:min-h-[750px] md:min-h-[800px] lg:h-[900px] xl:h-[928px] w-full lg:w-full lg:max-w-[1600px] xl:max-w-[1600px] xl:w-[1600px] lg:mx-auto max-sm:min-h-[400px]"
      >
        {/* Full width background wrapper */}
        <div className="absolute inset-0 w-full bg-[#171F32]"></div>
        {/* Content container 1600x928 / PC: 자연스러운 전환 / 1600px 줄어들 때 정보섹션과 동일 타이밍 */}
        <div className="relative w-full h-full lg:w-full lg:max-w-[1600px] xl:max-w-[1600px] xl:w-[1600px] lg:h-[900px] xl:h-[928px] mx-auto">
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
          
          {/* Shape Layer - 태블릿: 아래 왼쪽 기준으로 줄어듦 */}
          <div className="absolute inset-0 z-[1] overflow-hidden hidden md:block">
            <div className="relative w-full h-full">
              <Image
                src={hpeVideoBgImageUrl}
                alt="HPE Shape"
                fill
                className="object-contain object-left-bottom"
                priority
                sizes="1600px"
              />
            </div>
          </div>
          
          {/* Close Button - 오른쪽 위 / 태블릿: 크기 조정 */}
          <button
            onClick={() => window.close()}
            className="absolute top-4 sm:top-8 md:top-10 lg:top-12 right-4 sm:right-6 md:right-6 lg:right-8 z-30 w-10 h-10 sm:w-12 sm:h-12 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors max-sm:w-8 max-sm:h-8 max-sm:top-3 max-sm:right-3"
            aria-label="닫기"
          >
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white max-sm:w-4 max-sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          
          {/* HPE Logo - 왼쪽 50px / 태블릿: 크기 조정 / 1600px에서 줄어들 때 위로 이동하면서 최적화 / 1257px 부드러운 전환 / 태블릿: 홈 버튼과 간격 / PC: 위치 조정 */}
          <div className="absolute top-3 sm:top-3 md:top-3 lg:top-5 xl:top-6 2xl:top-16 left-4 sm:left-4 md:left-4 lg:left-5 xl:left-6 2xl:left-8 z-30 max-sm:top-3 max-sm:left-4">
            <Image
              src="/img/hpe/hpe_logo.png"
              alt="HPE"
              width={120}
              height={40}
              className="object-contain w-20 h-7 sm:w-24 sm:h-8 md:w-[100px] md:h-[33px] lg:w-[105px] lg:h-[35px] xl:w-[110px] xl:h-[36px] 2xl:w-[120px] 2xl:h-10 max-sm:w-16 max-sm:h-5"
              priority
            />
          </div>
          
          {/* Home Icon and Category - 플레이어 카드 왼쪽 선에 맞춤 / 태블릿: 플레이어 왼쪽 라인에 맞춤 / 1600px에서 줄어들 때 최적화 / 1257px 부드러운 전환 / 태블릿: HPE와 간격 */}
          <div className="absolute top-12 sm:top-12 md:top-16 lg:top-[56px] xl:top-16 2xl:top-12 z-20 flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-5.5 xl:gap-6 w-full max-w-[1200px] left-1/2 -translate-x-1/2 px-4 sm:px-6 md:px-6 lg:px-6 xl:px-8 max-sm:top-16 max-sm:px-4">
            <div className="w-full max-w-[1070px] md:w-full md:max-w-[calc(100vw-4rem)] md:mx-auto lg:w-full lg:max-w-[900px] lg:mx-auto xl:w-full xl:max-w-[1070px] xl:mx-auto 2xl:max-w-[1070px] 2xl:mx-auto flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-5.5 xl:gap-6 max-sm:gap-2">
              <Link href={`/ondemand/${webinarPath}/watch`}>
                <Image
                  src="/img/hpe/ic_5.png"
                  alt="홈으로"
                  width={48}
                  height={48}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-[60px] lg:h-[60px] xl:w-16 xl:h-16 object-contain cursor-pointer hover:opacity-80 transition-opacity max-sm:w-8 max-sm:h-8"
                  priority
                />
              </Link>
              {session.title && (
                <span className="text-white text-lg sm:text-xl md:text-xl lg:text-2xl xl:text-3xl font-medium max-sm:text-base">
                  {session.title}
                </span>
              )}
            </div>
          </div>
          
          {/* Video Player / 태블릿: 양옆 마진 / PC: 자연스러운 전환 / 1600px에서 줄어들 때 크기 유지 / 1257px 부드러운 전환 / 홈 버튼과 겹치지 않도록 여백 확보 */}
          <div className="absolute top-[160px] md:top-[150px] lg:top-[145px] xl:top-[150px] 2xl:top-[155px] z-20 w-full max-sm:relative max-sm:top-0">
            <div className="w-full max-w-[1200px] md:w-full md:px-4 lg:w-full lg:px-2 xl:w-full xl:px-6 2xl:max-w-[1200px] 2xl:px-8 mx-auto px-4 sm:px-6 max-sm:px-4 max-sm:pt-28">
              <div className="flex flex-col gap-4 sm:gap-6 md:gap-4 lg:gap-5 xl:gap-5.5 2xl:gap-6 w-full max-w-[1070px] md:w-full md:max-w-[calc(100vw-4rem)] lg:w-full lg:max-w-[900px] xl:w-full xl:max-w-[1070px] 2xl:max-w-[1070px] mx-auto pb-0 lg:pb-0 max-sm:gap-4">
                
                {/* Video Player - 1070x602 / 태블릿: 양옆 마진 / PC: 부드럽게 줄어듦 / 1600px에서 줄어들 때 크기 유지 / 1257px 부드러운 전환 */}
                <div
                  className="bg-black rounded-lg shadow-2xl overflow-hidden w-full mx-auto md:rounded-lg lg:w-[900px] lg:mx-auto xl:w-[1070px] xl:mx-auto 2xl:w-full"
                  style={{ aspectRatio: '1070/602' }}
                >
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
                
                {/* Description and Presenter Info - 플레이어와 간격 20px / 태블릿: 레이아웃 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 */}
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4 md:gap-4 lg:gap-10 xl:gap-12 mt-2 sm:mt-4 md:mt-3 lg:mt-2 xl:mt-2 mb-0 lg:mb-0 max-sm:mt-4 md:px-0 lg:px-0">
                  {/* Description / 태블릿: 크기 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 */}
                  <div className="w-full lg:w-full lg:max-w-[600px] xl:w-[680px]">
                    <p className="text-white text-sm sm:text-base md:text-sm lg:text-[15px] xl:text-base leading-relaxed text-left max-sm:text-xs max-sm:leading-relaxed">
                      {session.description || (session.session_key === 'platform_ai_native_networking' || session.session_key === 'datacenter_ai_high_performance'
                        ? 'AI 워크로드는 성능, 네트워크 설계, 운영 측면에서 기존의 방식으로는 감당하기 어려운 복잡성을 만들어 내며, 네트워크는 이러한 AI 데이터센터의 핵심 기반이 됩니다. HPE Juniper Networking의 데이터센터 솔루션은 개방형 유연성과 통합 AIOps를 통해 운영을 단순화하고 비용과 복잡성을 줄이며, 검증된 솔루션 성능으로 보안과 안정성을 갖춘 AI 데이터센터 구축을 가속화할 수 있습니다.'
                        : session.session_key === 'campus_aruba_smart_experience'
                        ? '네트워크의 품질은 이제 단순히 \'연결\'이 아니라 \'경험\'으로 평가됩니다. HPE Aruba Networking 세션에서는 Aruba User Experience Insight(UXI) 를 통해 실제 사용자의 체감 품질을 실시간으로 가시화하고, 문제를 선제적으로 감지·해결하는 사례와 전세계 최초 HPE Aruba 솔루션으로 이룬HIMSS Stage7취득 & 802.11mc/802.11az 고정밀 위치기반 서비스를 소개합니다.'
                        : 'HPE Juniper Networking 세션에서는 Mist AI 기반 실시간 인사이트와 클라이언트부터 클라우드까지의 풀스택 자동화를 통해 문제 해결을 간소화, 가속화하고 일관된 사용자 경험을 보장하는 솔루션을 다룹니다.')}
                    </p>
                  </div>
                  
                  {/* Presenter Introduction - 히어로(1600px) 오른쪽 끝에서 347px, 블록 전체 15px 오른쪽 / 간격: 박스-이름 20px, 이름-HPE 14px / 태블릿: 크기 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 */}
                  <div className="flex-shrink-0 flex flex-row lg:flex-col items-center lg:items-start w-full lg:w-auto lg:mr-[35px] xl:mr-[42px] lg:ml-[12px] xl:ml-[15px] gap-3 md:gap-2.5 lg:gap-0 max-sm:gap-2 md:justify-start">
                    <div className="bg-[#00AB84] text-black rounded-full text-sm md:text-xs lg:text-xs xl:text-sm font-medium whitespace-nowrap flex items-center justify-center w-[112px] h-[32px] md:w-[100px] md:h-[28px] lg:w-[105px] lg:h-[30px] xl:w-[112px] xl:h-[32px] lg:mb-2 max-sm:text-xs max-sm:w-24 max-sm:h-7">
                      발표자 소개
                    </div>
                    <div className="flex flex-row lg:flex-col items-center lg:items-start text-left lg:pl-5 xl:pl-6 lg:min-w-0 gap-2 md:gap-1.5 lg:gap-0 max-sm:gap-1.5">
                      {session.speaker && (
                        <>
                          <p className="text-white text-sm sm:text-base md:text-sm lg:text-[15px] xl:text-base font-medium max-sm:text-xs">
                            {session.speaker}
                          </p>
                          <span className="text-white text-sm sm:text-base md:text-sm lg:hidden max-sm:text-xs">|</span>
                        </>
                      )}
                      <p className="text-white text-xs sm:text-sm md:text-xs lg:text-xs xl:text-sm max-sm:text-[10px]">
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

      {/* Info Box Section / 태블릿: 패딩 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 - 히어로 섹션과 구분 / 1600px 줄어들 때 히어로섹션과 동일 타이밍 / 742px 구간 수정 */}
      <div className="relative bg-[#171F32] pt-8 pb-0 sm:pt-12 md:pt-9 lg:pt-9.5 xl:pt-10 sm:pb-8 max-sm:pt-6 max-sm:pb-6">
        <div className="w-full lg:w-full lg:max-w-[1600px] xl:max-w-[1600px] xl:w-[1600px] mx-auto px-4 sm:px-6 md:px-4 lg:px-8 max-sm:px-4">
          <div className="w-full flex justify-center">
            {/* Desktop & Tablet Info Box - PC와 태블릿 표시 / PC: 자연스러운 전환 / 태블릿: 플레이어와 정렬 / 996px 구간 수정 */}
            <div className="hidden md:block w-full md:w-full md:max-w-[calc(100vw-4rem)] md:mx-auto lg:w-full lg:max-w-[750px] lg:mx-auto xl:max-w-[1070px] h-40 relative bg-[#171F32] mx-auto overflow-hidden">
              {/* Left Text / 태블릿: 크기 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 */}
              <div className="w-72 md:w-64 lg:w-64 xl:w-72 md:left-[29.51px] lg:left-[29.51px] top-[30.46px] absolute justify-start z-10">
                <span className="text-white md:text-sm lg:text-sm xl:text-base font-medium md:leading-5 lg:leading-5 xl:leading-6">해당 온라인 행사에 참여 및 설문조사에 참여하신분들을 대상으로 '</span>
                <span className="text-emerald-500 md:text-sm lg:text-sm xl:text-base font-medium md:leading-5 lg:leading-5 xl:leading-6">메가박스 2인 관람권' 기프트콘</span>
                <span className="text-white md:text-sm lg:text-sm xl:text-base font-medium md:leading-5 lg:leading-5 xl:leading-6">을 발송해 드립니다.<br/><br/></span>
                <span className="text-white md:text-xs lg:text-xs xl:text-sm font-normal md:leading-[7px] lg:leading-[7px] xl:leading-[8.38px]">(100분 무작위 추첨, 행사 종료 후 일괄 지급)</span>
              </div>
              
              {/* Ticket Image / 태블릿: 위치 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 / 996px 구간 수정 */}
              <img className="w-32 h-20 md:left-[285px] lg:left-[314px] xl:left-[354.80px] top-[48.37px] absolute z-10" src="/img/hpe/ticket.png" alt="Movie Ticket" />
              
              {/* Divider 1 - 구분선 간격 183px / 태블릿: 위치 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 / 996px 구간 수정 */}
              <div className="w-[0.76px] h-28 md:left-[calc(100%-312px-0.76px)] lg:left-[443px] xl:left-[704px] top-[30.08px] absolute opacity-25 bg-gray-400 z-10"></div>
              
              {/* Divider 2 / 태블릿: 위치 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 / 996px 구간 수정 */}
              <div className="w-[0.76px] h-28 md:left-[calc(100%-156px-0.76px)] lg:left-[599px] xl:left-[887px] top-[30.08px] absolute opacity-25 bg-gray-400 z-10"></div>
              
              {/* Divider 3 - 컨테이너 오른쪽 끝 테두리 */}
              <div className="w-[0.76px] h-28 right-0 top-[30.08px] absolute opacity-25 bg-gray-400 z-10"></div>
              
              {/* Meeting - 구분선 704~887 (183px) 가운데, 클릭 시 새창 / 태블릿: 위치 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 / 996px 구간 수정 */}
              <a
                href="https://www.seminar-registration-page.com/juniper-meeting-maker"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute md:left-[calc(100%-312px-0.76px)] lg:left-[443px] xl:left-[704px] md:w-[156px] lg:w-[156px] xl:w-[183px] top-[30.08px] flex flex-col items-center gap-5 hover:opacity-90 transition-opacity cursor-pointer z-20"
              >
                <img className="w-16 h-16" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
                <div className="text-center text-emerald-500 text-xs font-normal">온/오프라인 미팅 신청</div>
              </a>
              
              {/* Survey - 구분선 887~1070 (183px) 가운데, 클릭 시 인페이지 팝업 / 태블릿: 위치 조정 / PC: 자연스러운 전환 / 태블릿: 정렬 / 996px 구간 수정 */}
              <button
                type="button"
                onClick={() => setShowSurveyModal(true)}
                className="absolute md:left-[calc(100%-156px-0.76px)] lg:left-[599px] xl:left-[887px] md:w-[156px] lg:w-[156px] xl:w-[183px] top-[30.08px] flex flex-col items-center gap-5 hover:opacity-90 transition-opacity cursor-pointer bg-transparent border-0 p-0 text-left z-20"
              >
                <img className="w-16 h-16" src="/img/hpe/ic_2.png" alt="설문조사" />
                <div className="text-center text-emerald-500 text-xs font-normal -ml-2.5">설문조사</div>
              </button>
            </div>
            
            {/* Mobile Info Box - 모바일만 표시 */}
            <div className="md:hidden w-full bg-[#171F32] rounded-lg p-3 sm:p-6 max-sm:p-4">
              {/* 모바일: 세로 레이아웃 */}
              <div className="flex flex-col gap-4">
                {/* Left Text Section with Ticket - 모바일: 같은 줄 */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-white text-xs sm:text-sm font-medium leading-tight max-sm:text-xs">해당 온라인 행사에 참여 및 설문조사에 참여하신분들을 대상으로 '</span>
                    <span className="text-emerald-500 text-xs sm:text-sm font-medium leading-tight max-sm:text-xs">메가박스 2인 관람권' 기프트콘</span>
                    <span className="text-white text-xs sm:text-sm font-medium leading-tight max-sm:text-xs">을 발송해 드립니다.<br/></span>
                    <span className="text-white text-[10px] sm:text-xs font-normal leading-tight max-sm:text-[10px]">(100분 무작위 추첨, 행사 종료 후 일괄 지급)</span>
                  </div>
                  {/* Ticket Image - 모바일: 텍스트 옆에 표시, 높이 맞춤 */}
                  <img 
                    className="w-20 h-auto flex-shrink-0 self-center" 
                    src="/img/hpe/ticket.png" 
                    alt="Movie Ticket" 
                    style={{ height: 'fit-content', maxHeight: '72px' }}
                  />
                </div>
                
                {/* Icons Section - 모바일: 가로 배치 */}
                <div className="flex items-center justify-center gap-6 max-sm:gap-4 mt-2 max-sm:flex-wrap">
                  <a
                    href="https://www.seminar-registration-page.com/juniper-meeting-maker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 hover:opacity-90 transition-opacity max-sm:flex-1 max-sm:min-w-0"
                  >
                    <img className="w-12 h-12 max-sm:w-10 max-sm:h-10" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
                    <span className="text-emerald-500 text-xs font-normal max-sm:text-[10px] max-sm:text-center">온/오프라인 미팅 신청</span>
                  </a>
                  {/* 모바일 구분줄 */}
                  <div className="w-[0.76px] h-16 opacity-25 bg-gray-400 max-sm:hidden"></div>
                  <button
                    type="button"
                    onClick={() => setShowSurveyModal(true)}
                    className="flex flex-col items-center gap-1 hover:opacity-90 transition-opacity bg-transparent border-0 p-0 text-left max-sm:flex-1 max-sm:min-w-0"
                  >
                    <img className="w-12 h-12 max-sm:w-10 max-sm:h-10" src="/img/hpe/ic_2.png" alt="설문조사" />
                    <span className="text-emerald-500 text-xs font-normal max-sm:text-[10px] max-sm:text-center max-sm:left-0">설문조사</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - 온디맨드 페이지 통일 / 태블릿: 높이 조정 */}
      <footer className="w-full max-sm:h-[50px] md:h-[100px] lg:h-[113px]" style={{ color: '#FFFFFF', backgroundColor: '#171F32' }}>
        <div className="max-w-[1600px] mx-auto h-full flex justify-center items-center max-sm:items-start pt-[40px] md:pt-[35px] lg:pt-[40px] max-sm:pt-4 max-sm:px-4">
          <p
            className="text-center text-[10px] md:text-[9px] lg:text-[10px] font-thin max-sm:leading-relaxed max-sm:break-words max-sm:px-2"
            style={{ color: '#FFFFFF', fontWeight: 100 }}
          >
            © Copyright 2026 Hewlett Packard Enterprise Development LP.
          </p>
        </div>
      </footer>

      <OnDemandSurveyModal
        open={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        webinarIdOrSlug={webinarPath}
      />
    </div>
  )
}
