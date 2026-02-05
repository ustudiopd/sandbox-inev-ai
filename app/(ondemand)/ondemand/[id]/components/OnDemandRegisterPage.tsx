'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

interface OnDemandWebinar {
  id: string
  slug?: string | null
  title: string
  description?: string
  clients?: {
    id: string
    name: string
    logo_url?: string | null
    brand_config?: any
  } | null
}

interface OnDemandRegisterPageProps {
  webinar: OnDemandWebinar
}

/**
 * 온디맨드 등록 페이지 컴포넌트
 * HPE 디자인에 맞춘 등록 페이지
 */
export default function OnDemandRegisterPage({ webinar }: OnDemandRegisterPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const webinarPath = webinar.slug || webinar.id
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    mobile: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 쿼리 파라미터에서 이름과 이메일 가져오기
  useEffect(() => {
    const name = searchParams.get('name')
    const email = searchParams.get('email')
    
    if (name) {
      setFormData(prev => ({ ...prev, name: decodeURIComponent(name) }))
    }
    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
    }
  }, [searchParams])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.company.trim() || 
        !formData.jobTitle.trim() || !formData.mobile.trim()) {
      alert('모든 필수 항목을 입력해주세요.')
      return
    }
    
    if (!agreed) {
      alert('개인정보 제3자 제공 동의에 체크해주세요.')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 전화번호 정규화 (하이픈 제거)
      const phoneNorm = formData.mobile.replace(/[-\s]/g, '')
      
      // 등록 API 호출 (웨비나 ID를 campaignId로 사용)
      const response = await fetch(`/api/public/event-survey/${webinar.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim(),
          phone: formData.mobile.trim(),
          phone_norm: phoneNorm,
          registration_data: {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            company: formData.company.trim(),
            jobTitle: formData.jobTitle.trim(),
            mobile: formData.mobile.trim(),
            privacyConsent: true,
          },
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '등록에 실패했습니다.')
      }
      
      // 등록 성공 시 세션 목록 페이지로 이동
      router.push(`/ondemand/${webinarPath}/watch`)
    } catch (error: any) {
      console.error('등록 오류:', error)
      alert(error.message || '등록 중 오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
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
  
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ backgroundColor: '#171F32' }}>
      {/* Hero Section */}
      <div className="relative w-full bg-[#171D28] h-[272px] sm:h-[480px] md:h-[521px] lg:h-[521px]">
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
        {/* 텍스트 콘텐츠: 도형 위에 위치하도록 z-index 관리 */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center py-4 sm:py-6 md:py-8 lg:py-12">
          
          {/* Center: Title and Info */}
          <div className="flex-1 flex items-center">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              {/* 로고와 기간 줄을 같은 컨테이너에 배치 */}
              <div className="flex flex-col items-center w-full">
                {/* 로고 너비에 맞춘 컨테이너 - 가운데 정렬 */}
                <div className="flex flex-col items-start w-[410px]">
                  {/* 제목 - 가운데 정렬 */}
                  <div className="mb-2 sm:mb-3 md:mb-4 lg:mb-6 self-center">
                    <Image
                      src={hpeWebinarSeriesImageUrl}
                      alt="HPE Webinar Series"
                      width={410}
                      height={80}
                      className="w-[410px] h-auto object-contain"
                      priority
                    />
                  </div>
                  
                  {/* 기간 배지와 날짜 - 왼쪽 정렬 */}
                  <div className="flex flex-row items-center justify-start gap-1.5 sm:gap-2 md:gap-2.5 mb-1.5 sm:mb-2 md:mb-3 flex-wrap">
                    <div className="inline-flex items-center shrink-0">
                      <Image
                        src={hpeDueIconUrl}
                        alt="기간"
                        width={50}
                        height={26}
                        className="h-5 sm:h-6 md:h-7 w-auto object-contain"
                        priority
                      />
                    </div>
                    <span className="text-white text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl whitespace-nowrap">
                      2026년 3월 2일 (월) ~ 3월 6일 (금)
                    </span>
                  </div>
                  
                  {/* 안내 텍스트 - 기간 아이콘과 같은 위치에서 시작 */}
                  <p className="text-white/90 text-[10px] sm:text-xs text-left">
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

      {/* Registration Form Section */}
      <div className="bg-white flex items-start sm:items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10 md:py-16 lg:py-32 min-h-[400px] overflow-x-hidden" style={{ paddingTop: '70px', paddingBottom: '70px' }}>
        <div className="w-[355px]">
          <form onSubmit={handleSubmit} className="space-y-3 w-full">
            {/* Title */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl text-[#00B388] mb-2 font-semibold">
                등록하기
              </h3>
              <div className="h-1 bg-[#00B388] w-full"></div>
            </div>
            
            {/* Name Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="name" className="text-sm font-semibold text-gray-700 whitespace-nowrap text-left" style={{ letterSpacing: '0.5px' }}>
                성 함<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="성 함을 입력하세요"
              />
            </div>
            
            {/* Email Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700 whitespace-nowrap text-left" style={{ letterSpacing: '0.5px' }}>
                이메일 주소<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="이메일 주소를 입력하세요"
              />
            </div>
            
            {/* Company Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="company" className="text-sm font-semibold text-gray-700 whitespace-nowrap text-left" style={{ letterSpacing: '0.5px' }}>
                회사명<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="회사명을 입력하세요"
              />
            </div>
            
            {/* Job Title Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="jobTitle" className="text-sm font-semibold text-gray-700 whitespace-nowrap text-left" style={{ letterSpacing: '0.5px' }}>
                직 급<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="직급을 입력하세요"
              />
            </div>
            
            {/* Mobile Input */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <label htmlFor="mobile" className="text-sm font-semibold text-gray-700 whitespace-nowrap text-left" style={{ letterSpacing: '0.5px' }}>
                모바일 번호<span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                required
                className="w-full sm:w-[253px] px-4 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-1"
                style={{ height: '37px' }}
                placeholder="모바일 번호를 입력하세요"
              />
            </div>
            
            {/* Privacy Policy */}
            <div className="mb-4" style={{ marginTop: '23px' }}>
              <div className="text-[11px] leading-tight" style={{ color: '#666666' }}>
                <p className="font-semibold mb-2 text-xs sm:text-sm">※ 개인정보 제3자 제공 동의</p>
                <p className="break-words mb-0.5" style={{ marginBottom: '2px' }}>1) 개인정보를 제공 받는 자: HPE</p>
                <p className="break-words mb-0.5" style={{ marginBottom: '2px' }}>2) 개인정보를 제공 받는자의 개인정보 이용 목적: 뉴스레터와 행사/세미나, 제품정보, 특별 판매, 교육 관련 정보 등의 email 제공, 기타 새로운 서비스 안내 및 마케팅 활동</p>
                <p className="break-words mb-0.5" style={{ marginBottom: '2px' }}>3) 제공하는 개인정보 항목: 성 함, 회사명, 직급, 이메일 주소, 휴대폰 번호</p>
                <p className="break-words mb-0" style={{ marginBottom: '0' }}>4) 개인정보를 제공 받는 자의 개인정보 보유 및 이용 기간: 정보 주체의 탈퇴 요청 혹은 개인정보 활용 거부 의사 표현시까지 해당 정보를 보유</p>
              </div>
            </div>
            
            {/* Agreement Checkbox */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="agreement"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
              />
              <label htmlFor="agreement" className="text-sm text-gray-700">
                상기 내용에 동의합니다.
              </label>
            </div>
            
            {/* Bottom Line */}
            <div className="h-1 bg-[#00B388] w-full"></div>
            
            {/* Submit Button */}
            <div className="flex justify-center" style={{ marginTop: '34px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-[#00B388] text-white font-medium rounded-full hover:bg-[#00A077] focus:outline-none focus:ring-2 focus:ring-[#00B388] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: '165px' }}
              >
                {isSubmitting ? '처리 중...' : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full" style={{ height: '113px', color: '#FFFFFF', backgroundColor: '#171F32' }}>
        <div className="max-w-[1600px] mx-auto h-full flex justify-center" style={{ paddingTop: '40px' }}>
          <p 
            className="text-center text-[10px] font-thin" 
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
