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
  registration_data?: any
  company?: string | null
  phone_norm?: string | null
  survey_no?: number | null
  code6?: string | null
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
  
  const downloadCSV = () => {
    if (!registrants || registrants.length === 0) {
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
    registrants.forEach((registrant) => {
      const regData = registrant.registration_data || {}
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
      '직책',
      '전화번호',
      '산업',
      '주소',
      '국가',
      '관심제품',
      '메시지',
      '완료일시',
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
      ...registrants.map((registrant) => {
        const regData = registrant.registration_data || {}
        
        // 날짜 포맷팅
        const completedAt = registrant.registered_at 
          ? new Date(registrant.registered_at).toLocaleString('ko-KR', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : '-'
        
        // 기본 필드 값
        const baseValues = [
          escapeCSV(registrant.survey_no || '-'),
          escapeCSV(registrant.code6 || '-'),
          escapeCSV(registrant.name || regData.name || '-'),
          escapeCSV(registrant.email || regData.email || '-'),
          escapeCSV(regData.company || registrant.company || '-'),
          escapeCSV(regData.position || regData.jobTitle || '-'),
          escapeCSV(regData.phone || regData.phone_norm || registrant.phone_norm || '-'),
          escapeCSV(regData.industry || '-'),
          escapeCSV(regData.address || '-'),
          escapeCSV(regData.country || '-'),
          escapeCSV(regData.interestedProducts || '-'),
          escapeCSV(regData.message || '-'),
          escapeCSV(completedAt),
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
    link.download = `웨비나_참여자_목록_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  const roleNames: Record<string, string> = {
    attendee: '참가자',
    host: '호스트',
    moderator: '모더레이터',
    관리자: '관리자',
    운영자: '운영자',
    분석가: '분석가',
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
        {/* 헤더 및 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <div></div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              disabled={!registrants || registrants.length === 0}
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
        </div>

        {registrants && registrants.length > 0 ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">확인코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">직책</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전화번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료일시</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrants.map((registrant) => {
                  const regData = registrant.registration_data || {}
                  return (
                    <tr 
                      key={registrant.id} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {registrant.survey_no || '-'}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {registrant.code6 || '-'}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {registrant.name || '-'}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {regData.company || registrant.company || '-'}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {regData.position || regData.jobTitle || '-'}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {regData.phone || regData.phone_norm || registrant.phone_norm || '-'}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleRegistrantClick(registrant)}
                      >
                        {registrant.registered_at ? new Date(registrant.registered_at).toLocaleString('ko-KR') : '-'}
                      </td>
                    </tr>
                  )
                })}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
