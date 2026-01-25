'use client'

import { useState, useEffect } from 'react'

interface ParticipantsTabProps {
  webinarId: string
}

interface Registrant {
  id: string
  name: string
  email: string | null
  role: string
  registered_via: string | null
  registered_at: string
  last_login_at: string | null
  source?: 'webinar' | 'registration'
}

export default function ParticipantsTab({ webinarId }: ParticipantsTabProps) {
  const [registrants, setRegistrants] = useState<Registrant[]>([])
  const [selectedRegistrant, setSelectedRegistrant] = useState<Registrant | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  useEffect(() => {
    fetchRegistrants()
  }, [webinarId])
  
  const fetchRegistrants = async () => {
    try {
      const response = await fetch(`/api/webinars/${webinarId}/registrants`)
      const result = await response.json()
      
      if (result.success && result.registrants) {
        setRegistrants(result.registrants)
      }
    } catch (error) {
      console.error('참여자 목록 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const refreshRegistrants = async () => {
    setRefreshing(true)
    try {
      await fetchRegistrants()
    } finally {
      setRefreshing(false)
    }
  }
  
  const handleRegistrantClick = (registrant: Registrant) => {
    setSelectedRegistrant(registrant)
  }
  
  const closeModal = () => {
    setSelectedRegistrant(null)
  }
  
  const roleNames: Record<string, string> = {
    attendee: '참가자',
    host: '호스트',
    moderator: '모더레이터',
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return (
    <>
      <div>
        {/* 헤더 및 새로고침 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <div></div>
          <button
            onClick={refreshRegistrants}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
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
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {registrants && registrants.length > 0 ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일시</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록 출처</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 로그인</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrants.map((registrant) => (
                  <tr 
                    key={registrant.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                      onClick={() => handleRegistrantClick(registrant)}
                    >
                      {registrant.name}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleRegistrantClick(registrant)}
                    >
                      {registrant.email || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleRegistrantClick(registrant)}
                    >
                      {roleNames[registrant.role] || registrant.role}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleRegistrantClick(registrant)}
                    >
                      {registrant.registered_at ? new Date(registrant.registered_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleRegistrantClick(registrant)}
                    >
                      {registrant.registered_via === 'registration_page' ? '등록 페이지' : 
                       registrant.registered_via === 'webinar' ? '웨비나 직접' : 
                       registrant.registered_via || '-'}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleRegistrantClick(registrant)}
                    >
                      {registrant.last_login_at ? new Date(registrant.last_login_at).toLocaleString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-lg">아직 참여자가 없습니다</p>
          </div>
        )}
      </div>
      
      {/* 참여자 상세 모달 */}
      {selectedRegistrant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                참여자 정보
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
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">이름:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">{selectedRegistrant.name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">이메일:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">{selectedRegistrant.email || '-'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">역할:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {roleNames[selectedRegistrant.role] || selectedRegistrant.role}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">등록일시:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {selectedRegistrant.registered_at ? new Date(selectedRegistrant.registered_at).toLocaleString('ko-KR') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">등록 출처:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {selectedRegistrant.registered_via === 'registration_page' ? '등록 페이지' : 
                     selectedRegistrant.registered_via === 'webinar' ? '웨비나 직접' : 
                     selectedRegistrant.registered_via || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">마지막 로그인:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {selectedRegistrant.last_login_at ? new Date(selectedRegistrant.last_login_at).toLocaleString('ko-KR') : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
