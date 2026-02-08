'use client'

import { useState, useEffect } from 'react'

interface StatisticsOverviewProps {
  clientId: string
}

interface OverviewData {
  client_id: string
  date_range: {
    from: string | null
    to: string | null
  }
  events: {
    total: number
    active: number
    completed: number
  }
  leads: {
    total: number
    unique_emails: number
  }
  visits: {
    total: number
    unique_sessions: number
  }
  shortlink_clicks: {
    total: number
    unique_sessions: number
  }
  survey_responses: {
    total: number
  }
  participations: {
    total: number
  }
  _metadata: {
    response_time_ms: number
    generated_at: string
  }
}

export default function StatisticsOverview({ clientId }: StatisticsOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days')
  
  useEffect(() => {
    loadStatistics()
  }, [clientId, dateRange])
  
  const loadStatistics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 기간 필터 계산 (KST 기준)
      let from: string | null = null
      let to: string | null = null
      
      if (dateRange !== 'all') {
        const now = new Date()
        const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        to = toDate.toISOString().split('T')[0] // YYYY-MM-DD
        
        const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
        const fromDate = new Date(toDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
        from = fromDate.toISOString().split('T')[0] // YYYY-MM-DD
      }
      
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      
      const response = await fetch(
        `/api/inev/clients/${clientId}/statistics/overview?${params.toString()}`
      )
      
      if (!response.ok) {
        throw new Error('통계를 불러오는데 실패했습니다')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다')
      console.error('통계 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }
  
  if (!data) {
    return null
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">통계 요약</h2>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7days">최근 7일</option>
            <option value="30days">최근 30일</option>
            <option value="90days">최근 90일</option>
            <option value="all">전체</option>
          </select>
          <button
            onClick={loadStatistics}
            className="text-sm px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* 이벤트 수 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">이벤트 수</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.events.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            진행 중: {data.events.active} | 종료: {data.events.completed}
          </div>
        </div>
        
        {/* 등록자 수 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">등록자 수</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.leads.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            고유 이메일: {data.leads.unique_emails.toLocaleString()}
          </div>
        </div>
        
        {/* Visit 수 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Visit 수</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.visits.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.visits.unique_sessions > 0 && `고유 세션: ${data.visits.unique_sessions.toLocaleString()}`}
          </div>
        </div>
        
        {/* ShortLink 클릭 */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">ShortLink 클릭</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.shortlink_clicks.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.shortlink_clicks.unique_sessions > 0 && `고유 세션: ${data.shortlink_clicks.unique_sessions.toLocaleString()}`}
          </div>
        </div>
      </div>
      
      {/* 추가 통계 (2열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 설문 응답 */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg p-4 border-l-4 border-teal-500">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">설문 응답 수</div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {data.survey_responses.total.toLocaleString()}
          </div>
        </div>
        
        {/* 참여자 수 */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-4 border-l-4 border-indigo-500">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">참여자 수</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.participations.total.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* 성능 메타데이터 (개발 모드에서만 표시) */}
      {process.env.NODE_ENV === 'development' && data._metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            응답 시간: {data._metadata.response_time_ms}ms | 
            생성 시각: {new Date(data._metadata.generated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </div>
        </div>
      )}
    </div>
  )
}
