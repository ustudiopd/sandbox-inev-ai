'use client'

import { useState, useEffect } from 'react'
import { CHANNEL_TEMPLATES, CONTENT_OPTIONS, generateUTMCampaign, generateHumanReadableDescription, type ChannelTemplate } from '@/lib/utils/utmTemplate'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CampaignLink {
  id: string
  name: string
  target_campaign_id: string
  landing_variant: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  start_date: string | null
  status: string
  url: string
  share_url?: string // 공유용 URL (cid만)
  campaign_url?: string // 광고용 URL (cid + UTM)
  conversion_count?: number
  visits_count?: number
  cvr?: number
  created_at: string
}

interface Campaign {
  id: string
  title: string
  public_path: string
}

interface CampaignLinksTabProps {
  clientId: string
  clientName?: string
  dateFrom?: string
  dateTo?: string
}

export default function CampaignLinksTab({ clientId, clientName = '', dateFrom, dateTo }: CampaignLinksTabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [links, setLinks] = useState<CampaignLink[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null)
  const [linkStats, setLinkStats] = useState<Record<string, any>>({})
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  
  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'conversions' | 'visits' | 'cvr'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // 템플릿 관련 상태
  const [selectedTemplate, setSelectedTemplate] = useState<ChannelTemplate | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  
  // 링크 생성 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    target_campaign_id: '',
    landing_variant: 'register',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    start_date: '2026-01-16', // 워트인텔리전트 기본 시작일
  })
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // 링크 수정 상태
  const [editingLink, setEditingLink] = useState<CampaignLink | null>(null)
  
  useEffect(() => {
    loadData()
  }, [clientId, dateFrom, dateTo])

  // 클라이언트 이름 가져오기
  useEffect(() => {
    if (!clientName && clientId) {
      fetch(`/api/clients/${clientId}`)
        .then(res => res.json())
        .then(data => {
          if (data.name) {
            // clientName이 props로 전달되지 않았을 때만 설정
          }
        })
        .catch(() => {})
    }
  }, [clientId, clientName])

  // 템플릿 선택 핸들러
  const handleTemplateSelect = (template: ChannelTemplate) => {
    setSelectedTemplate(template)
    
    if (template.id !== 'custom') {
      // 템플릿에서 source/medium 자동 채우기
      setFormData(prev => ({
        ...prev,
        utm_source: template.utm_source,
        utm_medium: template.utm_medium,
      }))
    } else {
      // 커스텀 선택 시 초기화
      setFormData(prev => ({
        ...prev,
        utm_source: '',
        utm_medium: '',
      }))
    }
  }

  // 링크 이름 변경 핸들러
  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }))
  }

  // 캠페인 선택 핸들러
  const handleCampaignChange = (campaignId: string) => {
    setFormData(prev => ({ ...prev, target_campaign_id: campaignId }))
  }

  // 링크 이름 또는 캠페인 변경 시 utm_campaign 업데이트
  useEffect(() => {
    if (formData.name && formData.target_campaign_id && selectedTemplate) {
      const campaign = campaigns.find(c => c.id === formData.target_campaign_id)
      if (campaign) {
        const generatedCampaign = generateUTMCampaign(
          formData.name,
          clientName || 'client',
          campaign.title,
          selectedTemplate.id
        )
        setFormData(prev => ({
          ...prev,
          utm_campaign: generatedCampaign,
        }))
        
        // 중복 감지
        const duplicate = links.find(link => 
          link.target_campaign_id === formData.target_campaign_id &&
          link.utm_source === (selectedTemplate?.utm_source || formData.utm_source) &&
          link.utm_medium === (selectedTemplate?.utm_medium || formData.utm_medium) &&
          link.utm_campaign === generatedCampaign &&
          link.utm_content === (formData.utm_content || null) &&
          link.status !== 'archived'
        )
        
        if (duplicate) {
          setDuplicateWarning(`이미 같은 캠페인 링크가 있습니다: "${duplicate.name}"`)
        } else {
          setDuplicateWarning(null)
        }
      }
    }
  }, [formData.name, formData.target_campaign_id, selectedTemplate?.id, clientName, campaigns, links, formData.utm_content])
  
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 캠페인 목록 조회
      const campaignsResponse = await fetch(`/api/event-survey/campaigns/list?clientId=${clientId}`)
      const campaignsResult = await campaignsResponse.json()
      
      if (campaignsResponse.ok && campaignsResult.campaigns) {
        setCampaigns(campaignsResult.campaigns.map((c: any) => ({
          id: c.id,
          title: c.title || `캠페인 ${c.id.slice(0, 8)}`,
          public_path: c.public_path || '',
        })))
      } else {
        console.error('캠페인 목록 조회 실패:', campaignsResult)
      }
      
      // 링크 목록 조회 (날짜 범위 포함)
      const linksUrl = dateFrom && dateTo
        ? `/api/clients/${clientId}/campaigns/links?from=${dateFrom}&to=${dateTo}`
        : `/api/clients/${clientId}/campaigns/links`
      const linksResponse = await fetch(linksUrl)
      const linksResult = await linksResponse.json()
      
      if (!linksResponse.ok) {
        throw new Error(linksResult.error || '링크 목록을 불러오는데 실패했습니다')
      }
      
      setLinks(linksResult.links || [])
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setCreateError(null)
    
    if (!formData.name.trim() || !formData.target_campaign_id) {
      setCreateError('링크 이름과 전환 타겟을 입력해주세요')
      setSubmitting(false)
      return
    }

    if (!selectedTemplate) {
      setCreateError('채널 템플릿을 선택해주세요')
      setSubmitting(false)
      return
    }

    // 중복 경고가 있을 때 확인
    if (duplicateWarning && !confirm('중복된 링크가 있습니다. 계속하시겠습니까?')) {
      setSubmitting(false)
      return
    }
    
    try {
      const response = await fetch(`/api/clients/${clientId}/campaigns/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '링크 생성에 실패했습니다')
      }
      
      // 성공 시 목록 새로고침 및 폼 초기화
      await loadData()
      setFormData({
        name: '',
        target_campaign_id: '',
        landing_variant: 'register',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        start_date: '2026-01-16', // 워트인텔리전트 기본 시작일
      })
      setSelectedTemplate(null)
      setShowAdvanced(false)
      setDuplicateWarning(null)
      setActiveTab('list')
    } catch (err: any) {
      setCreateError(err.message || '링크 생성 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleUpdateLink = async (link: CampaignLink, updates: Partial<CampaignLink>) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/campaigns/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '링크 수정에 실패했습니다')
      }
      
      await loadData()
      setEditingLink(null)
    } catch (err: any) {
      alert(err.message || '링크 수정 중 오류가 발생했습니다')
    }
  }
  
  const handleDeleteLink = async (link: CampaignLink) => {
    if (!confirm(`"${link.name}" 링크를 삭제하시겠습니까?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/clients/${clientId}/campaigns/links/${link.id}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '링크 삭제에 실패했습니다')
      }
      
      await loadData()
    } catch (err: any) {
      alert(err.message || '링크 삭제 중 오류가 발생했습니다')
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('링크가 클립보드에 복사되었습니다')
    }).catch(() => {
      alert('복사에 실패했습니다')
    })
  }
  
  // 필터링 및 정렬된 링크 목록
  const getFilteredAndSortedLinks = () => {
    let filtered = links.filter(link => {
      if (statusFilter !== 'all' && link.status !== statusFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const campaignTitle = campaigns.find(c => c.id === link.target_campaign_id)?.title || ''
        const utmText = [
          link.utm_source,
          link.utm_medium,
          link.utm_campaign
        ].filter(Boolean).join(' ').toLowerCase()
        
        return (
          link.name.toLowerCase().includes(query) ||
          campaignTitle.toLowerCase().includes(query) ||
          utmText.includes(query)
        )
      }
      return true
    })
    
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'conversions':
          comparison = (a.conversion_count || 0) - (b.conversion_count || 0)
          break
        case 'visits':
          comparison = (a.visits_count || 0) - (b.visits_count || 0)
          break
        case 'cvr':
          comparison = (a.cvr || 0) - (b.cvr || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }
  
  const filteredLinks = getFilteredAndSortedLinks()

  const loadLinkStats = async (linkId: string) => {
    if (linkStats[linkId]) {
      return // 이미 로드됨
    }

    setLoadingStats(prev => ({ ...prev, [linkId]: true }))
    try {
      const response = await fetch(`/api/clients/${clientId}/campaigns/links/${linkId}/stats`)
      const result = await response.json()
      
      if (response.ok) {
        setLinkStats(prev => ({ ...prev, [linkId]: result }))
      }
    } catch (err) {
      console.error('링크 통계 로드 실패:', err)
    } finally {
      setLoadingStats(prev => ({ ...prev, [linkId]: false }))
    }
  }

  const handleLinkExpand = (linkId: string) => {
    if (expandedLinkId === linkId) {
      setExpandedLinkId(null)
    } else {
      setExpandedLinkId(linkId)
      loadLinkStats(linkId)
    }
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">데이터를 불러오는 중...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 탭 메뉴 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            링크 목록
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            + 새 링크 생성
          </button>
        </div>
      </div>
      
      {/* 링크 목록 탭 */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* 전체 통계 요약 */}
          {links.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">전체 통계 요약</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">총 Visits</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {links.reduce((sum, link) => sum + (link.visits_count || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">총 전환</div>
                  <div className="text-2xl font-bold text-green-600">
                    {links.reduce((sum, link) => sum + (link.conversion_count || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">평균 CVR</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {(() => {
                      const totalVisits = links.reduce((sum, link) => sum + (link.visits_count || 0), 0)
                      const totalConversions = links.reduce((sum, link) => sum + (link.conversion_count || 0), 0)
                      return totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(2) : '0.00'
                    })()}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">활성 링크</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {links.filter(link => link.status === 'active').length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 링크별 성과 비교 차트 */}
          {links.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">링크별 성과 비교</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={links.filter(link => link.status !== 'archived').map(link => ({
                  name: link.name.length > 20 ? link.name.substring(0, 20) + '...' : link.name,
                  visits: link.visits_count || 0,
                  conversions: link.conversion_count || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visits" fill="#3b82f6" name="Visits" />
                  <Bar dataKey="conversions" fill="#10b981" name="전환" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 링크 목록 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">생성된 링크 목록</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="그리드 뷰"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="리스트 뷰"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 검색 및 필터 바 */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="링크 이름, UTM, 캠페인으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체 상태</option>
                <option value="active">활성</option>
                <option value="paused">일시정지</option>
                <option value="archived">보관</option>
              </select>
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('_')
                  setSortBy(by as any)
                  setSortOrder(order as any)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at_desc">최신순</option>
                <option value="created_at_asc">오래된순</option>
                <option value="name_asc">이름순 (가나다)</option>
                <option value="name_desc">이름순 (역순)</option>
                <option value="conversions_desc">전환 많은순</option>
                <option value="visits_desc">Visits 많은순</option>
                <option value="cvr_desc">CVR 높은순</option>
              </select>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            {filteredLinks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? '검색 결과가 없습니다' 
                    : '생성된 링크가 없습니다'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-600 hover:text-blue-700 mr-4"
                  >
                    검색 초기화
                  </button>
                )}
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    필터 초기화
                  </button>
                )}
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + 새 링크 생성
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="space-y-3">
                {filteredLinks.map(link => (
                  <div
                    key={link.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-center gap-4">
                      {/* 왼쪽: 기본 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate" title={link.name}>
                            {link.name}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                            link.status === 'active' ? 'bg-green-100 text-green-800' :
                            link.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {link.status === 'active' ? '활성' : link.status === 'paused' ? '일시정지' : '보관'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1 truncate" title={campaigns.find(c => c.id === link.target_campaign_id)?.title}>
                          {campaigns.find(c => c.id === link.target_campaign_id)?.title || link.target_campaign_id}
                        </p>
                        {(link.utm_source || link.utm_medium) && (
                          <div className="text-xs text-gray-500 truncate">
                            {link.utm_source}/{link.utm_medium}
                            {link.utm_campaign && ` • ${link.utm_campaign}`}
                          </div>
                        )}
                      </div>
                      
                      {/* 중간: 통계 */}
                      <div className="flex items-center gap-6 px-4 border-l border-r border-gray-200">
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs text-gray-500 mb-1">Visits</div>
                          <div className="text-lg font-bold text-blue-600">{link.visits_count || 0}</div>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs text-gray-500 mb-1">전환</div>
                          <div className="text-lg font-bold text-green-600">{link.conversion_count || 0}</div>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs text-gray-500 mb-1">CVR</div>
                          <div className="text-lg font-bold text-purple-600">
                            {link.cvr ? `${link.cvr.toFixed(1)}%` : '0%'}
                          </div>
                        </div>
                      </div>
                      
                      {/* 오른쪽: 액션 버튼 */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleLinkExpand(link.id)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded text-sm hover:bg-blue-100 transition-colors whitespace-nowrap"
                        >
                          {expandedLinkId === link.id ? '접기' : '상세'}
                        </button>
                        {(() => {
                          // 템플릿 매칭: source + medium 정확히 일치하는 경우
                          let matchedTemplate = CHANNEL_TEMPLATES.find(
                            t => t.utm_source === link.utm_source && t.utm_medium === link.utm_medium
                          )
                          
                          // 매칭 실패 시 medium만으로 매칭 시도
                          if (!matchedTemplate && link.utm_medium) {
                            matchedTemplate = CHANNEL_TEMPLATES.find(
                              t => t.utm_medium === link.utm_medium && t.id !== 'custom'
                            )
                          }
                          
                          // medium이 'email'인 경우 뉴스레터로 간주
                          if (!matchedTemplate && link.utm_medium === 'email') {
                            matchedTemplate = CHANNEL_TEMPLATES.find(t => t.id === 'newsletter')
                          }
                          
                          // medium이 'sms'인 경우 SMS로 간주
                          if (!matchedTemplate && link.utm_medium === 'sms') {
                            matchedTemplate = CHANNEL_TEMPLATES.find(t => t.id === 'sms')
                          }
                          
                          const preferredType = matchedTemplate?.preferredLinkType || 'campaign'
                          const isShareType = preferredType === 'share'
                          const url = isShareType 
                            ? (link.share_url || link.url)
                            : (link.campaign_url || link.url)
                          
                          return (
                            <button
                              onClick={() => copyToClipboard(url)}
                              className={`px-4 py-2 rounded text-sm transition-colors whitespace-nowrap ${
                                isShareType
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                              title={isShareType ? '공유용 링크 복사 (짧음)' : '광고용 링크 복사 (UTM 포함)'}
                            >
                              복사 {isShareType ? '(공유용)' : '(광고용)'}
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                    
                    {/* 확장된 상세 정보 */}
                    {expandedLinkId === link.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-gray-500">랜딩:</span> {link.landing_variant}
                          </div>
                          {(link.utm_source || link.utm_medium || link.utm_campaign) && (
                            <div>
                              <span className="text-gray-500">UTM:</span>{' '}
                              {[
                                link.utm_source && `source=${link.utm_source}`,
                                link.utm_medium && `medium=${link.utm_medium}`,
                                link.utm_campaign && `campaign=${link.utm_campaign}`,
                              ].filter(Boolean).join(', ')}
                            </div>
                          )}
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">링크 URL:</p>
                            <p className="text-xs font-mono text-gray-700 break-all">
                              {link.campaign_url || link.share_url || link.url}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingLink(link)}
                              className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleUpdateLink(link, { status: link.status === 'active' ? 'paused' : 'active' })}
                              className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200"
                            >
                              {link.status === 'active' ? '일시정지' : '재개'}
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link)}
                              className="flex-1 px-3 py-1.5 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLinks.map(link => (
                <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                  {editingLink?.id === link.id ? (
                    <LinkEditForm
                      link={link}
                      campaigns={campaigns}
                      onSave={(updates) => handleUpdateLink(link, updates)}
                      onCancel={() => setEditingLink(null)}
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 cursor-pointer" onClick={() => handleLinkExpand(link.id)}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600">
                            {link.name} {expandedLinkId === link.id ? '▼' : '▶'}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            전환 타겟: {campaigns.find(c => c.id === link.target_campaign_id)?.title || link.target_campaign_id}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span>랜딩: {link.landing_variant}</span>
                            {link.start_date && (
                              <span>시작일: {new Date(link.start_date).toLocaleDateString('ko-KR')}</span>
                            )}
                            <span className="font-semibold text-blue-600">Visits: {link.visits_count || 0}</span>
                            <span className="font-semibold text-green-600">전환: {link.conversion_count || 0}</span>
                            <span className="font-semibold text-purple-600">CVR: {link.cvr ? `${link.cvr.toFixed(2)}%` : '0.00%'}</span>
                            <span className={`px-2 py-1 rounded ${
                              link.status === 'active' ? 'bg-green-100 text-green-800' :
                              link.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {link.status === 'active' ? '활성' : link.status === 'paused' ? '일시정지' : '보관'}
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded p-2 mb-2 space-y-2">
                            {/* 템플릿에 따라 추천 링크 결정 */}
                            {(() => {
                              // 링크의 UTM 정보로 템플릿 찾기
                              const matchedTemplate = CHANNEL_TEMPLATES.find(
                                t => t.utm_source === link.utm_source && t.utm_medium === link.utm_medium
                              ) || CHANNEL_TEMPLATES.find(
                                t => t.id === 'sms' && (link.utm_source === 'sms' || link.utm_medium === 'sms')
                              ) || null
                              
                              // 템플릿의 preferredLinkType에 따라 추천 링크 결정
                              const preferredType = matchedTemplate?.preferredLinkType || 'campaign'
                              const recommendedUrl = preferredType === 'share'
                                ? (link.share_url || link.url)
                                : (link.campaign_url || link.url)
                              const recommendedLabel = preferredType === 'share'
                                ? `📱 추천 링크 (공유용 - 짧음)${matchedTemplate ? ` - ${matchedTemplate.name}` : ''}`
                                : `📊 추천 링크 (광고용 - UTM 포함)${matchedTemplate ? ` - ${matchedTemplate.name}` : ''}`
                              
                              return (
                                <>
                                  {/* 추천 링크 (템플릿에 따라) */}
                                  <div className="border-l-4 border-blue-500 pl-2">
                                    <p className="text-xs font-semibold text-blue-700 mb-1">{recommendedLabel}</p>
                                    <p className="text-sm font-mono text-gray-700 break-all">{recommendedUrl}</p>
                                    <button
                                      onClick={() => copyToClipboard(recommendedUrl)}
                                      className="mt-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                    >
                                      복사
                                    </button>
                                  </div>
                                  
                                  {/* 공유용 링크 (광고용이 추천인 경우에만 표시) */}
                                  {preferredType === 'campaign' && link.share_url && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">공유용 링크 (짧음):</p>
                                      <p className="text-sm font-mono text-gray-700 break-all">{link.share_url}</p>
                                      <button
                                        onClick={() => copyToClipboard(link.share_url!)}
                                        className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                                      >
                                        복사
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* 광고용 링크 (공유용이 추천인 경우에만 표시) */}
                                  {preferredType === 'share' && link.campaign_url && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">광고용 링크 (표준 UTM 포함):</p>
                                      <p className="text-sm font-mono text-gray-700 break-all">{link.campaign_url}</p>
                                      <button
                                        onClick={() => copyToClipboard(link.campaign_url!)}
                                        className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                                      >
                                        복사
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* 둘 다 없는 경우 (하위 호환성) */}
                                  {!link.share_url && !link.campaign_url && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">생성된 URL:</p>
                                      <p className="text-sm font-mono text-gray-700 break-all">{link.url}</p>
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                          {(link.utm_source || link.utm_medium || link.utm_campaign) && (
                            <div className="text-xs text-gray-500">
                              UTM: {[
                                link.utm_source && `source=${link.utm_source}`,
                                link.utm_medium && `medium=${link.utm_medium}`,
                                link.utm_campaign && `campaign=${link.utm_campaign}`,
                              ].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 상세 통계 (확장 시 표시) */}
                      {expandedLinkId === link.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {loadingStats[link.id] ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">통계를 불러오는 중...</p>
                            </div>
                          ) : linkStats[link.id] ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">Visits</div>
                                  <div className="text-xl font-bold text-blue-600">{linkStats[link.id].stats.visits.toLocaleString()}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">전환</div>
                                  <div className="text-xl font-bold text-green-600">{linkStats[link.id].stats.conversions.toLocaleString()}</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">CVR</div>
                                  <div className="text-xl font-bold text-purple-600">{linkStats[link.id].stats.cvr.toFixed(2)}%</div>
                                </div>
                              </div>
                              
                              {linkStats[link.id].daily_data && linkStats[link.id].daily_data.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">일별 추이</h4>
                                  <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={linkStats[link.id].daily_data}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(value) => {
                                          const date = new Date(value)
                                          return `${date.getMonth() + 1}/${date.getDate()}`
                                        }}
                                      />
                                      <YAxis />
                                      <Tooltip 
                                        labelFormatter={(value) => {
                                          const date = new Date(value)
                                          return date.toLocaleDateString('ko-KR')
                                        }}
                                      />
                                      <Legend />
                                      <Line type="monotone" dataKey="visits" stroke="#3b82f6" name="Visits" strokeWidth={2} />
                                      <Line type="monotone" dataKey="conversions" stroke="#10b981" name="전환" strokeWidth={2} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-sm text-gray-500">
                              통계 데이터가 없습니다
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(link.url)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          복사
                        </button>
                        <button
                          onClick={() => setEditingLink(link)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleUpdateLink(link, { status: link.status === 'active' ? 'paused' : 'active' })}
                          className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                        >
                          {link.status === 'active' ? '일시정지' : '재개'}
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link)}
                          className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
      
      {/* 링크 생성 탭 */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">새 링크 생성</h2>
          
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{createError}</p>
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">⚠️ {duplicateWarning}</p>
            </div>
          )}
          
          <form onSubmit={handleCreateLink} className="space-y-6">
            {/* 채널 템플릿 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                채널 선택 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CHANNEL_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="mt-2 text-sm text-gray-600">
                  선택됨: {selectedTemplate.name} ({selectedTemplate.utm_source || '직접 입력'}, {selectedTemplate.utm_medium || '직접 입력'})
                </p>
              )}
            </div>

            {/* 실시간 미리보기 */}
            {formData.name && formData.target_campaign_id && selectedTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  {generateHumanReadableDescription(
                    formData.name,
                    selectedTemplate,
                    campaigns.find(c => c.id === formData.target_campaign_id)?.title || ''
                  )}
                </p>
              </div>
            )}
            
            {/* 링크 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                링크 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 26년 1월 뉴스레터"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                링크 이름을 입력하면 UTM Campaign이 자동으로 생성됩니다.
              </p>
            </div>
            
            {/* 전환 타겟 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전환 타겟 (캠페인) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.target_campaign_id}
                onChange={(e) => handleCampaignChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">캠페인 선택</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 랜딩 위치 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                랜딩 위치
              </label>
              <select
                value={formData.landing_variant}
                onChange={(e) => setFormData({ ...formData, landing_variant: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="welcome">Welcome 페이지</option>
                <option value="register">등록 페이지</option>
                <option value="survey">설문 페이지</option>
              </select>
            </div>

            {/* 광고 시작일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고 시작일
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                해당 날짜부터 링크가 활성화됩니다.
              </p>
            </div>
            
            {/* UTM 파라미터 */}
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">UTM 파라미터</h3>
                  <p className="text-sm text-gray-600">
                    채널 템플릿을 선택하면 Source와 Medium이 자동으로 채워집니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAdvanced ? '고급 옵션 숨기기' : '고급 옵션 보기'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Source <span className="text-gray-500 font-normal">(출처)</span>
                    {selectedTemplate && selectedTemplate.id !== 'custom' && (
                      <span className="ml-2 text-xs text-gray-500">🔒 템플릿에서 자동 설정</span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    트래픽이 발생한 출처를 식별합니다.
                  </p>
                  {showAdvanced || !selectedTemplate || selectedTemplate.id === 'custom' ? (
                    <input
                      type="text"
                      value={formData.utm_source}
                      onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        selectedTemplate && selectedTemplate.id !== 'custom' && !showAdvanced ? 'bg-gray-100' : ''
                      }`}
                      placeholder="예: newsletter"
                      disabled={!!(selectedTemplate && selectedTemplate.id !== 'custom' && !showAdvanced)}
                    />
                  ) : (
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {formData.utm_source || '(자동 생성됨)'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Medium <span className="text-gray-500 font-normal">(매체)</span>
                    {selectedTemplate && selectedTemplate.id !== 'custom' && (
                      <span className="ml-2 text-xs text-gray-500">🔒 템플릿에서 자동 설정</span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    트래픽을 유도하는 데 사용된 매체를 식별합니다.
                  </p>
                  {showAdvanced || !selectedTemplate || selectedTemplate.id === 'custom' ? (
                    <input
                      type="text"
                      value={formData.utm_medium}
                      onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        selectedTemplate && selectedTemplate.id !== 'custom' && !showAdvanced ? 'bg-gray-100' : ''
                      }`}
                      placeholder="예: email"
                      disabled={!!(selectedTemplate && selectedTemplate.id !== 'custom' && !showAdvanced)}
                    />
                  ) : (
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {formData.utm_medium || '(자동 생성됨)'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Campaign <span className="text-gray-500 font-normal">(캠페인)</span>
                    <span className="ml-2 text-xs text-green-600">✨ 자동 생성</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    링크 이름과 캠페인 정보로부터 자동 생성됩니다.
                  </p>
                  <input
                    type="text"
                    value={formData.utm_campaign}
                    onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-green-50"
                    placeholder="자동 생성됨"
                    readOnly={!showAdvanced}
                  />
                  {!showAdvanced && (
                    <p className="mt-1 text-xs text-green-600">
                      링크 이름과 전환 타겟을 입력하면 자동으로 생성됩니다.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Term <span className="text-gray-500 font-normal">(키워드, 선택)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    주로 유료 검색 캠페인에서 사용되는 키워드를 식별합니다.
                  </p>
                  <input
                    type="text"
                    value={formData.utm_term}
                    onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: keyword"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Content <span className="text-gray-500 font-normal">(콘텐츠, 선택)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    A/B 테스트나 링크 위치 구분이 필요한 경우에만 선택하세요.
                  </p>
                  <select
                    value={formData.utm_content}
                    onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CONTENT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
            </div>
            
            {/* 제출 버튼 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '생성 중...' : '링크 생성'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('list')
                  setCreateError(null)
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// 링크 수정 폼 컴포넌트
function LinkEditForm({
  link,
  campaigns,
  onSave,
  onCancel,
}: {
  link: CampaignLink
  campaigns: Campaign[]
  onSave: (updates: Partial<CampaignLink>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<{
    name: string
    target_campaign_id: string
    landing_variant: string
    utm_source: string
    utm_medium: string
    utm_campaign: string
    utm_term: string
    utm_content: string
    start_date: string
    status: string
  }>({
    name: link.name,
    target_campaign_id: link.target_campaign_id,
    landing_variant: link.landing_variant,
    utm_source: link.utm_source || '',
    utm_medium: link.utm_medium || '',
    utm_campaign: link.utm_campaign || '',
    utm_term: link.utm_term || '',
    utm_content: link.utm_content || '',
    start_date: link.start_date || '',
    status: link.status,
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">링크 이름</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">전환 타겟</label>
          <select
            value={formData.target_campaign_id}
            onChange={(e) => setFormData({ ...formData, target_campaign_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          >
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="active">활성</option>
            <option value="paused">일시정지</option>
            <option value="archived">보관</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">광고 시작일</label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
        >
          취소
        </button>
      </div>
    </form>
  )
}
