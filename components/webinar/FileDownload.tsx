'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

interface WebinarFile {
  id: string
  webinar_id: string
  filename: string
  original_filename: string
  file_path: string
  file_size: number
  mime_type: string
  description?: string
  created_at: string
}

interface FileDownloadProps {
  webinarId: string
  className?: string
  canDelete?: boolean // 삭제 권한 여부
}

/**
 * 발표자료 다운로드 컴포넌트
 * 참여자가 웨비나 발표자료를 다운로드할 수 있는 UI 제공
 */
export default function FileDownload({
  webinarId,
  className = '',
  canDelete = false,
}: FileDownloadProps) {
  const [files, setFiles] = useState<WebinarFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const supabase = createClientSupabase()

  // 파일 목록 로드
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/webinars/${webinarId}/files`)
        const result = await response.json()

        if (!response.ok || result.error) {
          throw new Error(result.error || '파일 목록을 불러올 수 없습니다')
        }

        setFiles(result.files || [])
      } catch (err: any) {
        setError(err.message || '파일 목록을 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadFiles()

    // 실시간 업데이트 구독
    const channel = supabase
      .channel(`webinar:${webinarId}:files`)
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
      supabase.removeChannel(channel)
    }
  }, [webinarId, supabase])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = async (file: WebinarFile) => {
    try {
      setDownloading((prev) => new Set(prev).add(file.id))

      const response = await fetch(
        `/api/webinars/${webinarId}/files/${file.id}/download`
      )
      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || '다운로드 URL을 생성할 수 없습니다')
      }

      // 다운로드 시작
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = file.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      setError(err.message || '다운로드 중 오류가 발생했습니다')
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(file.id)
        return next
      })
    }
  }

  const handleDelete = async (file: WebinarFile) => {
    if (!confirm(`"${file.original_filename}" 파일을 삭제하시겠습니까?`)) {
      return
    }

    try {
      setDeleting((prev) => new Set(prev).add(file.id))
      setError(null)

      const response = await fetch(
        `/api/webinars/${webinarId}/files/${file.id}`,
        {
          method: 'DELETE',
        }
      )

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || '파일 삭제에 실패했습니다')
      }

      // 파일 목록에서 제거
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err: any) {
      setError(err.message || '파일 삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(file.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">파일 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error && files.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-600">다운로드 가능한 발표자료가 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 sm:p-6 ${className}`}>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
        📎 발표자료
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.original_filename}
                  </p>
                  <div className="flex items-center space-x-3 mt-1">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)}
                    </p>
                    {file.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleDownload(file)}
                disabled={downloading.has(file.id) || deleting.has(file.id)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {downloading.has(file.id) ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    다운로드 중...
                  </span>
                ) : (
                  '다운로드'
                )}
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDelete(file)}
                  disabled={downloading.has(file.id) || deleting.has(file.id)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting.has(file.id) ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      삭제 중...
                    </span>
                  ) : (
                    '삭제'
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

