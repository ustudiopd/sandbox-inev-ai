'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function WertPage() {
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  
  // 등록 폼 필드
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+82')
  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const [consentEmail, setConsentEmail] = useState(false)
  const [consentPhone, setConsentPhone] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ survey_no: number; code6: string } | null>(null)

  useEffect(() => {
    // 스크롤 부드럽게
    document.documentElement.style.scrollBehavior = 'smooth'
    
    // 캠페인 ID 조회
    const fetchCampaignId = async () => {
      try {
        const response = await fetch('/api/public/event-survey/resolve?path=/149403')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.campaign?.id) {
            setCampaignId(data.campaign.id)
          }
        }
      } catch (err) {
        console.error('캠페인 ID 조회 실패:', err)
      }
    }
    
    fetchCampaignId()
  }, [])

  useEffect(() => {
    // ESC 키로 모달 닫기
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRegisterModal) {
        setShowRegisterModal(false)
        setError('')
        setSuccess(false)
      }
    }

    if (showRegisterModal) {
      document.addEventListener('keydown', handleEscape)
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [showRegisterModal])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // 필수 필드 검증
    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    
    if (!firstName.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    
    if (!lastName.trim()) {
      setError('성을 입력해주세요.')
      return
    }
    
    if (!company.trim()) {
      setError('회사명을 입력해주세요.')
      return
    }
    
    if (!jobTitle.trim()) {
      setError('직급을 입력해주세요.')
      return
    }
    
    if (!phone1 || !phone2 || !phone3) {
      setError('전화번호를 모두 입력해주세요.')
      return
    }
    
    if (!privacyConsent) {
      setError('개인정보취급방침에 동의해주세요.')
      return
    }
    
    if (!campaignId) {
      setError('캠페인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    
    const phone = `${phone1}-${phone2}-${phone3}`
    const phoneNorm = phone.replace(/\D/g, '')
    const fullName = `${lastName}${firstName}`.trim()
    
    setLoading(true)

    try {
      // 이벤트 등록 API 호출
      const response = await fetch(`/api/public/event-survey/${campaignId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName,
          company: company.trim(),
          phone: phone,
          phone_norm: phoneNorm,
          registration_data: {
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            jobTitle: jobTitle.trim(),
            company: company.trim(),
            phone: phone,
            consentEmail,
            consentPhone,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '등록에 실패했습니다')
      }

      setSuccess(true)
      setSubmitted(true)
      setResult({
        survey_no: data.survey_no,
        code6: data.code6,
      })
      
      // 폼 초기화
      setEmail('')
      setFirstName('')
      setLastName('')
      setJobTitle('')
      setCompany('')
      setPhone1('010')
      setPhone2('')
      setPhone3('')
      setConsentEmail(false)
      setConsentPhone(false)
      setPrivacyConsent(false)
      
      // 5초 후 모달 닫기
      setTimeout(() => {
        setShowRegisterModal(false)
        setSuccess(false)
        setSubmitted(false)
        setResult(null)
      }, 5000)
    } catch (err: any) {
      setError(err.message || '등록 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const wertLogoUrl = supabaseUrl 
    ? `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png`
    : '/img/wert.png'

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
      <div className="wert-body">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="logo-container">
          <Image
            src={wertLogoUrl}
            alt="Wert Logo"
            width={150}
            height={50}
            className="w-full h-auto"
            unoptimized={!!supabaseUrl}
          />
        </div>

        <div className="content pl-[8%]">
          <h1 className="main-title">
            WERT TECH<br />
            SUMMIT 26
          </h1>
          <div className="sub-title">
            IP DATA <span className="text-2xl opacity-70">✕</span> AI
          </div>
          
          {/* Register Button */}
          <div className="register-button-container">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="register-button"
            >
              등록하기
            </button>
          </div>
        </div>

        <div
          className="scroll-down"
          onClick={() => scrollToSection('about')}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="wert-section">
        <span className="section-label">Overview</span>
        <h2 className="section-title">국내 최초 IP 데이터 X 버티컬 AI<br />비즈니스 기술 전략 써밋</h2>
        <p className="text-xl text-gray-600 max-w-3xl leading-relaxed">
          단순한 기술 공유를 넘어 실제 기업 현장에서 AI가 어떻게 전략화되고 의사결정에 활용되는지, 글로벌 테크 리더들과 함께 그 실체를 공개합니다.
        </p>
      </section>

      {/* Speakers Section */}
      <section id="speakers" className="wert-section">
        <span className="section-label">Speakers</span>
        <h2 className="section-title">Lineup</h2>
        <div className="speaker-grid">
          <div className="speaker-card">
            <Image
              src="https://via.placeholder.com/400x400?text=유은성"
              alt="유은성 상무"
              width={400}
              height={400}
              className="w-full aspect-square object-cover bg-gray-100 mb-5 rounded"
              unoptimized
            />
            <div className="speaker-info">
              <h4>유은성</h4>
              <p>Qualcomm 상무</p>
            </div>
          </div>
          <div className="speaker-card">
            <Image
              src="https://via.placeholder.com/400x400?text=김경훈"
              alt="김경훈 부문장"
              width={400}
              height={400}
              className="w-full aspect-square object-cover bg-gray-100 mb-5 rounded"
              unoptimized
            />
            <div className="speaker-info">
              <h4>김경훈</h4>
              <p>Kakao AI 부문장</p>
            </div>
          </div>
          <div className="speaker-card">
            <Image
              src="https://via.placeholder.com/400x400?text=정현기"
              alt="정현기 총괄"
              width={400}
              height={400}
              className="w-full aspect-square object-cover bg-gray-100 mb-5 rounded"
              unoptimized
            />
            <div className="speaker-info">
              <h4>정현기</h4>
              <p>AWS 기술총괄</p>
            </div>
          </div>
          <div className="speaker-card">
            <Image
              src="https://via.placeholder.com/400x400?text=윤정호"
              alt="윤정호 대표"
              width={400}
              height={400}
              className="w-full aspect-square object-cover bg-gray-100 mb-5 rounded"
              unoptimized
            />
            <div className="speaker-info">
              <h4>윤정호</h4>
              <p>워트인텔리전스 대표</p>
            </div>
          </div>
        </div>
      </section>

      {/* Program Section */}
      <section id="program" className="wert-section">
        <span className="section-label">Timeline</span>
        <h2 className="section-title">Program</h2>
        <div className="program-list">
          <div className="program-item">
            <div className="program-time">10:00 - 10:10</div>
            <div className="program-content">
              <h4>Opening</h4>
              <p>WERT TECH SUMMIT 26 개회 선언</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">10:10 - 10:50</div>
            <div className="program-content">
              <h4>Keynote: Vertical AI</h4>
              <p>글로벌 리더십을 재편하는 게임 체인저 '버티컬 AI' | 퀄컴 유은성 상무</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">10:50 - 11:30</div>
            <div className="program-content">
              <h4>AI Data Strategy</h4>
              <p>기업 경쟁력을 결정짓는 AI 데이터 전략 | 카카오 김경훈 부문장</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">11:30 - 12:10</div>
            <div className="program-content">
              <h4>AX Transformation</h4>
              <p>의사결정권자들이 선택한 기술 데이터 기반 AX 전략 | AWS 정현기 총괄</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">12:10 - 13:30</div>
            <div className="program-content">
              <h4>Lunch Break</h4>
              <p>점심 식사 및 네트워킹</p>
            </div>
          </div>
          <div className="program-item">
            <div className="program-time">13:30 - 14:10</div>
            <div className="program-content">
              <h4>Global Tech Trend 2030</h4>
              <p>데이터로 미리보는 2030년 글로벌 기술 트렌드 | 워트인텔리전스 윤정호 대표</p>
            </div>
          </div>
        </div>
      </section>

      {/* Venue Section */}
      <section id="venue" className="wert-section">
        <span className="section-label">Location</span>
        <h2 className="section-title">Venue</h2>
        <div className="venue-info">
          <div className="info-block">
            <h5>장소</h5>
            <p>GS타워 아모리스 역삼 (서울 강남구 테헤란로 508)</p>
          </div>
          <div className="info-block">
            <h5>문의</h5>
            <p>connect@wert.co.kr | 02-521-0110</p>
          </div>
          <div className="info-block">
            <h5>비고</h5>
            <p>오프라인 현장 참여 및 온라인 라이브 동시 진행</p>
          </div>
        </div>
      </section>

      <footer className="py-20 px-[8%] text-gray-400 text-sm flex justify-between items-center">
        <p>&copy; 2026 WERT Intelligence. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
        </div>
      </footer>

      {/* Register Modal */}
      {showRegisterModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            // 배경 클릭 시 모달 닫기
            if (e.target === e.currentTarget) {
              setShowRegisterModal(false)
              setError('')
              setSuccess(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 relative animate-fade-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowRegisterModal(false)
                setError('')
                setSuccess(false)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-3xl font-light leading-none w-8 h-8 flex items-center justify-center transition-colors"
              aria-label="닫기"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900">이벤트 등록</h2>

            {success ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">등록 완료!</h3>
                {result && (
                  <p className="text-sm text-gray-600 mb-2">
                    등록번호: {result.survey_no}<br />
                    확인코드: {result.code6}
                  </p>
                )}
                <p className="text-gray-600">
                  등록 신청이 완료되었습니다.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                {/* 회사명 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    회사명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all"
                    placeholder="회사명을 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>

                {/* 이메일 주소 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    이메일 주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all"
                    placeholder="이메일을 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>

                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all"
                    placeholder="이름을 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>

                {/* 성 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    성 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all"
                    placeholder="성을 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>

                {/* 직급 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    직급 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all"
                    placeholder="직급을 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>

                {/* 휴대폰 번호 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    휴대폰 번호 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="w-20 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all"
                      disabled={loading}
                    />
                    <div className="flex-1 relative">
                      <input
                        type="tel"
                        value={phone1}
                        onChange={(e) => setPhone1(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all text-center"
                        placeholder="010"
                        maxLength={3}
                        disabled={loading}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">-</span>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="tel"
                        value={phone2}
                        onChange={(e) => setPhone2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all text-center"
                        placeholder="1234"
                        maxLength={4}
                        disabled={loading}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">-</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="tel"
                        value={phone3}
                        onChange={(e) => setPhone3(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4da8da] focus:border-transparent transition-all text-center"
                        placeholder="5678"
                        maxLength={4}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 커뮤니케이션 동의 */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-4">
                    WERT에 대한 맞춤식 커뮤니케이션을 통해 WERT 파트너의 제품, 서비스, 특별 행사 및 이벤트 정보를 선택적으로 받으시겠습니까?
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentEmail}
                        onChange={(e) => setConsentEmail(e.target.checked)}
                        className="w-4 h-4 text-[#4da8da] border-gray-300 rounded focus:ring-[#4da8da]"
                        disabled={loading}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">이메일</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentPhone}
                        onChange={(e) => setConsentPhone(e.target.checked)}
                        className="w-4 h-4 text-[#4da8da] border-gray-300 rounded focus:ring-[#4da8da]"
                        disabled={loading}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">전화번호</span>
                    </label>
                  </div>
                </div>

                {/* 개인정보취급방침 */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    WERT에서 귀하의 정보를 관리, 사용, 보호하는 방법에 대해 자세히 알아보려면{' '}
                    <a 
                      href="https://www.wertcorp.com/kr/policy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#4da8da] hover:underline"
                    >
                      WERT 개인정보 취급방침
                    </a>을 참조하시기 바랍니다. 
                    동의한 사항에 대해 언제든지 취소 또는 수정하여 WERT의 마케팅 커뮤니케이션 서비스를 받을 수 있습니다.
                  </p>
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="w-4 h-4 text-[#4da8da] border-gray-300 rounded focus:ring-[#4da8da] mt-0.5"
                      disabled={loading}
                      required
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      개인정보 취급방침에 동의합니다 <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4da8da] hover:bg-[#46cdcf] text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl mt-4"
                >
                  {loading ? '등록 중...' : '제출 →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  )
}