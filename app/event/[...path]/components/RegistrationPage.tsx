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
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+82')
  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 필수 필드 검증
    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    
    if (!name.trim()) {
      setError('성함을 입력해주세요.')
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
    
    const phone = `${phone1}-${phone2}-${phone3}`
    const phoneNorm = phone.replace(/\D/g, '')
    
    setSubmitting(true)
    setError(null)
    
    try {
      // 등록 페이지는 상세 정보 제출
      const response = await fetch(`/api/public/event-survey/${campaign.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          phone: phone,
          phone_norm: phoneNorm,
            registration_data: {
              email: email.trim(),
              name: name.trim(),
              jobTitle: jobTitle.trim(),
              phoneCountryCode: phoneCountryCode,
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
            }
          
            .registration-date-badges {
              display: flex;
              gap: 8px;
              align-items: center;
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
                padding-top: 72px;
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
                font-size: 28px;
                line-height: 36px;
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
                font-size: 16px;
                padding: 14px 24px;
                gap: 8px;
                border-radius: 100px;
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
      ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_2.jpg'
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
          }
          
          .registration-date-badges {
            display: flex;
            gap: 8px;
            align-items: center;
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
              padding-top: 72px;
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
              font-size: 28px;
              line-height: 36px;
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
              font-size: 16px;
              padding: 14px 24px;
              gap: 8px;
              border-radius: 100px;
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
                  <div style={{ textAlign: 'center', fontSize: '36px', fontWeight: 700, color: '#000' }} className="mobile-text-sm">
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
            <Link 
              href={`${baseUrl}/event${campaign.public_path}`}
              className="back-link"
            >
              ← 메인페이지로 돌아가기
            </Link>
            
            <h1 className="registration-form-title">이벤트 등록</h1>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="mobile-form-gap">
              {error && (
                <div style={{ padding: '16px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '16px' }}>
                  <p style={{ fontSize: '16px', color: '#c00' }}>{error}</p>
                </div>
              )}
              
              {/* 회사명 */}
              <div>
                <label className="registration-form-label">
                  회사명 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="registration-form-input"
                  placeholder="회사명을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 이메일 주소 */}
              <div>
                <label className="registration-form-label">
                  이메일 주소 <span style={{ color: '#f00' }}>*</span>
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
              
              {/* 성함 */}
              <div>
                <label className="registration-form-label">
                  성함 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="registration-form-input"
                  placeholder="성함을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 직급 */}
              <div>
                <label className="registration-form-label">
                  직급 <span style={{ color: '#f00' }}>*</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="registration-form-input"
                  placeholder="직급을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              {/* 휴대폰 번호 */}
              <div>
                <label className="registration-form-label">
                  휴대폰 번호 <span style={{ color: '#f00' }}>*</span>
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
              
              {/* 커뮤니케이션 동의 */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e5e5' }} className="mobile-consent-section">
                <p style={{ fontSize: '16px', color: '#666', marginBottom: '16px', lineHeight: '24px' }} className="mobile-consent-text">
                  WERT에 대한 맞춤식 커뮤니케이션을 통해 WERT 파트너의 제품, 서비스, 특별 행사 및 이벤트 정보를 선택적으로 받으시겠습니까?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="mobile-checkbox-gap">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} className="mobile-checkbox-label">
                    <input
                      type="checkbox"
                      checked={consentEmail}
                      onChange={(e) => setConsentEmail(e.target.checked)}
                      style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: '#00A08C' }}
                      className="mobile-checkbox"
                      disabled={submitting}
                    />
                    <span style={{ fontSize: '16px', color: '#000' }} className="mobile-checkbox-text">이메일</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} className="mobile-checkbox-label">
                    <input
                      type="checkbox"
                      checked={consentPhone}
                      onChange={(e) => setConsentPhone(e.target.checked)}
                      style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: '#00A08C' }}
                      className="mobile-checkbox"
                      disabled={submitting}
                    />
                    <span style={{ fontSize: '16px', color: '#000' }} className="mobile-checkbox-text">전화번호</span>
                  </label>
                </div>
              </div>
              
              {/* 개인정보취급방침 */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e5e5' }} className="mobile-consent-section">
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '22px' }} className="mobile-privacy-text">
                  WERT에서 귀하의 정보를 관리, 사용, 보호하는 방법에 대해 자세히 알아보려면{' '}
                  <a 
                    href="https://www.wertcorp.com/kr/policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#00A08C', textDecoration: 'underline' }}
                  >
                    WERT 개인정보 취급방침
                  </a>을 참조하시기 바랍니다. 
                  동의한 사항에 대해 언제든지 취소 또는 수정하여 WERT의 마케팅 커뮤니케이션 서비스를 받을 수 있습니다. 
                  이 작업을 수행하려면 WERT 이메일 마케팅 커뮤니케이션 페이지 하단의 옵트아웃 및 환경설정 메커니즘을 사용하거나{' '}
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
                    style={{ color: '#00A08C', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    이 링크
                  </a>를 클릭하시면 됩니다. 
                  마케팅 팀으로부터 전화를 받으실 수 있도록 휴대폰 번호를 제공하신 경우, 로밍 요금이 적용될 수 있음을 알아두시기 바랍니다.
                </p>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }} className="mobile-checkbox-label">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    style={{ width: '20px', height: '20px', marginRight: '12px', marginTop: '2px', accentColor: '#00A08C' }}
                    className="mobile-checkbox"
                    disabled={submitting}
                    required
                  />
                  <span style={{ fontSize: '16px', color: '#000' }} className="mobile-checkbox-text">
                    개인정보 취급방침에 동의합니다 <span style={{ color: '#f00' }}>*</span>
                  </span>
                </label>
              </div>
              
              {/* 제출 버튼 */}
              <div style={{ marginTop: '32px' }}>
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
  
  // 기존 디자인 (다른 경로용)
  const headerImageUrl = campaign.public_path === '/149403'
    ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/wert.png'
    : campaign.public_path === '/445870'
    ? 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/edm_header_1600_2.jpg'
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
            
            {/* 성함 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                성함 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                placeholder="성함을 입력하세요"
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
            
            {/* 커뮤니케이션 동의 */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-4">
                {campaign.public_path === '/149403' 
                  ? 'WERT에 대한 맞춤식 커뮤니케이션을 통해 WERT 파트너의 제품, 서비스, 특별 행사 및 이벤트 정보를 선택적으로 받으시겠습니까?'
                  : 'HPE에 대한 맞춤식 커뮤니케이션을 통해 HPE 파트너의 제품, 서비스, 특별 행사 및 이벤트 정보를 선택적으로 받으시겠습니까?'}
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
            
            {/* 개인정보취급방침 */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
                {campaign.public_path === '/149403' ? (
                  <>
                    WERT에서 귀하의 정보를 관리, 사용, 보호하는 방법에 대해 자세히 알아보려면{' '}
                    <a 
                      href="https://www.wertcorp.com/kr/policy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#00B388] hover:underline"
                    >
                      WERT 개인정보 취급방침
                    </a>을 참조하시기 바랍니다. 
                    동의한 사항에 대해 언제든지 취소 또는 수정하여 WERT의 마케팅 커뮤니케이션 서비스를 받을 수 있습니다. 
                    이 작업을 수행하려면 WERT 이메일 마케팅 커뮤니케이션 페이지 하단의 옵트아웃 및 환경설정 메커니즘을 사용하거나{' '}
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                  className="w-4 h-4 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388] mt-0.5"
                  disabled={submitting}
                  required
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  개인정보 취급방침에 동의합니다 <span className="text-red-500">*</span>
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
