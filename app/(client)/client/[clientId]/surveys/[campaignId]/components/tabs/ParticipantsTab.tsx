'use client'

import { useState, useEffect } from 'react'

interface ParticipantsTabProps {
  campaignId: string
  entries: any[]
}

export default function ParticipantsTab({ campaignId, entries }: ParticipantsTabProps) {
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [localEntries, setLocalEntries] = useState<any[]>(entries)
  const [refreshingEntries, setRefreshingEntries] = useState(false)
  
  // entries가 변경되면 localEntries도 업데이트
  useEffect(() => {
    setLocalEntries(entries)
  }, [entries])
  
  const refreshEntries = async () => {
    setRefreshingEntries(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaignId}/entries`)
      const result = await response.json()
      
      if (result.success && result.entries) {
        setLocalEntries(result.entries)
      }
    } catch (error) {
      console.error('참여자 목록 새로고침 오류:', error)
    } finally {
      setRefreshingEntries(false)
    }
  }
  
  const handleEntryClick = (entry: any) => {
    setSelectedEntry(entry)
  }
  
  const closeModal = () => {
    setSelectedEntry(null)
  }

  const downloadCSV = () => {
    if (!localEntries || localEntries.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }
    
    // CSV 값 이스케이프 함수
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined || value === '') return ''
      const str = String(value)
      // 배열인 경우 세미콜론으로 구분된 문자열로 변환
      if (Array.isArray(value)) {
        return `"${value.join('; ').replace(/"/g, '""')}"`
      }
      // boolean인 경우 문자열로 변환
      if (typeof value === 'boolean') {
        return value ? '예' : '아니오'
      }
      // 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 두 개로
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    // 모든 registration_data 필드 수집 (동적 헤더 생성)
    const allFields = new Set<string>()
    localEntries.forEach((entry) => {
      const regData = entry.registration_data || {}
      Object.keys(regData).forEach((key) => {
        allFields.add(key)
      })
    })
    
    // 기본 헤더 정의
    const baseHeaders = [
      '완료번호',
      '확인코드',
      '이름',
      '이메일',
      '회사명',
      '전화번호',
      '완료일시',
      '마지막 로그인',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'UTM Term',
      'UTM Content',
      '마케팅 캠페인 링크 ID',
    ]
    
    // registration_data의 모든 필드를 헤더에 추가 (기본 필드 제외)
    const regDataFieldMap: Record<string, string> = {
      email: '이메일',
      name: '이름',
      company: '회사명',
      position: '직책',
      jobTitle: '직책',
      phone: '전화번호',
      phone_norm: '전화번호(정규화)',
      industry: '산업',
      address: '주소',
      country: '국가',
      interestedProducts: '관심제품',
      message: '메시지',
      phoneCountryCode: '전화번호 국가코드',
      privacyConsent: '개인정보 활용 동의',
      consentEmail: '이메일 수신 동의',
      consentPhone: '전화번호 수신 동의',
    }
    
    // 추가 필드 헤더 생성 (기본 필드에 없는 것만)
    const additionalHeaders: string[] = []
    allFields.forEach((field) => {
      if (!baseHeaders.some(h => regDataFieldMap[field] === h || field === h.toLowerCase())) {
        additionalHeaders.push(regDataFieldMap[field] || field)
      }
    })
    
    const headers = [...baseHeaders, ...additionalHeaders]
    
    // CSV 데이터 생성
    const csvRows = [
      headers.join(','),
      ...localEntries.map((entry) => {
        const regData = entry.registration_data || {}
        
        // 날짜 포맷팅
        const completedAt = entry.completed_at 
          ? new Date(entry.completed_at).toLocaleString('ko-KR', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : '-'
        
        const lastLoginAt = entry.last_login_at
          ? new Date(entry.last_login_at).toLocaleString('ko-KR', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : '-'
        
        // 기본 필드 값
        const baseValues = [
          escapeCSV(entry.survey_no || '-'),
          escapeCSV(entry.code6 || '-'),
          escapeCSV(entry.name || regData.name || '-'),
          escapeCSV(entry.registration_data?.email || regData.email || '-'),
          escapeCSV(regData.company || entry.company || '-'),
          escapeCSV(regData.phone || regData.phone_norm || entry.phone_norm || '-'),
          escapeCSV(completedAt),
          escapeCSV(lastLoginAt),
          escapeCSV(entry.utm_source || '-'),
          escapeCSV(entry.utm_medium || '-'),
          escapeCSV(entry.utm_campaign || '-'),
          escapeCSV(entry.utm_term || '-'),
          escapeCSV(entry.utm_content || '-'),
          escapeCSV(entry.marketing_campaign_link_id || '-'),
        ]
        
        // 추가 필드 값
        const additionalValues = additionalHeaders.map((header) => {
          // 헤더에서 원래 필드명 찾기
          const fieldName = Object.keys(regDataFieldMap).find(
            key => regDataFieldMap[key] === header
          ) || header.toLowerCase()
          return escapeCSV(regData[fieldName] || '-')
        })
        
        return [...baseValues, ...additionalValues].join(',')
      }),
    ]
    
    // CSV 문자열 생성
    const csvContent = csvRows.join('\n')
    
    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // 다운로드 링크 생성
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `참여자_목록_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // entries에 포함된 answers를 questions 형식으로 변환
  const getAnswersForEntry = (entry: any) => {
    if (!entry.answers || entry.answers.length === 0) {
      return []
    }
    
    return entry.answers.map((a: any) => ({
      id: a.questionId,
      order_no: a.orderNo,
      body: a.questionBody,
      type: a.questionType,
      answer: {
        text: a.answer !== '답변 없음' && a.questionType === 'text' ? a.answer : null,
        choices: a.answer !== '답변 없음' && (a.questionType === 'single' || a.questionType === 'multiple') 
          ? a.answer.split(', ').map((text: string) => ({ text }))
          : null,
      },
    }))
  }
  
  return (
    <>
      <div>
        {/* 헤더 및 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <div></div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              disabled={!localEntries || localEntries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              CSV 다운로드
            </button>
            <button
              onClick={refreshEntries}
              disabled={refreshingEntries}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className={`w-5 h-5 ${refreshingEntries ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshingEntries ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {localEntries && localEntries.length > 0 ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">확인코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전화번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료일시</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 로그인</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {localEntries.map((entry: any) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.survey_no}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.code6}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.name || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.registration_data?.email || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.company || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.phone_norm || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.completed_at ? new Date(entry.completed_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleEntryClick(entry)}
                    >
                      {entry.last_login_at ? new Date(entry.last_login_at).toLocaleString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-lg">아직 참여자가 없습니다</p>
          </div>
        )}
      </div>
      
      {/* 사용자 정보조회 모달 */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                사용자 정보조회
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">완료번호:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.survey_no || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">확인코드:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.code6 || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">이름:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.name || selectedEntry.registration_data?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">이메일:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.registration_data?.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">회사명:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.company || selectedEntry.registration_data?.company || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">직책:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.registration_data?.position || selectedEntry.registration_data?.jobTitle || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">전화번호:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.phone_norm || selectedEntry.registration_data?.phone || selectedEntry.registration_data?.phone_norm || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">완료일시:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {selectedEntry.completed_at ? new Date(selectedEntry.completed_at).toLocaleString('ko-KR') : '-'}
                      </span>
                    </div>
                    {selectedEntry.last_login_at && (
                      <div>
                        <span className="text-sm text-gray-600">마지막 로그인:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {new Date(selectedEntry.last_login_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* UTM 정보 */}
                {(selectedEntry.utm_source || selectedEntry.utm_medium || selectedEntry.utm_campaign) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">UTM 추적 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">UTM Source:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.utm_source || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">UTM Medium:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.utm_medium || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">UTM Campaign:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.utm_campaign || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">UTM Term:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.utm_term || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">UTM Content:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.utm_content || '-'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">마케팅 캠페인 링크 ID:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900 break-all">{selectedEntry.marketing_campaign_link_id || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 추가 등록 정보 */}
                {selectedEntry.registration_data && Object.keys(selectedEntry.registration_data).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">추가 등록 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedEntry.registration_data).map(([key, value]) => {
                        // 이미 기본 정보에 표시된 필드는 제외
                        const excludedKeys = ['name', 'email', 'company', 'position', 'jobTitle', 'phone', 'phone_norm']
                        if (excludedKeys.includes(key)) return null
                        
                        // 값 포맷팅
                        let displayValue: string = '-'
                        if (value === null || value === undefined) {
                          displayValue = '-'
                        } else if (typeof value === 'boolean') {
                          displayValue = value ? '예' : '아니오'
                        } else if (typeof value === 'object') {
                          displayValue = JSON.stringify(value, null, 2)
                        } else {
                          displayValue = String(value)
                        }
                        
                        // 필드명 한글 변환
                        const fieldNameMap: Record<string, string> = {
                          question: '질문',
                          department: '부서',
                          organization: '조직',
                          consentEmail: '이메일 수신 동의',
                          consentPhone: '전화번호 수신 동의',
                          privacyConsent: '개인정보 활용 동의',
                          phoneCountryCode: '전화번호 국가코드',
                          yearsOfExperience: '경력',
                          cid: 'CID',
                          interestedProducts: '관심제품',
                          address: '주소',
                          country: '국가',
                          message: '메시지',
                          industry: '산업',
                        }
                        
                        const displayKey = fieldNameMap[key] || key
                        
                        return (
                          <div key={key} className={typeof value === 'object' ? 'col-span-2' : ''}>
                            <span className="text-sm text-gray-600">{displayKey}:</span>
                            {typeof value === 'object' ? (
                              <div className="mt-1 bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                                {displayValue}
                              </div>
                            ) : (
                              <span className="ml-2 text-sm font-medium text-gray-900">{displayValue}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 설문 답변 (있는 경우만 표시) */}
                {(() => {
                  const questions = getAnswersForEntry(selectedEntry)
                  
                  if (questions.length > 0) {
                    return (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">설문 답변</h3>
                        <div className="space-y-6">
                          {questions.map((q: any, index: number) => (
                            <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start gap-2 mb-3">
                                <span className="text-sm font-medium text-gray-500">문항 {q.order_no}</span>
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                  {q.type === 'single' ? '단일 선택' : q.type === 'multiple' ? '다중 선택' : '텍스트'}
                                </span>
                              </div>
                              <h4 className="text-base font-semibold text-gray-900 mb-3">{q.body}</h4>
                              
                              {q.answer && (q.answer.text || (q.answer.choices && q.answer.choices.length > 0)) ? (
                                <div className="mt-3">
                                  {q.type === 'text' ? (
                                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
                                      {q.answer.text || '답변 없음'}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {q.answer.choices && q.answer.choices.length > 0 ? (
                                        q.answer.choices.map((choice: any, idx: number) => (
                                          <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-gray-700">
                                            {typeof choice === 'string' ? choice : choice.text || choice.id}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-sm text-gray-500">답변 없음</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 mt-3">답변 없음</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

