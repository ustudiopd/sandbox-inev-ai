'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface RegistrationPageProps {
  campaign: any
  baseUrl: string
}

export default function RegistrationPage({ campaign, baseUrl }: RegistrationPageProps) {
  const searchParams = useSearchParams()
  const isLookup = searchParams.get('lookup') === 'true'
  
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ survey_no: number; code6: string } | null>(null)
  const [lookupMode, setLookupMode] = useState(isLookup)
  const [lookupName, setLookupName] = useState('')
  const [lookupPhone1, setLookupPhone1] = useState('010')
  const [lookupPhone2, setLookupPhone2] = useState('')
  const [lookupPhone3, setLookupPhone3] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  
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
  const [customQuestion, setCustomQuestion] = useState('')
  const [consentEmail, setConsentEmail] = useState(false)
  const [consentPhone, setConsentPhone] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmitted = (submissionResult: { survey_no: number; code6: string }) => {
    setResult(submissionResult)
    setSubmitted(true)
  }
  
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!lookupName.trim()) {
      setLookupError('이름을 입력해주세요.')
      return
    }
    
    if (!lookupPhone1 || !lookupPhone2 || !lookupPhone3) {
      setLookupError('전화번호를 모두 입력해주세요.')
      return
    }
    
    const phone = `${lookupPhone1}-${lookupPhone2}-${lookupPhone3}`
    
    setLookupLoading(true)
    setLookupError(null)
    
    try {
      const response = await fetch(`/api/public/event-survey/${campaign.id}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lookupName.trim(),
          phone: phone,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        setLookupError(result.error || '등록 정보를 찾을 수 없습니다.')
        return
      }
      
      if (result.completed) {
        // 완료 페이지로 리다이렉트
        window.location.href = `${baseUrl}/event${campaign.public_path}/done?survey_no=${result.survey_no}&code6=${result.code6}`
      } else {
        setLookupError(result.message || '등록 정보를 찾을 수 없습니다.')
      }
    } catch (error: any) {
      console.error('등록 확인 오류:', error)
      setLookupError('등록 확인 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLookupLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
    
    if (!customQuestion.trim()) {
      setError('궁금한 점을 입력해주세요.')
      return
    }
    
    if (!privacyConsent) {
      setError('개인정보취급방침에 동의해주세요.')
      return
    }
    
    const phone = `${phone1}-${phone2}-${phone3}`
    const phoneNorm = phone.replace(/\D/g, '')
    const fullName = `${lastName}${firstName}`.trim()
    
    setSubmitting(true)
    setError(null)
    
    try {
      // 등록 페이지는 상세 정보 제출
      const response = await fetch(`/api/public/event-survey/${campaign.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              phoneCountryCode: phoneCountryCode,
              customQuestion: customQuestion.trim(),
              consentEmail: consentEmail,
              consentPhone: consentPhone,
              privacyConsent: privacyConsent,
            },
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '등록에 실패했습니다.')
      }
      
      handleSubmitted({
        survey_no: result.survey_no,
        code6: result.code6,
      })
    } catch (err: any) {
      console.error('등록 제출 오류:', err)
      setError(err.message || '등록 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (submitted && result) {
    // 완료 페이지로 리다이렉트
    window.location.href = `${baseUrl}/event${campaign.public_path}/done?survey_no=${result.survey_no}&code6=${result.code6}`
    return null
  }
  
  // 참여 확인 모드
  if (lookupMode) {
    const headerImageUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_1.jpg'
    
    return (
      <div className="min-h-screen bg-white font-sans text-gray-900 pb-20">
        {/* 상단 배너 */}
        <div className="w-full bg-white">
          <div className="max-w-[800px] mx-auto">
            <div className="relative w-full overflow-hidden flex justify-center">
              <img
                src={headerImageUrl}
                alt="이벤트 헤더"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto px-4 sm:px-5 py-6 sm:py-10">
          <div className="bg-white rounded-lg shadow-md p-5 sm:p-6 md:p-8">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900">
              등록 확인하기
            </h1>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
              등록한 이름과 전화번호를 입력해주세요
            </p>
            
            <form onSubmit={handleLookup} className="space-y-4 sm:space-y-5">
              {lookupError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{lookupError}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={lookupName}
                  onChange={(e) => setLookupName(e.target.value)}
                  className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                  placeholder="이름을 입력하세요"
                  disabled={lookupLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      value={lookupPhone1}
                      onChange={(e) => setLookupPhone1(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="w-full px-4 py-2.5 pr-8 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-center text-base"
                      placeholder="010"
                      maxLength={3}
                      disabled={lookupLoading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">-</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      value={lookupPhone2}
                      onChange={(e) => setLookupPhone2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-2.5 pr-8 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-center text-base"
                      placeholder="1234"
                      maxLength={4}
                      disabled={lookupLoading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">-</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={lookupPhone3}
                      onChange={(e) => setLookupPhone3(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-center text-base"
                      placeholder="5678"
                      maxLength={4}
                      disabled={lookupLoading}
                    />
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full bg-[#00B388] text-white py-3 sm:py-4 rounded-md text-base sm:text-xl font-bold shadow-lg hover:bg-[#008f6d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {lookupLoading ? '확인 중...' : '등록 확인하기'}
              </button>
              
              <button
                type="button"
                onClick={() => setLookupMode(false)}
                className="w-full px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm sm:text-base mt-2"
              >
                등록하기로 돌아가기
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  // 일반 등록 모드 - 상세 폼
  const headerImageUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_1.jpg'
  
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-20">
      {/* 상단 배너 */}
      <div className="w-full bg-white">
        <div className="max-w-[800px] mx-auto">
          <div className="relative w-full overflow-hidden flex justify-center">
            <img
              src={headerImageUrl}
              alt="이벤트 헤더"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-5 py-6 sm:py-10">
        {/* 네비게이션 */}
        <div className="mb-4">
          <Link 
            href={`${baseUrl}/event${campaign.public_path}`}
            className="text-gray-600 hover:text-gray-900 text-sm sm:text-base"
          >
            ← Back to event page / 이벤트 등록
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 md:p-10">
          {/* 제목 */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-gray-900">
            {campaign.title || 'HPE Networking Day'}
          </h1>
          
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">
            이벤트 등록
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {/* 회사명 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                회사명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                placeholder="회사명을 입력하세요"
                disabled={submitting}
                required
              />
            </div>
            
            {/* 이메일 주소 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                이메일 주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                placeholder="이메일을 입력하세요"
                disabled={submitting}
                required
              />
            </div>
            
            {/* 이름 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                placeholder="이름을 입력하세요"
                disabled={submitting}
                required
              />
            </div>
            
            {/* 성 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                성 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                placeholder="성을 입력하세요"
                disabled={submitting}
                required
              />
            </div>
            
            {/* 직급 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                직급 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                placeholder="직급을 입력하세요"
                disabled={submitting}
                required
              />
            </div>
            
            {/* 휴대폰 번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-20 px-3 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                  disabled={submitting}
                />
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full px-4 py-2.5 pr-8 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-center text-base"
                    placeholder="010"
                    maxLength={3}
                    disabled={submitting}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">-</span>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-2.5 pr-8 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-center text-base"
                    placeholder="1234"
                    maxLength={4}
                    disabled={submitting}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">-</span>
                </div>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={phone3}
                    onChange={(e) => setPhone3(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-center text-base"
                    placeholder="5678"
                    maxLength={4}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* 커스텀 질문 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새로워진 HPE Networking에 대한 궁금한 점을 남겨 주세요. 행사 당일 답변드립니다. <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base resize-none"
                placeholder="궁금한 점을 입력해주세요"
                rows={4}
                disabled={submitting}
                required
              />
            </div>
            
            {/* 커뮤니케이션 동의 */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-4">
                HPE에 대한 맞춤식 커뮤니케이션을 통해 HPE 파트너의 제품, 서비스, 특별 행사 및 이벤트 정보를 선택적으로 받으시겠습니까?
              </p>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentEmail}
                    onChange={(e) => setConsentEmail(e.target.checked)}
                    className="w-5 h-5 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                    disabled={submitting}
                  />
                  <span className="ml-3 text-sm sm:text-base text-gray-700">이메일</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentPhone}
                    onChange={(e) => setConsentPhone(e.target.checked)}
                    className="w-5 h-5 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                    disabled={submitting}
                  />
                  <span className="ml-3 text-sm sm:text-base text-gray-700">전화번호</span>
                </label>
              </div>
            </div>
            
            {/* 개인정보취급방침 */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
                HPE에서 귀하의 정보를 관리, 사용, 보호하는 방법에 대해 자세히 알아보려면{' '}
                <a 
                  href="https://www.hpe.com/kr/ko/privacy/ww-privacy-statement.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#00B388] hover:underline"
                >
                  HPE 개인정보취급방침
                </a>을 참조하시기 바랍니다. 
                동의한 사항에 대해 언제든지 취소 또는 수정하여 HPE의 마케팅 커뮤니케이션 서비스를 받을 수 있습니다. 
                이 작업을 수행하려면 HPE 이메일 마케팅 커뮤니케이션 페이지 하단의 옵트아웃 및 환경설정 메커니즘을 사용하거나{' '}
                <a 
                  href="/unsubscribe" 
                  onClick={(e) => {
                    e.preventDefault()
                    const width = 600
                    const height = 700
                    const left = (window.screen.width - width) / 2
                    const top = (window.screen.height - height) / 2
                    window.open(
                      '/unsubscribe',
                      'unsubscribe',
                      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes`
                    )
                  }}
                  className="text-[#00B388] hover:underline cursor-pointer"
                >
                  이 링크
                </a>를 클릭하시면 됩니다. 
                마케팅 팀으로부터 전화를 받으실 수 있도록 휴대폰 번호를 제공하신 경우, 로밍 요금이 적용될 수 있음을 알아두시기 바랍니다.
              </p>
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="w-5 h-5 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388] mt-0.5"
                  disabled={submitting}
                  required
                />
                <span className="ml-3 text-sm sm:text-base text-gray-700">
                  개인정보취급방침에 동의합니다 <span className="text-red-500">*</span>
                </span>
              </label>
            </div>
            
            {/* 제출 버튼 */}
            <div className="flex justify-start mt-8">
              <button
                type="submit"
                disabled={submitting}
                className="bg-gray-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-bold shadow-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '등록 중...' : '제출 →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
