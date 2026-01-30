'use client'

import { useState, useEffect } from 'react'
import {
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

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
  const [generatingSample, setGeneratingSample] = useState(false)
  const [deletingData, setDeletingData] = useState(false)
  
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
  
  // 샘플 데이터 생성
  const handleGenerateSampleData = async () => {
    const clearExisting = confirm('기존 설문 참여 데이터를 모두 삭제하고 새로 생성하시겠습니까?\n\n취소하면 기존 데이터는 유지하고 추가로 생성합니다.')
    
    if (!confirm('50명의 샘플 설문 데이터를 생성하시겠습니까?\n\n(이름, 전화번호, 설문 답변만 생성됩니다)')) {
      return
    }
    
    setGeneratingSample(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/generate-sample-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 50, clearExisting: clearExisting }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '샘플 데이터 생성 실패')
      }
      
      alert(`성공적으로 ${result.created?.entries || 50}개의 샘플 데이터를 생성했습니다.\n페이지를 새로고침하여 최신 데이터를 확인합니다.`)
      
      // DB 반영 시간 확보를 위해 약간의 지연 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error: any) {
      console.error('샘플 데이터 생성 오류:', error)
      alert(error.message || '샘플 데이터 생성에 실패했습니다')
    } finally {
      setGeneratingSample(false)
    }
  }
  
  // 설문 데이터 삭제
  const handleDeleteAllData = async () => {
    if (!confirm('⚠️ 경고: 모든 설문 참여 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }
    
    if (!confirm('정말로 모든 데이터를 삭제하시겠습니까?\n\n- 참여자 정보\n- 설문 답변\n- 스캔 기록\n- 경품 기록\n\n모두 삭제됩니다.')) {
      return
    }
    
    setDeletingData(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/generate-sample-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 0, clearExisting: true }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '데이터 삭제 실패')
      }
      
      alert('모든 설문 참여 데이터가 삭제되었습니다.')
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
    } catch (error: any) {
      console.error('데이터 삭제 오류:', error)
      alert(error.message || '데이터 삭제에 실패했습니다')
    } finally {
      setDeletingData(false)
    }
  }
  
  // CSV 다운로드
  const handleDownloadCSV = () => {
    if (allEntries.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }
    
    // 문항 정보 가져오기 (헤더 생성용)
    const questions = questionStats.length > 0 
      ? questionStats.map((stat: any) => ({
          id: stat.questionId,
          body: stat.questionBody,
          orderNo: stat.orderNo,
        }))
      : []
    
    // CSV 헤더 생성 - 기본 필드
    const baseHeaders = [
      '순번',
      '확인코드',
      '이름',
      '회사명',
      '전화번호',
      '완료일시',
      '스캔일시',
      '경품명',
      '경품기록일시',
      '생성일시',
    ]
    
    // registration_data 필드 헤더
    const registrationHeaders = [
      '이메일',
      '직책',
      '부서',
      '조직명',
      '경력',
      '질문/메시지',
      '전화번호국가코드',
      '이메일수신동의',
      '전화수신동의',
      '개인정보동의',
    ]
    
    // consent_data 필드 헤더
    const consentHeaders = [
      '개인정보공유동의',
      '개인정보취급위탁동의',
      '전화이메일SMS수신동의',
      '동의일시',
    ]
    
    // UTM 추적 필드 헤더
    const utmHeaders = [
      'UTM_Source',
      'UTM_Medium',
      'UTM_Campaign',
      'UTM_Term',
      'UTM_Content',
      'UTM_Referrer',
      'UTM_최초방문일시',
      '마케팅캠페인링크ID',
    ]
    
    // 추가 필드
    const additionalHeaders = [
      '마지막로그인일시',
    ]
    
    // 문항별 헤더 추가
    const questionHeaders = questions
      .sort((a: any, b: any) => a.orderNo - b.orderNo)
      .map((q: any) => `문항 ${q.orderNo}: ${q.body}`)
    
    const headers = [
      ...baseHeaders,
      ...registrationHeaders,
      ...consentHeaders,
      ...utmHeaders,
      ...additionalHeaders,
      ...questionHeaders
    ]
    
    // CSV 데이터 행 생성
    const rows = allEntries.map((entry: any) => {
      // 기본 필드
      const baseRow = [
        entry.survey_no || '',
        entry.code6 || '',
        entry.name || '',
        entry.company || '',
        entry.phone_norm || '',
        entry.completed_at ? new Date(entry.completed_at).toLocaleString('ko-KR') : '',
        entry.verified_at ? new Date(entry.verified_at).toLocaleString('ko-KR') : '',
        entry.prize_label || '',
        entry.prize_recorded_at ? new Date(entry.prize_recorded_at).toLocaleString('ko-KR') : '',
        entry.created_at ? new Date(entry.created_at).toLocaleString('ko-KR') : '',
      ]
      
      // registration_data 필드
      const registrationData = entry.registration_data || {}
      const registrationRow = [
        registrationData.email || '',
        registrationData.position || registrationData.jobTitle || '',
        registrationData.department || '',
        registrationData.organization || '',
        registrationData.yearsOfExperience || '',
        registrationData.question || registrationData.message || '', // question 또는 message 필드 확인
        registrationData.phoneCountryCode || '',
        registrationData.consentEmail ? '동의' : (registrationData.consentEmail === false ? '비동의' : ''),
        registrationData.consentPhone ? '동의' : (registrationData.consentPhone === false ? '비동의' : ''),
        registrationData.privacyConsent ? '동의' : (registrationData.privacyConsent === false ? '비동의' : ''),
      ]
      
      // consent_data 필드
      const consentData = entry.consent_data || {}
      const consentRow = [
        consentData.consent1 ? '동의' : (consentData.consent1 === false ? '비동의' : ''),
        consentData.consent2 ? '동의' : (consentData.consent2 === false ? '비동의' : ''),
        consentData.consent3 ? '동의' : (consentData.consent3 === false ? '비동의' : ''),
        consentData.consented_at ? new Date(consentData.consented_at).toLocaleString('ko-KR') : '',
      ]
      
      // UTM 필드
      const utmRow = [
        entry.utm_source || '',
        entry.utm_medium || '',
        entry.utm_campaign || '',
        entry.utm_term || '',
        entry.utm_content || '',
        entry.utm_referrer || '',
        entry.utm_first_visit_at ? new Date(entry.utm_first_visit_at).toLocaleString('ko-KR') : '',
        entry.marketing_campaign_link_id || '',
      ]
      
      // 추가 필드
      const additionalRow = [
        entry.last_login_at ? new Date(entry.last_login_at).toLocaleString('ko-KR') : '',
      ]
      
      // 문항별 답변 추가 (entries에 이미 answers가 포함되어 있음)
      const answerMap = new Map(
        (entry.answers || []).map((a: any) => [a.questionId, a.answer])
      )
      
      const answerRow = questions
        .sort((a: any, b: any) => a.orderNo - b.orderNo)
        .map((q: any) => answerMap.get(q.id) || '답변 없음')
      
      return [
        ...baseRow,
        ...registrationRow,
        ...consentRow,
        ...utmRow,
        ...additionalRow,
        ...answerRow
      ]
    })
    
    // CSV 내용 생성
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    // BOM 추가 (한글 깨짐 방지)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${campaign.title || '설문조사'}_참여자_전체데이터_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }
  
  // 문항별 차트 렌더링 함수
  const renderQuestionChart = (stat: any) => {
    // 차트 데이터 준비
    const chartData = stat.options.map((option: any) => {
      const optionId = typeof option === 'string' ? option : option.id
      const optionText = typeof option === 'string' ? option : option.text
      const count = stat.choiceDistribution[optionId] || 0
      const percentage = stat.totalAnswers > 0 
        ? ((count / stat.totalAnswers) * 100) 
        : 0
      
      return {
        name: optionText,
        value: count,
        percentage: percentage,
        fill: getColorForOption(stat.orderNo, optionText, stat.options.length),
      }
    })
    
    // 모든 문항: Donut Chart (통일된 스타일)
    // 문항 3은 높은 가치부터 정렬
    const displayData = stat.orderNo === 3 
      ? [...chartData].sort((a, b) => b.value - a.value)
      : chartData
    
    return (
      <div className="w-full">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
            >
              {displayData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value}명 (${props.payload.percentage.toFixed(1)}%)`,
                props.payload.name
              ]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '12px' }}
            />
            <Legend
              verticalAlign="bottom"
              height={50}
              formatter={(value, entry: any) => `${entry.payload.name}: ${entry.payload.value}명`}
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
    
    // 기본: 막대 그래프
    return (
      <div className="space-y-3">
        {chartData.map((item: any, index: number) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{item.value}명</span>
                <span className="text-gray-500">({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{ width: `${item.percentage}%`, backgroundColor: item.fill }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  // 옵션별 색상 결정 함수
  const getColorForOption = (orderNo: number, optionText: string, totalOptions: number) => {
    // 문항 1: 긴박도에 따른 그라데이션 (1주일 이내 = 진한 색, 계획 없음 = 연한 회색)
    if (orderNo === 1) {
      const urgencyColors: Record<string, string> = {
        '1주일 이내': '#dc2626',      // 진한 빨강
        '1개월 이내': '#ea580c',      // 주황
        '1개월 - 3개월': '#f59e0b',   // 노랑
        '3개월 - 6개월': '#84cc16',   // 연두
        '6개월 - 12개월': '#22c55e',   // 초록
        '1년 이후': '#10b981',         // 청록
        '계획없음': '#d1d5db',         // 연한 회색
      }
      return urgencyColors[optionText] || '#3b82f6'
    }
    
    // 문항 2: 프로젝트 종류별 색상
    if (orderNo === 2) {
      const projectColors: Record<string, string> = {
        '유무선 캠퍼스 & 브랜치 네트워크': '#3b82f6',
        '엔터프라이즈 라우팅 (SD-WAN 포함)': '#8b5cf6',
        '네트워크 보안': '#ef4444',
        '해당 없음': '#9ca3af',
      }
      return projectColors[optionText] || '#6366f1'
    }
    
    // 문항 3: 리드 퀄리티에 따른 색상 (높은 가치 = 진한 색)
    if (orderNo === 3) {
      const leadColors: Record<string, string> = {
        'HPE 네트워크 전문가의 방문 요청': '#10b981',      // 진한 초록 (최고 가치)
        'HPE 네트워크 전문가의 온라인 미팅 요청': '#3b82f6', // 파랑
        'HPE 네트워크 전문가의 전화 상담 요청': '#f59e0b',   // 노랑
        '관심 없음': '#d1d5db',                              // 연한 회색
      }
      return leadColors[optionText] || '#6366f1'
    }
    
    // 기본 색상 팔레트
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']
    return colors[totalOptions % colors.length] || '#3b82f6'
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
        
        {/* 공개 대시보드 링크 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">공개 대시보드</h4>
            <p className="text-xs text-gray-600 mb-3">
              아래 링크를 공유하면 로그인 없이 설문 통계를 볼 수 있습니다.
            </p>
            {campaign.dashboard_code ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/dashboard/${campaign.dashboard_code}`}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/event/dashboard/${campaign.dashboard_code}`
                    navigator.clipboard.writeText(url)
                    alert('링크가 클립보드에 복사되었습니다.')
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  복사
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={async () => {
                    if (!campaign.id) {
                      alert('캠페인 ID가 없습니다.')
                      return
                    }
                    
                    try {
                      console.log('대시보드 코드 생성 요청:', campaign.id)
                      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/generate-dashboard-code`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                      })
                      
                      console.log('대시보드 코드 생성 응답:', response.status, response.statusText)
                      
                      const result = await response.json()
                      console.log('대시보드 코드 생성 결과:', result)
                      
                      if (!response.ok) {
                        throw new Error(result.error || `서버 오류 (${response.status})`)
                      }
                      
                      if (result.success) {
                        alert('대시보드 코드가 생성되었습니다. 페이지를 새로고침합니다.')
                        window.location.reload()
                      } else {
                        alert(result.error || '대시보드 코드 생성에 실패했습니다.')
                      }
                    } catch (error: any) {
                      console.error('대시보드 코드 생성 오류:', error)
                      alert(`대시보드 코드 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  대시보드 코드 생성
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 샘플 데이터 생성 및 삭제 버튼 (테스트용) */}
        {campaign.form_id && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleGenerateSampleData}
                disabled={generatingSample || deletingData}
                className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {generatingSample ? '생성 중...' : '📊 샘플 데이터 생성 (50명)'}
              </button>
              <button
                onClick={handleDeleteAllData}
                disabled={generatingSample || deletingData || allEntries.length === 0}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {deletingData ? '삭제 중...' : '🗑️ 모든 데이터 삭제'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              테스트를 위해 50명의 샘플 설문 데이터를 생성하거나, 모든 설문 참여 데이터를 삭제할 수 있습니다.
            </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questionStats.map((stat, index) => (
                <div key={stat.questionId} className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">문항 {stat.orderNo}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {stat.questionType === 'single' ? '단일 선택' : stat.questionType === 'multiple' ? '다중 선택' : '텍스트'}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{stat.questionBody}</h4>
                    <div className="text-xs text-gray-500">
                      총 {stat.totalAnswers}명 응답
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    {stat.questionType === 'text' ? (
                      // 텍스트 문항: 응답 목록
                      <div className="w-full">
                        {stat.textAnswers.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {stat.textAnswers.map((answer: string, idx: number) => (
                              <div key={idx} className="bg-white rounded p-2 text-xs text-gray-700">
                                {answer}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center">응답이 없습니다.</p>
                        )}
                      </div>
                    ) : (
                      // 선택형 문항: 선택지별 분포 (차트로 표시)
                      <div className="w-full">
                        {stat.options && stat.options.length > 0 ? (
                          <div>
                            {renderQuestionChart(stat)}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center">선택지가 없습니다.</p>
                        )}
                      </div>
                    )}
                  </div>
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

