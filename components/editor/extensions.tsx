'use client'

import {
  Text,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  TextQuote,
  Code,
  Youtube,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'
import { Editor, Range } from '@tiptap/core'
import { Command, createSuggestionItems, renderItems, type SuggestionItem } from 'novel'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import YouTube from '@tiptap/extension-youtube'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import type { JSONContent } from '@tiptap/core'

// 슬래시 명령어 아이템 생성 함수 (업로드 함수 포함)
export const createSuggestionItemsWithUpload = (
  uploadFn?: (file: File) => Promise<string>,
  onEditorReady?: (editor: any) => void
) => {
  return createSuggestionItems([
  {
    title: 'Text',
    description: 'Just start typing with plain text.',
    searchTerms: ['p', 'paragraph'],
    icon: <Text size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleNode('paragraph', 'paragraph')
          .run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run()
      }
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading.',
    searchTerms: ['title', 'big', 'large'],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 1 })
          .run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().setNode('heading', { level: 1 }).run()
      }
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    searchTerms: ['subtitle', 'medium'],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().setNode('heading', { level: 2 }).run()
      }
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    searchTerms: ['subtitle', 'small'],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().setNode('heading', { level: 3 }).run()
      }
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list.',
    searchTerms: ['unordered', 'ul'],
    icon: <List size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().toggleBulletList().run()
      }
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    searchTerms: ['ordered', 'ol'],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().toggleOrderedList().run()
      }
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with a to-do list.',
    searchTerms: ['todo', 'task', 'checklist'],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().toggleTaskList().run()
      }
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote.',
    searchTerms: ['blockquote'],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().toggleBlockquote().run()
      }
    },
  },
  {
    title: 'Code',
    description: 'Capture a code snippet.',
    searchTerms: ['codeblock'],
    icon: <Code size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      } else {
        // fallback: range가 없는 경우
        editor.chain().focus().toggleCodeBlock().run()
      }
    },
  },
    {
      title: 'Image',
      description: '이미지를 업로드합니다.',
      searchTerms: ['image', 'img', 'picture', 'photo', '이미지'],
      icon: <ImageIcon size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        if (onEditorReady) {
          onEditorReady(editor)
        }
        
        const currentPos = editor.state.selection.anchor
        
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file && uploadFn) {
            const maxSize = 50 * 1024 * 1024
            if (file.size > maxSize) {
              alert(`이미지 크기는 50MB 이하여야 합니다. 현재 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
              return
            }

            try {
              const url = await uploadFn(file)
              editor.chain().focus().run()
              
              const state = editor.state
              const docSize = state.doc.content.size
              const insertPos = Math.min(currentPos, docSize)
              
              editor.chain()
                .focus()
                .setTextSelection(insertPos)
                .insertContent({
                  type: 'image',
                  attrs: {
                    src: url,
                  },
                })
                .run()
            } catch (error: any) {
              console.error('Image upload error:', error)
              alert(error.message || '이미지 업로드에 실패했습니다.')
            }
          }
        }
        input.click()
      },
    },
    {
      title: 'YouTube',
      description: '유튜브 동영상을 삽입합니다.',
      searchTerms: ['youtube', 'video', 'embed', '유튜브', '동영상'],
      icon: <Youtube size={18} />,
      command: ({ editor, range }) => {
        const url = prompt('YouTube URL을 입력하세요:')
        if (!url) return
        
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
        const match = url.match(youtubeRegex)
        
        if (match) {
          const videoId = match[1]
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'youtube',
              attrs: {
                src: `https://www.youtube.com/embed/${videoId}`,
              },
            })
            .run()
        } else {
          alert('유효한 YouTube URL이 아닙니다.\n예: https://www.youtube.com/watch?v=VIDEO_ID 또는 https://youtu.be/VIDEO_ID')
        }
      },
    },
  ])
}

// 기본 suggestionItems (업로드 함수 없이)
export const suggestionItems = createSuggestionItems([

  {
    title: 'Text',
    description: 'Just start typing with plain text.',
    searchTerms: ['p', 'paragraph'],
    icon: <Text size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleNode('paragraph', 'paragraph')
          .run()
      } else {
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run()
      }
    },
  },
  {
    title: 'Heading 1',
    description: 'Big section heading.',
    searchTerms: ['title', 'big', 'large'],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 1 })
          .run()
      } else {
        editor.chain().focus().setNode('heading', { level: 1 }).run()
      }
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    searchTerms: ['subtitle', 'medium'],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run()
      } else {
        editor.chain().focus().setNode('heading', { level: 2 }).run()
      }
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    searchTerms: ['subtitle', 'small'],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run()
      } else {
        editor.chain().focus().setNode('heading', { level: 3 }).run()
      }
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list.',
    searchTerms: ['unordered', 'ul'],
    icon: <List size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      } else {
        editor.chain().focus().toggleBulletList().run()
      }
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    searchTerms: ['ordered', 'ol'],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      } else {
        editor.chain().focus().toggleOrderedList().run()
      }
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with a to-do list.',
    searchTerms: ['todo', 'task', 'checklist'],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      } else {
        editor.chain().focus().toggleTaskList().run()
      }
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote.',
    searchTerms: ['blockquote'],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      } else {
        editor.chain().focus().toggleBlockquote().run()
      }
    },
  },
  {
    title: 'Code',
    description: 'Capture a code snippet.',
    searchTerms: ['codeblock'],
    icon: <Code size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      } else {
        editor.chain().focus().toggleCodeBlock().run()
      }
    },
  },
  {
    title: 'YouTube',
    description: 'Embed a YouTube video.',
    searchTerms: ['video', 'youtube', 'embed'],
    icon: <Youtube size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      const url = prompt('YouTube URL을 입력하세요:')
      if (!url) return
      
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
      const match = url.match(youtubeRegex)
      
      if (match) {
        const videoId = match[1]
        if (range) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'youtube',
              attrs: {
                src: `https://www.youtube.com/embed/${videoId}`,
              },
            })
            .run()
        } else {
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'youtube',
              attrs: {
                src: `https://www.youtube.com/embed/${videoId}`,
              },
            })
            .run()
        }
      } else {
        alert('유효한 YouTube URL이 아닙니다.\n예: https://www.youtube.com/watch?v=VIDEO_ID 또는 https://youtu.be/VIDEO_ID')
      }
    },
  },
])

// 슬래시 명령어 확장 설정 ⭐ 핵심!
export const createSlashCommand = (items: typeof suggestionItems) => {
  return Command.configure({
    suggestion: {
      items: () => items,
      render: renderItems, // ← 필수! 이게 없으면 메뉴가 나타나지 않거나 적용이 안 됨
    },
  })
}

// 기본 slashCommand
export const slashCommand = createSlashCommand(suggestionItems)

// Tiptap 확장 설정
export const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    link: false, // Link 확장 비활성화 (중복 방지)
  }),
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'rounded-lg',
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-cyan-400 hover:text-cyan-300 underline',
    },
  }),
  YouTube.configure({
    width: 640,
    height: 360,
    HTMLAttributes: {
      class: 'youtube-embed rounded-lg',
    },
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  slashCommand, // ← 필수!
]

export type { JSONContent }
