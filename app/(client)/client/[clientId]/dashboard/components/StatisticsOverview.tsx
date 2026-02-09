'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Users, 
  Eye, 
  MousePointerClick, 
  FileText, 
  UserCheck, 
  RefreshCw,
  TrendingUp,
  BarChart3
} from 'lucide-react'

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">통계 요약</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="text-sm pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="90days">최근 90일</option>
              <option value="all">전체</option>
            </select>
          </div>
          <button
            onClick={loadStatistics}
            className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* 이벤트 수 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">이벤트 수</div>
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {data.events.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            진행 중: {data.events.active} | 종료: {data.events.completed}
          </div>
        </div>
        
        {/* 등록자 수 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-green-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">등록자 수</div>
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {data.leads.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            고유 이메일: {data.leads.unique_emails.toLocaleString()}
          </div>
        </div>
        
        {/* Visit 수 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Visit 수</div>
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {data.visits.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {data.visits.unique_sessions > 0 && `고유 세션: ${data.visits.unique_sessions.toLocaleString()}`}
          </div>
        </div>
        
        {/* ShortLink 클릭 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">ShortLink 클릭</div>
            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <MousePointerClick className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
            {data.shortlink_clicks.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {data.shortlink_clicks.unique_sessions > 0 && `고유 세션: ${data.shortlink_clicks.unique_sessions.toLocaleString()}`}
          </div>
        </div>
      </div>
      
      {/* 추가 통계 (2열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 설문 응답 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-teal-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">설문 응답 수</div>
            <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
            {data.survey_responses.total.toLocaleString()}
          </div>
        </div>
        
        {/* 참여자 수 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">참여자 수</div>
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
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
