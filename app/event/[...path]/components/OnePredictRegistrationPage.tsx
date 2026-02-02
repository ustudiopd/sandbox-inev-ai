'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { extractDomain } from '@/lib/utils/utm'
import { getOrCreateSessionId } from '@/lib/utils/session'

interface OnePredictRegistrationPageProps {
  campaign?: any
  baseUrl?: string
  utmParams?: Record<string, string>
}

export default function OnePredictRegistrationPage({ campaign: initialCampaign, baseUrl = '', utmParams = {} }: OnePredictRegistrationPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cid = searchParams.get('cid')
  
  // URL에서 직접 UTM 파라미터 추출 (서버에서 전달된 prop이 없어도 처리)
  const urlUTMParams: Record<string, string> = {}
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  utmKeys.forEach(key => {
    const value = searchParams.get(key)
    if (value) {
      urlUTMParams[key] = value
    }
  })
  
  // 서버에서 전달된 utmParams와 URL의 UTM 파라미터 병합 (URL 우선)
  const mergedUTMParams = { ...utmParams, ...urlUTMParams }
  
  const [showMessage, setShowMessage] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [campaign, setCampaign] = useState(initialCampaign)
  
  // 등록 폼 상태
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone1: '010', // 기본값: 010
    phone2: '',
    phone3: '',
    company: '',
    position: '',
    interestedProducts: [] as string[],
    industry: '',
    address: '',
    country: '대한민국', // 기본값: 대한민국 (수정 가능)
    message: ''
  })
  
  // 개인정보 활용 동의 상태
  const [privacyConsent, setPrivacyConsent] = useState<'yes' | 'no' | null>(null)
  
  // 세션 ID 상태 관리 (Visit과 등록에서 동일한 세션 ID 사용 보장)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  
  // 세션 ID 초기화 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    try {
      const id = getOrCreateSessionId('ef_session_id', 30)
      setSessionId(id)
      console.log('[OnePredictRegistrationPage] 세션 ID 초기화:', id)
    } catch (error) {
      console.warn('[OnePredictRegistrationPage] 세션 ID 초기화 실패:', error)
      // 실패해도 새로 생성
      const fallbackId = getOrCreateSessionId('ef_session_id', 30)
      setSessionId(fallbackId)
    }
  }, []) // 빈 의존성 배열: 마운트 시 한 번만 실행
  
  // UTM 파라미터 localStorage 저장 (서버에서 추출한 값 + URL에서 읽은 값 병합)
  useEffect(() => {
    if (Object.keys(mergedUTMParams).length > 0 && campaign?.id) {
      try {
        const existingUTM = localStorage.getItem(`utm:${campaign.id}`)
        const existingData = existingUTM ? JSON.parse(existingUTM) : null
        
        const utmData = {
          ...mergedUTMParams,
          captured_at: new Date().toISOString(),
          first_visit_at: existingData?.first_visit_at || new Date().toISOString(),
          referrer_domain: extractDomain(document.referrer),
        }
        
        // last-touch 정책: 기존 값이 있으면 overwrite
        localStorage.setItem(`utm:${campaign.id}`, JSON.stringify(utmData))
        console.log('[OnePredictRegistrationPage] UTM 파라미터 저장:', utmData)
      } catch (error) {
        // localStorage 저장 실패는 무시 (graceful)
        console.warn('[OnePredictRegistrationPage] UTM 저장 실패:', error)
      }
    }
  }, [campaign?.id, mergedUTMParams])
  
  // Visit 수집 (Phase 3) - 에러 발생해도 등록은 계속 진행
  // 웨비나 ID도 Visit API를 지원하므로 호출
  useEffect(() => {
    if (!campaign?.id) return
    
    // sessionId가 없으면 여기서 생성 (초기화가 늦을 경우 대비)
    const currentSessionId = sessionId || getOrCreateSessionId('ef_session_id', 30)
    
    try {
      // 상태에서 관리하는 session_id 사용 (쿠키 최신화 문제 해결)
      
      // localStorage에서 UTM 읽기
      let utmData: Record<string, any> = {}
      try {
        const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
        if (storedUTM) {
          utmData = JSON.parse(storedUTM)
        }
      } catch (parseError) {
        // localStorage 파싱 실패는 무시
        console.warn('[OnePredictRegistrationPage] UTM 파싱 실패:', parseError)
      }
      
      // Visit 수집 (비동기, 실패해도 계속 진행)
      fetch(`/api/public/campaigns/${campaign.id}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId, // 상태에서 관리하는 세션 ID 사용 (없으면 여기서 생성)
          utm_source: utmData.utm_source || utmParams.utm_source || null,
          utm_medium: utmData.utm_medium || utmParams.utm_medium || null,
          utm_campaign: utmData.utm_campaign || utmParams.utm_campaign || null,
          utm_term: utmData.utm_term || utmParams.utm_term || null,
          utm_content: utmData.utm_content || utmParams.utm_content || null,
          cid: cid || null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      }).catch((error) => {
        // Visit 수집 실패는 무시 (graceful failure)
        console.warn('[OnePredictRegistrationPage] Visit 수집 실패 (무시):', error)
      })
    } catch (error) {
      // Visit 수집 초기화 실패도 무시
      console.warn('[OnePredictRegistrationPage] Visit 수집 초기화 실패 (무시):', error)
    }
  }, [campaign?.id, campaign?.public_path, cid, utmParams, sessionId]) // campaign.public_path 의존성 추가
  
  const showMessageBox = (text: string) => {
    setMessageText(text)
    setShowMessage(true)
    setTimeout(() => {
      setShowMessage(false)
    }, 3000)
  }

  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!campaign?.id) {
      showMessageBox('캠페인 정보를 찾을 수 없습니다.')
      return
    }
    
    // 필수 필드 검증
    if (!formData.email.trim()) {
      showMessageBox('이메일을 입력해주세요.')
      return
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      showMessageBox('올바른 이메일 형식을 입력해주세요.')
      return
    }
    
    if (!formData.name.trim()) {
      showMessageBox('이름을 입력해주세요.')
      return
    }
    
    // 휴대폰 번호 검증
    if (!formData.phone1.trim() || !formData.phone2.trim() || !formData.phone3.trim()) {
      showMessageBox('휴대폰 번호를 모두 입력해주세요.')
      return
    }
    
    if (!formData.company.trim()) {
      showMessageBox('회사를 입력해주세요.')
      return
    }
    
    if (!formData.position) {
      showMessageBox('직급을 선택해주세요.')
      return
    }
    
    if (!formData.industry) {
      showMessageBox('산업을 선택해주세요.')
      return
    }
    
    if (!formData.address.trim()) {
      showMessageBox('주소를 입력해주세요.')
      return
    }
    
    if (!formData.country.trim()) {
      showMessageBox('국가를 입력해주세요.')
      return
    }
    
    // 개인정보 활용 동의 검증
    if (privacyConsent !== 'yes') {
      showMessageBox('개인정보 활용 동의에 동의해주세요.')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 휴대폰 번호 합치기
      const phone = `${formData.phone1}-${formData.phone2}-${formData.phone3}`
      const phoneNorm = phone.replace(/\D/g, '')
      
      // localStorage에서 UTM 읽기
      let utmData: Record<string, any> = {}
      try {
        const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
        if (storedUTM) {
          utmData = JSON.parse(storedUTM)
        }
      } catch (parseError) {
        console.warn('[OnePredictRegistrationPage] UTM 파싱 실패:', parseError)
      }
      
      // 상태에서 관리하는 session_id 사용 (Visit과 동일한 세션 ID 보장)
      // 쿠키 최신화 문제 해결: 한 번 생성한 세션 ID를 재사용
      // sessionId가 없으면 여기서 생성 (초기화가 늦을 경우 대비)
      const currentSessionId = sessionId || getOrCreateSessionId('ef_session_id', 30)
      
      console.log('[OnePredictRegistrationPage] 등록 요청 시작:', {
        campaignId: campaign.id,
        email: formData.email.trim(),
        name: formData.name.trim(),
        phone: phoneNorm,
        sessionId: currentSessionId, // 상태에서 관리하는 세션 ID (없으면 여기서 생성)
        timestamp: new Date().toISOString()
      })
      
      // 등록 API 호출
      const apiUrl = `/api/public/event-survey/${campaign.id}/register`
      
      // 네트워크 요청 타임아웃 설정 (30초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim() || null,
          phone: phone,
          phone_norm: phoneNorm,
          registration_data: {
            email: formData.email.trim(),
            name: formData.name.trim(),
            company: formData.company.trim(),
            position: formData.position,
            jobTitle: formData.position,
            industry: formData.industry,
            address: formData.address.trim(),
            country: formData.country.trim(),
            interestedProducts: formData.interestedProducts,
            message: formData.message.trim() || undefined,
            phoneCountryCode: '+82',
            privacyConsent: privacyConsent === 'yes',
            consentEmail: false,
            consentPhone: false,
          },
          // UTM 파라미터 추가 (localStorage > URL > 서버 prop 우선순위)
          utm_source: utmData.utm_source || mergedUTMParams.utm_source || null,
          utm_medium: utmData.utm_medium || mergedUTMParams.utm_medium || null,
          utm_campaign: utmData.utm_campaign || mergedUTMParams.utm_campaign || null,
          utm_term: utmData.utm_term || mergedUTMParams.utm_term || null,
          utm_content: utmData.utm_content || mergedUTMParams.utm_content || null,
          utm_first_visit_at: utmData.first_visit_at || null,
          utm_referrer: utmData.referrer_domain || null,
          cid: cid || null,
          session_id: currentSessionId || null, // 상태에서 관리하는 세션 ID (Visit과 동일) - 없어도 등록 성공
        }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.')
        }
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          throw new Error('네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.')
        }
        throw fetchError
      }
      
      console.log('[OnePredictRegistrationPage] 응답 수신:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })
      
      // 응답 본문 읽기 시도
      let result: any
      try {
        const text = await response.text()
        console.log('[OnePredictRegistrationPage] 응답 본문:', text.substring(0, 500))
        if (text) {
          result = JSON.parse(text)
        } else {
          result = {}
        }
      } catch (parseError) {
        console.error('[OnePredictRegistrationPage] 응답 파싱 오류:', parseError)
        throw new Error('서버 응답을 읽을 수 없습니다.')
      }
      
      if (!response.ok) {
        console.error('[OnePredictRegistrationPage] 등록 실패:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error || '알 수 없는 오류',
          result
        })
        throw new Error(result.error || `등록에 실패했습니다. (${response.status})`)
      }
      
      // 성공 응답 확인
      console.log('[OnePredictRegistrationPage] API 응답:', {
        status: response.status,
        ok: response.ok,
        result,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : []
      })
      
      if (result.success || result.survey_no) {
        console.log('[OnePredictRegistrationPage] 등록 성공:', {
          success: result.success,
          survey_no: result.survey_no,
          code6: result.code6,
          email: formData.email.trim(),
          result
        })
        
        // 등록 완료 상태로 변경
        setIsRegistrationComplete(true)
        showMessageBox('등록이 완료되었습니다')
      } else {
        console.error('[OnePredictRegistrationPage] 잘못된 응답:', {
          result,
          responseStatus: response.status,
          responseOk: response.ok
        })
        throw new Error(result.message || result.error || '서버에서 잘못된 응답을 받았습니다.')
      }
    } catch (err: any) {
      console.error('[OnePredictRegistrationPage] 등록 제출 오류:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      showMessageBox(err.message || '등록 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, part: 'phone1' | 'phone2' | 'phone3') => {
    let value = e.target.value.replace(/[^0-9]/g, '') // 숫자만 허용
    
    // 각 필드별 최대 길이 제한
    if (part === 'phone1' && value.length > 3) value = value.slice(0, 3)
    if (part === 'phone2' && value.length > 4) value = value.slice(0, 4)
    if (part === 'phone3' && value.length > 4) value = value.slice(0, 4)
    
    setFormData(prev => ({ ...prev, [part]: value }))
    
    // 자동으로 다음 필드로 포커스 이동
    if (part === 'phone1' && value.length === 3) {
      const nextInput = document.querySelector<HTMLInputElement>(`input[name="phone2"]`)
      nextInput?.focus()
    }
    if (part === 'phone2' && value.length === 4) {
      const nextInput = document.querySelector<HTMLInputElement>(`input[name="phone3"]`)
      nextInput?.focus()
    }
  }

  const handleProductChange = (product: string) => {
    setFormData(prev => ({
      ...prev,
      interestedProducts: prev.interestedProducts.includes(product)
        ? prev.interestedProducts.filter(p => p !== product)
        : [...prev.interestedProducts, product]
    }))
  }

  const handleIndustryChange = (industry: string) => {
    setFormData(prev => ({ ...prev, industry }))
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans" style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif" }}>
      {/* Header */}
      <header className="fixed w-full z-50 bg-white border-b border-gray-200 h-[80px] max-sm:h-[60px]">
        <div className="w-full px-6 max-sm:px-4 h-full flex items-center">
          <div className="max-w-3xl mx-auto w-full flex items-center">
            <div className="flex items-center cursor-pointer" onClick={() => router.push('/webinar/426307')}>
              <img 
                src="https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/onepredict/onepredict_logo.png" 
                alt="원프레딕트 로고"
                className="w-[120px] max-sm:w-[100px] h-auto"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Registration Section */}
      <section className="pt-24 max-sm:pt-20 pb-20 max-sm:pb-12 px-6 max-sm:px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-8 md:p-12 max-sm:p-6">
            {isRegistrationComplete ? (
              <div className="text-center py-12 max-sm:py-8">
                <div className="mb-6 max-sm:mb-4">
                  <i className="fas fa-check-circle text-6xl max-sm:text-5xl" style={{ color: '#2936E7' }}></i>
                </div>
                <h2 className="text-3xl max-sm:text-2xl font-bold mb-4 max-sm:mb-3" style={{ color: '#333333' }}>
                  등록이 완료되었습니다
                </h2>
                <p className="text-gray-600 max-sm:text-sm">
                  웨비나 등록이 성공적으로 완료되었습니다.<br />
                  감사합니다.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8 max-sm:mb-6">
                  <h2 className="text-3xl max-sm:text-2xl font-bold mb-2" style={{ color: '#333333' }}>회원 등록 정보</h2>
                  <p className="text-gray-500 max-sm:text-sm">웨비나 참가를 위한 정보를 입력해주세요</p>
                </div>

                <form onSubmit={handleRegistration} className="space-y-6 max-sm:space-y-4">
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  1. 이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  2. 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>

              {/* 휴대폰 번호 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  3. 휴대폰 번호 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1 sm:gap-2">
                  <input
                    type="tel"
                    name="phone1"
                    required
                    value={formData.phone1}
                    onChange={(e) => handlePhoneChange(e, 'phone1')}
                    placeholder="010"
                    maxLength={3}
                    className="flex-1 min-w-0 px-4 max-sm:px-2 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] text-center max-sm:text-sm"
                  />
                  <span className="text-gray-400 flex-shrink-0 max-sm:text-sm">-</span>
                  <input
                    type="tel"
                    name="phone2"
                    required
                    value={formData.phone2}
                    onChange={(e) => handlePhoneChange(e, 'phone2')}
                    placeholder="1234"
                    maxLength={4}
                    className="flex-1 min-w-0 px-4 max-sm:px-2 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] text-center max-sm:text-sm"
                  />
                  <span className="text-gray-400 flex-shrink-0 max-sm:text-sm">-</span>
                  <input
                    type="tel"
                    name="phone3"
                    required
                    value={formData.phone3}
                    onChange={(e) => handlePhoneChange(e, 'phone3')}
                    placeholder="5678"
                    maxLength={4}
                    className="flex-1 min-w-0 px-4 max-sm:px-2 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] text-center max-sm:text-sm"
                  />
                </div>
              </div>

              {/* 회사 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  4. 회사 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  required
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>

              {/* 직급 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  5. 직급 <span className="text-red-500">*</span>
                </label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                >
                  <option value="">선택해주세요</option>
                  <option value="사원대리">사원대리</option>
                  <option value="과장차장">과장차장</option>
                  <option value="팀장이상">팀장이상</option>
                </select>
              </div>

              {/* 관심제품 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  6. 관심 제품명 <span className="text-gray-500 font-normal text-xs">(복수선택가능)</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interestedProducts.includes('guardione solution')}
                      onChange={() => handleProductChange('guardione solution')}
                      className="w-4 h-4"
                      style={{ accentColor: '#2936E7' }}
                    />
                    <span>guardione solution</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interestedProducts.includes('AI native factory solution')}
                      onChange={() => handleProductChange('AI native factory solution')}
                      className="w-4 h-4"
                      style={{ accentColor: '#2936E7' }}
                    />
                    <span>AI native factory solution</span>
                  </label>
                </div>
              </div>

              {/* 산업 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  7. 산업 <span className="text-red-500">*</span>
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                >
                  <option value="">선택해주세요</option>
                  <option value="로봇/AI인프라/기술">로봇/AI인프라/기술</option>
                  <option value="바이오">바이오</option>
                  <option value="반도체/디스플레이">반도체/디스플레이</option>
                  <option value="방산/항공">방산/항공</option>
                  <option value="센서/제어기술">센서/제어기술</option>
                  <option value="소재/섬유">소재/섬유</option>
                  <option value="에너지원">에너지원</option>
                  <option value="식음료">식음료</option>
                  <option value="유통/물류">유통/물류</option>
                  <option value="자동차">자동차</option>
                  <option value="조선">조선</option>
                  <option value="철강">철강</option>
                  <option value="ICT/통신">ICT/통신</option>
                  <option value="건설/건축">건설/건축</option>
                  <option value="공사·공단·공공기관">공사·공단·공공기관</option>
                  <option value="교육/법률/컨설팅/인증">교육/법률/컨설팅/인증</option>
                  <option value="금융">금융</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 주소 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  8. 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>

              {/* 국가 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  9. 국가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="대한민국"
                  required
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm"
                />
              </div>

              {/* 메시지 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  10. 궁금한 내용이나 미리 전해두고 싶은 메시지가 있다면 남겨주세요 (선별 후 Q&A 세션 중 답변 예정)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 max-sm:px-3 py-3 max-sm:py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#2936E7] max-sm:text-sm resize-none"
                  placeholder="메시지를 입력해주세요"
                />
              </div>

              {/* 개인정보 활용 동의 */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e5e5' }} className="mobile-consent-section">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', marginBottom: '12px' }}>
                    개인정보 활용 동의 <span style={{ color: '#f00' }}>*</span>
                  </h3>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: '22px', marginBottom: '16px' }}>
                    <p style={{ marginBottom: '12px' }}>
                      주식회사 원프레딕트는 웨비나 운영과 서비스 홍보를 위해 다음과 같이 개인정보를 수집 및 이용하고자 합니다. 귀하는 동의를 거부할 권리가 있으며, 거부할 경우 웨비나 이용이 제한됩니다.
                    </p>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>- 항목:</strong> 이름, 이메일, 휴대폰번호, 회사
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>- 수집 및 이용목적:</strong> 참가자 혜택 제공(서비스 안내 등)
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>- 보유 및 이용기간:</strong> 동의 철회까지
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                      <strong>※ 동의 거부 권리 및 불이익:</strong> 귀하는 위와 같은 개인정보 활용 동의를 거부할 권리가 있습니다. 다만, 동의 거부 시 웨비나 참가 신청 및 관련 혜택 제공이 제한될 수 있습니다.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="privacyConsent"
                      value="yes"
                      checked={privacyConsent === 'yes' as const}
                      onChange={(e) => setPrivacyConsent('yes')}
                      style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: '#2936E7', flexShrink: 0 }}
                      required
                    />
                    <span style={{ fontSize: '16px', color: '#000' }}>네, 동의합니다.</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="privacyConsent"
                      value="no"
                      checked={privacyConsent === 'no' as const}
                      onChange={(e) => setPrivacyConsent('no')}
                      style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: '#2936E7', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '16px', color: '#000' }}>아니요, 동의하지 않습니다.</span>
                  </label>
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                  자세한 내용은 <a href="https://ko.onepredict.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#2936E7', textDecoration: 'underline' }}>개인정보처리방침</a>을 참조하시기 바랍니다.
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 max-sm:px-6 py-4 max-sm:py-3 text-white font-bold rounded-lg transition-all hover:bg-[#12058E] hover:-translate-y-0.5 max-sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2936E7' }}
                >
                  {isSubmitting ? '등록 중...' : '등록 완료하기'}
                </button>
              </div>
            </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Message UI Component */}
      {showMessage && (
        <div className="fixed bottom-10 max-sm:bottom-6 left-1/2 -translate-x-1/2 z-[2000] animate-fade-in max-sm:px-4 max-sm:w-full max-sm:max-w-sm">
          <div 
            className="text-white px-8 max-sm:px-4 py-4 max-sm:py-3 rounded-full shadow-2xl flex items-center space-x-3 max-sm:space-x-2 max-sm:text-sm"
            style={{ backgroundColor: '#12058E' }}
          >
            <i className="fas fa-check-circle flex-shrink-0" style={{ color: '#51CADE' }}></i>
            <span className="max-sm:truncate">{messageText}</span>
          </div>
        </div>
      )}

      {/* Font Awesome CDN */}
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
