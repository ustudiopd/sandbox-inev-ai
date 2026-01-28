'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SettingsTabProps {
  campaign: {
    id: string
    title: string
    host?: string | null
    public_path: string
    status: string
    client_id: string
    meta_title?: string | null
    meta_description?: string | null
    meta_thumbnail_url?: string | null
  }
  onCampaignUpdate?: (campaign: any) => void
}

export default function SettingsTab({ campaign, onCampaignUpdate }: SettingsTabProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: campaign.title || '',
    host: campaign.host || '',
    status: campaign.status || 'draft',
    metaTitle: campaign.meta_title || '',
    metaDescription: campaign.meta_description || '',
    metaThumbnailUrl: campaign.meta_thumbnail_url || '',
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingMetaThumbnail, setUploadingMetaThumbnail] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          host: formData.host?.trim() || null,
          status: formData.status,
          meta_title: formData.metaTitle?.trim() || null,
          meta_description: formData.metaDescription?.trim() || null,
          meta_thumbnail_url: formData.metaThumbnailUrl?.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '캠페인 수정 실패')
      }

      if (onCampaignUpdate && result.campaign) {
        onCampaignUpdate(result.campaign)
      }
      
      alert('캠페인이 성공적으로 수정되었습니다')
    } catch (err: any) {
      console.error('캠페인 수정 오류:', err)
      setError(err.message || '캠페인 수정 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 설문조사 캠페인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 데이터도 함께 삭제됩니다.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/event-survey/campaigns/${campaign.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '캠페인 삭제 실패')
      }

      alert('캠페인이 성공적으로 삭제되었습니다')
      // 클라이언트 대시보드로 리다이렉트
      router.push(`/client/${campaign.client_id}/dashboard`)
    } catch (err: any) {
      console.error('캠페인 삭제 오류:', err)
      setError(err.message || '캠페인 삭제 중 오류가 발생했습니다')
      setDeleting(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            캠페인 제목 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="캠페인 제목을 입력하세요"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            호스트 (선택사항)
          </label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example.com"
          />
          <p className="mt-1 text-sm text-gray-500">
            도메인 식별용입니다. 비워두면 기본 도메인을 사용합니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상태 *
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="draft">초안 (Draft)</option>
            <option value="published">발행됨 (Published)</option>
            <option value="closed">종료됨 (Closed)</option>
          </select>
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm text-gray-600 mb-4">
            <p className="font-medium mb-2">공개 경로:</p>
            <p className="font-mono text-blue-600">{campaign.public_path}</p>
            <p className="mt-2 text-xs text-gray-500">
              공개 경로는 변경할 수 없습니다.
            </p>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">메타 링크 설정</h3>
          <p className="text-sm text-gray-600 mb-4">
            소셜 미디어 공유 및 메타 링크에 사용될 제목, 설명, 썸네일을 설정합니다. 비워두면 캠페인 제목과 설명이 사용됩니다.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메타 제목
            </label>
            <input
              type="text"
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="소셜 미디어 공유 시 표시될 제목을 입력하세요"
            />
            <p className="mt-1 text-sm text-gray-500">
              비워두면 캠페인 제목이 사용됩니다.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메타 설명
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="소셜 미디어 공유 시 표시될 설명을 입력하세요"
              rows={3}
            />
            <p className="mt-1 text-sm text-gray-500">
              비워두면 캠페인 설명이 사용됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메타 썸네일 이미지
            </label>
            {formData.metaThumbnailUrl && (
              <div className="mb-4">
                <img 
                  src={formData.metaThumbnailUrl} 
                  alt="메타 썸네일 미리보기"
                  className="max-w-md h-auto rounded-lg border border-gray-300"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                
                setUploadingMetaThumbnail(true)
                setError('')
                
                try {
                  const formDataToUpload = new FormData()
                  formDataToUpload.append('file', file)
                  
                  const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/meta-thumbnail/upload`, {
                    method: 'POST',
                    body: formDataToUpload,
                  })
                  
                  const result = await response.json()
                  
                  if (!response.ok) {
                    throw new Error(result.error || '메타 썸네일 업로드 실패')
                  }
                  
                  setFormData({ ...formData, metaThumbnailUrl: result.url })
                  alert('메타 썸네일이 성공적으로 업로드되었습니다.')
                } catch (err: any) {
                  setError(err.message || '메타 썸네일 업로드 중 오류가 발생했습니다')
                } finally {
                  setUploadingMetaThumbnail(false)
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploadingMetaThumbnail}
            />
            <p className="mt-1 text-sm text-gray-500">
              소셜 미디어 공유 시 표시될 썸네일 이미지를 업로드하세요. (최대 5MB, 권장 크기: 1200x630px)
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
          >
            {deleting ? '삭제 중...' : '삭제하기'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? '수정 중...' : '수정하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

