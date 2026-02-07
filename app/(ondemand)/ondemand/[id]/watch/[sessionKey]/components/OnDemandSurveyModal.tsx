'use client'

import { useState, useEffect } from 'react'

/** 설문 문항 정의 (HPE 네트워크 설문) */
const SURVEY_QUESTIONS = [
  {
    key: 'q1',
    body: '현재 네트워크 프로젝트 계획이 있으시다면 언제입니까?',
    type: 'radio' as const,
    options: [
      { key: '1week', text: '1주일 이내' },
      { key: '1month', text: '1개월 이내' },
      { key: '1_3months', text: '1개월 - 3개월' },
      { key: '3_6months', text: '3개월 - 6개월' },
      { key: '6_12months', text: '6개월 - 12개월' },
      { key: '1year_plus', text: '1년 이후' },
      { key: 'no_plan', text: '계획없음' },
    ],
  },
  {
    key: 'q2',
    body: '향후 네트워크 프로젝트 계획이 있으시다면, 다음 중 어떤 영역에 해당합니까?',
    type: 'checkbox' as const,
    options: [
      { key: 'datacenter', text: '데이터 센터 (AI 데이터 센터, 데이터 센터 자동화 등)' },
      { key: 'campus', text: '유무선 캠퍼스 & 브랜치 네트워크' },
      { key: 'routing', text: '엔터프라이즈 라우팅 (SD-WAN 포함)' },
      { key: 'security', text: '네트워크 보안' },
      { key: 'none', text: '해당 없음' },
    ],
  },
  {
    key: 'q3',
    body: '해당 프로젝트에 대한 예산은 이미 확보되어 있습니까?',
    type: 'radio' as const,
    options: [
      { key: 'yes', text: '예' },
      { key: 'no', text: '아니오' },
    ],
  },
  {
    key: 'q4',
    body: '예정된 프로젝트에서 귀하의 역할은 의사결정 권한이 있는 구매 담당자(Authorized Buyer)입니까?',
    type: 'radio' as const,
    options: [
      { key: 'yes', text: '예' },
      { key: 'no', text: '아니오' },
    ],
  },
  {
    key: 'q5',
    body: 'HPE의 네트워크 솔루션에 대해 보다 더 자세한 내용을 들어 보실 의향이 있으십니까?',
    type: 'radio' as const,
    options: [
      { key: 'visit', text: 'HPE 네트워크 전문가의 방문 요청' },
      { key: 'online', text: 'HPE 네트워크 전문가의 온라인 미팅 요청' },
      { key: 'phone', text: 'HPE 네트워크 전문가의 전화 상담 요청' },
      { key: 'no_interest', text: '관심 없음' },
    ],
  },
] as const

interface OnDemandSurveyModalProps {
  open: boolean
  onClose: () => void
  webinarIdOrSlug: string
  onSuccess?: (data: { survey_no: number; code6: string }) => void
}

export default function OnDemandSurveyModal({
  open,
  onClose,
  webinarIdOrSlug,
  onSuccess,
}: OnDemandSurveyModalProps) {
  // 체크박스는 배열로, 라디오는 문자열로 저장
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const handleAnswerChange = (questionKey: string, optionKey: string, isCheckbox: boolean) => {
    if (isCheckbox) {
      setAnswers((prev) => {
        const current = (prev[questionKey] as string[]) || []
        const newValue = current.includes(optionKey)
          ? current.filter((k) => k !== optionKey)
          : [...current, optionKey]
        return { ...prev, [questionKey]: newValue }
      })
    } else {
      setAnswers((prev) => ({ ...prev, [questionKey]: optionKey }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // 모든 문항 답변 확인
    const missing = SURVEY_QUESTIONS.filter((q) => {
      const answer = answers[q.key]
      if (q.type === 'checkbox') {
        return !answer || (Array.isArray(answer) && answer.length === 0)
      } else {
        return !answer || answer === ''
      }
    })
    
    if (missing.length > 0) {
      setError('모든 설문 문항에 답해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      // 체크박스는 배열을 문자열로 변환 (쉼표로 구분)
      const formattedAnswers = SURVEY_QUESTIONS.map((q) => {
        const answer = answers[q.key]
        if (q.type === 'checkbox' && Array.isArray(answer)) {
          return {
            questionKey: q.key,
            choiceKey: answer.join(','), // 다중 선택을 쉼표로 구분
          }
        } else {
          return {
            questionKey: q.key,
            choiceKey: answer as string,
          }
        }
      })

      const res = await fetch(`/api/public/ondemand/${webinarIdOrSlug}/survey/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // 빈 문자열로 전송 (API에서 선택적으로 처리)
          phone: '', // 빈 문자열로 전송 (API에서 선택적으로 처리)
          answers: formattedAnswers,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '제출에 실패했습니다.')
        return
      }
      if (data.alreadySubmitted) {
        // 이미 제출된 경우 모달 닫고 팝업만 표시
        if (onSuccess) {
          onSuccess({ survey_no: data.survey_no, code6: data.code6 })
          onClose()
        }
        return
      }
      // 새로 제출한 경우 모달 닫고 팝업만 표시
      if (onSuccess) {
        onSuccess({ survey_no: data.survey_no, code6: data.code6 })
        onClose()
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 모달이 열릴 때 설문 제출 여부 확인 (페이지 로딩 시 이미 확인했지만, 혹시 모를 경우를 대비)
  useEffect(() => {
    if (open) {
      checkSubmissionStatus()
    }
  }, [open])

  const checkSubmissionStatus = async () => {
    setChecking(true)
    try {
      const res = await fetch(`/api/public/ondemand/${webinarIdOrSlug}/survey/check`)
      const data = await res.json()
      
      if (data.submitted && data.survey_no && data.code6) {
        // 이미 제출된 경우 모달 닫고 팝업만 표시
        if (onSuccess) {
          onSuccess({ survey_no: data.survey_no, code6: data.code6 })
          // 모달 즉시 닫기
          onClose()
        }
      }
    } catch (err) {
      // 확인 실패해도 설문 제출은 가능하도록 에러 무시
      console.error('설문 제출 여부 확인 오류:', err)
    } finally {
      setChecking(false)
    }
  }

  const handleClose = () => {
    setAnswers({})
    setError(null)
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

        <div className="p-4 pb-6 min-h-[400px]">
          {checking ? (
            <div className="text-center py-8 h-full flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-600">확인 중...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500"><span className="text-red-500">*</span> 필수 항목</p>

              {SURVEY_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p className="text-sm font-medium mb-2 text-gray-900">{q.body} <span className="text-red-500">*</span></p>
                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const isCheckbox = q.type === 'checkbox'
                      const isChecked = isCheckbox
                        ? (answers[q.key] as string[])?.includes(opt.key) || false
                        : answers[q.key] === opt.key
                      
                      return (
                        <label key={opt.key} className="flex items-center gap-2 cursor-pointer text-gray-700">
                          <input
                            type={isCheckbox ? 'checkbox' : 'radio'}
                            name={q.key}
                            checked={isChecked}
                            onChange={() => handleAnswerChange(q.key, opt.key, isCheckbox)}
                            className={isCheckbox 
                              ? "rounded border-gray-400 text-emerald-500 focus:ring-emerald-500"
                              : "rounded-full border-gray-400 text-emerald-500 focus:ring-emerald-500"
                            }
                          />
                          <span className="text-sm">{opt.text}</span>
                        </label>
                      )
                    })}
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
