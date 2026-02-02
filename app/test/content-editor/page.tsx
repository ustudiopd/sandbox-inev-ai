'use client'

import { useState } from 'react'
import ContentEditor from '@/components/editor/ContentEditor'
import type { JSONContent } from '@tiptap/core'

export default function ContentEditorTestPage() {
  const [content, setContent] = useState<JSONContent | null>(null)

  const handleUpload = async (file: File): Promise<string> => {
    // EventLive의 /api/upload 엔드포인트 사용
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
    return data.url
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">콘텐츠 에디터 테스트</h1>
        <p className="text-gray-600">
          Novel.sh 기반 콘텐츠 에디터 테스트 페이지입니다.
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">사용 방법:</h2>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li><code className="bg-blue-100 px-1 rounded">/</code> 를 입력하여 슬래시 메뉴 열기</li>
            <li>텍스트를 선택하면 Bubble Menu가 나타납니다</li>
            <li>이미지를 드래그 앤 드롭하거나 붙여넣을 수 있습니다</li>
            <li>YouTube URL을 붙여넣으면 자동으로 임베드됩니다</li>
            <li>이미지 URL을 붙여넣으면 이미지로 삽입됩니다</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <ContentEditor
          content={content}
          onChange={setContent}
          uploadFn={handleUpload}
          placeholder="내용을 입력하세요... '/ 를 입력하여 명령어를 선택하세요"
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">에디터 콘텐츠 (JSON)</h2>
        <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
          <pre className="text-xs">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">테스트 기능</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">슬래시 메뉴</h3>
            <p className="text-sm text-gray-600">
              <code>/</code> 입력 후 다음 명령어들을 테스트해보세요:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Heading 1, 2, 3</li>
              <li>Bullet List, Numbered List</li>
              <li>To-do List</li>
              <li>Quote</li>
              <li>Code</li>
              <li>Image (이미지 업로드)</li>
              <li>YouTube</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Bubble Menu</h3>
            <p className="text-sm text-gray-600">
              텍스트를 선택하면 다음 기능들을 사용할 수 있습니다:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Bold (Ctrl+B)</li>
              <li>Italic (Ctrl+I)</li>
              <li>Underline (Ctrl+U)</li>
              <li>Strikethrough</li>
              <li>Inline Code</li>
              <li>Link 추가/편집</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">이미지 업로드</h3>
            <p className="text-sm text-gray-600">
              다음 방법으로 이미지를 업로드할 수 있습니다:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>슬래시 메뉴에서 Image 선택</li>
              <li>이미지 파일을 드래그 앤 드롭</li>
              <li>클립보드에서 이미지 붙여넣기</li>
              <li>이미지 URL 붙여넣기</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">YouTube 임베드</h3>
            <p className="text-sm text-gray-600">
              YouTube URL을 붙여넣으면 자동으로 임베드됩니다:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>https://youtu.be/VIDEO_ID</li>
              <li>슬래시 메뉴에서 YouTube 선택</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
