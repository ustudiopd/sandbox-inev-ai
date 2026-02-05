'use client'

import { useState } from 'react'

/** 설문 문항 정의 (HPE 데이터센터 설문) */
const SURVEY_QUESTIONS = [
  {
    key: 'q1',
    body: '행사 전 HPE 데이터센터 솔루션에 대한 인지도는 어느 정도 였습니까?',
    options: [
      { key: 'none', text: '전혀 모름' },
      { key: 'heard', text: '들어본 적 있는 정도' },
      { key: 'interested', text: '관심 있는 정도' },
      { key: 'well_known', text: '매우 잘 알고 있는 정도' },
    ],
  },
  {
    key: 'q2',
    body: '현재 데이터센터 네트워크 프로젝트 계획이 있으시다면 언제입니까?',
    options: [
      { key: '6m', text: '계획 있음 (6개월 내)' },
      { key: '6m_1y', text: '계획 있음 (6개월 ~ 1년 이내)' },
      { key: '1y_plus', text: '계획 있음 (1년 이후)' },
      { key: 'no', text: '계획 없음' },
    ],
  },
  {
    key: 'q3',
    body: '데이터센터 외 네트워크 프로젝트 계획이 있으시다면 어떤 것입니까?',
    options: [
      { key: 'campus', text: '유무선 캠퍼스 & 브랜치 네트워크' },
      { key: 'routing', text: '엔터프라이즈 라우팅 (SD-WAN 포함)' },
      { key: 'security', text: '네트워크 보안' },
      { key: 'none', text: '해당 없음' },
    ],
  },
  {
    key: 'q4',
    body: '다음 중 데이터센터 네트워크 중 특별히 관심 있으신 분야는 어디입니까?',
    options: [
      { key: 'ai_fabric', text: 'AI 데이터센터 (RoCEv2 지원 패브릭)' },
      { key: 'aiops', text: '데이터센터를 위한 AIOps' },
      { key: 'automation', text: '데이터센터 네트워크 자동화' },
      { key: 'hardware', text: '데이터센터용 고성능 하드웨어 (스위칭, 라우팅)' },
      { key: 'zero_trust', text: '제로 트러스트 데이터센터 (보안)' },
      { key: 'none', text: '관심 없음' },
    ],
  },
  {
    key: 'q5',
    body: 'HPE의 데이터센터 네트워크 솔루션에 대해 보다 더 자세한 내용을 들어 보실 의향이 있으십니까?',
    options: [
      { key: 'visit', text: 'HPE 혹은 HPE 파트너의 방문 요청' },
      { key: 'online', text: 'HPE 혹은 HPE 파트너의 온라인 미팅 요청' },
      { key: 'phone', text: 'HPE 혹은 HPE 파트너의 전화 상담 요청' },
      { key: 'none', text: '관심 없음' },
    ],
  },
] as const

interface OnDemandSurveyModalProps {
  open: boolean
  onClose: () => void
  webinarIdOrSlug: string
}

export default function OnDemandSurveyModal({
  open,
  onClose,
  webinarIdOrSlug,
}: OnDemandSurveyModalProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ survey_no: number; code6: string } | null>(null)

  const handlePhoneChange = (part: 'phone1' | 'phone2' | 'phone3', value: string) => {
    const num = value.replace(/[^0-9]/g, '')
    if (part === 'phone1') setPhone1(num)
    else if (part === 'phone2' && num.length <= 4) setPhone2(num)
    else if (part === 'phone3' && num.length <= 4) setPhone3(num)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    if (!company.trim()) {
      setError('회사명을 입력해 주세요.')
      return
    }
    if (!phone2.trim() || !phone3.trim()) {
      setError('휴대폰 번호를 모두 입력해 주세요.')
      return
    }
    const missing = SURVEY_QUESTIONS.filter((q) => !answers[q.key])
    if (missing.length > 0) {
      setError('모든 설문 문항에 답해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      const phone = `${phone1}-${phone2}-${phone3}`
      const res = await fetch(`/api/public/ondemand/${webinarIdOrSlug}/survey/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || undefined,
          phone,
          answers: SURVEY_QUESTIONS.map((q) => ({
            questionKey: q.key,
            choiceKey: answers[q.key],
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '제출에 실패했습니다.')
        return
      }
      if (data.alreadySubmitted) {
        setSuccess({ survey_no: data.survey_no, code6: data.code6 })
        return
      }
      setSuccess({ survey_no: data.survey_no, code6: data.code6 })
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setCompany('')
    setPhone1('010')
    setPhone2('')
    setPhone3('')
    setAnswers({})
    setError(null)
    setSuccess(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white text-gray-900 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">설문조사</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 pb-6">
          {success ? (
            <div className="text-center py-8">
              <p className="text-emerald-600 font-medium mb-2">설문이 제출되었습니다.</p>
              <p className="text-sm text-gray-600 mb-4">
                참여 번호: {success.survey_no} / 코드: {success.code6}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                닫기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500"><span className="text-red-500">*</span> 필수 항목</p>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
                  placeholder="이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">회사명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
                  placeholder="회사명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">휴대폰 번호 <span className="text-red-500">*</span></label>
                <div className="flex gap-1">
                  <input
                    type="tel"
                    value={phone1}
                    onChange={(e) => handlePhoneChange('phone1', e.target.value)}
                    className="w-14 rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-900 text-center"
                  />
                  <span className="self-center text-gray-400">-</span>
                  <input
                    type="tel"
                    value={phone2}
                    onChange={(e) => handlePhoneChange('phone2', e.target.value)}
                    className="flex-1 max-w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-900 text-center"
                    maxLength={4}
                  />
                  <span className="self-center text-gray-400">-</span>
                  <input
                    type="tel"
                    value={phone3}
                    onChange={(e) => handlePhoneChange('phone3', e.target.value)}
                    className="flex-1 max-w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-900 text-center"
                    maxLength={4}
                  />
                </div>
              </div>

              {SURVEY_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p className="text-sm font-medium mb-2 text-gray-900">{q.body} <span className="text-red-500">*</span></p>
                  <div className="space-y-1.5">
                    {q.options.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={q.key}
                          checked={answers[q.key] === opt.key}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.key]: opt.key }))}
                          className="rounded-full border-gray-400 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {submitting ? '제출 중...' : '제출'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
