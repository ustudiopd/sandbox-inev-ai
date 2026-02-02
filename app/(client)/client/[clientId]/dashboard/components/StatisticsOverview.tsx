'use client'

import { useState, useEffect } from 'react'

interface StatisticsOverviewProps {
  clientId: string
}

interface OverviewData {
  client_id: string
  date_range: { from: string; to: string }
  marketing: {
    total_conversions: number
    total_visits: number
    _source: string
  }
  webinars: {
    total_webinars: number
    total_registrants: number
    _source: string
  }
  campaigns: {
    total_campaigns: number
    total_conversions: number
    _source: string
  }
  links: {
    total_links: number
    active_links: number
    total_conversions: number
    total_visits: number
    _source: string
  }
  summary: {
    total_conversions: number
    total_visits: number
    total_webinars: number
    total_campaigns: number
    total_links: number
  }
  _metadata: {
    response_time_ms: number
    data_sources: {
      marketing: string
      webinars: string
      campaigns: string
      links: string
    }
    generated_at: string
  }
}

export default function StatisticsOverview({ clientId }: StatisticsOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    loadStatistics()
  }, [clientId])
  
  const loadStatistics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 최근 30일 데이터 조회
      const to = new Date().toISOString().split('T')[0]
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await fetch(
        `/api/clients/${clientId}/statistics/overview?from=${from}&to=${to}`
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }
  
  if (!data) {
    return null
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">통계 요약</h2>
        <button
          onClick={loadStatistics}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          새로고침
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* 마케팅 전환 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">마케팅 전환</div>
          <div className="text-2xl font-bold text-blue-600">
            {data.summary.total_conversions.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Visits: {data.summary.total_visits.toLocaleString()}
          </div>
        </div>
        
        {/* 웨비나 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-1">웨비나</div>
          <div className="text-2xl font-bold text-purple-600">
            {data.summary.total_webinars}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            등록자: {data.webinars.total_registrants.toLocaleString()}
          </div>
        </div>
        
        {/* 캠페인 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">캠페인</div>
          <div className="text-2xl font-bold text-green-600">
            {data.summary.total_campaigns}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            전환: {data.campaigns.total_conversions.toLocaleString()}
          </div>
        </div>
        
        {/* 링크 */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 mb-1">캠페인 링크</div>
          <div className="text-2xl font-bold text-orange-600">
            {data.summary.total_links}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            활성: {data.links.active_links}
          </div>
        </div>
      </div>
      
      {/* 성능 메타데이터 (개발 모드에서만 표시) */}
      {process.env.NODE_ENV === 'development' && data._metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            응답 시간: {data._metadata.response_time_ms}ms | 
            데이터 소스: 마케팅({data._metadata.data_sources.marketing}), 
            웨비나({data._metadata.data_sources.webinars}), 
            캠페인({data._metadata.data_sources.campaigns}), 
            링크({data._metadata.data_sources.links})
          </div>
        </div>
      )}
    </div>
  )
}
