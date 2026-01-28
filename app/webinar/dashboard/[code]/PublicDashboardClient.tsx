'use client'

import { useState, useEffect } from 'react'

interface PublicDashboardClientProps {
  webinar: any
}

export default function PublicDashboardClient({ webinar }: PublicDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'participants'>('participants')
  
  // 참석자 명단 관련 상태
  const [participantEntries, setParticipantEntries] = useState<any[]>([])
  const [loadingParticipantEntries, setLoadingParticipantEntries] = useState(false)
  
  useEffect(() => {
    if (activeTab === 'participants') {
      loadParticipantEntries()
    }
  }, [webinar.id, activeTab])

  const loadParticipantEntries = async () => {
    setLoadingParticipantEntries(true)
    try {
      const response = await fetch(`/api/public/webinars/${webinar.id}/registrants`)
      const result = await response.json()
      
      if (result.success && result.registrants) {
        setParticipantEntries(result.registrants)
      }
    } catch (error) {
      console.error('참석자 명단 로드 오류:', error)
    } finally {
      setLoadingParticipantEntries(false)
    }
  }

  // 전화번호 마스킹 함수 (뒷자리 4개만 표시)
  const maskPhone = (phone: string | null | undefined): string => {
    if (!phone) return '-'
    const phoneNorm = phone.replace(/\D/g, '')
    if (phoneNorm.length >= 4) {
      return `****-****-${phoneNorm.slice(-4)}`
    }
    return phone
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {webinar.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">참여자 관리 대시보드</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 등록자</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {webinar.stats?.total_registrants || 0}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl shadow-lg mb-6 sm:mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('participants')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium border-b-2 transition-colors ${
                  activeTab === 'participants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                참여자 관리
              </button>
            </nav>
          </div>
        </div>

        {/* 참여자 관리 탭 */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
              참여자 목록
            </h2>

            {loadingParticipantEntries ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                참여자 목록을 불러오는 중...
              </div>
            ) : participantEntries.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-lg">아직 참여자가 없습니다</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          완료번호
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          확인코드
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          이름
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          회사명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          직책
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          전화번호
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          완료일시
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {participantEntries.map((entry: any) => {
                        const regData = entry.registration_data || {}
                        const phone = regData.phone || regData.phone_norm || entry.phone_norm
                        
                        return (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {entry.survey_no || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {entry.code6 || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {regData.company || entry.company || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {regData.position || regData.jobTitle || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {maskPhone(phone)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.registered_at
                                ? new Date(entry.registered_at).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
