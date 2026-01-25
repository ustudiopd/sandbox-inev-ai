'use client'

import { Editor } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, Underline, Strikethrough, Code, Link2, Link2Off } from 'lucide-react'

interface BubbleMenuProps {
  editor: Editor | null
}

export function BubbleMenu({ editor }: BubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!editor) return

    const updateBubbleMenu = () => {
      const { selection } = editor.state
      
      if (selection.empty) {
        setIsVisible(false)
        return
      }

      // 이미지가 선택된 경우 표시하지 않음
      const node = editor.state.doc.nodeAt(selection.from)
      if (node?.type.name === 'image') {
        setIsVisible(false)
        return
      }

      // 선택된 텍스트의 위치 계산
      const { from, to } = selection
      try {
        const start = editor.view.coordsAtPos(from)
        const end = editor.view.coordsAtPos(to)

        setPosition({
          x: (start.left + end.left) / 2,
          y: start.top - 10,
        })
        setIsVisible(true)
      } catch (error) {
        setIsVisible(false)
      }
    }

    // 선택 변경 감지
    const handleSelectionUpdate = () => {
      updateBubbleMenu()
    }

    // 마우스 업 이벤트
    const handleMouseUp = () => {
      setTimeout(updateBubbleMenu, 10)
    }

    // 키보드 이벤트 (Shift+Arrow 등)
    const handleKeyDown = () => {
      setTimeout(updateBubbleMenu, 10)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.view.dom.addEventListener('mouseup', handleMouseUp)
    editor.view.dom.addEventListener('keydown', handleKeyDown)

    // 초기 업데이트
    updateBubbleMenu()

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.view.dom.removeEventListener('mouseup', handleMouseUp)
      editor.view.dom.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor])

  // 외부 클릭 시 메뉴 숨기기
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // 에디터 내부 클릭은 무시
        if (editor?.view.dom.contains(e.target as Node)) {
          return
        }
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, editor])

  if (!editor || !isVisible) {
    return null
  }

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
    setIsVisible(false)
  }

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run()
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const isLinkActive = editor.isActive('link')

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1">
        {!showLinkInput ? (
          <>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-600' : ''
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-600' : ''
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-600' : ''
              }`}
              title="Underline (Ctrl+U)"
            >
              <Underline size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-600' : ''
              }`}
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                editor.isActive('code') ? 'bg-slate-200 dark:bg-slate-600' : ''
              }`}
              title="Inline Code"
            >
              <Code size={16} />
            </button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
            {isLinkActive ? (
              <>
                <button
                  onClick={handleUnlink}
                  className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Remove Link"
                >
                  <Link2Off size={16} />
                </button>
                <button
                  onClick={() => {
                    const { href } = editor.getAttributes('link')
                    setLinkUrl(href || '')
                    setShowLinkInput(true)
                  }}
                  className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Edit Link"
                >
                  <Link2 size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLinkInput(true)}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Add Link"
              >
                <Link2 size={16} />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLinkSubmit()
                } else if (e.key === 'Escape') {
                  setShowLinkInput(false)
                  setLinkUrl('')
                }
              }}
              placeholder="Enter URL..."
              className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleLinkSubmit}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false)
                setLinkUrl('')
              }}
              className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-600 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return typeof window !== 'undefined' ? createPortal(menuContent, document.body) : null
}
