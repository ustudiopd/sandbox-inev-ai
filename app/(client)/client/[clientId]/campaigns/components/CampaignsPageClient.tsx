'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import CampaignLinksTab from './CampaignLinksTab'

interface CampaignsPageClientProps {
  clientId: string
  clientName: string
  clientCreatedAt?: string
}

interface MarketingSummary {
  total_conversions: number
  total_visits?: number
  avg_cvr?: number
  active_links?: number
  conversions_by_source: Array<{ source: string | null; count: number; is_untracked?: boolean }>
  conversions_by_medium: Array<{ medium: string | null; count: number }>
  conversions_by_campaign: Array<{ campaign: string | null; count: number }>
  conversions_by_combo: Array<{ source: string | null; medium: string | null; campaign: string | null; count: number }>
  conversions_by_link?: Array<{ link_id: string; link_name: string; count: number }> // Phase 2
  tracking_metadata?: {
    tracked_count: number
    untracked_count: number
    tracking_success_rate: string
  }
  date_range: { from: string; to: string }
}

export default function CampaignsPageClient({ clientId, clientName, clientCreatedAt }: CampaignsPageClientProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'summary' | 'links'>('summary')
  
  // 로컬/테스트 환경 확인 (클라이언트 사이드)
  const isDevOrPreview = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('vercel.app') // Vercel 프리뷰 환경
  )
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<MarketingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // 디버깅: 클라이언트 생성일 확인
  useEffect(() => {
    if (clientCreatedAt) {
      console.log('[CampaignsPageClient] 클라이언트 생성일:', {
        clientCreatedAt,
        parsed: new Date(clientCreatedAt),
        formatted: new Date(clientCreatedAt).toISOString().split('T')[0],
      })
    }
  }, [clientCreatedAt])
  const [dateFrom, setDateFrom] = useState(() => {
    // 클라이언트 생성일이 있으면 그 날짜부터, 없으면 30일 전부터
    if (clientCreatedAt) {
      const createdDate = new Date(clientCreatedAt)
      // KST 기준으로 날짜 추출
      const kstDate = new Date(createdDate.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      const year = kstDate.getFullYear()
      const month = String(kstDate.getMonth() + 1).padStart(2, '0')
      const day = String(kstDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    // KST 기준으로 30일 전 날짜 계산
    const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    nowKST.setDate(nowKST.getDate() - 30)
    const year = nowKST.getFullYear()
    const month = String(nowKST.getMonth() + 1).padStart(2, '0')
    const day = String(nowKST.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [dateTo, setDateTo] = useState(() => {
    // KST 기준으로 오늘 날짜 추출
    const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const year = nowKST.getFullYear()
    const month = String(nowKST.getMonth() + 1).padStart(2, '0')
    const day = String(nowKST.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  
  useEffect(() => {
    loadSummary()
  }, [clientId, dateFrom, dateTo])
  
  const loadSummary = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/clients/${clientId}/campaigns/summary?from=${dateFrom}&to=${dateTo}`
      )
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다')
      }
      
      setSummary(result)
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const formatSource = (source: string | null) => {
    if (!source) return 'Direct (UTM 없음)'
    if (source === 'Direct (no tracking)') return 'Direct (no tracking)'
    return source
  }
  
  const formatMedium = (medium: string | null) => {
    if (!medium) return 'Direct (UTM 없음)'
    return medium
  }
  
  const formatCampaign = (campaign: string | null) => {
    if (!campaign) return 'Direct (UTM 없음)'
    return campaign
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">광고/캠페인 성과</h1>
          <p className="text-gray-600">{clientName}의 마케팅 전환 데이터</p>
        </div>
        
        {/* 탭 메뉴 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              전환 성과
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'links'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              캠페인 링크
            </button>
          </div>
        </div>
        
        {/* 날짜 필터 (두 탭 공통) */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  if (activeTab === 'summary') {
                    loadSummary()
                  }
                }}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                조회
              </button>
            </div>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'links' ? (
          <CampaignLinksTab clientId={clientId} clientName={clientName} dateFrom={dateFrom} dateTo={dateTo} />
        ) : (
          <>
        
        {/* 로딩 */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        )}
        
        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {/* 요약 데이터 */}
        {!loading && !error && summary && (
          <div className="space-y-6">
            {/* 전체 통계 요약 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">전체 통계 요약</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">총 Visits</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(summary.total_visits || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">총 전환</div>
                  <div className="text-2xl font-bold text-green-600">
                    {summary.total_conversions.toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">평균 CVR</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {(summary.avg_cvr || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">활성 링크</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {summary.active_links || 0}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {new Date(dateFrom).toLocaleDateString('ko-KR')} ~ {new Date(dateTo).toLocaleDateString('ko-KR')}
              </p>
              
              {/* 추적 성공률 표시 (로컬/테스트 환경에서만) */}
              {summary.tracking_metadata && isDevOrPreview && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">추적 성공률</span>
                    <span className={`text-lg font-semibold ${
                      parseFloat(summary.tracking_metadata.tracking_success_rate) >= 80
                        ? 'text-green-600'
                        : parseFloat(summary.tracking_metadata.tracking_success_rate) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {summary.tracking_metadata.tracking_success_rate}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    추적 성공: {summary.tracking_metadata.tracked_count.toLocaleString()}개 / 
                    추적 실패: {summary.tracking_metadata.untracked_count.toLocaleString()}개
                  </div>
                  {summary.tracking_metadata.untracked_count > 0 && (
                    <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                      ⚠️ 일부 전환이 추적되지 않았습니다. 링크에 UTM 파라미터가 포함되어 있는지 확인해주세요.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Source별 전환 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Source별 전환</h2>
              <div className="space-y-2">
                {summary.conversions_by_source.length === 0 ? (
                  <p className="text-gray-500">데이터가 없습니다</p>
                ) : (
                  summary.conversions_by_source.map((item, idx) => {
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between py-2 border-b border-gray-100 ${
                          item.is_untracked && isDevOrPreview ? 'bg-amber-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-gray-700 ${item.is_untracked && isDevOrPreview ? 'font-medium text-amber-800' : ''}`}>
                            {formatSource(item.source)}
                          </span>
                          {item.is_untracked && isDevOrPreview && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                              추적 실패
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">{item.count.toLocaleString()}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            
            {/* Medium별 전환 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Medium별 전환</h2>
              <div className="space-y-2">
                {summary.conversions_by_medium.length === 0 ? (
                  <p className="text-gray-500">데이터가 없습니다</p>
                ) : (
                  summary.conversions_by_medium.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{formatMedium(item.medium)}</span>
                      <span className="font-semibold text-gray-900">{item.count.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Campaign별 전환 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign별 전환</h2>
              <div className="space-y-2">
                {summary.conversions_by_campaign.length === 0 ? (
                  <p className="text-gray-500">데이터가 없습니다</p>
                ) : (
                  summary.conversions_by_campaign.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{formatCampaign(item.campaign)}</span>
                      <span className="font-semibold text-gray-900">{item.count.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Source + Medium + Campaign 조합별 전환 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Source + Medium + Campaign 조합별 전환</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Source</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Medium</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Campaign</th>
                      <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">전환 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.conversions_by_combo.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-500">
                          데이터가 없습니다
                        </td>
                      </tr>
                    ) : (
                      summary.conversions_by_combo.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-sm text-gray-700">{formatSource(item.source)}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{formatMedium(item.medium)}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{formatCampaign(item.campaign)}</td>
                          <td className="py-2 px-3 text-sm text-right font-semibold text-gray-900">{item.count.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 링크별 전환 (Phase 2) */}
            {summary.conversions_by_link && summary.conversions_by_link.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">생성된 링크별 전환</h2>
                <div className="space-y-2">
                  {summary.conversions_by_link.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{item.link_name}</span>
                      <span className="font-semibold text-gray-900">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
