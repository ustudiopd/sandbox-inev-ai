'use client'

import { useState, useEffect, useRef } from 'react'
import { markdownToHtml } from '@/lib/email/markdown-to-html'
import { processTemplate } from '@/lib/email/template-processor'

// 기본 푸터 텍스트 (마크다운 형식)
const DEFAULT_FOOTER_TEXT = `본 이메일은 워트 웨비나 등록 확인을 위해 발송되었습니다.

워트(WERT)

웨비나와 관련된 문의사항이 있으시면 아래 연락처를 통해 문의주시기 바랍니다.

메일문의: crm@wert.co.kr`

interface EmailCampaignTabProps {
  clientId: string
  scopeType: 'webinar' | 'registration_campaign'
  scopeId: string
}

interface EmailCampaign {
  id: string
  subject: string
  status: 'draft' | 'ready' | 'sending' | 'sent' | 'failed' | 'canceled'
  campaign_type: string
  created_at: string
  sent_at: string | null
  total_recipients: number | null
  sent_count: number | null
  failed_count: number | null
}

interface CampaignDetail {
  id: string
  subject: string
  preheader: string | null
  body_md: string
  status: 'draft' | 'ready' | 'sending' | 'sent' | 'failed' | 'canceled'
  campaign_type: string
  variables_json?: Record<string, string>
  header_image_url?: string | null
  footer_text?: string | null
}

