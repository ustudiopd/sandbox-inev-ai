'use client'

import { useState } from 'react'

interface ParticipantsTabProps {
  campaignId: string
  entries: any[]
}

export default function ParticipantsTab({ campaignId, entries }: ParticipantsTabProps) {
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  
  const handleEntryClick = (entry: any) => {
    setSelectedEntry(entry)
  }
  
  const closeModal = () => {
    setSelectedEntry(null)
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
        {entries && entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">확인코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전화번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료일시</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">스캔일시</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">경품</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry: any) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEntryClick(entry)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.survey_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.code6}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.phone_norm || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.completed_at ? new Date(entry.completed_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.verified_at ? new Date(entry.verified_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.prize_label || '-'}
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
      
      {/* 설문 답변 모달 */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                설문 답변 상세
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
              {/* 참여자 정보 */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">참여자 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">이름:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">회사명:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.company || '-'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">전화번호:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.phone_norm || '-'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">완료번호:</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{selectedEntry.survey_no}</span>
                  </div>
                </div>
              </div>
              
              {/* 설문 답변 */}
              {(() => {
                const questions = getAnswersForEntry(selectedEntry)
                
                if (questions.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <p>답변 데이터가 없습니다.</p>
                    </div>
                  )
                }
                
                return (
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
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

