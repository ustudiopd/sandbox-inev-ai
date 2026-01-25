'use client'

import { StarterKit } from '@tiptap/starter-kit'
import { Heading } from '@tiptap/extension-heading'
import { BulletList } from '@tiptap/extension-bullet-list'
import { OrderedList } from '@tiptap/extension-ordered-list'
import { ListItem } from '@tiptap/extension-list-item'
import { Markdown } from '@tiptap/markdown'
import { Image } from '@tiptap/extension-image'
import { SimpleImage } from './extensions/SimpleImage'
import { Link } from '@tiptap/extension-link'
import { Youtube } from '@tiptap/extension-youtube'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Underline } from '@tiptap/extension-underline'
import { JSONContent } from 'novel'
import { useEffect, useCallback, useRef, useState } from 'react'
import { BubbleMenu } from './BubbleMenu'
import { Small } from './extensions/Small'
import { AutoLink } from './extensions/AutoLink'
import { StructuredSection } from './extensions/StructuredSection'
import { InfoItem } from './extensions/InfoItem'
import { ImageResizeExtension } from './extensions/ImageResizeExtension'
import { EditorRoot, EditorContent, EditorCommand, EditorCommandItem, EditorCommandList, EditorCommandEmpty, handleCommandNavigation, useEditor as useCurrentEditor } from 'novel'
import { suggestionItems, slashCommand } from './extensions'

interface BlogEditorProps {
  initialContent?: JSONContent | null
  onChange: (content: JSONContent) => void
  onSetThumbnail?: (url: string) => void
  editorKey?: string | number
}

/**
 * 메인 블로그 에디터 컴포넌트
 * Novel.sh 기반의 리치 텍스트 에디터
 */
