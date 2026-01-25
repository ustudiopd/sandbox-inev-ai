'use client'

import { useState, useEffect } from 'react'
import BlogEditor from '@/components/editor/BlogEditor'
import { JSONContent } from 'novel'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { jsonToMarkdown, copyMarkdownToClipboard, downloadMarkdownFile } from '@/lib/utils/markdown'
import { Download, Copy, FileUp } from 'lucide-react'

export default function EditorTestPage() {
  const [content, setContent] = useState<JSONContent | null>(null)
  const [title, setTitle] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // 자동 저장 훅
  const { saveStatus, lastSaved, triggerSave, restoreFromLocal } = useAutoSave({
    docId: 'test-editor',
    debounceMs: 2000,
    onSave: async (content, title) => {
      // 실제 저장 로직은 여기에 구현
      console.log('Saving content:', { content, title })
      setSaveMessage('저장되었습니다!')
      setTimeout(() => setSaveMessage(''), 3000)
    },
  })

  // 페이지 로드 시 로컬 백업에서 복원
  useEffect(() => {
    const restored = restoreFromLocal()
    if (restored.content) {
      setContent(restored.content)
    }
    if (restored.title) {
      setTitle(restored.title)
    }
  }, [restoreFromLocal])

  // 콘텐츠 변경 시 자동 저장 트리거 (비활성화됨)
  // useEffect(() => {
  //   if (content) {
  //     triggerSave(content, title)
  //   }
  // }, [content, title, triggerSave])

  const handleExportMarkdown = () => {
    if (!content) return
    const markdown = jsonToMarkdown(content)
    copyMarkdownToClipboard(markdown)
    setSaveMessage('마크다운이 클립보드에 복사되었습니다!')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleDownloadMarkdown = () => {
    if (!content) return
    const markdown = jsonToMarkdown(content)
    downloadMarkdownFile(markdown, 'content.md')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { readMarkdownFile, markdownToJSON } = await import('@/lib/utils/markdown')
    try {
      const json = await readMarkdownFile(file)
      setContent(json)
      setSaveMessage('파일이 로드되었습니다!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('File load error:', error)
      setSaveMessage('파일 로드에 실패했습니다.')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const saveStatusText = {
    saved: '저장됨',
    saving: '저장 중...',
    error: '저장 오류',
    offline: '오프라인',
  }[saveStatus]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">콘텐츠 에디터 테스트</h1>
          
          {/* 제목 입력 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 저장 상태 및 액션 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`text-sm ${
                saveStatus === 'saved' ? 'text-green-600' :
                saveStatus === 'saving' ? 'text-blue-600' :
                saveStatus === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {saveStatusText}
                {lastSaved && ` (${lastSaved.toLocaleTimeString()})`}
              </span>
              {saveMessage && (
                <span className="text-sm text-green-600">{saveMessage}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer flex items-center gap-2">
                <FileUp size={16} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExportMarkdown}
                className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg flex items-center gap-2"
              >
                <Copy size={16} />
                <span>Copy MD</span>
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg flex items-center gap-2"
              >
                <Download size={16} />
                <span>Download MD</span>
              </button>
            </div>
          </div>
        </div>

        {/* 에디터 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <BlogEditor
            initialContent={content}
            onChange={(newContent) => {
              // 리뷰 지침: 외부 상태가 editor content를 덮어쓰지 않도록 주의
              // onChange는 에디터 업데이트를 감지하는 용도로만 사용
              setContent(newContent)
            }}
            // editorKey={Date.now()} ← 제거: 매 렌더마다 에디터 재생성 방지
          />
        </div>
      </div>
    </div>
  )
}
