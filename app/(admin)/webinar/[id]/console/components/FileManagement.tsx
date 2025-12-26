'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

interface WebinarFile {
  id: number
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
  uploaded_by: string
}

interface FileManagementProps {
  webinarId: string
}

export default function FileManagement({ webinarId }: FileManagementProps) {
  const [files, setFiles] = useState<WebinarFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadFiles()
    
    // 실시간 구독
    const channel = supabase
      .channel(`webinar-${webinarId}-files-management`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webinar_files',
          filter: `webinar_id=eq.${webinarId}`,
        },
        () => {
          loadFiles()
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [webinarId])
  
  const loadFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/webinars/${webinarId}/files`)
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '파일 목록 로드 실패')
      }
      
      setFiles(result.files || [])
    } catch (error) {
      console.error('파일 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 파일 크기 검증 (100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      alert('파일 크기는 100MB를 초과할 수 없습니다')
      return
    }
    
    // MIME 타입 검증
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ]
    
    if (!allowedTypes.includes(file.type)) {
      alert('지원하지 않는 파일 형식입니다. PDF, PPT, PPTX, DOC, DOCX, ZIP만 업로드 가능합니다.')
      return
    }
    
    await handleUpload(file)
  }
  
  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`/api/webinars/${webinarId}/files/upload`, {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '업로드 실패')
      }
      
      setUploadProgress(100)
      loadFiles()
      
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('업로드 실패:', error)
      alert(error.message || '파일 업로드에 실패했습니다')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }
  
  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`"${fileName}" 파일을 삭제하시겠습니까?`)) return
    
    try {
      const response = await fetch(`/api/webinars/${webinarId}/files/${fileId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '삭제 실패')
      }
      
      loadFiles()
    } catch (error: any) {
      console.error('삭제 실패:', error)
      alert(error.message || '파일 삭제에 실패했습니다')
    }
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('zip')) return '📦'
    return '📎'
  }
  
  return (
    <div>
      {/* 업로드 영역 */}
      <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.ppt,.pptx,.doc,.docx,.zip"
          className="hidden"
          disabled={uploading}
        />
        <div className="text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? '업로드 중...' : '+ 파일 업로드'}
          </button>
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            PDF, PPT, PPTX, DOC, DOCX, ZIP (최대 100MB)
          </p>
        </div>
      </div>
      
      {/* 파일 목록 */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {loading && files.length === 0 ? (
          <div className="text-center text-gray-500 py-8">파일을 불러오는 중...</div>
        ) : files.length === 0 ? (
          <div className="text-center text-gray-500 py-8">업로드된 파일이 없습니다</div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-lg border-2 border-gray-200 bg-white flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{file.file_name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/webinars/${webinarId}/files/${file.id}/download`)
                      const result = await response.json()
                      
                      if (!response.ok || result.error) {
                        throw new Error(result.error || '다운로드 URL 생성 실패')
                      }
                      
                      window.open(result.downloadUrl, '_blank')
                    } catch (error: any) {
                      console.error('다운로드 실패:', error)
                      alert(error.message || '파일 다운로드에 실패했습니다')
                    }
                  }}
                  className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  다운로드
                </button>
                <button
                  onClick={() => handleDelete(file.id, file.file_name)}
                  className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