export default function BlogEditor({
  initialContent,
  onChange,
  onSetThumbnail,
  editorKey,
}: BlogEditorProps) {
  const commandMenuRef = useRef<HTMLDivElement>(null)
  
  // 리뷰 지침: 외부 상태가 editor content를 덮어쓰지 않도록 초기값만 유지
  // initialContent가 변경되어도 에디터가 리셋되지 않도록 초기값만 저장
  const initialContentRef = useRef(initialContent)
  useEffect(() => {
    // 최초 마운트 시에만 초기값 설정
    if (initialContent && !initialContentRef.current) {
      initialContentRef.current = initialContent
    }
  }, [])
  
  // 확장 배열 정의
  const extensions = [
    StarterKit.configure({
      link: false, // 별도로 Link 확장을 사용하므로 비활성화
      horizontalRule: false, // 별도로 HorizontalRule 확장을 사용하므로 비활성화
      underline: false, // 별도로 Underline 확장을 사용하므로 비활성화
      heading: false, // 별도로 Heading 확장을 사용하므로 비활성화
      bulletList: false, // 별도로 BulletList 확장을 사용하므로 비활성화
      orderedList: false, // 별도로 OrderedList 확장을 사용하므로 비활성화
      listItem: false, // 별도로 ListItem 확장을 사용하므로 비활성화
    }),
    // Heading 확장: level별 스타일 적용
    Heading.extend({
      renderHTML({ HTMLAttributes, node }) {
        const level = node.attrs.level as number
        const classes = {
          1: 'font-bold text-3xl mt-8 mb-4 text-slate-900 dark:text-slate-100',
          2: 'font-bold text-2xl mt-6 mb-3 text-slate-900 dark:text-slate-100',
          3: 'font-bold text-xl mt-4 mb-2 text-slate-900 dark:text-slate-100',
        }[level] || 'font-bold text-slate-900 dark:text-slate-100'
        
        return [
          `h${level}`,
          {
            ...HTMLAttributes,
            class: `${HTMLAttributes.class || ''} ${classes}`.trim(),
          },
          0,
        ]
      },
    }).configure({
      levels: [1, 2, 3],
    }),
    // BulletList 확장: 스타일 적용
    BulletList.configure({
      HTMLAttributes: {
        class: 'list-disc ml-6 my-2',
      },
    }),
    // OrderedList 확장: 스타일 적용
    OrderedList.configure({
      HTMLAttributes: {
        class: 'list-decimal ml-6 my-2',
      },
    }),
    // ListItem 확장: 스타일 적용
    ListItem.configure({
      HTMLAttributes: {
        class: 'my-2',
      },
    }),
    Markdown,
    // SimpleImage 확장: NodeView 없이 작동하는 Image 확장
    SimpleImage,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 hover:text-blue-800 underline',
      },
    }),
    Youtube.configure({
      width: 640,
      height: 480,
      HTMLAttributes: {
        class: 'rounded-lg',
      },
    }),
    TaskList,
    TaskItem,
    HorizontalRule,
    Underline,
    Small,
    AutoLink,
    StructuredSection,
    InfoItem,
    // ImageResizeExtension, // 일시적으로 비활성화: addNodeView 에러 해결 후 재활성화
    slashCommand, // 가이드 권장 방식: extensions.tsx에서 export한 slashCommand 사용
  ]

  // EditorContent 내부에서 사용할 컴포넌트들
  function EditorBubbleWrapper() {
    const { editor } = useCurrentEditor()
    if (!editor) return null
    return <BubbleMenu editor={editor as any} />
  }

  function ImageUploadHandler() {
    const { editor } = useCurrentEditor()
    const [uploading, setUploading] = useState(false)
    
    const handleImageUpload = useCallback(
      async (file: File) => {
        if (!editor) return

        // 파일 타입 검증
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          alert('지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 가능)')
          return
        }

        // 파일 크기 검증 (10MB)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
          alert('이미지 크기는 10MB 이하여야 합니다.')
          return
        }

        setUploading(true)

        const formData = new FormData()
        formData.append('file', file)

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
            throw new Error(errorData.error || 'Upload failed')
          }

          const data = await response.json()
          const url = data.url

          console.log('이미지 업로드 성공, URL:', url)

          // 이미지를 에디터에 삽입
          // insertContent를 사용하여 이미지 노드 삽입
          const imageContent = {
            type: 'image',
            attrs: {
              src: url,
              alt: '',
            },
          }
          
          // 현재 에디터 상태 확인
          const beforeState = editor.getJSON()
          console.log('삽입 전 상태:', beforeState)
          
          // 이미지 삽입
          const result = editor.chain().focus().insertContent(imageContent).run()
          console.log('insertContent 결과:', result)
          
          // 삽입 확인
          setTimeout(() => {
            const afterState = editor.getJSON()
            const hasImage = JSON.stringify(afterState).includes(url)
            console.log('삽입 후 상태:', afterState)
            console.log('이미지 삽입 확인:', {
              url,
              hasImage,
              beforeState,
              afterState,
            })
            
            // DOM에서도 확인
            const editorElement = editor.view.dom
            const images = editorElement.querySelectorAll('img')
            console.log('DOM의 이미지 개수:', images.length)
            images.forEach((img, idx) => {
              console.log(`이미지 ${idx}:`, img.src, img.className)
            })
            
            if (!hasImage && images.length === 0) {
              console.error('이미지 삽입 실패!')
              alert('이미지 삽입에 실패했습니다. 콘솔을 확인해주세요.')
            }
          }, 200)
        } catch (error) {
          console.error('Image upload error:', error)
          const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.'
          alert(errorMessage)
        } finally {
          setUploading(false)
        }
      },
      [editor]
    )

    useEffect(() => {
      if (!editor) return

      const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
          const file = files[0]
          if (file.type.startsWith('image/')) {
            handleImageUpload(file)
          }
        }
      }

      const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
              e.preventDefault()
              const file = item.getAsFile()
              if (file) {
                handleImageUpload(file)
              }
            }
          }
        }
      }

      const editorElement = editor.view.dom
      editorElement.addEventListener('drop', handleDrop)
      editorElement.addEventListener('paste', handlePaste)

      return () => {
        editorElement.removeEventListener('drop', handleDrop)
        editorElement.removeEventListener('paste', handlePaste)
      }
    }, [editor, handleImageUpload])

    // YouTube URL 감지 및 임베드
    useEffect(() => {
      if (!editor) return

      const handlePaste = (e: ClipboardEvent) => {
        const text = e.clipboardData?.getData('text')
        if (text) {
          const youtubeRegex =
            /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
          const match = text.match(youtubeRegex)
          if (match) {
            e.preventDefault()
            const videoId = match[1]
            editor
              .chain()
              .focus()
              .setYoutubeVideo({
                src: `https://www.youtube.com/embed/${videoId}`,
              })
              .run()
          }
        }
      }

      const editorElement = editor.view.dom
      editorElement.addEventListener('paste', handlePaste)

      return () => {
        editorElement.removeEventListener('paste', handlePaste)
      }
    }, [editor])

    return (
      <>
        {uploading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">이미지 업로드 중...</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">잠시만 기다려주세요</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <EditorRoot>
      <EditorContent
        extensions={extensions as any}
        initialContent={initialContentRef.current || {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [],
            },
          ],
        }}
        immediatelyRender={false}
        onUpdate={({ editor }) => {
          const json = editor.getJSON()
          onChange(json)

          // 첫 번째 이미지를 썸네일로 설정
          if (onSetThumbnail) {
            const firstImage = findFirstImage(json)
            if (firstImage) {
              onSetThumbnail(firstImage.attrs?.src || '')
            }
          }
        }}
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => {
              // 키보드 네비게이션 처리
              return handleCommandNavigation(event) || false
            },
          },
          attributes: {
            // Tailwind Typography prose 적용: 에디터 콘텐츠 영역에만 타이포 스타일 적용
            // - prose: 기본 타이포그래피 스타일
            // - max-w-none: prose 기본 max-width 제한 제거 (레이아웃 깨짐 방지)
            // - dark:prose-invert: 다크모드 지원
            // - prose-slate: slate 색상 테마
            // - focus:outline-none: 포커스 아웃라인 제거
            // - min-h-*: 최소 높이 설정
            class: 'prose prose-slate max-w-none dark:prose-invert focus:outline-none min-h-[350px] sm:min-h-[450px] lg:min-h-[500px] [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[600px] [&_img]:object-contain prose-p:my-6 prose-code:text-cyan-600 prose-code:dark:text-cyan-400 prose-code:bg-slate-100 prose-code:dark:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-pre:bg-slate-50 prose-pre:dark:bg-slate-900 prose-pre:border-2 prose-pre:border-slate-200 prose-pre:dark:border-slate-800 prose-pre:rounded-lg',
          },
        }}
      >
        <EditorBubbleWrapper />
        <ImageUploadHandler />
        <div ref={commandMenuRef}>
          {/* Slash 메뉴는 prose 영향 밖에 두기: not-prose 클래스로 타이포 스타일 제외 */}
          <EditorCommand className="not-prose z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-2 shadow-lg">
          <EditorCommandEmpty className="px-2 text-sm text-slate-500 dark:text-slate-400">
            결과 없음
          </EditorCommandEmpty>
          <EditorCommandList>
            {suggestionItems.map((item, index) => (
              <EditorCommandItem
                key={index}
                onCommand={({ editor, range }) => {
                  // 리뷰 지침: DOM 변경 여부 확인을 위한 디버깅
                  const editorElement = editor.view.dom
                  const beforeHTML = editorElement.innerHTML
                  
                  if (item.command) {
                    item.command({ editor, range })
                    
                    // DOM 변경 확인
                    setTimeout(() => {
                      const afterHTML = editorElement.innerHTML
                      const domChanged = beforeHTML !== afterHTML
                      
                      console.log('=== DOM 변경 확인 ===')
                      console.log('Command:', item.title)
                      console.log('DOM changed:', domChanged)
                      
                      if (domChanged) {
                        console.log('✅ DOM이 변경되었습니다 - 스타일 문제일 가능성 높음')
                        console.log('Before HTML:', beforeHTML.substring(0, 200))
                        console.log('After HTML:', afterHTML.substring(0, 200))
                        
                        // Heading인 경우 h1~h6 태그 확인
                        if (item.title.includes('Heading')) {
                          const headings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
                          console.log('Headings found:', headings.length, Array.from(headings).map(h => `${h.tagName}: "${h.textContent?.substring(0, 50)}"`))
                          if (headings.length > 0) {
                            const firstHeading = headings[0] as HTMLElement
                            const computed = window.getComputedStyle(firstHeading)
                            console.log('First heading computed styles:', {
                              fontSize: computed.fontSize,
                              fontWeight: computed.fontWeight,
                              color: computed.color,
                              marginTop: computed.marginTop,
                              marginBottom: computed.marginBottom,
                            })
                            console.log('First heading classes:', firstHeading.className)
                          }
                        }
                        
                        // List인 경우 ul/ol 태그 확인
                        if (item.title.includes('List')) {
                          const lists = editorElement.querySelectorAll('ul, ol')
                          console.log('Lists found:', lists.length, Array.from(lists).map(l => `${l.tagName} (${l.children.length} items)`))
                          if (lists.length > 0) {
                            const firstList = lists[0] as HTMLElement
                            const computed = window.getComputedStyle(firstList)
                            console.log('First list computed styles:', {
                              listStyleType: computed.listStyleType,
                              paddingLeft: computed.paddingLeft,
                              marginTop: computed.marginTop,
                              marginBottom: computed.marginBottom,
                            })
                            console.log('First list classes:', firstList.className)
                          }
                        }
                      } else {
                        console.log('❌ DOM이 변경되지 않았습니다 - 명령 실행 문제일 가능성')
                        console.log('Editor state:', editor.getJSON())
                      }
                    }, 50)
                  }
                }}
                value={item.title}
                keywords={item.searchTerms}
                className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  {item.icon}
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.description}</div>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>
        </div>
      </EditorContent>
    </EditorRoot>
  )
}

// 첫 번째 이미지 찾기 헬퍼 함수
function findFirstImage(content: JSONContent): JSONContent | null {
  if (content.type === 'image') {
    return content
  }

  if (content.content) {
    for (const child of content.content) {
      const found = findFirstImage(child)
      if (found) {
        return found
      }
    }
  }

  return null
}
