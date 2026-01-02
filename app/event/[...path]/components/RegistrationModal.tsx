'use client'

import { useState } from 'react'

interface RegistrationModalProps {
  campaign: any
  baseUrl: string
  onClose: () => void
  onSuccess: (result: { survey_no: number; code6: string }) => void
}

export default function RegistrationModal({ campaign, baseUrl, onClose, onSuccess }: RegistrationModalProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 필수 필드 검증
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
    
    setSubmitting(true)
    setError(null)
    
    try {
      // 등록 페이지는 기본 정보만 제출 (설문조사 없이)
      const response = await fetch(`/api/public/event-survey/${campaign.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || null,
          phone: phone,
          phone_norm: phoneNorm,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '등록에 실패했습니다.')
      }
      
      onSuccess({
        survey_no: result.survey_no,
        code6: result.code6,
      })
    } catch (err: any) {
      console.error('등록 제출 오류:', err)
      setError(err.message || '등록 중 오류가 발생했습니다. 다시 시도해주세요.')
      setSubmitting(false)
    }
  }
  
  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* 모달 컨텐츠 */}
        <div
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 모달 헤더 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold text-gray-900">
              {campaign.title || '이벤트 등록'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold leading-none"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          
          {/* 모달 바디 */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                  placeholder="이름을 입력하세요"
                  disabled={submitting}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회사명
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2.5 border-b-2 border-gray-200 focus:border-[#00B388] outline-none transition-colors bg-white text-gray-900 text-base"
                  placeholder="회사명을 입력하세요 (선택사항)"
                  disabled={submitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
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
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-[#00B388] text-white rounded-lg hover:bg-[#008f6d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
