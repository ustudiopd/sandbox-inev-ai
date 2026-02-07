'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import OnDemandSurveyModal from '../[sessionKey]/components/OnDemandSurveyModal'

interface Session {
  session_key: string
  title: string
  description?: string
  thumbnail_url?: string | null
  provider: string
  asset_id: string
  vimeo_hash?: string
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
  start_time?: string | null
  end_time?: string | null
  sessions: Session[]
  clients?: {
    id: string
    name: string
    logo_url?: string | null
  } | null
}

interface OnDemandWatchPageProps {
  webinar: OnDemandWebinar
  initialSurveyStatus?: { submitted: boolean; survey_no?: number; code6?: string } | null
}

export default function OnDemandWatchPage({ webinar, initialSurveyStatus }: OnDemandWatchPageProps) {
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [successData, setSuccessData] = useState<{ survey_no: number; code6: string } | null>(null)
  const [surveyStatus, setSurveyStatus] = useState(initialSurveyStatus)
  const webinarPath = webinar.slug || webinar.id

  // 설문 버튼 클릭 시 처리
  const handleSurveyClick = () => {
    // 이미 제출된 경우 팝업만 표시
    if (surveyStatus?.submitted && surveyStatus.survey_no && surveyStatus.code6) {
      setSuccessData({ survey_no: surveyStatus.survey_no, code6: surveyStatus.code6 })
      setShowSuccessAlert(true)
      setTimeout(() => {
        setShowSuccessAlert(false)
      }, 5000)
    } else {
      // 제출되지 않은 경우 모달 열기
      setShowSurveyModal(true)
    }
  }
  const sortedSessions = [...webinar.sessions].sort((a, b) => (a.order || 0) - (b.order || 0))
  
  // Supabase Storage URL (로컬/프로덕션 모두 사용)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const hpeWebinarSeriesImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/HPE_Webinar_Series.png`
    : '/img/hpe/HPE_Webinar_Series.png'
  const hpeHeroBgImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/webinar_home_bg1.png`
    : '/img/hpe/webinar_home_bg1.png'
  const hpeShapeImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/webinar_rec.png`
    : '/img/hpe/webinar_rec.png'
  const hpeTicketImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/ticket.png`
    : '/img/hpe/ticket.png'

  const formatDateRange = () => {
    if (webinar.start_time && webinar.end_time) {
      const start = new Date(webinar.start_time)
      const end = new Date(webinar.end_time)
      const startStr = start.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
      })
      const endStr = end.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
      })
      return `${startStr} ~ ${endStr}`
    }
    return '2026년 3월 2일 (월) ~ 3월 6일 (금)'
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
      {/* Hero Section - 모바일: 높이 조정, 태블릿: 높이 조정, 부드러운 전환 / 1600px 줄어들 때 정보섹션과 동일 타이밍 */}
      <div className="relative w-full bg-[#171D28] h-[272px] sm:h-[480px] md:h-[650px] lg:h-[670px] xl:h-[689px] pb-8 sm:pb-12 md:pb-0 max-sm:h-auto max-sm:min-h-[400px] max-sm:pb-6">
        {/* Background Image - 1600px까지만 적용 */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <div className="relative w-full lg:w-full lg:max-w-[1600px] xl:max-w-[1600px] xl:w-[1600px] h-full">
            <Image
              src={hpeHeroBgImageUrl}
              alt="HPE Webinar Series Background"
              fill
              className="object-cover object-left"
              priority
              sizes="1600px"
              style={{ 
                objectFit: 'cover',
                objectPosition: 'left center',
                width: '100%',
                height: '100%'
              }}
            />
          </div>
        </div>
        
        {/* 모바일 전용 배경 이미지 - 연하게 */}
        <div className="absolute inset-0 w-full h-full md:hidden opacity-30">
          <Image
            src="/img/hpe/bg_b_928.png"
            alt="HPE Background Pattern"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            style={{ 
              objectFit: 'cover',
              objectPosition: 'center',
              width: '100%',
              height: '100%'
            }}
          />
        </div>
        
        
        <div className="relative w-full lg:w-full lg:max-w-[1600px] xl:max-w-[1600px] xl:w-[1600px] mx-auto h-full overflow-visible flex items-center justify-center z-10">
          {/* Shape Layer - 1600px 컨테이너 기준 정렬, 100% 크기, 모바일에서 숨김 / 태블릿: 아래 왼쪽 기준으로 줄어듦 */}
          <div className="absolute inset-0 z-[1] overflow-hidden hidden md:block">
            <div className="relative w-full h-full">
              <Image
                src={hpeShapeImageUrl}
                alt="HPE Shape"
                fill
                className="object-contain object-left-bottom"
                priority
                sizes="1600px"
              />
            </div>
          </div>
          
          {/* HPE Logo - 1600px 컨테이너 기준 정렬 / 모바일: 상단 여백 확보 / 태블릿: 크기 조정 */}
          <div className="absolute top-4 sm:top-8 md:top-10 lg:top-12 left-4 sm:left-6 md:left-6 lg:left-8 z-20 max-sm:top-3">
            <Image
              src="/img/hpe/hpe_logo.png"
              alt="HPE"
              width={80}
              height={27}
              className="sm:w-[100px] sm:h-[33px] md:w-[110px] md:h-[36px] lg:w-[120px] lg:h-[40px] object-contain"
              priority
            />
          </div>
        <div className="relative z-10 w-full h-full flex flex-col justify-center py-4 sm:py-6 md:py-7 lg:py-10 xl:py-12 max-sm:pt-24 max-sm:pb-4" style={{ paddingTop: '50px' }}>
          
          {/* Center: Title and Info */}
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 md:gap-5 lg:gap-5.5 xl:gap-6 max-sm:gap-3">
            {/* HPE Webinar Series 로고 - 모바일: 가운데 정렬, 로고와 간격 / 태블릿: Info Box 왼쪽 라인 맞춤, 반응형 */}
            <div className="w-full px-4 sm:px-6 md:px-6 lg:px-8">
              <div className="mb-2 sm:mb-3 md:mb-3.5 lg:mb-4 xl:mb-6 max-sm:mx-auto max-sm:text-center max-sm:mb-3 max-sm:mt-4 sm:ml-[430px] md:w-full md:max-w-[750px] md:mx-auto lg:w-full lg:max-w-[847px] lg:mx-auto xl:ml-[430px] xl:w-auto xl:max-w-none">
                <Image
                  src={hpeWebinarSeriesImageUrl}
                  alt="HPE Webinar Series"
                  width={410}
                  height={80}
                  className="w-[280px] sm:w-[320px] md:w-[360px] lg:w-[410px] h-auto object-contain object-left max-sm:w-[85%] max-sm:max-w-[320px] max-sm:mx-auto"
                  priority
                />
              </div>
            </div>
            
            <div className="w-full px-4 sm:px-6 md:px-6 lg:px-8">
              <div className="text-left max-w-3xl md:w-full md:max-w-[750px] md:mx-auto lg:w-full lg:max-w-[847px] lg:mx-auto xl:max-w-[802px] xl:ml-[430px] max-sm:mx-auto max-sm:max-w-full max-sm:px-2 sm:ml-[430px]">
                {/* Description - 모바일: 텍스트 크기 및 간격 조정 / 태블릿: 왼쪽 정렬, Info Box 왼쪽 라인 맞춤, 반응형 */}
                <p className="text-white/90 text-[17px] md:text-[16px] lg:text-[16.5px] xl:text-[17px] leading-relaxed mb-4 sm:mb-6 md:mb-5 lg:mb-5.5 xl:mb-6 max-sm:text-sm max-sm:leading-relaxed max-sm:mb-3" style={{ letterSpacing: '-0.1px' }}>
                  지난 Discover More AI Seoul 행사에서 큰 관심을 받았던 HPE Networking 주요 발표 내용을 온디맨드 웨비나로 준비했습니다. AI 네이티브 네트워킹 플랫폼, 데이터 센터부터 캠퍼스 & 브랜치 영역까지 핵심 세션의 인사이트를 한 번에 만나보실 수 있습니다. 지금 온디맨드 웨비나를 통해 AI 시대를 대비한 HPE Networking의 기술 비전과 전략을 확인해 보세요.
                </p>
              </div>
            </div>
              
              {/* Info Box - 모바일 최적화 / 태블릿: 크기 및 위치 조정, 반응형 */}
              <div className="w-full px-4 sm:px-6 md:px-6 lg:px-8">
                <div className="w-[847px] md:w-full md:max-w-[750px] lg:w-full lg:max-w-[847px] xl:w-[847px] min-h-[160px] md:h-40 relative bg-[#171F32] px-4 sm:px-6 md:px-0 py-4 md:py-0 mb-4 sm:mb-0 max-sm:w-full max-sm:mx-auto max-sm:max-w-[calc(100vw-2rem)] sm:ml-[430px] md:mx-auto lg:mx-auto xl:ml-[430px]">
                  {/* 모바일: 세로 레이아웃, 데스크톱: 가로 레이아웃 */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full gap-4 md:gap-0">
                    {/* Left Text Section with Ticket - 모바일: 같은 줄 / 태블릿: 위치 조정 */}
                    <div className="flex-1 md:w-72 md:absolute md:left-[29.51px] lg:left-[29.51px] md:top-[30.46px] max-sm:flex max-sm:items-center max-sm:gap-3">
                      <div className="flex-1">
                        <span className="text-white text-xs sm:text-sm md:text-sm lg:text-base font-medium leading-tight md:leading-6">해당 온라인 행사에 참여 및 설문조사에 참여하신분들을 대상으로 '</span>
                        <span className="text-emerald-500 text-xs sm:text-sm md:text-sm lg:text-base font-medium leading-tight md:leading-6">메가박스 2인 관람권' 기프트콘</span>
                        <span className="text-white text-xs sm:text-sm md:text-sm lg:text-base font-medium leading-tight md:leading-6">을 발송해 드립니다.<br className="md:hidden"/><br className="hidden md:block"/></span>
                        <span className="text-white text-[10px] sm:text-xs md:text-xs lg:text-sm font-normal leading-tight md:leading-[8.38px]">(100분 무작위 추첨, 행사 종료 후 일괄 지급)</span>
                      </div>
                      {/* Ticket Image - 모바일: 텍스트 옆에 표시, 높이 맞춤 */}
                      <img 
                        className="block md:hidden w-20 h-auto flex-shrink-0 self-center" 
                        src={hpeTicketImageUrl} 
                        alt="Movie Ticket" 
                        style={{ height: 'fit-content', maxHeight: '72px', background: 'transparent' }}
                      />
                    </div>
                    
                    {/* Ticket Image - 데스크톱: 절대 위치 / 태블릿: 위치 조정 */}
                    <img 
                      className="hidden md:block w-32 h-20 md:absolute md:left-[314px] lg:left-[354.80px] md:top-[48.37px]" 
                      src={hpeTicketImageUrl} 
                      alt="Movie Ticket" 
                      style={{ background: 'transparent' }}
                    />
                    
                    {/* Divider 1 - 모바일에서 숨김 / 태블릿: 위치 조정 */}
                    <div className="hidden md:block w-[0.76px] h-28 absolute md:left-[443px] lg:left-[501.07px] top-[30.08px] opacity-25 bg-gray-400"></div>
                    
                    {/* Divider 2 - 모바일에서 숨김 / 태블릿: 위치 조정 */}
                    <div className="hidden md:block w-[0.76px] h-28 absolute md:left-[599px] lg:left-[677.04px] top-[30.08px] opacity-25 bg-gray-400"></div>
                    
                    {/* Icons Section - 모바일: 가로 배치, 데스크톱: 절대 위치 */}
                    <div className="flex md:hidden items-center justify-center gap-6 max-sm:gap-4 mt-2 max-sm:flex-wrap">
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
                        onClick={handleSurveyClick}
                        className="flex flex-col items-center gap-1 hover:opacity-90 transition-opacity bg-transparent border-0 p-0 text-left max-sm:flex-1 max-sm:min-w-0"
                      >
                        <img className="w-12 h-12 max-sm:w-10 max-sm:h-10" src="/img/hpe/ic_2.png" alt="설문조사" />
                        <span className="text-emerald-500 text-xs font-normal max-sm:text-[10px] max-sm:text-center max-sm:left-0">설문조사</span>
                      </button>
                    </div>
                    
                    {/* 데스크톱 아이콘들 / 태블릿: 위치 조정 */}
                    <div className="hidden md:block">
                      <a
                        href="https://www.seminar-registration-page.com/juniper-meeting-maker"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute md:left-[466px] lg:left-[526.32px] top-[33.13px] w-[130px] h-[95px] z-10 hover:opacity-90 transition-opacity"
                      >
                        <img className="w-16 h-16 absolute left-[28.84px] top-0" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
                        <span className="absolute left-0 top-[84.94px] text-emerald-500 text-xs font-normal block w-32">온/오프라인 미팅 신청</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleSurveyClick}
                        className="absolute md:left-[651px] lg:left-[735.70px] top-[33.13px] w-[100px] h-[95px] z-10 hover:opacity-90 transition-opacity cursor-pointer bg-transparent border-0 p-0 text-left"
                      >
                        <img className="w-16 h-16 absolute left-0 top-0" src="/img/hpe/ic_2.png" alt="설문조사" />
                        <span className="absolute left-0 top-[84.94px] text-emerald-500 text-xs font-normal block w-24">설문조사</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </div>
        </div>
        
        {/* Divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300 z-20"></div>
      </div>

      {/* Sessions Grid - 모바일: 높이 자동, 그리드 조정 / 태블릿: 너비 조정 / 1600px 줄어들 때 히어로섹션과 동일 타이밍 */}
      <div className="flex-1 bg-white overflow-x-hidden h-[1095px] max-sm:h-auto max-sm:overflow-visible">
        <div className="w-full lg:w-full lg:max-w-[1600px] xl:max-w-[1600px] xl:w-[1600px] mx-auto px-4 sm:px-6 md:px-4 lg:px-8 pb-6 sm:pb-8 max-sm:px-0 max-sm:pb-6 max-sm:pt-8 pt-[100px] md:pt-[80px] lg:pt-[100px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 w-[1020px] md:w-full md:max-w-[calc(100vw-2rem)] lg:w-[1020px] mx-auto max-sm:w-full max-sm:max-w-full max-sm:gap-4 max-sm:px-4" style={{ gap: '30px' }}>
          {sortedSessions.map((session) => (
            <div key={session.session_key} className="w-full flex flex-col items-center max-sm:items-start max-sm:w-full max-sm:max-w-[calc(100vw-2rem)]">
              {/* Category Name - 모바일: 전체 너비, 썸네일과 정렬 / 태블릿: 크기 조정 */}
              {session.category_label && (
                <h3 className="text-xl sm:text-2xl md:text-[1.5rem] lg:text-[1.75rem] font-bold text-emerald-500 mb-2 sm:mb-3 text-left w-[495px] md:w-full lg:w-[495px] pl-0 max-sm:w-full max-sm:max-w-[calc(100vw-2rem)] max-sm:text-lg max-sm:mb-3">
                  <div className="leading-tight font-bold">{session.category_label}</div>
                  {session.product_label && (
                    <div className="leading-tight font-bold">{session.product_label}</div>
                  )}
                </h3>
              )}
              <SessionCard
                session={session}
                webinarPath={webinarPath}
              />
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Market Analysis Section - 모바일: 패딩 및 텍스트 조정, 세션 카드와 정렬 / 태블릿: 패딩 조정 */}
      <section className="w-full bg-[#171F32] text-white pt-8 sm:pt-12 md:pt-14 lg:pt-16 overflow-x-hidden max-sm:pt-6" style={{ paddingBottom: '0px' }}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-5 lg:px-8 max-sm:px-4">
          <div className="max-w-[1020px] md:max-w-[900px] lg:max-w-[1020px] mx-auto max-sm:max-w-full">
            {/* Header - 모바일: 텍스트 크기 조정, 왼쪽 정렬, 세션 카드와 정렬 / 태블릿: 크기 조정 */}
            <header className="mb-8 sm:mb-12 md:mb-10 lg:mb-12 max-sm:mb-6">
              <h1 className="font-bold mb-2 text-left text-[44px] md:text-[38px] lg:text-[44px] max-sm:text-2xl">
                <div className="leading-tight mb-2 max-sm:mb-1 md:mb-0 md:inline">시장조사기관으로 부터 인정받은</div>
                <div className="leading-tight text-white md:inline md:ml-2">HPE Networking</div>
              </h1>
            </header>

            {/* Gartner Reports Grid - 태블릿: 간격 조정 */}
            <main className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-5 lg:gap-6 mb-12 sm:mb-16 md:mb-14 lg:mb-16">
              {/* Wired/Wireless Section */}
              <div className="flex flex-col items-center">
                <div className="bg-[#00b894] text-white px-6 sm:px-8 md:px-6 lg:px-8 py-1 rounded-full font-bold mb-3 sm:mb-4 uppercase tracking-wider text-sm sm:text-base md:text-sm lg:text-base">
                  A LEADER
                </div>
                <h2 className="text-lg sm:text-xl md:text-lg lg:text-xl font-bold text-center mb-1">Wired/Wireless:</h2>
                <p className="text-gray-300 text-xs sm:text-sm md:text-xs lg:text-sm mb-4 sm:mb-6 text-center">#1 in all critical capability use cases</p>
                
                {/* MQ Chart */}
                <div className="w-full">
                  <img
                    src="/img/hpe/chart_1.png"
                    alt="Magic Quadrant for Enterprise Wired and Wireless LAN Infrastructure"
                    className="w-full h-auto max-w-[80%] mx-auto"
                  />
                </div>
              </div>

              {/* Data Center Networking Section */}
              <div className="flex flex-col items-center">
                <div className="bg-[#00b894] text-white px-6 sm:px-8 md:px-6 lg:px-8 py-1 rounded-full font-bold mb-3 sm:mb-4 uppercase tracking-wider text-sm sm:text-base md:text-sm lg:text-base">
                  A LEADER
                </div>
                <h2 className="text-lg sm:text-xl md:text-lg lg:text-xl font-bold text-center mb-1">Data Center Networking</h2>
                <p className="text-gray-300 text-xs sm:text-sm md:text-xs lg:text-sm mb-4 sm:mb-6 text-center">#1 in Enterprise Build Out use case</p>
                
                {/* MQ Chart */}
                <div className="w-full">
                  <img
                    src="/img/hpe/chart_2.png"
                    alt="Magic Quadrant for Data Center Switching"
                    className="w-full h-auto max-w-[80%] mx-auto"
                  />
                </div>
              </div>
            </main>

            {/* Footer Highlight Box - 모바일: 높이 자동, 패딩 조정 / 태블릿: 크기 조정 */}
            <section className="bg-[#2868B2] p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col md:flex-row max-sm:flex-row items-center gap-4 sm:gap-6 md:gap-6 lg:gap-8 max-sm:gap-3 shadow-2xl w-[1020px] md:w-[900px] lg:w-[1020px] h-[200px] md:h-[180px] lg:h-[200px] max-sm:w-full max-sm:h-auto max-sm:max-w-full max-sm:p-4 max-sm:mx-auto">
              <div className="flex-shrink-0 max-sm:w-16 max-sm:h-16">
                <img
                  src="/img/hpe/ic_4.png"
                  alt="AI Data Center Infrastructure"
                  width={120}
                  height={120}
                  className="object-contain w-20 h-20 sm:w-24 sm:h-24 md:w-[100px] md:h-[100px] lg:w-[120px] lg:h-[120px] max-sm:w-16 max-sm:h-16"
                />
              </div>
              <div className="flex-grow text-center md:text-left max-sm:text-left max-sm:min-w-0">
                <h3 className="font-bold mb-3 sm:mb-4 md:mb-3 lg:mb-4 text-[26px] md:text-[22px] lg:text-[26px] max-sm:text-lg max-sm:mb-2 max-sm:leading-tight">
                  <span className="block md:inline max-sm:inline">2025년 800GbE OEM</span>
                  <span className="block md:inline max-sm:inline"> 스위칭 시장 점유율 1위</span>
                </h3>
                <p className="text-blue-100 leading-relaxed text-sm sm:text-base md:text-base lg:text-xl max-sm:text-xs max-sm:leading-relaxed">
                  2025년 3월에 발표된 650 Group의 2024년 매출 출하량 보고서에 따르면, <br className="hidden sm:block" />
                  HPE Juniper Networking은 AI 데이터센터 인프라의 핵심 요소인 <span className="text-[#F5B225] font-bold">800GbE OEM</span> <br className="hidden sm:block" />
                  스위치 시장에서 <span className="text-[#F5B225] font-bold">44%의 점유율</span>로 선두를 달리고 있습니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* Footer - 모바일: 높이 50px, 텍스트 위치 조정 / 태블릿: 높이 조정 */}
      <footer className="w-full max-sm:h-[50px] md:h-[100px] lg:h-[113px]" style={{ color: '#FFFFFF', backgroundColor: '#171F32' }}>
        <div className="max-w-[1600px] mx-auto h-full flex justify-center items-center pt-[40px] md:pt-[35px] lg:pt-[40px] max-sm:px-4 max-sm:items-start max-sm:pt-4">
          <p 
            className="text-center text-[10px] md:text-[9px] lg:text-[10px] font-thin max-sm:leading-relaxed max-sm:break-words max-sm:px-2" 
            style={{ 
              color: '#FFFFFF', 
              fontWeight: 100
            }}
          >
            © Copyright 2026 Hewlett Packard Enterprise Development LP.
          </p>
        </div>
      </footer>

      <OnDemandSurveyModal
        open={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        webinarIdOrSlug={webinarPath}
        onSuccess={(data) => {
          // 설문 제출 상태 업데이트
          setSurveyStatus({
            submitted: true,
            survey_no: data.survey_no,
            code6: data.code6,
          })
          setSuccessData(data)
          setShowSuccessAlert(true)
          setShowSurveyModal(false)
          // 5초 후 자동으로 알림 닫기
          setTimeout(() => {
            setShowSuccessAlert(false)
          }, 5000)
        }}
      />

      {/* 설문 제출 성공 알림 팝업 */}
      {showSuccessAlert && successData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl p-4 pb-6 max-w-lg w-full pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[400px]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-white -mx-4 -mt-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">설문조사</h2>
              <button
                onClick={() => setShowSuccessAlert(false)}
                className="rounded p-1 text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center py-8 h-full flex flex-col items-center justify-center min-h-[300px]">
              <p className="text-emerald-600 font-medium mb-4">설문이 제출되었습니다.</p>
              <button
                onClick={() => setShowSuccessAlert(false)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Thumbnail URL generation function
 */
function getThumbnailUrl(session: Session, order: number): string | null {
  // Use thumbnail_url if available
  if (session.thumbnail_url) {
    return session.thumbnail_url
  }
  
  // Use thumb_se1.jpg for first session (order 1)
  if (order === 1) {
    return `/img/hpe/thumb_se1.jpg`
  }
  
  // Use thumb1.png, thumb2.png, thumb3.png, thumb4.png based on order
  if (order >= 1 && order <= 4) {
    return `/img/hpe/thumb${order}.png`
  }
  
  // Generate thumbnail from provider and asset_id
  if (session.provider === 'youtube' && session.asset_id) {
    return `https://img.youtube.com/vi/${session.asset_id}/maxresdefault.jpg`
  }
  
  if (session.provider === 'vimeo' && session.asset_id) {
    // Vimeo thumbnail: Use Vumbnail service
    return `https://vumbnail.com/${session.asset_id}.jpg`
  }
  
  return null
}

