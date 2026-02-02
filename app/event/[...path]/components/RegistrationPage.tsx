'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { extractDomain } from '@/lib/utils/utm'
import { getOrCreateSessionId } from '@/lib/utils/session'

interface RegistrationPageProps {
  campaign: any
  baseUrl: string
  utmParams?: Record<string, string>
}

export default function RegistrationPage({ campaign, baseUrl, utmParams = {} }: RegistrationPageProps) {
  const searchParams = useSearchParams()
  const isLookup = searchParams.get('lookup') === 'true'
  
  // cid 추출 (querystring에서)
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
  
  // 세션 ID 상태 관리 (Visit과 등록에서 동일한 세션 ID 사용 보장)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // 세션 ID 초기화 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    try {
      const id = getOrCreateSessionId('ef_session_id', 30)
      setSessionId(id)
      console.log('[RegistrationPage] 세션 ID 초기화:', id)
    } catch (error) {
      console.warn('[RegistrationPage] 세션 ID 초기화 실패:', error)
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
        console.log('[RegistrationPage] UTM 파라미터 저장:', utmData)
      } catch (error) {
        // localStorage 저장 실패는 무시 (graceful)
        console.warn('[RegistrationPage] UTM 저장 실패:', error)
      }
    }
  }, [campaign?.id, mergedUTMParams])
  
  // Visit 수집 (Phase 3) - 에러 발생해도 등록은 계속 진행
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
        console.warn('[RegistrationPage] UTM 파싱 실패:', parseError)
      }
      
      // Visit 수집 (비동기, 실패해도 계속 진행)
      fetch(`/api/public/campaigns/${campaign.id}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId, // 상태에서 관리하는 세션 ID 사용 (없으면 여기서 생성)
          utm_source: utmData.utm_source || mergedUTMParams.utm_source || null,
          utm_medium: utmData.utm_medium || mergedUTMParams.utm_medium || null,
          utm_campaign: utmData.utm_campaign || mergedUTMParams.utm_campaign || null,
          utm_term: utmData.utm_term || mergedUTMParams.utm_term || null,
          utm_content: utmData.utm_content || mergedUTMParams.utm_content || null,
          cid: cid || null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      }).catch((error) => {
        // Visit 수집 실패는 무시 (graceful failure)
        console.warn('[RegistrationPage] Visit 수집 실패 (무시):', error)
      })
    } catch (error) {
      // Visit 수집 초기화 실패도 무시
      console.warn('[RegistrationPage] Visit 수집 초기화 실패 (무시):', error)
    }
  }, [campaign?.id, cid, utmParams, sessionId]) // sessionId 의존성 추가
  
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ survey_no: number; code6: string } | null>(null)
  const [lookupMode, setLookupMode] = useState(isLookup)
  const [lookupName, setLookupName] = useState('')
  const [lookupPhone1, setLookupPhone1] = useState('010')
  const [lookupPhone2, setLookupPhone2] = useState('')
  const [lookupPhone3, setLookupPhone3] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  
  // HPE 원래 버전 필드 (445870 경로용)
  const isHPE = campaign?.public_path === '/445870'
  
  // 등록 폼 필드
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [firstName, setFirstName] = useState('') // HPE 원래 버전: 이름
  const [lastName, setLastName] = useState('') // HPE 원래 버전: 성
  const [company, setCompany] = useState('') // HPE 원래 버전: 회사명
  const [jobTitle, setJobTitle] = useState('') // HPE 원래 버전: 직급
  const [organization, setOrganization] = useState('') // 소속
  const [department, setDepartment] = useState('') // 부서
  const [position, setPosition] = useState('') // 직함
  const [yearsOfExperience, setYearsOfExperience] = useState('') // 연차(경력)
  const [question, setQuestion] = useState('') // 웨비나와 관련하여 궁금한 사항
  const [customQuestion, setCustomQuestion] = useState('') // HPE 원래 버전: 커스텀 질문
  const [phoneCountryCode, setPhoneCountryCode] = useState('+82')
  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const [consentEmail, setConsentEmail] = useState(false) // HPE 원래 버전: 이메일 수신 동의
  const [consentPhone, setConsentPhone] = useState(false) // HPE 원래 버전: 전화 수신 동의
  const [privacyConsent, setPrivacyConsent] = useState<'yes' | 'no' | null>(null)
  const [privacyConsentCheckbox, setPrivacyConsentCheckbox] = useState(false) // HPE 원래 버전: 체크박스
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  
  const handleSubmitted = (submissionResult: { survey_no: number; code6: string }) => {
    setResult(submissionResult)
    setSubmitted(true)
  }
  
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!lookupName.trim()) {
      setLookupError('성함을 입력해주세요.')
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
  
  // 테스트용 간단한 폼 여부 확인
  const isSimpleForm = campaign.public_path === '/test-registration-modu'
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 테스트용 간단한 폼: 이름과 전화번호만 검증
    if (isSimpleForm) {
      if (!name.trim()) {
        setError('이름을 입력해주세요.')
        return
      }
      
      if (!phone1 || !phone2 || !phone3) {
        setError('전화번호를 모두 입력해주세요.')
        return
      }
      
      const phone = `${phone1}-${phone2}-${phone3}`
      const phoneNorm = phone.replace(/\D/g, '')
      
      // localStorage에서 UTM 읽기
      let utmData: Record<string, any> = {}
      try {
        const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
        if (storedUTM) {
          utmData = JSON.parse(storedUTM)
        }
      } catch (parseError) {
        console.warn('[RegistrationPage] UTM 파싱 실패:', parseError)
      }
      
      const currentSessionId = sessionId || getOrCreateSessionId('ef_session_id', 30)
      
      setSubmitting(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/public/event-survey/${campaign.id}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            company: null,
            phone: phone,
            phone_norm: phoneNorm,
            utm_source: utmData.utm_source || mergedUTMParams.utm_source || null,
            utm_medium: utmData.utm_medium || mergedUTMParams.utm_medium || null,
            utm_campaign: utmData.utm_campaign || mergedUTMParams.utm_campaign || null,
            utm_term: utmData.utm_term || mergedUTMParams.utm_term || null,
            utm_content: utmData.utm_content || mergedUTMParams.utm_content || null,
            utm_first_visit_at: utmData.first_visit_at || null,
            utm_referrer: utmData.referrer_domain || null,
            cid: cid || null,
            session_id: currentSessionId || null,
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
        console.error('[RegistrationPage] 등록 제출 오류:', err)
        setError(err.message || '등록 중 오류가 발생했습니다. 다시 시도해주세요.')
        setSubmitting(false)
      }
      
      return
    }
    
    // 필수 필드 검증 (빈 문자열 및 플레이스홀더 값 체크)
    const isValidValue = (value: string) => {
      const trimmed = value.trim()
      return trimmed && trimmed !== '-' && trimmed !== '없음' && trimmed !== 'N/A' && trimmed !== 'n/a'
    }
    
    if (!isValidValue(email)) {
      setError('이메일을 입력해주세요.')
      return
    }
    
    // HPE 원래 버전 필드 검증
    if (isHPE) {
      if (!isValidValue(firstName)) {
        setError('이름을 입력해주세요.')
        return
      }
      
      if (!isValidValue(lastName)) {
        setError('성을 입력해주세요.')
        return
      }
      
      if (!isValidValue(company)) {
        setError('회사명을 입력해주세요.')
        return
      }
      
      if (!isValidValue(jobTitle)) {
        setError('직급을 입력해주세요.')
        return
      }
      
      if (!phone1 || !phone2 || !phone3) {
        setError('전화번호를 모두 입력해주세요.')
        return
      }
      
      if (!privacyConsentCheckbox) {
        setError('개인정보취급방침에 동의해주세요.')
        return
      }
    } else {
      // 기존 버전 필드 검증
      if (!isValidValue(name)) {
        setError('이름을 입력해주세요.')
        return
      }
      
      if (!isValidValue(organization)) {
        setError('소속을 입력해주세요.')
        return
      }
      
      if (!isValidValue(department)) {
        setError('부서를 입력해주세요.')
        return
      }
      
      if (!isValidValue(position)) {
        setError('직함을 입력해주세요.')
        return
      }
      
      if (!isValidValue(yearsOfExperience)) {
        setError('연차(경력)를 입력해주세요.')
        return
      }
      
      if (!phone1 || !phone2 || !phone3) {
        setError('휴대폰 번호를 모두 입력해주세요.')
        return
      }
      
      if (privacyConsent !== 'yes') {
        setError('개인정보 활용 동의에 동의해주세요.')
        return
      }
    }
    
    const phone = `${phone1}-${phone2}-${phone3}`
    const phoneNorm = phone.replace(/\D/g, '')
    const fullName = isHPE ? `${lastName}${firstName}`.trim() : name.trim()
    
    // localStorage에서 UTM 읽기
    let utmData: Record<string, any> = {}
    try {
      const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
      if (storedUTM) {
        utmData = JSON.parse(storedUTM)
      }
    } catch (parseError) {
      // localStorage 파싱 실패는 무시
      console.warn('[RegistrationPage] UTM 파싱 실패:', parseError)
    }
    
    // 상태에서 관리하는 session_id 사용 (Visit과 동일한 세션 ID 보장)
    // 쿠키 최신화 문제 해결: 한 번 생성한 세션 ID를 재사용
    // sessionId가 없으면 여기서 생성 (초기화가 늦을 경우 대비)
    const currentSessionId = sessionId || getOrCreateSessionId('ef_session_id', 30)
    
    setSubmitting(true)
    setError(null)
    
    // 요청 데이터 준비
    const baseRequestBody = isHPE ? {
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
        privacyConsent: privacyConsentCheckbox,
      },
    } : {
      name: name.trim(),
      company: organization.trim(), // 소속을 company 필드에 저장 (기존 API 호환성)
      phone: phone,
      phone_norm: phoneNorm,
      registration_data: {
        email: email.trim(),
        name: name.trim(),
        organization: organization.trim(),
        department: department.trim(),
        position: position.trim(),
        jobTitle: position.trim(), // 직책 (position과 동일, 호환성)
        yearsOfExperience: yearsOfExperience.trim(),
        question: question.trim() || '', // 선택 필드 (빈 문자열도 저장)
        phoneCountryCode: phoneCountryCode,
        privacyConsent: privacyConsent === 'yes',
        consentEmail: false, // 이메일 수신 동의 (등록 페이지에서는 별도 필드 없음)
        consentPhone: false, // 전화 수신 동의 (등록 페이지에서는 별도 필드 없음)
      },
    }
    
    const requestBody = {
      ...baseRequestBody,
      // UTM 파라미터 추가 (localStorage > URL > 서버 prop 우선순위)
      utm_source: utmData.utm_source || mergedUTMParams.utm_source || null,
      utm_medium: utmData.utm_medium || mergedUTMParams.utm_medium || null,
      utm_campaign: utmData.utm_campaign || mergedUTMParams.utm_campaign || null,
      utm_term: utmData.utm_term || mergedUTMParams.utm_term || null,
      utm_content: utmData.utm_content || mergedUTMParams.utm_content || null,
      utm_first_visit_at: utmData.first_visit_at || null,
      utm_referrer: utmData.referrer_domain || null,
      cid: cid || null, // cid 파라미터 전달
      session_id: currentSessionId || null, // Visit 연결용 (Phase 3) - 없어도 등록 성공
    }
    
    console.log('[RegistrationPage] 등록 요청 시작:', {
      campaignId: campaign.id,
      email: email.trim(),
      name: name.trim(),
      phone: phoneNorm,
      timestamp: new Date().toISOString()
    })
    
    try {
      // 등록 페이지는 상세 정보 제출
      const apiUrl = `/api/public/event-survey/${campaign.id}/register`
      console.log('[RegistrationPage] API URL:', apiUrl)
      
      // 네트워크 요청 타임아웃 설정 (30초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
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
      
      console.log('[RegistrationPage] 응답 수신:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      // 응답 본문 읽기 시도
      let result: any
      try {
        const text = await response.text()
        console.log('[RegistrationPage] 응답 본문:', text.substring(0, 500))
        if (text) {
          result = JSON.parse(text)
        } else {
          result = {}
        }
      } catch (parseError) {
        console.error('[RegistrationPage] 응답 파싱 오류:', parseError)
        throw new Error('서버 응답을 읽을 수 없습니다.')
      }
      
      if (!response.ok) {
        console.error('[RegistrationPage] 등록 실패:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error || '알 수 없는 오류',
          result
        })
        throw new Error(result.error || `등록에 실패했습니다. (${response.status})`)
      }
      
      // 성공 응답 검증
      if (!result.survey_no || !result.code6) {
        console.error('[RegistrationPage] 잘못된 응답:', result)
        throw new Error('서버에서 잘못된 응답을 받았습니다.')
      }
      
      console.log('[RegistrationPage] 등록 성공:', {
        survey_no: result.survey_no,
        code6: result.code6,
        email: email.trim()
      })
      
      handleSubmitted({
        survey_no: result.survey_no,
        code6: result.code6,
      })
    } catch (err: any) {
      console.error('[RegistrationPage] 등록 제출 오류:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      setError(err.message || '등록 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (submitted && result) {
    // 간단한 테스트 폼의 경우 리다이렉트하지 않고 완료 메시지 표시
    if (isSimpleForm) {
      // 완료 메시지는 폼 내에서 표시됨 (아래 JSX에서 처리)
      // 리다이렉트하지 않음
    } else {
      // 기존 폼의 경우 완료 페이지로 리다이렉트
      window.location.href = `${baseUrl}/event${campaign.public_path}/done?survey_no=${result.survey_no}&code6=${result.code6}`
      return null
    }
  }
  
  // 참여 확인 모드
  if (lookupMode) {
    const isWertSummit = campaign.public_path === '/149403'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    
    if (isWertSummit) {
      return (
        <>
          <style jsx global>{`
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
            
            html, body {
              font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
              background-color: #fff;
              margin: 0;
              padding: 0;
            }
            
            .registration-hero {
              width: 100%;
              max-width: 1000px;
              margin: 0 auto;
              position: relative;
              background: white;
              min-height: 600px;
              padding-top: 112px;
              padding-bottom: 80px;
              overflow: hidden;
            }
            
            .registration-hero-bg {
              width: 1972px;
              height: 1109px;
              position: absolute;
              left: -34px;
              top: 1530px;
              transform-origin: top left;
              transform: rotate(-90deg);
              filter: blur(40px);
              opacity: 0.3;
              z-index: 0;
            }
            
            .registration-hero-content {
              position: relative;
              z-index: 1;
            }
            
            .registration-header {
              width: 100%;
              max-width: 1000px;
              height: 112px;
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(255, 255, 255, 0.6);
              backdrop-filter: blur(2px);
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .registration-logo {
              width: 320px;
              height: 40px;
            }
            
            .registration-content {
              max-width: 856px;
              margin: 0 auto;
              padding: 0 72px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 40px;
            }
          
            .registration-title {
              text-align: center;
              font-size: 96px;
              font-weight: 700;
              line-height: 117.6px;
              color: #000;
              margin: 0;
              margin-bottom: 32px;
            }
          
            .registration-date-badges {
              display: flex;
              gap: 8px;
              align-items: center;
              margin-top: 32px;
              margin-bottom: 32px;
            }
          
            .date-badge {
              padding: 8px 24px;
              background-color: #000;
              border-radius: 16px;
              color: #fff;
              font-size: 36px;
              font-weight: 700;
              line-height: 54px;
            }
          
            .registration-form-section {
              width: 100%;
              max-width: 1000px;
              margin: 0 auto;
              padding: 80px 72px;
              background: white;
            }
          
            .registration-form-container {
              max-width: 856px;
              margin: 0 auto;
              background: #f5f5f5;
              border-radius: 48px;
              padding: 64px;
              box-shadow: 0px 4px 48px -10px rgba(0, 0, 0, 0.08);
            }
            
            @media (min-width: 1024px) {
              .registration-form-container {
                max-width: 714px;
              }
              
              .registration-entry-form {
                max-width: 500px;
                margin: 0 auto;
              }
            }
          
            .registration-form-title {
              font-size: 36px;
              font-weight: 700;
              color: #000;
              margin-bottom: 40px;
              text-align: center;
            }
          
            .registration-form-label {
              font-size: 20px;
              font-weight: 600;
              color: #000;
              margin-bottom: 12px;
              display: block;
            }
          
            .registration-form-input {
              width: 100%;
              padding: 16px 20px;
              background: #fff;
              border: 2px solid #e5e5e5;
              border-radius: 16px;
              font-size: 18px;
              color: #000;
              font-family: 'Pretendard', sans-serif;
              transition: all 0.3s ease;
            }
          
            .registration-form-input:focus {
              outline: none;
              border-color: #00A08C;
              background-color: #fff;
            }
          
            .registration-form-input::placeholder {
              color: #999;
            }
          
            .registration-form-button {
              width: 100%;
              padding: 20px 48px;
              background-color: #00A08C;
              color: #fff;
              border: none;
              border-radius: 200px;
              font-size: 24px;
              font-weight: 700;
              line-height: 36px;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
            }
            
            @media (min-width: 1024px) {
              .registration-form-button {
                width: auto;
                padding: 24px 40px 24px 64px;
                font-size: 36px;
                line-height: 1.2;
                gap: 24px;
                border-radius: 200px;
              }
              
              .registration-button-container {
                display: flex;
                justify-content: center;
              }
              
              .mobile-country-code {
                width: 80px !important;
                padding: 16px 8px !important;
              }
              
              .mobile-phone-gap {
                gap: 4px !important;
              }
            }
          
            .registration-form-button:hover {
              background-color: #008f7a;
              transform: translateY(-2px);
              box-shadow: 0 8px 16px rgba(0, 160, 140, 0.3);
            }
          
            .registration-form-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          
            .secondary-button {
              width: 100%;
              padding: 16px 40px;
              background-color: transparent;
              color: #00A08C;
              border: 2px solid #00A08C;
              border-radius: 200px;
              font-size: 20px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s ease;
              margin-top: 16px;
            }
          
            .secondary-button:hover {
              background-color: #00A08C;
              color: #fff;
            }
          
            @media (max-width: 768px) {
              .registration-hero {
                padding-top: 64px;
                padding-bottom: 40px;
                min-height: auto;
              }
              
              .registration-header {
                height: 56px;
                padding: 0 16px;
              }
              
              .registration-logo {
                width: 160px;
                height: 20px;
              }
              
              .registration-content {
                padding: 0 16px;
                gap: 20px;
              }
              
              .registration-title {
                font-size: 36px;
                line-height: 1.25;
                margin-bottom: 24px;
              }
              
              .registration-date-badges {
                margin-top: 24px;
                margin-bottom: 24px;
              }
              
              .date-badge {
                font-size: 14px;
                padding: 6px 12px;
                line-height: 20px;
                border-radius: 8px;
              }
              
              .registration-form-section {
                padding: 32px 16px;
              }
              
              .registration-form-container {
                padding: 24px 16px;
                border-radius: 20px;
              }
              
              .registration-form-title {
                font-size: 20px;
                margin-bottom: 20px;
              }
              
              .registration-form-label {
                font-size: 14px;
                margin-bottom: 8px;
              }
              
              .registration-form-input {
                font-size: 14px;
                padding: 12px 14px;
                border-radius: 12px;
              }
              
              .registration-form-button {
                width: auto;
                font-size: 14px;
                padding: 10px 16px;
                gap: 8px;
                border-radius: 9999px;
                min-height: 44px;
              }
              
              .registration-button-container {
                display: flex;
                justify-content: center;
              }
              
              .secondary-button {
                font-size: 14px;
                padding: 12px 24px;
                border-radius: 100px;
              }
              
              .mobile-text-sm {
                font-size: 18px !important;
                line-height: 26px !important;
              }
              
              .mobile-form-gap {
                gap: 24px !important;
              }
              
              .mobile-phone-gap {
                gap: 6px !important;
              }
              
              .mobile-phone-separator {
                right: 8px !important;
                font-size: 12px !important;
              }
              
            .mobile-country-code {
              width: 60px !important;
              font-size: 14px !important;
            }
            
            .phone-first-field {
              flex: 0 0 60px !important;
            }
            
            .phone-first-input {
              padding-right: 12px !important;
            }
            
            .phone-second-input {
              padding-right: 12px !important;
            }
            
            .phone-third-input {
              padding-right: 12px !important;
            }
            
            .mobile-consent-section {
              padding-top: 20px !important;
            }
            
            .mobile-consent-text {
              font-size: 14px !important;
              line-height: 20px !important;
              margin-bottom: 12px !important;
            }
            
            .mobile-privacy-text {
              font-size: 12px !important;
              line-height: 18px !important;
              margin-bottom: 12px !important;
            }
            
            .mobile-checkbox-gap {
              gap: 10px !important;
            }
            
            .mobile-checkbox-label {
              align-items: flex-start !important;
            }
            
            .mobile-checkbox {
              width: 18px !important;
              height: 18px !important;
              margin-right: 10px !important;
              margin-top: 2px !important;
            }
            
            .mobile-checkbox-text {
              font-size: 14px !important;
              line-height: 20px !important;
            }
          }
        `}</style>

        {/* Header with Logo */}
          <div className="registration-header">
            <img
              src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png`}
              alt="keywert Insight"
              className="registration-logo"
            />
          </div>

          {/* Hero Section */}
          <section className="registration-hero">
            {/* Background Image - Rotated and Blurred */}
            <div className="registration-hero-bg">
              <img
                src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/image 50-1.png`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="registration-hero-content">
              <div className="registration-content">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
                    {/* IP Insight ON 이미지 */}
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/ip_insight_on.png`}
                      alt="IP Insight ON"
                      style={{ width: '204px', height: '60px', marginTop: '40px', marginBottom: '40px', objectFit: 'contain' }}
                    />
                    <div style={{ textAlign: 'center', fontSize: '36px', fontWeight: 700, color: '#000' }}>
                      실제 고객사례로 알아보는
                    </div>
                    <h1 className="registration-title">
                      AI 특허리서치<br />
                      <span style={{ whiteSpace: 'nowrap' }}>실무 활용 웨비나</span>
                    </h1>
                    <div className="registration-date-badges">
                      <div className="date-badge">2026. 02. 06</div>
                      <div className="date-badge">14:00</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Form Section */}
          <section className="registration-form-section">
            <div className="registration-form-container">
              <h1 className="registration-form-title">등록 확인하기</h1>
              <p style={{ fontSize: '16px', color: '#666', textAlign: 'center', marginBottom: '32px' }}>
                등록한 성함과 전화번호를 입력해주세요
              </p>
              
              <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="mobile-form-gap">
                {lookupError && (
                  <div style={{ padding: '16px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '16px' }}>
                    <p style={{ fontSize: '16px', color: '#c00' }}>{lookupError}</p>
                  </div>
                )}
                
                <div>
                  <label className="registration-form-label">성함</label>
                  <input
                    type="text"
                    value={lookupName}
                    onChange={(e) => setLookupName(e.target.value)}
                    className="registration-form-input"
                    placeholder="성함을 입력하세요"
                    disabled={lookupLoading}
                  />
                </div>
                
                <div>
                  <label className="registration-form-label">전화번호</label>
                  <div style={{ display: 'flex', gap: '8px' }} className="mobile-phone-gap">
                    <div style={{ flex: 1, position: 'relative' }} className="phone-first-field">
                      <input
                        type="tel"
                        value={lookupPhone1}
                        onChange={(e) => setLookupPhone1(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        className="registration-form-input phone-first-input"
                        style={{ textAlign: 'center', paddingRight: '32px' }}
                        placeholder="010"
                        maxLength={3}
                        disabled={lookupLoading}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} className="mobile-phone-separator">-</span>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="tel"
                        value={lookupPhone2}
                        onChange={(e) => setLookupPhone2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="registration-form-input phone-second-input"
                        style={{ textAlign: 'center', paddingRight: '32px' }}
                        placeholder="1234"
                        maxLength={4}
                        disabled={lookupLoading}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} className="mobile-phone-separator">-</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="tel"
                        value={lookupPhone3}
                        onChange={(e) => setLookupPhone3(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="registration-form-input phone-third-input"
                        style={{ textAlign: 'center' }}
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
                  className="registration-form-button"
                >
                  {lookupLoading ? '확인 중...' : '등록 확인하기'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setLookupMode(false)}
                  className="secondary-button"
                >
                  등록하기로 돌아가기
                </button>
              </form>
            </div>
          </section>
        </>
      )
    }
    
    // 기존 디자인 (다른 경로용)
    const headerImageUrl = campaign.public_path === '/149403'
      ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert.png'
      : campaign.public_path === '/445870'
      ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_0126.jpg'
      : 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_1.jpg'
    
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
              등록한 성함과 전화번호를 입력해주세요
            </p>
            
            <form onSubmit={handleLookup} className="space-y-4 sm:space-y-5">
              {lookupError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{lookupError}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  성함
                </label>
                <input
                  type="text"
                  value={lookupName}
                  onChange={(e) => setLookupName(e.target.value)}
                  className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                  placeholder="성함을 입력하세요"
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
  // 149403 경로는 WebinarFormWertPage와 같은 디자인 사용
  const isWertSummit = campaign.public_path === '/149403'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  
  if (isWertSummit) {
    return (
      <>
        <style jsx global>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
          
          html, body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            background-color: #fff;
            margin: 0;
            padding: 0;
          }
          
          .registration-hero {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            margin-right: calc(-50vw + 50%);
            position: relative;
            background-image: url(https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert/bg2.png);
            background-size: cover;
            background-position: left center;
            background-repeat: no-repeat;
            background-attachment: local;
            min-height: 600px;
            padding-top: 150px;
            padding-bottom: 80px;
            overflow: hidden;
          }
          
          @media (min-width: 640px) {
            .registration-hero {
              padding-top: 150px;
            }
          }
          
          @media (min-width: 1024px) {
            .registration-hero {
              padding-top: 150px;
            }
          }
          
          .registration-hero-bg {
            display: none;
          }
          
          .registration-hero-content {
            position: relative;
            z-index: 1;
          }
          
          .registration-header {
            width: 100vw;
            height: 112px;
            position: absolute;
            top: 0;
            left: 0;
            margin-left: calc(-50vw + 50%);
            margin-right: calc(-50vw + 50%);
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(2px);
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .registration-logo {
            width: 320px;
            height: 40px;
          }
          
          .registration-content {
            max-width: 856px;
            margin: 0 auto;
            padding: 0 72px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px;
          }
          
          .hero-title-wrapper {
            gap: 4px;
          }
          
          @media (min-width: 1024px) {
            .hero-title-wrapper {
              gap: 8px;
            }
          }
          
          .registration-subtitle-text {
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            color: rgba(0, 0, 0, 0.8);
            font-family: 'Pretendard', sans-serif;
            margin: 0;
            margin-bottom: 24px;
          }
          
          @media (min-width: 640px) {
            .registration-subtitle-text {
              font-size: 18px;
            }
          }
          
          @media (min-width: 1024px) {
            .registration-subtitle-text {
              font-size: 32px;
              line-height: 48px;
            }
          }
          
          .registration-title {
            text-align: center;
            font-size: 96px;
            font-weight: 700;
            line-height: 117.6px;
            color: #000;
            margin: 0;
            margin-bottom: 32px;
          }
          
          .registration-date-badges {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-top: 32px;
            margin-bottom: 32px;
          }
          
          .date-badge {
            padding: 8px 24px;
            background-color: #000;
            border-radius: 16px;
            color: #fff;
            font-size: 36px;
            font-weight: 700;
            line-height: 54px;
          }
          
          .registration-form-section {
            width: 100%;
            max-width: 1000px;
            margin: 0 auto;
            padding: 80px 72px;
            background: white;
          }
          
          .registration-form-container {
            max-width: 856px;
            margin: 0 auto;
            background: #f5f5f5;
            border-radius: 48px;
            padding: 64px;
            box-shadow: 0px 4px 48px -10px rgba(0, 0, 0, 0.08);
          }
          
          @media (min-width: 1024px) {
            .registration-form-container {
              max-width: 714px;
            }
            
            .registration-entry-form {
              max-width: 500px;
              margin: 0 auto;
            }
            
            .mobile-country-code {
              width: 80px !important;
              padding: 16px 8px !important;
            }
            
            .mobile-phone-gap {
              gap: 4px !important;
            }
          }
          
          .registration-form-title {
            font-size: 36px;
            font-weight: 700;
            color: #000;
            margin-bottom: 40px;
            text-align: center;
          }
          
          .registration-form-label {
            font-size: 20px;
            font-weight: 600;
            color: #000;
            margin-bottom: 12px;
            display: block;
          }
          
          .registration-form-input {
            width: 100%;
            padding: 16px 20px;
            background: #fff;
            border: 2px solid #e5e5e5;
            border-radius: 16px;
            font-size: 18px;
            color: #000;
            font-family: 'Pretendard', sans-serif;
            transition: all 0.3s ease;
          }
          
          .registration-form-input:focus {
            outline: none;
            border-color: #00A08C;
            background-color: #fff;
          }
          
          .registration-form-input::placeholder {
            color: #999;
          }
          
          .registration-form-button {
            width: 100%;
            padding: 20px 48px;
            background-color: #00A08C;
            color: #fff;
            border: none;
            border-radius: 200px;
            font-size: 24px;
            font-weight: 700;
            line-height: 36px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }
          
          @media (min-width: 1024px) {
            .registration-form-button {
              width: auto;
              padding: 24px 40px 24px 64px;
              font-size: 36px;
              line-height: 1.2;
              gap: 24px;
              border-radius: 200px;
            }
            
            .registration-button-container {
              display: flex;
              justify-content: center;
            }
          }
          
          .registration-form-button:hover {
            background-color: #008f7a;
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 160, 140, 0.3);
          }
          
          .registration-form-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .back-link {
            color: #666;
            text-decoration: none;
            margin-bottom: 40px;
            display: inline-block;
            font-size: 18px;
            transition: color 0.3s ease;
          }
          
          .back-link:hover {
            color: #000;
          }
          
          @media (max-width: 768px) {
            .registration-hero {
              padding-top: 64px;
              padding-bottom: 40px;
              min-height: auto;
            }
            
            .registration-header {
              height: 56px;
              padding: 0 16px;
            }
            
            .registration-logo {
              width: 160px;
              height: 20px;
            }
            
            .registration-content {
              padding: 0 16px;
              gap: 20px;
              margin-top: 16px;
            }
            
            .registration-title {
              font-size: 36px;
              line-height: 1.25;
              margin-bottom: 24px;
            }
            
            .registration-date-badges {
              margin-top: 24px;
              margin-bottom: 24px;
            }
            
            .date-badge {
              font-size: 14px;
              padding: 6px 12px;
              line-height: 20px;
              border-radius: 8px;
            }
            
            .registration-form-section {
              padding: 32px 16px;
            }
            
            .registration-form-container {
              padding: 24px 16px;
              border-radius: 20px;
            }
            
            .registration-form-title {
              font-size: 20px;
              margin-bottom: 20px;
            }
            
            .registration-form-label {
              font-size: 14px;
              margin-bottom: 8px;
            }
            
            .registration-form-input {
              font-size: 14px;
              padding: 12px 14px;
              border-radius: 12px;
            }
            
            .registration-form-button {
              width: auto;
              font-size: 14px;
              padding: 10px 16px;
              gap: 8px;
              border-radius: 9999px;
              min-height: 44px;
            }
            
            .registration-button-container {
              display: flex;
              justify-content: center;
            }
            
            .back-link {
              font-size: 14px;
              margin-bottom: 24px;
            }
            
            .mobile-text-sm {
              font-size: 18px !important;
              line-height: 26px !important;
            }
            
            .mobile-form-gap {
              gap: 24px !important;
            }
            
            .mobile-phone-gap {
              gap: 0 !important;
            }
            
            .mobile-phone-separator {
              display: none !important;
            }
            
            .mobile-country-code {
              width: 60px !important;
              font-size: 14px !important;
            }
            
            .phone-first-field {
              flex: 0 0 60px !important;
            }
            
            .phone-first-input {
              padding-right: 12px !important;
            }
            
            .phone-second-input {
              padding-right: 12px !important;
            }
            
            .phone-third-input {
              padding-right: 12px !important;
            }
            
            .mobile-consent-section {
              padding-top: 20px !important;
            }
            
            .mobile-consent-text {
              font-size: 14px !important;
              line-height: 20px !important;
              margin-bottom: 12px !important;
            }
            
            .mobile-privacy-text {
              font-size: 12px !important;
              line-height: 18px !important;
              margin-bottom: 12px !important;
            }
            
            .mobile-checkbox-gap {
              gap: 10px !important;
            }
            
            .mobile-checkbox-label {
              align-items: flex-start !important;
            }
            
            .mobile-checkbox {
              width: 18px !important;
              height: 18px !important;
              margin-right: 10px !important;
              margin-top: 2px !important;
            }
            
            .mobile-checkbox-text {
              font-size: 14px !important;
              line-height: 20px !important;
            }
          }
        `}</style>

        {/* Header with Logo */}
        <div className="registration-header">
          <img
            src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/kewert_logo.png`}
            alt="keywert Insight"
            className="registration-logo"
          />
        </div>

        {/* Hero Section */}
        <section className="registration-hero">
          <div className="registration-hero-content">
            <div className="registration-content">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
                <div className="hero-title-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* IP Insight ON 이미지 */}
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/ip_insight_on.png`}
                    alt="IP Insight ON"
                    style={{ width: '204px', height: '60px', marginTop: '40px', marginBottom: '40px', objectFit: 'contain' }}
                  />
                  <div className="registration-subtitle-text">
                    고객사례로 알아보는
                  </div>
                  <h1 className="registration-title">
                    AI 특허리서치<br />
                    <span style={{ whiteSpace: 'nowrap' }}>실무 활용 웨비나</span>
                  </h1>
                  <div className="registration-date-badges">
                    <div className="date-badge">2026. 02. 06</div>
                    <div className="date-badge">14:00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="registration-form-section">
          <div className="registration-form-container">
            <Link 
              href={`${baseUrl}/event${campaign.public_path}`}
              className="back-link"
            >
              ← 메인페이지로 돌아가기
            </Link>
            
            <h1 className="registration-form-title">웨비나 등록</h1>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="mobile-form-gap registration-entry-form">
              {error && (
                <div style={{ padding: '16px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '16px' }}>
                  <p style={{ fontSize: '16px', color: '#c00' }}>{error}</p>
                </div>
              )}
              
              {/* 이름 */}
              <div>
                <label className="registration-form-label">
                  이름 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="registration-form-input"
                  placeholder="이름을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 이메일 */}
              <div>
                <label className="registration-form-label">
                  이메일 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="registration-form-input"
                  placeholder="이메일을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 휴대폰 번호 */}
              <div>
                <label className="registration-form-label">
                  휴대폰번호 <span style={{ color: '#f00' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="mobile-phone-gap">
                  <input
                    type="text"
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="registration-form-input mobile-country-code"
                    style={{ width: '70px', textAlign: 'center' }}
                    disabled={submitting}
                  />
                  <div style={{ flex: 1, position: 'relative' }} className="phone-first-field">
                    <input
                      type="tel"
                      value={phone1}
                      onChange={(e) => setPhone1(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="registration-form-input phone-first-input"
                      style={{ textAlign: 'center', paddingRight: '32px' }}
                      placeholder="010"
                      maxLength={3}
                      disabled={submitting}
                      required
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} className="mobile-phone-separator">-</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="registration-form-input phone-second-input"
                      style={{ textAlign: 'center', paddingRight: '32px' }}
                      placeholder="1234"
                      maxLength={4}
                      disabled={submitting}
                      required
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} className="mobile-phone-separator">-</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="tel"
                      value={phone3}
                      onChange={(e) => setPhone3(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="registration-form-input phone-third-input"
                      style={{ textAlign: 'center' }}
                      placeholder="5678"
                      maxLength={4}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* 소속 */}
              <div>
                <label className="registration-form-label">
                  소속 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="registration-form-input"
                  placeholder="소속을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 부서 */}
              <div>
                <label className="registration-form-label">
                  부서 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="registration-form-input"
                  placeholder="부서를 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 직함 */}
              <div>
                <label className="registration-form-label">
                  직함 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="registration-form-input"
                  placeholder="직함을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 연차(경력) */}
              <div>
                <label className="registration-form-label">
                  연차(경력) <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  className="registration-form-input"
                  placeholder="예: 5년, 신입 등"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 웨비나와 관련하여 궁금한 사항 */}
              <div>
                <label className="registration-form-label">
                  웨비나와 관련하여 궁금한 사항을 기재해 주세요.
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="registration-form-input"
                  placeholder="궁금한 사항을 입력하세요"
                  rows={4}
                  disabled={submitting}
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
              </div>
              
              {/* 개인정보 취급방침 - isWertSummit일 때는 워트인텔리전스 버전만 표시 (HPE는 기존 디자인에서 처리) */}
              {!isHPE && (
                <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e5e5' }} className="mobile-consent-section">
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', marginBottom: '12px' }}>
                      개인정보 활용 동의 <span style={{ color: '#f00' }}>*</span>
                    </h3>
                    <div style={{ fontSize: '14px', color: '#333', lineHeight: '22px', marginBottom: '16px' }}>
                      <p style={{ marginBottom: '12px' }}>
                        주식회사 워트인텔리전스는 웨비나 운영과 서비스 홍보를 위해 다음과 같이 개인정보를 수집 및 이용하고자 합니다. 귀하는 동의를 거부할 권리가 있으며, 거부할 경우 웨비나 이용이 제한됩니다.
                      </p>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>- 항목:</strong> 이름, 이메일, 휴대폰번호, 소속, 부서, 직함, 연차(경력)
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
                        checked={privacyConsent === 'yes'}
                        onChange={(e) => setPrivacyConsent('yes')}
                        style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: '#00A08C', flexShrink: 0 }}
                        disabled={submitting}
                        required
                      />
                      <span style={{ fontSize: '16px', color: '#000' }}>네, 동의합니다.</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="privacyConsent"
                        value="no"
                        checked={privacyConsent === 'no'}
                        onChange={(e) => setPrivacyConsent('no')}
                        style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: '#00A08C', flexShrink: 0 }}
                        disabled={submitting}
                      />
                      <span style={{ fontSize: '16px', color: '#000' }}>아니요, 동의하지 않습니다.</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* 제출 버튼 */}
              <div style={{ marginTop: '32px' }} className="registration-button-container">
                <button
                  type="submit"
                  disabled={submitting}
                  className="registration-form-button"
                >
                  {submitting ? '등록 중...' : '웨비나 등록하기'}
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/wert/symbol1.png`}
                    alt=""
                    width={14}
                    height={20}
                    style={{ width: '14px', height: '20px', objectFit: 'contain' }}
                  />
                </button>
              </div>
            </form>
          </div>
        </section>
      </>
    )
  }
  
  // 테스트용 간단한 폼 렌더링
  if (isSimpleForm) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">
              {campaign.title || '이벤트 등록'}
            </h1>
            <p className="text-gray-600 text-sm">간단한 정보만 입력해주세요</p>
          </div>
          
          {submitted && result ? (
            // 완료 메시지 표시
            <div className="space-y-6 bg-white rounded-2xl shadow-lg p-8">
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-green-800 mb-2">등록이 완료되었습니다!</h2>
                <p className="text-gray-600 mb-2">
                  등록 번호: <span className="font-semibold">{result.survey_no}</span>
                </p>
                <p className="text-sm text-gray-500">
                  확인 코드: <span className="font-mono font-semibold">{result.code6}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false)
                  setResult(null)
                  setName('')
                  setPhone1('010')
                  setPhone2('')
                  setPhone3('')
                  setError(null)
                }}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                다시 등록하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            
            {/* 이름 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 transition-all"
                placeholder="이름을 입력하세요"
                disabled={submitting}
                required
              />
            </div>
            
            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="tel"
                  value={phone1}
                  onChange={(e) => setPhone1(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-center bg-white text-gray-900 transition-all"
                  placeholder="010"
                  maxLength={3}
                  disabled={submitting}
                  required
                />
                <span className="text-gray-400 font-semibold">-</span>
                <input
                  type="tel"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-center bg-white text-gray-900 transition-all"
                  placeholder="1234"
                  maxLength={4}
                  disabled={submitting}
                  required
                />
                <span className="text-gray-400 font-semibold">-</span>
                <input
                  type="tel"
                  value={phone3}
                  onChange={(e) => setPhone3(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-center bg-white text-gray-900 transition-all"
                  placeholder="5678"
                  maxLength={4}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
            
              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {submitting ? '등록 중...' : '등록하기'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }
  
  // 기존 디자인 (다른 경로용)
  const headerImageUrl = campaign.public_path === '/149403'
    ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert.png'
    : campaign.public_path === '/445870'
    ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_0126.jpg'
    : 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_1.jpg'
  
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
            {campaign.public_path === '/149403' 
              ? 'AI 특허리서치 실무 활용 웨비나'
              : campaign.public_path === '/445870' 
              ? 'HPE Networking in Motion' 
              : (campaign.title || 'HPE Networking in Motion')}
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
            
            {/* HPE 원래 버전 필드 */}
            {isHPE ? (
              <>
                {/* 이메일 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    이메일 <span className="text-red-500">*</span>
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
                
                {/* 전화번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전화번호 <span className="text-red-500">*</span>
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
                    새로워진 HPE Networking에 대한 궁금한 점을 남겨 주세요. 행사 당일 답변드립니다.
                  </label>
                  <textarea
                    value={customQuestion}
                    onChange={(e) => {
                      setCustomQuestion(e.target.value)
                      // 자동 높이 조절
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                    className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base resize-none overflow-hidden"
                    placeholder="궁금한 점을 입력해주세요"
                    rows={1}
                    disabled={submitting}
                    style={{ minHeight: '2.5rem' }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* 이름 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                    placeholder="이름을 입력하세요"
                    disabled={submitting}
                    required
                  />
                </div>
                
                {/* 이메일 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    이메일 <span className="text-red-500">*</span>
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
                
                {/* 소속 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    소속 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                    placeholder="소속을 입력하세요"
                    disabled={submitting}
                    required
                  />
                </div>
                
                {/* 부서 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    부서 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                    placeholder="부서를 입력하세요"
                    disabled={submitting}
                    required
                  />
                </div>
                
                {/* 직함 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    직함 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                    placeholder="직함을 입력하세요"
                    disabled={submitting}
                    required
                  />
                </div>
                
                {/* 연차(경력) */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    연차(경력) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                    placeholder="예: 5년, 신입 등"
                    disabled={submitting}
                    required
                  />
                </div>
                
                {/* 웨비나와 관련하여 궁금한 사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    웨비나와 관련하여 궁금한 사항을 기재해 주세요.
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                    placeholder="궁금한 사항을 입력하세요"
                    rows={4}
                    disabled={submitting}
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                </div>
              </>
            )}
            
            {/* 휴대폰 번호 (기존 버전용) */}
            {!isHPE && (
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
            )}
            
            {/* HPE 원래 버전: 커뮤니케이션 동의 */}
            {isHPE && (
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
                      className="w-4 h-4 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                      disabled={submitting}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">이메일</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentPhone}
                      onChange={(e) => setConsentPhone(e.target.checked)}
                      className="w-4 h-4 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                      disabled={submitting}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">전화번호</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* HPE 원래 버전: 개인정보 취급방침 */}
            {isHPE ? (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
                  HPE에서 귀하의 정보를 관리, 사용, 보호하는 방법에 대해 자세히 알아보려면{' '}
                  <a 
                    href="https://www.hpe.com/kr/ko/privacy/ww-privacy-statement.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00B388] hover:underline"
                  >
                    HPE 개인정보 취급방침
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
                        `width=${width},height=${height},left=${left},top=${top}`
                      )
                    }}
                    className="text-[#00B388] hover:underline"
                  >
                    여기
                  </a>를 클릭하세요.
                </p>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsentCheckbox}
                    onChange={(e) => setPrivacyConsentCheckbox(e.target.checked)}
                    className="w-4 h-4 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388] mt-0.5"
                    disabled={submitting}
                    required
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    개인정보 취급방침에 동의합니다 <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-3">
                  개인정보 활용 동의 <span className="text-red-500">*</span>
                </h3>
                <div className="text-sm text-gray-700 mb-4 leading-relaxed">
                  <p className="mb-3">
                    주식회사 워트인텔리전스는 웨비나 운영과 서비스 홍보를 위해 다음과 같이 개인정보를 수집 및 이용하고자 합니다. 귀하는 동의를 거부할 권리가 있으며, 거부할 경우 웨비나 이용이 제한됩니다.
                  </p>
                  <div className="mb-2">
                    <strong>- 항목:</strong> 이름, 이메일, 휴대폰번호, 소속, 부서, 직함, 연차(경력)
                  </div>
                  <div className="mb-2">
                    <strong>- 수집 및 이용목적:</strong> 참가자 혜택 제공(서비스 안내 등)
                  </div>
                  <div className="mb-3">
                    <strong>- 보유 및 이용기간:</strong> 동의 철회까지
                  </div>
                  <div className="text-xs text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg">
                    <strong>※ 동의 거부 권리 및 불이익:</strong> 귀하는 위와 같은 개인정보 활용 동의를 거부할 권리가 있습니다. 다만, 동의 거부 시 웨비나 참가 신청 및 관련 혜택 제공이 제한될 수 있습니다.
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacyConsent"
                      value="yes"
                      checked={privacyConsent === 'yes'}
                      onChange={(e) => setPrivacyConsent('yes')}
                      className="w-4 h-4 text-[#00B388] border-gray-300 focus:ring-[#00B388]"
                      disabled={submitting}
                      required
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">네, 동의합니다.</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privacyConsent"
                      value="no"
                      checked={privacyConsent === 'no'}
                      onChange={(e) => setPrivacyConsent('no')}
                      className="w-4 h-4 text-[#00B388] border-gray-300 focus:ring-[#00B388]"
                      disabled={submitting}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">아니요, 동의하지 않습니다.</span>
                  </label>
                </div>
              </div>
            )}
            
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
