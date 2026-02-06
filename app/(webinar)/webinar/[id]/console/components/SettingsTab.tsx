'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SettingsTabProps {
  webinar: {
    id: string
    slug?: string | null
    title: string
    project_name?: string | null
    description?: string
    youtube_url: string
    start_time?: string | null
    end_time?: string | null
    max_participants?: number | null
    is_public: boolean
    access_policy: string
    client_id: string
    email_template_text?: string | null
    email_thumbnail_url?: string | null
    meta_title?: string | null
    meta_description?: string | null
    meta_thumbnail_url?: string | null
    dashboard_code?: string | null
    settings?: any
  }
  onWebinarUpdate?: (webinar: any) => void
}

export default function SettingsTab({ webinar, onWebinarUpdate }: SettingsTabProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    projectName: '',
    title: '',
    description: '',
    youtubeUrl: '',
    startTime: '',
    endTime: '',
    maxParticipants: '',
    isPublic: false,
    accessPolicy: 'auth' as 'auth' | 'guest_allowed' | 'invite_only' | 'email_auth' | 'name_email_auth',
    allowedEmails: [] as string[],
    emailTemplateText: '',
    emailThumbnailUrl: '',
    metaTitle: '',
    metaDescription: '',
    metaThumbnailUrl: '',
    isEnded: false,
  })
  const [loading, setLoading] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingMetaThumbnail, setUploadingMetaThumbnail] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (webinar) {
      // UTC 시간을 로컬 시간으로 변환하여 datetime-local 형식으로 표시
      const formatDateTime = (dateString: string | null) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      // 허용된 이메일 목록 로드
      const loadAllowedEmails = async () => {
        if (webinar.access_policy === 'email_auth') {
          try {
            const response = await fetch(`/api/webinars/${webinar.id}/allowed-emails`)
            if (response.ok) {
              const { emails } = await response.json()
              return emails || []
            }
          } catch (error) {
            console.error('허용된 이메일 로드 오류:', error)
          }
        }
        return []
      }
      
      const initializeFormData = async () => {
        const emails = await loadAllowedEmails()
        const settings = webinar.settings as any || {}
        setFormData({
          projectName: webinar.project_name || '',
          title: webinar.title || '',
          description: webinar.description || '',
          youtubeUrl: webinar.youtube_url || '',
          startTime: formatDateTime(webinar.start_time || null),
          endTime: formatDateTime(webinar.end_time || null),
          maxParticipants: webinar.max_participants ? String(webinar.max_participants) : '',
          isPublic: webinar.is_public || false,
          accessPolicy: (webinar.access_policy || 'auth') as 'auth' | 'guest_allowed' | 'invite_only' | 'email_auth' | 'name_email_auth',
          allowedEmails: emails,
          emailTemplateText: webinar.email_template_text || '',
          emailThumbnailUrl: webinar.email_thumbnail_url || '',
          metaTitle: webinar.meta_title || '',
          metaDescription: webinar.meta_description || '',
          metaThumbnailUrl: webinar.meta_thumbnail_url || '',
          isEnded: settings.ended === true || false,
        })
      }
      
      initializeFormData()
    }
  }, [webinar])

  // 웨비나 기본 설정 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // datetime-local 입력값을 UTC ISO 문자열로 변환
      const convertToUTC = (localDateTime: string) => {
        if (!localDateTime) return null
        const localDate = new Date(localDateTime)
        return localDate.toISOString()
      }

      // 기존 settings 가져오기
      const currentSettings = (webinar.settings as any) || {}
      
      // 종료 설정을 settings에 추가
      const updatedSettings = {
        ...currentSettings,
        ended: formData.isEnded,
      }
      
      const requestBody = {
        projectName: formData.projectName || null,
        title: formData.title,
        description: formData.description || null,
        youtubeUrl: formData.youtubeUrl.trim() || null, // 빈 문자열도 null로 변환하여 명시적으로 업데이트
        startTime: convertToUTC(formData.startTime),
        endTime: convertToUTC(formData.endTime),
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        isPublic: formData.isPublic,
        accessPolicy: formData.accessPolicy,
        allowedEmails: formData.accessPolicy === 'email_auth' ? formData.allowedEmails : undefined,
        emailTemplateText: formData.emailTemplateText || null,
        emailThumbnailUrl: formData.emailThumbnailUrl || null,
        settings: updatedSettings,
      }

      console.log('웨비나 설정 저장 요청:', requestBody) // 디버깅용

      const response = await fetch(`/api/webinars/${webinar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      console.log('웨비나 설정 저장 응답:', result) // 디버깅용

      if (!response.ok) {
        throw new Error(result.error || `서버 오류 (${response.status})`)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      if (onWebinarUpdate && result.webinar) {
        onWebinarUpdate(result.webinar)
        // 폼 데이터도 업데이트하여 UI 동기화
        setFormData({
          ...formData,
          youtubeUrl: result.webinar.youtube_url || '',
        })
      }
      
      alert('웨비나 설정이 성공적으로 저장되었습니다')
    } catch (err: any) {
      console.error('웨비나 설정 저장 오류:', err)
      setError(err.message || '웨비나 설정 저장 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 메타링크 설정 저장
  const handleSaveMeta = async () => {
    setError('')
    setSavingMeta(true)

    try {
      const requestBody = {
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        metaThumbnailUrl: formData.metaThumbnailUrl || null,
      }

      const response = await fetch(`/api/webinars/${webinar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `서버 오류 (${response.status})`)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      if (onWebinarUpdate && result.webinar) {
        onWebinarUpdate(result.webinar)
      }
      
      alert('메타링크 설정이 성공적으로 저장되었습니다')
    } catch (err: any) {
      console.error('메타링크 설정 저장 오류:', err)
      setError(err.message || '메타링크 설정 저장 중 오류가 발생했습니다')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 웨비나를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 데이터도 함께 삭제됩니다.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/webinars/${webinar.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '웨비나 삭제 실패')
      }

      alert('웨비나가 성공적으로 삭제되었습니다')
      // 클라이언트 대시보드로 리다이렉트
      router.push(`/client/${webinar.client_id}/dashboard`)
    } catch (err: any) {
      console.error('웨비나 삭제 오류:', err)
      setError(err.message || '웨비나 삭제 중 오류가 발생했습니다')
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

      {/* 공개 대시보드 링크 */}
      <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-base font-semibold text-gray-900 mb-2">공개 대시보드</h4>
        <p className="text-sm text-gray-600 mb-3">
          아래 링크를 공유하면 로그인 없이 참여자 목록을 볼 수 있습니다.
        </p>
        {webinar.dashboard_code ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/webinar/dashboard/${webinar.dashboard_code}`}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/webinar/dashboard/${webinar.dashboard_code}`
                navigator.clipboard.writeText(url)
                alert('링크가 클립보드에 복사되었습니다.')
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              복사
            </button>
            <a
              href={`/webinar/dashboard/${webinar.dashboard_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              열기
            </a>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={async () => {
                if (!webinar.id) {
                  alert('웨비나 ID가 없습니다.')
                  return
                }
                
                try {
                  console.log('대시보드 코드 생성 요청:', webinar.id)
                  const response = await fetch(`/api/webinars/${webinar.id}/generate-dashboard-code`, {
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            프로젝트명
          </label>
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="대시보드에 표시될 프로젝트명을 입력하세요"
          />
          <p className="mt-1 text-sm text-gray-500">
            대시보드에 표시되는 프로젝트명입니다. 비워두면 웨비나 제목이 사용됩니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            웨비나 제목 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="메인 페이지에 노출될 웨비나 제목을 입력하세요"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            메인 페이지에 노출되는 웨비나 제목입니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="웨비나에 대한 설명을 입력하세요"
            rows={3}
          />
        </div>

        <div className="border-t pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">메타 링크 설정</h3>
              <p className="text-sm text-gray-600 mt-1">
                소셜 미디어 공유 및 메타 링크에 사용될 제목과 설명을 설정합니다. 비워두면 웨비나 제목과 설명이 사용됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={savingMeta}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
            >
              {savingMeta ? '저장 중...' : '메타링크 저장'}
            </button>
          </div>
          
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
              비워두면 웨비나 제목이 사용됩니다.
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
              비워두면 웨비나 설명이 사용됩니다.
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
                  
                  const response = await fetch(`/api/webinars/${webinar.id}/meta-thumbnail/upload`, {
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
              소셜 미디어 공유 시 표시될 썸네일 이미지를 업로드하세요. (최대 5MB, 권장 크기: 1200x630px) 비워두면 이메일 썸네일이 사용됩니다.
            </p>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">이메일 등록 안내 설정</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              등록 이메일 문구
            </label>
            <textarea
              value={formData.emailTemplateText}
              onChange={(e) => setFormData({ ...formData, emailTemplateText: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`모두의 특강

${webinar.title}

에 신청해주셔서 감사합니다

해당 라이브는

2026.1.14일 7시에 시작합니다

해당링크를 눌러 접속하시면됩니다`}
              rows={8}
            />
            <p className="mt-1 text-sm text-gray-500">
              등록 이메일에 포함될 문구를 입력하세요. 비워두면 기본 문구가 사용됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              썸네일 이미지
            </label>
            {formData.emailThumbnailUrl && (
              <div className="mb-4">
                <img 
                  src={formData.emailThumbnailUrl} 
                  alt="썸네일 미리보기"
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
                
                setUploadingThumbnail(true)
                setError('')
                
                try {
                  const formDataToUpload = new FormData()
                  formDataToUpload.append('file', file)
                  
                  const response = await fetch(`/api/webinars/${webinar.id}/thumbnail/upload`, {
                    method: 'POST',
                    body: formDataToUpload,
                  })
                  
                  const result = await response.json()
                  
                  if (!response.ok) {
                    throw new Error(result.error || '썸네일 업로드 실패')
                  }
                  
                  setFormData({ ...formData, emailThumbnailUrl: result.url })
                  alert('썸네일이 성공적으로 업로드되었습니다.')
                } catch (err: any) {
                  setError(err.message || '썸네일 업로드 중 오류가 발생했습니다')
                } finally {
                  setUploadingThumbnail(false)
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploadingThumbnail}
            />
            <p className="mt-1 text-sm text-gray-500">
              등록 이메일 및 입장 페이지에 표시될 썸네일 이미지를 업로드하세요. (최대 5MB)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <input
            type="url"
            value={formData.youtubeUrl}
            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작 시간
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료 시간
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            최대 참여자 수
          </label>
          <input
            type="number"
            value={formData.maxParticipants}
            onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="제한 없음"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            접근 정책
          </label>
          <select
            value={formData.accessPolicy}
            onChange={(e) => setFormData({ ...formData, accessPolicy: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="auth">인증필요 (로그인 필수)</option>
            <option value="email_auth">인증필요 (이메일)</option>
            <option value="name_email_auth">인증필요 (이름+이메일)</option>
            <option value="guest_allowed">게스트 허용</option>
            <option value="invite_only">초대 전용</option>
          </select>
          {(formData.accessPolicy === 'email_auth' || formData.accessPolicy === 'name_email_auth') && (
            <div className="mt-4 space-y-4">
              {/* 등록된 이메일별 접속 링크 */}
              {formData.allowedEmails.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    등록된 이메일별 접속 링크
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {formData.allowedEmails.map((email, index) => {
                      const webinarPath = webinar.slug || webinar.id
                      const accessLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'}/webinar/${webinarPath}?email=${encodeURIComponent(email)}`
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600 mb-1">{email}</div>
                            <div className="text-xs text-blue-600 break-all">{accessLink}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(accessLink)
                              alert('접속 링크가 클립보드에 복사되었습니다.')
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            복사
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
              공개 웨비나 (검색 가능)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isEnded"
              checked={formData.isEnded ?? false}
              onChange={(e) => setFormData({ ...formData, isEnded: e.target.checked })}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="isEnded" className="ml-2 block text-sm text-gray-700">
              웨비나 종료 (종료된 웨비나로 표시)
            </label>
          </div>
          <p className="ml-6 text-sm text-gray-500">
            체크하면 웨비나가 종료된 것으로 표시되며, 참가자 입장이 제한됩니다.
          </p>
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
            {loading ? '저장 중...' : '웨비나 설정 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

