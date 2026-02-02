'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ContentEditor from '@/components/editor/ContentEditor'
import type { JSONContent } from '@tiptap/core'

export default function NewNotePage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params?.clientId as string
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<JSONContent | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    
    if (!content) {
      alert('내용을 입력해주세요.')
      return
    }
    
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/client/${clientId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '노트 저장에 실패했습니다.')
      }
      
      const data = await response.json()
      router.push(`/client/${clientId}/notes/${data.id}`)
    } catch (error: any) {
      console.error('노트 저장 오류:', error)
      alert(error.message || '노트 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleCancel = () => {
    if (confirm('작성 중인 내용이 저장되지 않습니다. 정말 취소하시겠습니까?')) {
      router.push(`/client/${clientId}/notes`)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">새 노트 작성</h1>
          <p className="text-gray-600">팀과 공유할 메모나 아이디어를 작성하세요</p>
        </div>
        
        {/* 제목 입력 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목을 입력하세요..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 콘텐츠 에디터 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            내용
          </label>
          <ContentEditor
            content={content}
            onChange={setContent}
            placeholder="내용을 입력하세요... '/ 를 입력하여 명령어를 선택하세요"
          />
        </div>
        
        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
