'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OnDemandWebinar {
  id: string
  slug?: string | null
  title: string
  description?: string
  start_time?: string | null
  end_time?: string | null
  meta_thumbnail_url?: string | null
  email_thumbnail_url?: string | null
  settings?: {
    ondemand?: {
      sessions?: any[]
    }
  }
  sessions?: any[]
  clients?: {
    id: string
    name: string
    logo_url?: string | null
    brand_config?: any
  } | null
}

interface OnDemandLandingPageProps {
  webinar: OnDemandWebinar
}

/**
 * 온디맨드 랜딩 페이지 컴포넌트
 * HPE 디자인에 맞춘 로그인 페이지
 */
export default function OnDemandLandingPage({ webinar }: OnDemandLandingPageProps) {
  const router = useRouter()
  const webinarPath = webinar.slug || webinar.id
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Supabase Storage URL (로컬/프로덕션 모두 사용)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  
  const hpeWebinarSeriesImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/HPE_Webinar_Series.png`
    : '/img/hpe/HPE_Webinar_Series.png'
  const hpeBackgroundImageUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/webinar_login_BG_1600px.png`
    : '/img/hpe/webinar_login_BG_1600px.png'
  const hpeDueIconUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/hpe/due.png`
    : '/img/hpe/due.png'
  
  // 기간 포맷팅
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
    return null
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 에러 메시지 초기화
    setErrorMessage('')
    
    // 브라우저 기본 유효성 검사가 통과한 경우에만 실행
    if (!name.trim() || !email.trim()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 등록 여부 확인 API 호출
      const response = await fetch(`/api/ondemand/${webinarPath}/check-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      })
      
      const data = await response.json()
      
      if (data.registered) {
        // 등록된 사용자: 세션 목록 페이지로 이동
        router.push(`/ondemand/${webinarPath}/watch`)
      } else {
        // 등록되지 않은 사용자: 에러 메시지 표시
        setIsSubmitting(false)
        setErrorMessage('가입되지 않은 계정입니다.')
      }
    } catch (error) {
      console.error('로그인 확인 오류:', error)
      setIsSubmitting(false)
      setErrorMessage('가입되지 않은 계정입니다.')
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ backgroundColor: '#171F32' }}>
      {/* Hero Section - 모바일: 높이 조정, 태블릿: 높이 조정 */}
      <div className="relative w-full bg-[#171D28] h-[272px] sm:h-[480px] md:h-[500px] lg:h-[521px] max-sm:h-[242px] max-sm:flex max-sm:flex-col">
        {/* 배경 이미지 - 1600px까지만 적용 */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <div className="relative w-full max-w-[1600px] h-full">
            <Image
              src={hpeBackgroundImageUrl}
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
        
        <div className="relative w-full max-w-[1600px] mx-auto h-full overflow-hidden flex items-center justify-center z-10">
          {/* 도형 레이어: 1600px 컨테이너 기준 정렬, 모바일에서 숨김 */}
          <div className="absolute inset-0 z-[1] overflow-hidden hidden md:block">
            <div 
              className="absolute inset-0"
              style={{ 
                width: '100%',
                height: '100%'
              }}
            >
              <Image
                src="/img/hpe/rec_1.png"
                alt="HPE Shape"
                fill
                className="object-cover object-left"
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
        {/* 텍스트 콘텐츠: 도형 위에 위치하도록 z-index 관리 / 모바일: 로고와 간격 확보 / 태블릿: 패딩 조정 */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center py-4 sm:py-6 md:py-7 lg:py-12 max-sm:pt-20 max-sm:pb-4">
          
          {/* Center: Title and Info */}
          <div className="flex-1 flex items-center max-sm:items-start max-sm:pt-0">
            <div className="w-full px-4 sm:px-6 md:px-6 lg:px-8 max-sm:px-3">
              {/* 로고와 기간 줄을 같은 컨테이너에 배치 */}
              <div className="flex flex-col items-center w-full">
                {/* 로고 너비에 맞춘 컨테이너 - 가운데 정렬 / 모바일: 기간 설명 기준 너비, 가운데 정렬 / 태블릿: 너비 조정 */}
                <div className="flex flex-col items-start w-[410px] md:w-[380px] lg:w-[410px] max-sm:w-auto max-sm:max-w-[calc(100vw-1.5rem)] max-sm:mx-auto">
                  {/* 제목 - 가운데 정렬 / 모바일: 크기 축소, 간격 확대 / 태블릿: 크기 조정 */}
                  <div className="mb-2 sm:mb-3 md:mb-3.5 lg:mb-6 self-center max-sm:w-full max-sm:mb-4">
                    <Image
                      src={hpeWebinarSeriesImageUrl}
                      alt="HPE Webinar Series"
                      width={410}
                      height={80}
                      className="w-[410px] md:w-[380px] lg:w-[410px] h-auto object-contain max-sm:w-[85%] max-sm:max-w-[320px]"
                      priority
                    />
                  </div>
                  
                  {/* 기간 배지와 날짜 - 왼쪽 정렬 / 모바일: 줄바꿈 허용, 간격 확대 / 태블릿: 크기 조정 */}
                  <div className="flex flex-row items-center justify-start gap-1.5 sm:gap-2 md:gap-2 mb-1.5 sm:mb-2 md:mb-2.5 lg:mb-3 flex-wrap max-sm:mb-4 max-sm:mb-1">
                    <div className="inline-flex items-center shrink-0">
                      <Image
                        src={hpeDueIconUrl}
                        alt="기간"
                        width={50}
                        height={26}
                        className="h-5 sm:h-6 md:h-6 lg:h-7 w-auto object-contain"
                        priority
                      />
                    </div>
                    <span className="text-white text-xs sm:text-sm md:text-sm lg:text-lg xl:text-xl max-sm:whitespace-normal">
                      2026년 3월 2일 (월) ~ 3월 6일 (금)
                    </span>
                  </div>
                  
                  {/* 안내 텍스트 - 기간 아이콘과 같은 위치에서 시작 / 모바일: 기간과 붙임 / 태블릿: 크기 조정 */}
                  <p className="text-white/90 text-[10px] sm:text-xs md:text-xs lg:text-xs text-left max-sm:leading-relaxed max-sm:mt-0 max-sm:-mt-1">
                    * 기간 내, 언제든지 입장하셔서 컨텐츠를 반복적으로 시청하실 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        
        {/* Divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300 z-20"></div>
      </div>

      {/* Login Form Section - 모바일: 전체 너비, 터치 영역 확보, 버튼 가운데 정렬 / 태블릿: 패딩 조정 */}
      <div className="bg-white flex items-start sm:items-center justify-center px-3 sm:px-4 md:px-5 lg:px-8 min-h-[300px] overflow-x-hidden max-sm:px-4 max-sm:py-8 max-sm:items-center sm:pt-[70px] sm:pb-[70px] md:pt-[60px] md:pb-[60px] lg:pt-[70px] lg:pb-[70px]">
        <div className="w-[355px] md:w-[340px] lg:w-[355px] max-sm:w-full max-sm:max-w-[min(100%,355px)]">
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6 md:space-y-5 lg:space-y-6 w-full">
            {/* Title */}
            <div className="mb-6 sm:mb-8 md:mb-7 lg:mb-8">
              <h3 className="text-xl sm:text-2xl md:text-xl lg:text-2xl text-[#00B388] mb-2 font-semibold">
                로그인
              </h3>
              <div className="h-1 bg-[#00B388] w-full"></div>
            </div>
            
            {/* Name Input - 모바일: 터치 최소 44px / 태블릿: 너비 조정 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 md:gap-3 lg:gap-4">
              <label htmlFor="name" className="text-sm md:text-sm lg:text-sm font-semibold text-gray-700 whitespace-nowrap text-left">
                성 함<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErrorMessage('')
                }}
                required
                className="w-full sm:w-[253px] md:w-[240px] lg:w-[253px] px-4 rounded bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1 h-[37px] max-sm:min-h-[44px] max-sm:text-base placeholder:text-gray-500"
                placeholder="성함을 입력하세요"
                style={{ backgroundColor: '#f3f4f6', color: '#111827' }}
              />
            </div>
            
            {/* Email Input - 모바일: 터치 최소 44px / 태블릿: 너비 조정 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 md:gap-3 lg:gap-4">
              <label htmlFor="email" className="text-sm md:text-sm lg:text-sm font-semibold text-gray-700 whitespace-nowrap text-left">
                이메일 주소<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMessage('')
                }}
                required
                className="w-full sm:w-[253px] md:w-[240px] lg:w-[253px] px-4 rounded bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1 h-[37px] max-sm:min-h-[44px] max-sm:text-base placeholder:text-gray-500"
                placeholder="이메일 주소를 입력하세요"
                style={{ backgroundColor: '#f3f4f6', color: '#111827' }}
              />
            </div>
            
            {/* Bottom Line */}
            <div className="h-1 bg-[#00B388] w-full"></div>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="text-center">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}
            
            {/* Login Button - 모바일: 터치 영역 확대, 상단 간격 확대 / 태블릿: 크기 조정 */}
            <div className="flex flex-col items-center gap-3 md:gap-2.5 lg:gap-3 max-sm:!mt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 md:px-7 md:py-2 lg:px-8 lg:py-2.5 bg-[#00B388] text-white font-medium rounded-full hover:bg-[#00A077] focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-sm:min-h-[44px] max-sm:min-w-[165px] max-sm:px-6 w-[165px] md:w-[160px] lg:w-[165px]"
              >
                {isSubmitting ? '처리 중...' : '로그인'}
              </button>
              
              {/* 등록하기 링크 */}
              <Link 
                href={`/ondemand/${webinarPath}/register`}
                className="text-sm md:text-xs lg:text-sm text-gray-600 hover:text-[#00B388] underline transition-colors"
              >
                등록하기
              </Link>
            </div>
          </form>
        </div>
      </div>

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

    </div>
  )
}