export default function EmailCampaignTab({ clientId, scopeType, scopeId }: EmailCampaignTabProps) {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // 생성 폼 상태
  const [campaignType, setCampaignType] = useState<'reminder_d1' | 'reminder_h1' | 'confirmation' | 'custom'>('reminder_d1')
  const [creating, setCreating] = useState(false)
  
  // 편집 폼 상태
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null)
  const [editForm, setEditForm] = useState({
    subject: '',
    preheader: '',
        body_md: '',
        header_image_url: '',
        footer_text: DEFAULT_FOOTER_TEXT,
  })
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [showTestSendModal, setShowTestSendModal] = useState(false)
  const [testEmails, setTestEmails] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [sending, setSending] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduledSendAt, setScheduledSendAt] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<EmailCampaign | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingRecipientCount, setLoadingRecipientCount] = useState(false)
  const [recipientSamples, setRecipientSamples] = useState<Array<{ email: string; displayName?: string }>>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showVariableHelp, setShowVariableHelp] = useState(false)
  const [showImageGallery, setShowImageGallery] = useState(false)
  const [images, setImages] = useState<Array<{ url: string; path: string; name: string }>>([])
  const [loadingImages, setLoadingImages] = useState(false)
  
  useEffect(() => {
    fetchCampaigns()
  }, [clientId, scopeType, scopeId])
  
  const fetchImages = async () => {
    try {
      setLoadingImages(true)
      const response = await fetch(`/api/client/images?clientId=${clientId}`)
      const result = await response.json()
      
      if (result.success) {
        setImages(result.data.images || [])
      } else {
        console.error('이미지 목록 조회 실패:', result.error)
      }
    } catch (error: any) {
      console.error('이미지 목록 조회 오류:', error)
    } finally {
      setLoadingImages(false)
    }
  }
  
  const handleOpenImageGallery = () => {
    setShowImageGallery(true)
    fetchImages()
  }
  
  const handleSelectImage = (imageUrl: string) => {
    setEditForm({ ...editForm, header_image_url: imageUrl })
    setShowImageGallery(false)
  }
  
  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('이메일 캠페인 조회:', { clientId, scopeType, scopeId })
      
      const response = await fetch(`/api/client/emails?clientId=${clientId}&scopeType=${scopeType}&scopeId=${scopeId}`)
      const result = await response.json()
      
      console.log('이메일 캠페인 조회 결과:', result)
      
      if (result.success) {
        setCampaigns(result.data.campaigns || [])
        setError(null)
      } else {
        const errorMessage = result.error || '캠페인 목록을 불러오는 중 오류가 발생했습니다.'
        console.error('이메일 캠페인 조회 실패:', errorMessage)
        setError(errorMessage)
      }
    } catch (error: any) {
      console.error('이메일 캠페인 목록 조회 오류:', error)
      setError(`네트워크 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateCampaign = async () => {
    try {
      setCreating(true)
      const response = await fetch('/api/client/emails/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          scopeType,
          scopeId,
          campaignType,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchCampaigns()
        setShowCreateModal(false)
        setCampaignType('reminder_d1')
      } else {
        alert(`캠페인 생성 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('캠페인 생성 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setCreating(false)
    }
  }
  
  const handleEditClick = async (campaign: EmailCampaign) => {
    try {
      setLoadingDetail(true)
      setSelectedCampaign(campaign)
      
      const response = await fetch(`/api/client/emails/${campaign.id}`)
      const result = await response.json()
      
      if (result.success) {
        const detail = result.data.campaign
        setCampaignDetail(detail)
        setEditForm({
          subject: detail.subject || '',
          preheader: detail.preheader || '',
          body_md: detail.body_md || '',
          header_image_url: detail.header_image_url || '',
          footer_text: detail.footer_text || DEFAULT_FOOTER_TEXT,
        })
        setShowEditModal(true)
      } else {
        alert(`캠페인 조회 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('캠페인 조회 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setLoadingDetail(false)
    }
  }
  
  const handleSave = async () => {
    if (!selectedCampaign) return
    
    try {
      setSaving(true)
      // footer_text가 기본값과 동일하거나 빈 문자열이면 null로 저장 (기본 푸터 사용)
      const footerTextToSave = 
        !editForm.footer_text || 
        editForm.footer_text.trim() === '' || 
        editForm.footer_text.trim() === DEFAULT_FOOTER_TEXT.trim()
          ? null
          : editForm.footer_text
      
      const response = await fetch(`/api/client/emails/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editForm.subject,
          preheader: editForm.preheader,
          body_md: editForm.body_md,
          header_image_url: editForm.header_image_url || null,
          footer_text: footerTextToSave,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchCampaigns()
        setShowEditModal(false)
        setSelectedCampaign(null)
        setCampaignDetail(null)
      } else {
        alert(`저장 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('저장 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setSaving(false)
    }
  }
  
  const handlePreview = () => {
    const variables = campaignDetail?.variables_json || {}
    // 미리보기용 샘플 개인화 변수 추가
    const previewVariables = {
      ...variables,
      email: 'example@example.com',
      recipient_email: 'example@example.com',
      name: '홍길동',
      recipient_name: '홍길동',
    }
    const processedSubject = processTemplate(editForm.subject, previewVariables)
    const processedBody = processTemplate(editForm.body_md, previewVariables)
    
    // 푸터 텍스트 처리 (변수 치환)
    // 빈 문자열이면 기본 푸터 사용, 아니면 사용자 입력값 사용
    const footerTextToUse = editForm.footer_text && editForm.footer_text.trim()
      ? editForm.footer_text
      : DEFAULT_FOOTER_TEXT
    const processedFooter = processTemplate(footerTextToUse, previewVariables)
    
    // 마크다운을 HTML로 변환 (헤더 이미지와 푸터 포함)
    const fullHtml = markdownToHtml(
      processedBody,
      true,
      editForm.header_image_url || null,
      processedFooter
    )
    
    // 제목을 포함한 전체 HTML 생성
    const htmlWithTitle = fullHtml.replace(
      '<div class="content">',
      `<div class="content"><h1 style="font-size: 24px; margin-bottom: 20px;">${processedSubject}</h1>`
    )
    
    setPreviewHtml(htmlWithTitle)
    setShowPreview(true)
  }
  
  const handleApprove = async () => {
    if (!selectedCampaign) return
    
    if (!confirm('이메일 캠페인을 승인하시겠습니까? 승인 후 테스트 발송 및 실제 발송이 가능합니다.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/client/emails/${selectedCampaign.id}/approve`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('승인되었습니다.')
        await fetchCampaigns()
        if (campaignDetail) {
          await handleEditClick(selectedCampaign)
        }
      } else {
        alert(`승인 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('승인 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    }
  }
  
  const handleCancelApproval = async () => {
    if (!selectedCampaign) return
    
    if (!confirm('승인을 취소하시겠습니까? 초안 상태로 돌아가 수정할 수 있습니다.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/client/emails/${selectedCampaign.id}/cancel-approval`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('승인이 취소되었습니다.')
        await fetchCampaigns()
        if (campaignDetail) {
          await handleEditClick(selectedCampaign)
        }
      } else {
        alert(`승인 취소 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('승인 취소 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    }
  }
  
  const handleTestSend = async () => {
    if (!selectedCampaign) return
    
    const emails = testEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))
    
    if (emails.length === 0) {
      alert('올바른 이메일 주소를 입력해주세요.')
      return
    }
    
    if (emails.length > 10) {
      alert('테스트 이메일은 최대 10개까지 가능합니다.')
      return
    }
    
    try {
      setSendingTest(true)
      const response = await fetch(`/api/client/emails/${selectedCampaign.id}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmails: emails }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`테스트 이메일이 발송되었습니다. (성공: ${result.data.run.meta_json.success}개, 실패: ${result.data.run.meta_json.failed}개)`)
        setShowTestSendModal(false)
        setTestEmails('')
      } else {
        alert(`테스트 발송 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('테스트 발송 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setSendingTest(false)
    }
  }
  
  const handleSendClick = async () => {
    if (!selectedCampaign) return
    
    // 수신자 수 미리 조회
    try {
      setLoadingRecipientCount(true)
      const previewResponse = await fetch(`/api/client/emails/${selectedCampaign.id}/audience-preview`)
      const previewResult = await previewResponse.json()
      
      if (previewResult.success) {
        setRecipientCount(previewResult.data.totalCount)
        setRecipientSamples(previewResult.data.samples || [])
        setShowSendConfirmModal(true)
      } else {
        alert(`수신자 조회 실패: ${previewResult.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('수신자 조회 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setLoadingRecipientCount(false)
    }
  }
  
  const handleSend = async () => {
    if (!selectedCampaign) return
    
    setShowSendConfirmModal(false)
    
    try {
      setSending(true)
      const response = await fetch(`/api/client/emails/${selectedCampaign.id}/send`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`이메일 발송이 시작되었습니다. (총 ${result.data.run.meta_json.total}명, 성공: ${result.data.run.meta_json.success}개, 실패: ${result.data.run.meta_json.failed}개)`)
        await fetchCampaigns()
        setShowEditModal(false)
        setSelectedCampaign(null)
        setCampaignDetail(null)
        setRecipientCount(null)
        setRecipientSamples([])
      } else {
        alert(`발송 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('발송 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setSending(false)
    }
  }
  
  const handleSchedule = async () => {
    if (!selectedCampaign || !scheduledSendAt) return
    
    if (!confirm(`정말로 ${new Date(scheduledSendAt).toLocaleString('ko-KR')}에 이메일을 예약 발송하시겠습니까?`)) {
      return
    }
    
    try {
      setScheduling(true)
      // 예약 발송은 scheduled_send_at을 업데이트하는 API가 필요합니다
      // 일단 간단하게 PUT으로 업데이트
      const response = await fetch(`/api/client/emails/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_send_at: scheduledSendAt,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('예약 발송이 설정되었습니다.')
        setShowScheduleModal(false)
        setScheduledSendAt('')
        await fetchCampaigns()
      } else {
        alert(`예약 설정 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('예약 설정 오류:', error)
      alert(`네트워크 오류: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setScheduling(false)
    }
  }
  
  const handleDeleteClick = (campaign: EmailCampaign) => {
    setCampaignToDelete(campaign)
    setShowDeleteModal(true)
  }
  
  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return
    
    try {
      setDeleting(true)
      setError(null)
      
      const response = await fetch(`/api/client/emails/${campaignToDelete.id}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 목록 새로고침
        await fetchCampaigns()
        setShowDeleteModal(false)
        setCampaignToDelete(null)
      } else {
        setError(result.error || '캠페인 삭제에 실패했습니다')
      }
    } catch (error: any) {
      console.error('캠페인 삭제 오류:', error)
      setError(`네트워크 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`)
    } finally {
      setDeleting(false)
    }
  }
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('이미지 파일만 업로드할 수 있습니다. (JPEG, PNG, GIF, WebP)')
      return
    }
    
    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }
    
    try {
      setUploadingImage(true)
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || '이미지 업로드에 실패했습니다.')
      }
      
      const data = await response.json()
      
      // 업로드된 이미지 URL을 입력 필드에 설정
      setEditForm({ ...editForm, header_image_url: data.url })
      
      // 갤러리가 열려있으면 새로고침
      if (showImageGallery) {
        await fetchImages()
      }
      
      alert('이미지가 업로드되었습니다.')
    } catch (error: any) {
      console.error('이미지 업로드 오류:', error)
      alert(`이미지 업로드 실패: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setUploadingImage(false)
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  const canDelete = (status: string) => {
    return ['draft', 'ready', 'canceled'].includes(status)
  }
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      ready: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      draft: '초안',
      ready: '승인됨',
      sending: '발송 중',
      sent: '발송 완료',
      failed: '실패',
      canceled: '취소됨',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    )
  }
  
  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">이메일 캠페인</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 새 캠페인 생성
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      
      {campaigns.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          등록된 이메일 캠페인이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">수신자</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{campaign.subject}</td>
                  <td className="px-4 py-3 text-sm">{campaign.campaign_type}</td>
                  <td className="px-4 py-3">{getStatusBadge(campaign.status)}</td>
                  <td className="px-4 py-3 text-sm">
                    {campaign.total_recipients !== null ? (
                      <>
                        총 {campaign.total_recipients}명
                        {campaign.sent_count !== null && campaign.sent_count > 0 && (
                          <span className="text-green-600 ml-2">✓ {campaign.sent_count}명 발송</span>
                        )}
                        {campaign.failed_count !== null && campaign.failed_count > 0 && (
                          <span className="text-red-600 ml-2">✗ {campaign.failed_count}명 실패</span>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(campaign.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(campaign)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        편집
                      </button>
                      {canDelete(campaign.status) && (
                        <button
                          onClick={() => handleDeleteClick(campaign)}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">새 이메일 캠페인 생성</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">캠페인 타입</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="reminder_d1">D-1 리마인더</option>
                <option value="reminder_h1">H-1 리마인더</option>
                <option value="confirmation">등록 확인</option>
                <option value="custom">커스텀</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creating ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 편집 모달 */}
      {showEditModal && campaignDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 min-h-fit">
            <h3 className="text-lg font-semibold mb-4">이메일 캠페인 편집</h3>
            <p className="text-sm text-gray-600 mb-4">캠페인 ID: {campaignDetail.id}</p>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="이메일 제목"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Preheader</label>
                <input
                  type="text"
                  value={editForm.preheader}
                  onChange={(e) => setEditForm({ ...editForm, preheader: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="이메일 미리보기 텍스트"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">본문 (마크다운)</label>
                  <button
                    type="button"
                    onClick={() => setShowVariableHelp(!showVariableHelp)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showVariableHelp ? '변수 숨기기' : '사용 가능한 변수 보기'}
                  </button>
                </div>
                {showVariableHelp && (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                    <p className="font-semibold text-blue-900 mb-2">📝 사용 가능한 개인화 변수:</p>
                    <div className="space-y-1 text-blue-800">
                      <div><code className="bg-white px-1 rounded">{'{{title}}'}</code> - 웨비나/이벤트 제목</div>
                      <div><code className="bg-white px-1 rounded">{'{{url}}'}</code> - 입장 링크 URL</div>
                      <div><code className="bg-white px-1 rounded">{'{{date}}'}</code> - 시작 날짜 (예: 2026.2.3일)</div>
                      <div><code className="bg-white px-1 rounded">{'{{time}}'}</code> - 시작 시간 (예: 7시)</div>
                      <div><code className="bg-white px-1 rounded">{'{{datetime}}'}</code> - 시작 일시 (예: 2026.2.3일 7시)</div>
                      <div><code className="bg-white px-1 rounded">{'{{thumbnail_url}}'}</code> - 썸네일 이미지 URL</div>
                      <div className="mt-2 pt-2 border-t border-blue-300">
                        <p className="font-semibold text-blue-900 mb-1">👤 수신자별 개인화 변수:</p>
                        <div><code className="bg-white px-1 rounded">{'{{name}}'}</code> 또는 <code className="bg-white px-1 rounded">{'{{recipient_name}}'}</code> - 등록자 이름 (없으면 이메일 앞부분)</div>
                        <div><code className="bg-white px-1 rounded">{'{{email}}'}</code> 또는 <code className="bg-white px-1 rounded">{'{{recipient_email}}'}</code> - 수신자 이메일 주소</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-300">
                        <p className="text-blue-700 italic">💡 사용 예시: "안녕하세요 {'{{name}}'}님, {'{{title}}'}에 신청해주셔서 감사합니다."</p>
                      </div>
                    </div>
                  </div>
                )}
                <textarea
                  value={editForm.body_md}
                  onChange={(e) => setEditForm({ ...editForm, body_md: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-64"
                  placeholder="이메일 본문을 마크다운 형식으로 작성하세요&#10;&#10;예시:&#10;안녕하세요 {{name}}님,&#10;&#10;{{title}}에 신청해주셔서 감사합니다."
                />
                <p className="mt-1 text-xs text-gray-500">마크다운 형식을 지원합니다. 변수는 {'{{변수명}}'} 형식으로 사용할 수 있습니다.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">상단 헤더 이미지 URL (선택)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={editForm.header_image_url}
                    onChange={(e) => setEditForm({ ...editForm, header_image_url: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://example.com/image.jpg 또는 파일 업로드"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="header-image-upload"
                  />
                  <label
                    htmlFor="header-image-upload"
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      uploadingImage
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {uploadingImage ? '업로드 중...' : '업로드'}
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenImageGallery}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    이미지 선택
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  이미지 URL을 직접 입력하거나 파일을 업로드하거나, 업로드된 이미지에서 선택할 수 있습니다. (JPEG, PNG, GIF, WebP, 최대 10MB)
                </p>
                {editForm.header_image_url && (
                  <div className="mt-2">
                    <img 
                      src={editForm.header_image_url} 
                      alt="헤더 이미지 미리보기" 
                      className="max-w-full h-auto border border-gray-300 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">하단 푸터 텍스트 (선택)</label>
                <textarea
                  value={editForm.footer_text}
                  onChange={(e) => setEditForm({ ...editForm, footer_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
                  placeholder="이메일 하단에 표시될 푸터 텍스트를 입력하세요 (마크다운 지원). 비워두면 기본 푸터가 사용됩니다."
                />
                <p className="mt-1 text-xs text-gray-500">비워두면 기본 워트 푸터가 사용됩니다</p>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">상태:</span>
                  {getStatusBadge(campaignDetail.status)}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedCampaign(null)
                    setCampaignDetail(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  미리보기
                </button>
                {(campaignDetail.status === 'draft' || campaignDetail.status === 'ready') && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                )}
                {campaignDetail.status === 'draft' && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    승인하기
                  </button>
                )}
                {campaignDetail.status === 'ready' && (
                  <>
                    <button
                      onClick={() => setShowTestSendModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      테스트 발송
                    </button>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      예약 발송
                    </button>
                    <button
                      onClick={handleSendClick}
                      disabled={sending || loadingRecipientCount}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loadingRecipientCount ? '수신자 조회 중...' : sending ? '발송 중...' : '지금 발송'}
                    </button>
                    <button
                      onClick={handleCancelApproval}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      승인 취소
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 미리보기 모달 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">이메일 미리보기</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
            <div
              className="border border-gray-200 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}
      
      {/* 테스트 발송 모달 */}
      {showTestSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">테스트 이메일 발송</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">이메일 주소 (쉼표로 구분, 최대 10개)</label>
              <textarea
                value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
                placeholder="test1@example.com, test2@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">쉼표로 구분하여 여러 이메일을 입력할 수 있습니다</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowTestSendModal(false)
                  setTestEmails('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={sendingTest}
              >
                취소
              </button>
              <button
                onClick={handleTestSend}
                disabled={sendingTest || !testEmails.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {sendingTest ? '발송 중...' : '발송'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 예약 발송 모달 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">예약 발송 설정</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">발송 일시</label>
              <input
                type="datetime-local"
                value={scheduledSendAt}
                onChange={(e) => setScheduledSendAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="mt-1 text-xs text-gray-500">예약된 시간에 자동으로 발송됩니다</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowScheduleModal(false)
                  setScheduledSendAt('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={scheduling}
              >
                취소
              </button>
              <button
                onClick={handleSchedule}
                disabled={scheduling || !scheduledSendAt}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {scheduling ? '설정 중...' : '예약 설정'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">캠페인 삭제 확인</h3>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                다음 캠페인을 삭제하시겠습니까?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{campaignToDelete.subject}</p>
                <p className="text-sm text-gray-600 mt-1">
                  상태: {getStatusBadge(campaignToDelete.status)}
                </p>
              </div>
              <p className="text-sm text-red-600 mt-3">
                ⚠️ 이 작업은 되돌릴 수 없습니다. 캠페인과 관련된 모든 발송 로그도 함께 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setCampaignToDelete(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 발송 확인 모달 */}
      {showSendConfirmModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">이메일 발송 확인</h3>
            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-medium text-gray-900 mb-1">{selectedCampaign.subject}</p>
                <p className="text-sm text-gray-600">
                  상태: {getStatusBadge(selectedCampaign.status)}
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  📊 발송 대상자 정보
                </p>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {recipientCount !== null ? recipientCount.toLocaleString() : '-'}
                    </span>
                    <span className="text-sm text-gray-600">명</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {scopeType === 'webinar' 
                      ? '웨비나 등록자 목록에서 조회된 수신자 수입니다.'
                      : '등록 캠페인 등록자 목록에서 조회된 수신자 수입니다.'}
                  </p>
                  
                  {recipientSamples.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">수신자 샘플 (최대 10명):</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {recipientSamples.map((sample, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="font-mono">{sample.email}</span>
                            {sample.displayName && (
                              <span className="text-gray-500">({sample.displayName})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ 이 작업은 취소할 수 없습니다. 정말로 발송하시겠습니까?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSendConfirmModal(false)
                  setRecipientCount(null)
                  setRecipientSamples([])
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={sending}
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={sending || recipientCount === null || recipientCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {sending ? '발송 중...' : recipientCount === 0 ? '수신자 없음' : '발송하기'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 이미지 갤러리 모달 */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">이미지 선택</h3>
              <button
                onClick={() => setShowImageGallery(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {loadingImages ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500">이미지 목록을 불러오는 중...</div>
              </div>
            ) : images.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500">업로드된 이미지가 없습니다.</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => handleSelectImage(image.url)}
                    >
                      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dy=".3em"%3E이미지%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate" title={image.name}>
                          {image.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowImageGallery(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
