'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
  const [showModal, setShowModal] = useState(false)
  
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
        // 등록되지 않은 사용자: 모달 표시
        setIsSubmitting(false)
        setShowModal(true)
      }
    } catch (error) {
      console.error('로그인 확인 오류:', error)
      setIsSubmitting(false)
      // API 오류 시 모달 표시
      setShowModal(true)
    }
  }
  
  const handleConfirmRegister = () => {
    setShowModal(false)
    // 등록 페이지로 이동 (이름과 이메일을 쿼리 파라미터로 전달)
    router.push(`/ondemand/${webinarPath}/register?name=${encodeURIComponent(name.trim())}&email=${encodeURIComponent(email.trim())}`)
  }
  
  const handleCancelRegister = () => {
    setShowModal(false)
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full bg-[#171D28] h-[272px] sm:h-[480px] md:h-[520px] lg:h-[520px]">
        {/* 배경 이미지: 가로로 꽉 차게, 전체 배경에 */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/img/hpe/bg_b_3984x520_1.png"
            alt="HPE Webinar Series Background"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            style={{ 
              objectFit: 'cover',
              objectPosition: 'left center',
              width: '100%',
              height: '100%'
            }}
          />
        </div>
        
        {/* 도형 레이어: 모바일에서도 비율에 맞게 표시 */}
        <div className="absolute inset-0 z-[1] overflow-hidden">
          <div 
            className="absolute inset-0 min-[1601px]:left-0 max-[1600px]:left-1/2 max-[1600px]:-translate-x-1/2"
            style={{ 
              width: '1600px', 
              minWidth: '1600px',
              height: '100%',
              maxWidth: '100vw'
            }}
          >
            <Image
              src="/img/hpe/rec_1.png"
              alt="HPE Shape"
              fill
              className="object-cover object-left max-[1600px]:object-contain max-[1600px]:object-left"
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1600px) 1600px, 1600px"
            />
          </div>
        </div>
        
        {/* HPE Logo - 항상 왼쪽 끝에 고정 */}
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
        
        <div className="relative w-full max-w-[1600px] mx-auto h-full overflow-hidden flex items-center justify-center z-10">
        {/* 텍스트 콘텐츠: 도형 위에 위치하도록 z-index 관리 */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center py-4 sm:py-6 md:py-8 lg:py-12">
          
          {/* Center: Title and Info */}
          <div className="flex-1 flex items-center">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                {/* 제목 */}
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 md:mb-4 lg:mb-6">
                  {webinar.title}
                </h2>
                
                {/* 기간 배지와 날짜 */}
                <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 mb-1.5 sm:mb-2 md:mb-3 flex-wrap">
                  <span className="inline-flex items-center px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm md:text-base font-medium bg-white text-gray-900 whitespace-nowrap">
                    기간
                  </span>
                  <span className="text-white text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl whitespace-nowrap">
                    2026년 3월 2일 (월) ~ 3월 6일 (금)
                  </span>
                </div>
                
                {/* 안내 텍스트 */}
                <p className="text-white/90 text-xs sm:text-sm max-w-2xl mx-auto px-4">
                  기간 내, 언제든지 입장하셔서 컨텐츠를 반복적으로 시청하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
        
        {/* Divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300 z-20"></div>
      </div>

      {/* Login Form Section */}
      <div className="bg-white flex items-start sm:items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10 md:py-16 lg:py-32 min-h-[300px] overflow-x-hidden">
        <div className="w-full max-w-md">
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6 w-full">
            {/* Title */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl text-[#00B388] mb-2">
                로그인
              </h3>
              <div className="h-1 bg-[#00B388] w-full"></div>
            </div>
            
            {/* Name Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="name" className="text-sm font-medium text-gray-700 whitespace-nowrap text-left">
                성 함<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="성함을 입력하세요"
              />
            </div>
            
            {/* Email Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 whitespace-nowrap text-left">
                이메일 주소<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="이메일 주소를 입력하세요"
              />
            </div>
            
            {/* Bottom Line */}
            <div className="h-1 bg-[#00B388] w-full"></div>
            
            {/* Login Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-[#00B388] text-white font-medium rounded-full hover:bg-[#00A077] focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: '165px' }}
              >
                {isSubmitting ? '처리 중...' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-gray-900 text-white py-2 sm:py-4">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-4 flex items-center justify-center">
          <p className="text-center text-[9px] sm:text-xs whitespace-nowrap overflow-hidden text-ellipsis">© Copyright 2026 Hewlett Packard Enterprise Development LP.</p>
        </div>
      </footer>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-base text-gray-900">
                등록되지 않은 사용자입니다. 등록하시겠습니까?
              </p>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelRegister}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmRegister}
                className="px-4 py-2 text-sm font-medium text-white bg-[#00B388] border border-[#00A077] rounded hover:bg-[#00A077] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