/**
 * Session Card Component
 */
function SessionCard({ session, webinarPath }: { session: Session; webinarPath: string }) {
  const thumbnailUrl = getThumbnailUrl(session, session.order)
  
  return (
    <Link
      href={`/ondemand/${webinarPath}/watch/${session.session_key}`}
      target="_blank"
      className="group bg-white overflow-hidden max-sm:overflow-visible w-[495px] md:w-full lg:w-[495px] max-sm:w-full max-sm:max-w-[calc(100vw-2rem)]"
    >
      {/* Thumbnail - 모바일: 반응형, Info Box와 같은 너비 / 태블릿: 크기 조정 */}
      <div className="relative w-[495px] md:w-full lg:w-[495px] h-[279px] md:h-[245px] lg:h-[279px] bg-gray-200 max-sm:w-full max-sm:h-auto max-sm:aspect-video">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={session.title}
            fill
            className="object-contain"
            unoptimized={thumbnailUrl.includes('youtube.com') || thumbnailUrl.includes('vumbnail.com')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
          <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-8 h-8 text-gray-900 ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content - 모바일: 패딩 조정, 썸네일과 정렬 */}
      <div className="px-0 py-3 sm:py-4 max-sm:px-0 max-sm:py-3">
        <div className="mb-2 pl-0">
          <h3 className="text-lg sm:text-xl font-normal text-gray-900 group-hover:text-emerald-500 transition-colors text-left max-sm:text-base max-sm:leading-relaxed">
            {session.title === '클라이언트부터 클라우드까지, 최상의 경험을 제공하는 풀스택 네트워크의 구현' 
              ? (
                <>
                  클라이언트부터 클라우드까지,<br className="max-sm:hidden" /> 최상의 경험을 제공하는 풀스택 네트워크의 구현
                </>
              )
              : session.title === '보이지 않는 연결, 보이는 경험 Aruba UXI와 첨단 기술로 전세계 최초로 완성한 Smart Experience'
              ? (
                <>
                  '보이지 않는 연결, 보이는 경험' Aruba UXI와 첨단<br className="max-sm:hidden" /> 기술로 전세계 최초로 완성한 Smart Experience
                </>
              )
              : session.title
            }
          </h3>
        </div>
        
        {session.description && (
          <p className="text-base sm:text-lg text-gray-600 mb-2 sm:mb-3 line-clamp-2 text-left sm:text-center">
            {session.description}
          </p>
        )}
      </div>
    </Link>
  )
}
