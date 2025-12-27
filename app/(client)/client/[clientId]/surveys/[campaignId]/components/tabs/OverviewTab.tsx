'use client'

import { useState, useEffect } from 'react'

interface OverviewTabProps {
  campaign: any
  onCampaignUpdate?: (campaign: any) => void
}

export default function OverviewTab({ campaign, onCampaignUpdate }: OverviewTabProps) {
  const [updating, setUpdating] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [allEntries, setAllEntries] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [questionStats, setQuestionStats] = useState<any[]>([])
  
  // 참여자 데이터 및 통계 로드
  useEffect(() => {
    loadAllEntries()
    loadQuestionStats()
  }, [campaign.id])
  
  const loadAllEntries = async () => {
    setLoadingEntries(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/entries`)
      const result = await response.json()
      
      if (result.success && result.entries) {
        setAllEntries(result.entries)
      }
    } catch (error) {
      console.error('참여자 데이터 로드 오류:', error)
    } finally {
      setLoadingEntries(false)
    }
  }
  
  const loadQuestionStats = async () => {
    if (!campaign.form_id) return
    
    setLoadingStats(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/question-stats`)
      const result = await response.json()
      
      if (result.success && result.questionStats) {
        setQuestionStats(result.questionStats)
      }
    } catch (error) {
      console.error('문항별 통계 로드 오류:', error)
    } finally {
      setLoadingStats(false)
    }
  }
  
  // CSV 다운로드
  const handleDownloadCSV = () => {
    if (allEntries.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }
    
    // CSV 헤더
    const headers = [
      '순번',
      '확인코드',
      '이름',
      '회사명',
      '전화번호',
      '완료일시',
      '스캔일시',
      '경품명',
    ]
    
    // CSV 데이터 행
    const rows = allEntries.map((entry: any) => [
      entry.survey_no || '',
      entry.code6 || '',
      entry.name || '',
      entry.company || '',
      entry.phone_norm || '',
      entry.completed_at ? new Date(entry.completed_at).toLocaleString('ko-KR') : '',
      entry.verified_at ? new Date(entry.verified_at).toLocaleString('ko-KR') : '',
      entry.prize_label || '',
    ])
    
    // CSV 내용 생성
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    // BOM 추가 (한글 깨짐 방지)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${campaign.title || '설문조사'}_참여자_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }
  
  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'closed') => {
    if (!confirm(`정말 상태를 "${newStatus === 'published' ? '발행됨' : newStatus === 'closed' ? '종료됨' : '초안'}"으로 변경하시겠습니까?`)) {
      return
    }
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: '상태 변경 실패' }))
        throw new Error(result.error || '상태 변경 실패')
      }
      
      const result = await response.json()
      
      if (result.success && result.campaign && onCampaignUpdate) {
        onCampaignUpdate(result.campaign)
        alert('상태가 성공적으로 변경되었습니다')
      }
    } catch (error: any) {
      console.error('상태 변경 오류:', error)
      alert(error.message || '상태 변경 중 오류가 발생했습니다')
    } finally {
      setUpdating(false)
    }
  }
  
  return (
    <div>
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-600 mb-2">총 완료 수</div>
          <div className="text-3xl font-bold text-purple-600">{campaign.stats?.total_completed || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-600 mb-2">스캔 수</div>
          <div className="text-3xl font-bold text-blue-600">{campaign.stats?.total_verified || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-600 mb-2">경품 기록 수</div>
          <div className="text-3xl font-bold text-green-600">{campaign.stats?.total_prize_recorded || 0}</div>
        </div>
      </div>
      
      {/* 상세 통계 및 다운로드 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">설문 통계</h3>
          <button
            onClick={handleDownloadCSV}
            disabled={loadingEntries || allEntries.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loadingEntries ? '로딩 중...' : 'CSV 다운로드'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">총 참여자</div>
            <div className="text-2xl font-bold text-gray-900">{campaign.stats?.total_completed || 0}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">스캔 완료</div>
            <div className="text-2xl font-bold text-blue-600">{campaign.stats?.total_verified || 0}</div>
            {campaign.stats?.total_completed > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                ({((campaign.stats?.total_verified || 0) / campaign.stats.total_completed * 100).toFixed(1)}%)
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">경품 기록</div>
            <div className="text-2xl font-bold text-green-600">{campaign.stats?.total_prize_recorded || 0}</div>
            {campaign.stats?.total_completed > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                ({((campaign.stats?.total_prize_recorded || 0) / campaign.stats.total_completed * 100).toFixed(1)}%)
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">미스캔</div>
            <div className="text-2xl font-bold text-orange-600">
              {(campaign.stats?.total_completed || 0) - (campaign.stats?.total_verified || 0)}
            </div>
            {campaign.stats?.total_completed > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                ({(((campaign.stats?.total_completed || 0) - (campaign.stats?.total_verified || 0)) / campaign.stats.total_completed * 100).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>
        
        {allEntries.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            총 {allEntries.length}명의 참여자 데이터를 다운로드할 수 있습니다.
          </div>
        )}
      </div>
      
      {/* 문항별 통계 */}
      {campaign.form_id && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">문항별 통계</h3>
          
          {loadingStats ? (
            <div className="text-center py-8 text-gray-500">통계를 불러오는 중...</div>
          ) : questionStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>아직 응답이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questionStats.map((stat, index) => (
                <div key={stat.questionId} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">문항 {stat.orderNo}</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {stat.questionType === 'single' ? '단일 선택' : stat.questionType === 'multiple' ? '다중 선택' : '텍스트'}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-gray-900">{stat.questionBody}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          총 {stat.totalAnswers}명 응답
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {stat.questionType === 'text' ? (
                    // 텍스트 문항: 응답 목록
                    <div className="mt-4">
                      {stat.textAnswers.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {stat.textAnswers.map((answer: string, idx: number) => (
                            <div key={idx} className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                              {answer}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">응답이 없습니다.</p>
                      )}
                    </div>
                  ) : (
                    // 선택형 문항: 선택지별 분포
                    <div className="mt-4">
                      {stat.options && stat.options.length > 0 ? (
                        <div className="space-y-3">
                          {stat.options.map((option: any) => {
                            const optionId = typeof option === 'string' ? option : option.id
                            const optionText = typeof option === 'string' ? option : option.text
                            const count = stat.choiceDistribution[optionId] || 0
                            const percentage = stat.totalAnswers > 0 
                              ? ((count / stat.totalAnswers) * 100).toFixed(1) 
                              : '0.0'
                            
                            return (
                              <div key={optionId} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{optionText}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">{count}명</span>
                                    <span className="text-gray-500">({percentage}%)</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">선택지가 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 캠페인 정보 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-700">상태:</span>
          <span className={`px-3 py-1 rounded-full text-sm ${
            campaign.status === 'published' 
              ? 'bg-green-100 text-green-800' 
              : campaign.status === 'closed'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {campaign.status === 'published' ? '발행됨' : campaign.status === 'closed' ? '종료됨' : '초안'}
          </span>
          {campaign.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={updating}
              className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              발행하기
            </button>
          )}
          {campaign.status === 'published' && (
            <button
              onClick={() => handleStatusChange('closed')}
              disabled={updating}
              className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              종료하기
            </button>
          )}
          {campaign.status === 'closed' && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={updating}
              className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              재발행하기
            </button>
          )}
        </div>
        {campaign.host && (
          <div>
            <span className="font-medium text-gray-700">호스트:</span> {campaign.host}
          </div>
        )}
        {campaign.forms && (
          <div>
            <span className="font-medium text-gray-700">연결된 폼:</span> {campaign.forms.title}
          </div>
        )}
        <div>
          <span className="font-medium text-gray-700">생성일:</span>{' '}
          {new Date(campaign.created_at).toLocaleString('ko-KR')}
        </div>
        {campaign.updated_at && (
          <div>
            <span className="font-medium text-gray-700">수정일:</span>{' '}
            {new Date(campaign.updated_at).toLocaleString('ko-KR')}
          </div>
        )}
      </div>
    </div>
  )
}

