'use client'

import { EditorRoot, EditorContent, EditorCommand, EditorCommandList, EditorCommandItem, EditorCommandEmpty, useEditor } from 'novel'
import { handleCommandNavigation } from 'novel'
import { createImageUpload, handleImagePaste, handleImageDrop, UpdatedImage, UploadImagesPlugin } from 'novel'
import { extensions, createSuggestionItemsWithUpload, createSlashCommand } from './extensions'
import { BubbleMenu } from './BubbleMenu'
import type { JSONContent, Extensions } from '@tiptap/core'
import { useMemo, useRef, useEffect } from 'react'

// BubbleMenu 래퍼 컴포넌트
function BubbleMenuWrapper() {
  const { editor } = useEditor()
  if (!editor) return null
  return <BubbleMenu editor={editor as any} />
}

export interface ContentEditorProps {
  content: JSONContent | null
  onChange: (content: JSONContent) => void
  uploadFn?: (file: File) => Promise<string>
  placeholder?: string
  imageStoragePath?: string
}

export default function ContentEditor({
  content,
  onChange,
  uploadFn,
  placeholder = '"/"를 입력하여 명령어를 선택하세요...',
  imageStoragePath = 'blog-images',
}: ContentEditorProps) {
  // 이미지 업로드 함수 생성
  const directUploadFn = useMemo(() => {
    return async (file: File): Promise<string> => {
      if (uploadFn) {
        return uploadFn(file)
      }
      // 기본 구현: EventLive의 /api/upload 엔드포인트 사용
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
  }, [uploadFn])

  const imageUploadFn = useMemo(() => {
    return createImageUpload({
      validateFn: (file: File) => {
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 업로드할 수 있습니다.')
          return false
        }
        if (file.size > 50 * 1024 * 1024) {
          alert('파일 크기는 50MB를 초과할 수 없습니다.')
          return false
        }
        return true
      },
      onUpload: directUploadFn,
    })
  }, [directUploadFn])

  const editorRef = useRef<any>(null)
  const { editor } = useEditor()

  useEffect(() => {
    if (editor) {
      editorRef.current = editor
    }
  }, [editor])

  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  const imageExtension = useMemo(() => {
    return UpdatedImage.extend({
      addProseMirrorPlugins() {
        return [
          UploadImagesPlugin({
            imageClass: 'opacity-40 rounded-lg border border-gray-300',
          }),
        ]
      },
    }).configure({
      allowBase64: false,
      HTMLAttributes: {
        class: 'rounded-lg border border-gray-300',
        style: 'max-width: 100%; height: auto; max-height: 600px; object-fit: contain; cursor: pointer;',
      },
      inline: false,
    })
  }, [])

  const editorSuggestionItems = useMemo(() => {
    return createSuggestionItemsWithUpload(directUploadFn, (editor: any) => {
      editorRef.current = editor
    })
  }, [directUploadFn])

  const editorExtensions = useMemo(() => {
    const dynamicSlashCommand = createSlashCommand(editorSuggestionItems)
    
    const mappedExtensions = extensions.map((ext) => {
      if (ext.name === 'image') {
        return imageExtension
      }
      if ((ext as any).name === 'slashCommand' || (ext as any).options?.suggestion) {
        return dynamicSlashCommand
      }
      return ext
    })
    
    return mappedExtensions
  }, [imageExtension, editorSuggestionItems])

  return (
    <EditorRoot>
      <div className="bg-white rounded-lg">
        <EditorContent
          // @ts-ignore - novel과 @tiptap 패키지 버전 충돌로 인한 타입 오류
          extensions={editorExtensions}
          content={content}
          immediatelyRender={false} // ← SSR 환경에서 필수!
          onCreate={({ editor }) => {
            editorRef.current = editor
          }}
          onUpdate={({ editor }) => {
            onChange(editor.getJSON())
          }}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event), // ← 키보드 네비게이션 필수!
            },
            attributes: {
              class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-4 bg-white',
              'data-placeholder': placeholder,
            },
            handlePaste: (view, event) => {
              const handled = handleImagePaste(view, event, imageUploadFn)
              if (handled) return true

              const text = event.clipboardData?.getData('text/plain')
              if (!text) return false

              // 이미지 URL 붙여넣기
              if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(text)) {
                event.preventDefault()
                const { state, dispatch } = view
                const { selection } = state
                const imageNode = state.schema.nodes.image.create({
                  src: text,
                })
                const transaction = state.tr.replaceSelectionWith(imageNode)
                dispatch(transaction)
                return true
              }

              // YouTube URL 붙여넣기
              const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
              const youtubeMatch = text.match(youtubeRegex)
              if (youtubeMatch) {
                event.preventDefault()
                const { state, dispatch } = view
                const { selection } = state
                const videoId = youtubeMatch[1]
                const youtubeNode = state.schema.nodes.youtube.create({
                  src: `https://www.youtube.com/embed/${videoId}`,
                })
                const transaction = state.tr.replaceSelectionWith(youtubeNode)
                dispatch(transaction)
                return true
              }

              return false
            },
            handleDrop: (view, event, slice, moved) => {
              return handleImageDrop(view, event, moved, imageUploadFn)
            },
          }}
          slotBefore={
            <div>
              <BubbleMenuWrapper />
            </div>
          }>
          {/* 하이브리드 방식: renderItems 유지 + 수동 렌더링 ⭐ 핵심! */}
          <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-gray-300 bg-white px-1 py-2 shadow-lg">
            <EditorCommandEmpty className="px-2 text-sm text-gray-500">결과 없음</EditorCommandEmpty>
            <EditorCommandList>
              {editorSuggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={({ editor, range }) => {
                    // ← 핵심! { editor, range } 객체를 구조 분해 할당으로 받음
                    // renderItems가 있으면 Novel이 자동으로 이 객체를 제공함
                    if (!editor || !range) {
                      console.error('[SlashMenu] editor/range missing', item.title)
                      return
                    }
                    
                    if (item.command) {
                      try {
                        item.command({ editor, range })
                      } catch (error) {
                        console.error('[ContentEditor] Command execution error:', error, item.title)
                      }
                    }
                  }}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-gray-100 aria-selected:bg-gray-100"
                  key={item.title}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-gray-100">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
        </EditorContent>
      </div>
    </EditorRoot>
  )
}
