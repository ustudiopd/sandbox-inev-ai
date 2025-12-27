'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import SurveyForm from './SurveyForm'

interface SurveyPageProps {
  campaign: any
  baseUrl: string
}

export default function SurveyPage({ campaign, baseUrl }: SurveyPageProps) {
  const searchParams = useSearchParams()
  const isLookup = searchParams.get('lookup') === 'true'
  
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ survey_no: number; code6: string } | null>(null)
  const [lookupMode, setLookupMode] = useState(isLookup)
  const [lookupName, setLookupName] = useState('')
  const [lookupPhone1, setLookupPhone1] = useState('')
  const [lookupPhone2, setLookupPhone2] = useState('')
  const [lookupPhone3, setLookupPhone3] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  
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
        setLookupError(result.error || '참여 정보를 찾을 수 없습니다.')
        return
      }
      
      if (result.completed) {
        // 완료 페이지로 리다이렉트
        window.location.href = `${baseUrl}/event${campaign.public_path}/done?survey_no=${result.survey_no}&code6=${result.code6}`
      } else {
        setLookupError(result.message || '참여 정보를 찾을 수 없습니다.')
      }
    } catch (error: any) {
      console.error('참여 확인 오류:', error)
      setLookupError('참여 확인 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLookupLoading(false)
    }
  }
  
  if (submitted && result) {
    // 완료 페이지로 리다이렉트
    window.location.href = `${baseUrl}/event${campaign.public_path}/done?survey_no=${result.survey_no}&code6=${result.code6}`
    return null
  }
  
  // 참여 확인 모드
  if (lookupMode) {
    const headerImageUrl = 'https://yqsayphssjznthrxpgfb.supabase.co/storage/v1/object/public/webinar-thumbnails/hpe-booth-header.jpg'
    
    return (
      <div className="min-h-screen bg-white font-sans text-gray-900 pb-20">
        {/* 상단 배너 */}
        <div className="w-full bg-[#f8f9fa]">
          <div className="max-w-screen-xl mx-auto">
            <div className="relative w-full overflow-hidden flex justify-center">
              <img
                src={headerImageUrl}
                alt="이벤트 헤더"
                className="w-full h-auto max-w-[600px]"
                style={{ maxHeight: '300px' }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-[640px] mx-auto px-4 sm:px-5 py-6 sm:py-10">
          <div className="bg-gray-50 rounded-lg shadow-md p-5 sm:p-6 md:p-8">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900">
              참여 확인하기
            </h1>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
              설문 참여한 이름과 전화번호를 입력해주세요
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
                {lookupLoading ? '확인 중...' : '참여 확인하기'}
              </button>
              
              <button
                type="button"
                onClick={() => setLookupMode(false)}
                className="w-full px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm sm:text-base mt-2"
              >
                설문 참여하기로 돌아가기
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  // 일반 설문 모드
  return (
    <SurveyForm
      campaignId={campaign.id}
      formId={campaign.form_id}
      onSubmitted={handleSubmitted}
      publicPath={campaign.public_path}
    />
  )
}

