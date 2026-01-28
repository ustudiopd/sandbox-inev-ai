'use client'

import { useState, useEffect } from 'react'

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
  status: string
  url: string
  conversion_count?: number
  created_at: string
}

interface Campaign {
  id: string
  title: string
  public_path: string
}

interface CampaignLinksTabProps {
  clientId: string
}

export default function CampaignLinksTab({ clientId }: CampaignLinksTabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [links, setLinks] = useState<CampaignLink[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
  })
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // 링크 수정 상태
  const [editingLink, setEditingLink] = useState<CampaignLink | null>(null)
  
  useEffect(() => {
    loadData()
  }, [clientId])
  
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
      
      // 링크 목록 조회
      const linksResponse = await fetch(`/api/clients/${clientId}/campaigns/links`)
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
      })
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">생성된 링크 목록</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {links.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">생성된 링크가 없습니다</p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + 새 링크 생성
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {links
                .filter(link => link.status !== 'archived')
                .map(link => (
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
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {link.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            전환 타겟: {campaigns.find(c => c.id === link.target_campaign_id)?.title || link.target_campaign_id}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span>랜딩: {link.landing_variant}</span>
                            <span>전환: {link.conversion_count || 0}개</span>
                            <span className={`px-2 py-1 rounded ${
                              link.status === 'active' ? 'bg-green-100 text-green-800' :
                              link.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {link.status === 'active' ? '활성' : link.status === 'paused' ? '일시정지' : '보관'}
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded p-2 mb-2">
                            <p className="text-xs text-gray-500 mb-1">생성된 URL:</p>
                            <p className="text-sm font-mono text-gray-700 break-all">{link.url}</p>
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
          
          <form onSubmit={handleCreateLink} className="space-y-6">
            {/* 링크 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                링크 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 26년 1월 뉴스레터"
                required
              />
            </div>
            
            {/* 전환 타겟 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전환 타겟 (캠페인) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.target_campaign_id}
                onChange={(e) => setFormData({ ...formData, target_campaign_id: e.target.value })}
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
            
            {/* UTM 파라미터 */}
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">UTM 파라미터</h3>
                <p className="text-sm text-gray-600">
                  UTM 파라미터는 마케팅 캠페인의 성과를 추적하는 데 사용됩니다. 각 파라미터는 트래픽의 출처와 특성을 식별하는 데 도움이 됩니다.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Source <span className="text-gray-500 font-normal">(출처)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    트래픽이 발생한 출처를 식별합니다. 예: google, facebook, newsletter, blog, naver
                  </p>
                  <input
                    type="text"
                    value={formData.utm_source}
                    onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: newsletter"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Medium <span className="text-gray-500 font-normal">(매체)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    트래픽을 유도하는 데 사용된 매체를 식별합니다. 예: email, cpc(유료검색), organic(자연검색), social, banner
                  </p>
                  <input
                    type="text"
                    value={formData.utm_medium}
                    onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Campaign <span className="text-gray-500 font-normal">(캠페인)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    특정 캠페인이나 프로모션을 식별합니다. 예: january_2026, product_launch, summer_sale
                  </p>
                  <input
                    type="text"
                    value={formData.utm_campaign}
                    onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: january_2026"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Term <span className="text-gray-500 font-normal">(키워드, 선택)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    주로 유료 검색 캠페인에서 사용되는 키워드를 식별합니다. 예: 마케팅자동화, 이벤트플랫폼
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
                    동일한 캠페인 내에서 다른 버전의 콘텐츠를 구별합니다. 예: banner_ad, text_link, sidebar_ad
                  </p>
                  <input
                    type="text"
                    value={formData.utm_content}
                    onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: banner_ad"
                  />
                </div>
              </div>
              
              {/* UTM 파라미터 예시 */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">💡 예시</p>
                <p className="text-xs text-blue-800 mb-1">
                  <strong>뉴스레터 이메일:</strong> Source=newsletter, Medium=email, Campaign=january_2026
                </p>
                <p className="text-xs text-blue-800 mb-1">
                  <strong>페이스북 광고:</strong> Source=facebook, Medium=cpc, Campaign=product_launch, Content=banner_ad
                </p>
                <p className="text-xs text-blue-800">
                  <strong>구글 검색:</strong> Source=google, Medium=organic, Campaign=brand_search
                </p>
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
  const [formData, setFormData] = useState({
    name: link.name,
    target_campaign_id: link.target_campaign_id,
    landing_variant: link.landing_variant,
    utm_source: link.utm_source || '',
    utm_medium: link.utm_medium || '',
    utm_campaign: link.utm_campaign || '',
    utm_term: link.utm_term || '',
    utm_content: link.utm_content || '',
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
