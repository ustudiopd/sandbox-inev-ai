'use client'

import { useState, useEffect } from 'react'
import { CHANNEL_TEMPLATES, CONTENT_OPTIONS, generateUTMCampaign, generateHumanReadableDescription, type ChannelTemplate } from '@/lib/utils/utmTemplate'
import { Copy, ExternalLink, Trash2, Edit2, Plus, Check } from 'lucide-react'

interface EventUTMLink {
  id: string
  name: string
  landing_variant: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  start_date: string | null
  status: string
  url: string
  share_url?: string
  campaign_url?: string
  visits_count?: number
  unique_sessions?: number
  leads_count?: number
  cvr?: number
  created_at: string
}

interface EventUTMLinksTabProps {
  eventId: string
}

export default function EventUTMLinksTab({ eventId }: EventUTMLinksTabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [links, setLinks] = useState<EventUTMLink[]>([])
  const [event, setEvent] = useState<{ slug: string; client_id: string } | null>(null)
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null)
  
  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all')
  
  // 템플릿 관련 상태
  const [selectedTemplate, setSelectedTemplate] = useState<ChannelTemplate | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  
  // 링크 생성 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    landing_variant: 'welcome',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    start_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // 링크 수정 상태
  const [editingLink, setEditingLink] = useState<EventUTMLink | null>(null)

  useEffect(() => {
    loadEvent()
    loadLinks()
  }, [eventId])

  const loadEvent = async () => {
    try {
      const response = await fetch(`/api/inev/events/${eventId}`)
      if (!response.ok) {
        throw new Error('이벤트 조회 실패')
      }
      const data = await response.json()
      if (data.slug) {
        setEvent({ slug: data.slug, client_id: data.client_id })
        // 클라이언트 이름 조회 (inev-admin용 API 사용)
        try {
          // inev-admin 컨텍스트에서는 /api/inev/clients 사용
          const clientResponse = await fetch('/api/inev/clients')
          if (clientResponse.ok) {
            const clientsData = await clientResponse.json()
            if (Array.isArray(clientsData)) {
              const client = clientsData.find((c: any) => c.id === data.client_id)
              if (client?.name) {
                setClientName(client.name)
              }
            }
          }
        } catch (e) {
          console.error('클라이언트 조회 오류:', e)
        }
      }
    } catch (e) {
      console.error('이벤트 조회 오류:', e)
    }
  }

  const loadLinks = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/inev/events/${eventId}/utm-links`)
      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.error || '링크 목록을 불러오는데 실패했습니다')
        } catch {
          setError('링크 목록을 불러오는데 실패했습니다')
        }
        return
      }
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setLinks(Array.isArray(data) ? data : [])
      }
    } catch (e: any) {
      setError(e.message || '링크 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 템플릿 선택 핸들러
  const handleTemplateSelect = (template: ChannelTemplate) => {
    setSelectedTemplate(template)
    
    if (template.id !== 'custom') {
      setFormData(prev => ({
        ...prev,
        utm_source: template.utm_source,
        utm_medium: template.utm_medium,
      }))
    } else {
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
    
    // utm_campaign 자동 생성
    if (name && event) {
      const generatedCampaign = generateUTMCampaign(
        name,
        clientName || 'client',
        event.slug,
        selectedTemplate?.id || 'custom'
      )
      setFormData(prev => ({
        ...prev,
        utm_campaign: generatedCampaign,
      }))
    }
  }

  // 링크 생성 핸들러
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setCreateError(null)
    setDuplicateWarning(null)

    try {
      const response = await fetch(`/api/inev/events/${eventId}/utm-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || '링크 생성에 실패했습니다')
        } catch {
          throw new Error('링크 생성에 실패했습니다')
        }
      }

      const data = await response.json()

      // 성공 시 목록 새로고침 및 폼 초기화
      await loadLinks()
      setActiveTab('list')
      setFormData({
        name: '',
        landing_variant: 'welcome',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        start_date: '',
      })
      setSelectedTemplate(null)
    } catch (err: any) {
      setCreateError(err.message || '링크 생성에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  // 링크 수정 핸들러
  const handleUpdateLink = async (link: EventUTMLink, updates: Partial<EventUTMLink>) => {
    try {
      const response = await fetch(`/api/inev/events/${eventId}/utm-links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || '링크 수정에 실패했습니다')
        } catch {
          throw new Error('링크 수정에 실패했습니다')
        }
      }

      await loadLinks()
      setEditingLink(null)
    } catch (err: any) {
      alert(err.message || '링크 수정에 실패했습니다')
    }
  }

  // 링크 삭제 핸들러
  const handleDeleteLink = async (link: EventUTMLink) => {
    if (!confirm(`"${link.name}" 링크를 삭제하시겠습니까?`)) return

    try {
      const response = await fetch(`/api/inev/events/${eventId}/utm-links/${link.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || '링크 삭제에 실패했습니다')
        } catch {
          throw new Error('링크 삭제에 실패했습니다')
        }
      }

      await loadLinks()
    } catch (err: any) {
      alert(err.message || '링크 삭제에 실패했습니다')
    }
  }

  // 클립보드 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('링크가 클립보드에 복사되었습니다')
    }).catch(() => {
      alert('복사에 실패했습니다')
    })
  }

  // 필터링된 링크 목록
  const filteredLinks = links.filter(link => {
    if (statusFilter !== 'all' && link.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        link.name.toLowerCase().includes(query) ||
        (link.utm_source && link.utm_source.toLowerCase().includes(query)) ||
        (link.utm_medium && link.utm_medium.toLowerCase().includes(query)) ||
        (link.utm_campaign && link.utm_campaign.toLowerCase().includes(query))
      )
    }
    return true
  })

  if (loading && links.length === 0) {
    return <div className="text-gray-500">로딩 중...</div>
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
          {/* 검색 및 필터 바 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="링크 이름, UTM으로 검색..."
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
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
              {!searchQuery && statusFilter === 'all' && (
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  첫 번째 링크 생성하기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredLinks.map(link => (
                <div key={link.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{link.name}</h3>
                      {(link.utm_source || link.utm_medium) && (
                        <p className="text-sm text-gray-600 mb-2">
                          UTM: {link.utm_source}/{link.utm_medium}
                          {link.utm_campaign && ` • ${link.utm_campaign}`}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {link.visits_count !== undefined && (
                          <span>Visits: {link.visits_count.toLocaleString()}</span>
                        )}
                        {link.leads_count !== undefined && (
                          <span>Leads: {link.leads_count.toLocaleString()}</span>
                        )}
                        {link.cvr !== undefined && (
                          <span>CVR: {(link.cvr * 100).toFixed(2)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(link.campaign_url || link.url)}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="링크 복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingLink(link)}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link)}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 링크 URL 표시 */}
                  <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-600">광고용 링크 (UTM 포함):</span>
                      <button
                        onClick={() => copyToClipboard(link.campaign_url || link.url)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        복사
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 break-all">{link.campaign_url || link.url}</p>
                    {link.share_url && (
                      <>
                        <div className="flex items-center gap-2 mt-2 mb-2">
                          <span className="text-xs font-medium text-gray-600">공유용 링크 (짧음):</span>
                          <button
                            onClick={() => copyToClipboard(link.share_url!)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            복사
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 break-all">{link.share_url}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 링크 생성 탭 */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">새 UTM 링크 생성</h2>
          
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
            </div>
            
            {/* UTM 파라미터 */}
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">UTM 파라미터</h3>
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
                  </label>
                  {showAdvanced || !selectedTemplate || selectedTemplate.id === 'custom' ? (
                    <input
                      type="text"
                      value={formData.utm_source}
                      onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="예: newsletter"
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
                  </label>
                  {showAdvanced || !selectedTemplate || selectedTemplate.id === 'custom' ? (
                    <input
                      type="text"
                      value={formData.utm_medium}
                      onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="예: email"
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
                  <input
                    type="text"
                    value={formData.utm_campaign}
                    onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-green-50"
                    placeholder="자동 생성됨"
                    readOnly={!showAdvanced}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Term <span className="text-gray-500 font-normal">(키워드, 선택)</span>
                  </label>
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
                disabled={submitting || !selectedTemplate}
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
