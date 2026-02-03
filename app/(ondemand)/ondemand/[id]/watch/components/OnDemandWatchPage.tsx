'use client'

import Link from 'next/link'
import Image from 'next/image'

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
}

export default function OnDemandWatchPage({ webinar }: OnDemandWatchPageProps) {
  const webinarPath = webinar.slug || webinar.id
  const sortedSessions = [...webinar.sessions].sort((a, b) => (a.order || 0) - (b.order || 0))
  
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
      {/* Hero Section */}
      <div className="relative w-full bg-[#171D28] min-h-[272px] sm:min-h-[480px] md:h-[520px] lg:h-[520px] pb-8 sm:pb-12 md:pb-0">
        {/* Background Image - 1600px까지만 적용 */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <div className="relative w-full max-w-[1600px] h-full">
            <Image
              src="/img/hpe/bg_b_3984x520_1.png"
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
        
        
        <div className="relative w-full max-w-[1600px] mx-auto h-full overflow-visible flex items-center justify-center z-10">
          {/* Shape Layer - 1600px 컨테이너 기준 정렬, 100% 크기, 모바일에서 숨김 */}
          <div className="absolute inset-0 z-[1] overflow-hidden hidden md:block">
            <div className="relative w-full h-full">
              <Image
                src="/img/hpe/rec_2.png"
                alt="HPE Shape"
                fill
                className="object-contain object-left-top"
                priority
                sizes="1600px"
              />
            </div>
          </div>
          
          {/* HPE Logo - 1600px 컨테이너 기준 정렬 */}
          <div className="absolute top-4 sm:top-8 md:top-12 left-4 sm:left-6 lg:left-8 z-20">
            <Image
              src="/img/hpe/hpe_logo.png"
              alt="HPE"
              width={80}
              height={27}
              className="sm:w-[100px] sm:h-[33px] md:w-[120px] md:h-[40px] object-contain"
              priority
            />
          </div>
        <div className="relative z-10 w-full h-full flex flex-col justify-center py-4 sm:py-6 md:py-8 lg:py-12">
          
          {/* Center: Title and Info */}
          <div className="flex flex-col items-center justify-center pt-12 sm:pt-16 md:pt-0 gap-4 sm:gap-6">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="text-left max-w-3xl md:max-w-[856px] mx-auto">
                {/* Title */}
                <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 md:mb-4 lg:mb-6">
                  {webinar.title}
                </h2>
                
                {/* Description */}
                <p className="text-white/90 text-sm sm:text-base md:text-base leading-relaxed mb-4 sm:mb-6">
                  지난 Discover More AI Seoul 행사에서 큰 관심을 받았던 HPE Networking 발표 내용을 온디멘드 웨비나로 다시 확인하실 수 있도록 준비했습니다. AI 시대를 대비한 HPE Networking의 기술 비전과 전략을 온디멘드 웨비나로 언제 어디서나 확인하실 수 있습니다. AI 네이티브 네트워킹 플랫폼, 데이터 센터 및 캠퍼스 & 브랜치 까지 주요 세션의 핵심 인사이트를 한 번에 만나보시기 바랍니다.
                </p>
              </div>
            </div>
              
              {/* Info Box - 모바일 최적화 */}
              <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-[856px] min-h-[160px] md:h-40 relative bg-[#171F32] mx-auto px-4 sm:px-6 md:px-0 py-4 md:py-0 mb-4 sm:mb-0">
                  {/* 모바일: 세로 레이아웃, 데스크톱: 가로 레이아웃 */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full gap-4 md:gap-0">
                    {/* Left Text Section */}
                    <div className="flex-1 md:w-72 md:absolute md:left-[29.51px] md:top-[30.46px]">
                      <span className="text-white text-xs sm:text-sm md:text-base font-medium leading-tight md:leading-6">해당 온라인 행사에 참여 및 설문조사에 참여하신분들을 대상으로 '</span>
                      <span className="text-emerald-500 text-xs sm:text-sm md:text-base font-medium leading-tight md:leading-6">메가박스 2인 관람권' 기프트콘</span>
                      <span className="text-white text-xs sm:text-sm md:text-base font-medium leading-tight md:leading-6">을 발송해 드립니다.<br className="md:hidden"/><br className="hidden md:block"/></span>
                      <span className="text-white text-[10px] sm:text-xs md:text-sm font-normal leading-tight md:leading-[8.38px]">(100분 무작위 추첨, 행사 종료 후 일괄 지급)</span>
                    </div>
                    
                    {/* Ticket Image - 모바일에서 숨김 */}
                    <img 
                      className="hidden md:block w-32 h-20 md:absolute md:left-[354.80px] md:top-[48.37px]" 
                      src="/img/hpe/ticket.png" 
                      alt="Movie Ticket" 
                    />
                    
                    {/* Divider 1 - 모바일에서 숨김 */}
                    <div className="hidden md:block w-[0.76px] h-28 absolute left-[501.07px] top-[30.08px] opacity-25 bg-gray-400"></div>
                    
                    {/* Divider 2 - 모바일에서 숨김 */}
                    <div className="hidden md:block w-[0.76px] h-28 absolute left-[677.04px] top-[30.08px] opacity-25 bg-gray-400"></div>
                    
                    {/* Icons Section - 모바일: 가로 배치, 데스크톱: 절대 위치 */}
                    <div className="flex md:hidden items-center justify-center gap-12 sm:gap-16 mt-2">
                      <div className="flex flex-col items-center gap-1">
                        <img className="w-12 h-12" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
                        <span className="text-emerald-500 text-xs font-normal">온/오프라인 미팅 신청</span>
                      </div>
                      {/* 모바일 구분줄 */}
                      <div className="w-[0.76px] h-16 opacity-25 bg-gray-400"></div>
                      <div className="flex flex-col items-center gap-1">
                        <img className="w-12 h-12" src="/img/hpe/ic_2.png" alt="설문조사" />
                        <span className="text-emerald-500 text-xs font-normal relative left-[-2px]">설문조사</span>
                      </div>
                    </div>
                    
                    {/* 데스크톱 아이콘들 */}
                    <div className="hidden md:block">
                      <div className="w-32 absolute left-[526.32px] top-[118.07px] text-emerald-500 text-xs font-normal">온/오프라인 미팅 신청</div>
                      <div className="w-14 absolute left-[734.98px] top-[118.07px] text-emerald-500 text-sm font-normal">설문조사</div>
                      <img className="w-16 h-16 absolute left-[555.16px] top-[33.13px]" src="/img/hpe/ic_3.png" alt="온/오프라인 미팅 신청" />
                      <img className="w-16 h-16 absolute left-[735.70px] top-[31.61px]" src="/img/hpe/ic_2.png" alt="설문조사" />
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

      {/* Sessions Grid */}
      <div className="flex-1 bg-white overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto w-full">
          {sortedSessions.map((session) => (
            <div key={session.session_key} className="w-full">
              {/* Category Name */}
              {session.category_label && (
                <h3 className="text-xl sm:text-2xl md:text-[2rem] font-normal text-emerald-500 mb-2 sm:mb-3 text-left">
                  <div className="leading-relaxed">{session.category_label}</div>
                  {session.product_label && (
                    <div className="leading-relaxed">{session.product_label}</div>
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

      {/* Market Analysis Section */}
      <section className="w-full bg-[#0b1a2d] text-white py-8 sm:py-12 md:py-16 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-8 sm:mb-12">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                <div className="leading-relaxed">시장조사기관으로 부터 인정받은</div>
                <div className="leading-relaxed text-white">HPE Networking</div>
              </h1>
            </header>

            {/* Gartner Reports Grid */}
            <main className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-6 mb-12 sm:mb-16">
              {/* Wired/Wireless Section */}
              <div className="flex flex-col items-center">
                <div className="bg-[#00b894] text-white px-6 sm:px-8 py-1 rounded-full font-bold mb-3 sm:mb-4 uppercase tracking-wider text-sm sm:text-base">
                  A LEADER
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-center mb-1">Wired/Wireless:</h2>
                <p className="text-gray-300 text-xs sm:text-sm mb-4 sm:mb-6 text-center">#1 in all critical capability use cases</p>
                
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
                <div className="bg-[#00b894] text-white px-6 sm:px-8 py-1 rounded-full font-bold mb-3 sm:mb-4 uppercase tracking-wider text-sm sm:text-base">
                  A LEADER
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-center mb-1">Data Center Networking</h2>
                <p className="text-gray-300 text-xs sm:text-sm mb-4 sm:mb-6 text-center">#1 in Enterprise Build Out use case</p>
                
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

            {/* Footer Highlight Box */}
            <section className="bg-[#2868B2] p-4 sm:p-6 md:p-10 rounded-lg flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 shadow-2xl mb-8 sm:mb-12">
              <div className="flex-shrink-0">
                <img
                  src="/img/hpe/ic_4.png"
                  alt="AI Data Center Infrastructure"
                  width={120}
                  height={120}
                  className="object-contain w-20 h-20 sm:w-24 sm:h-24 md:w-[120px] md:h-[120px]"
                />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
                  <span className="block md:inline">2025년 800GbE OEM</span>
                  <span className="block md:inline"> 스위칭 시장 점유율 1위</span>
                </h3>
                <p className="text-blue-100 leading-relaxed text-sm sm:text-base md:text-lg lg:text-xl">
                  2025년 3월에 발표된 650 Group의 2024년 매출 출하량 보고서에 따르면, <br className="hidden sm:block" />
                  HPE Juniper Networking은 AI 데이터센터 인프라의 핵심 요소인 <span className="text-[#F5B225] font-bold">800GbE OEM</span> <br className="hidden sm:block" />
                  스위치 시장에서 <span className="text-[#F5B225] font-bold">44%의 점유율</span>로 선두를 달리고 있습니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-900 text-white" style={{ height: '113px' }}>
        <div className="max-w-[1600px] mx-auto h-full flex items-center justify-center">
          <p className="text-center text-sm">© Copyright 2026 Hewlett Packard Enterprise Development LP.</p>
        </div>
      </footer>
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
      className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow w-full"
    >
      {/* Thumbnail */}
      <div className="relative w-full pb-[56.25%] bg-gray-200">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={session.title}
            fill
            className="object-cover"
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

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-emerald-500 transition-colors text-left">
            {session.title}
          </h3>
        </div>
        
        {session.description && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2 text-left sm:text-center">
            {session.description}
          </p>
        )}
        
        {session.speaker && (
          <div className="flex items-center text-xs sm:text-sm text-gray-500">
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {session.speaker}
          </div>
        )}
      </div>
    </Link>
  )
}
