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
  Layout,
} from 'lucide-react'
import { Editor, Range } from '@tiptap/core'
import { Command, createSuggestionItems, renderItems, type SuggestionItem } from 'novel'

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
    title: 'YouTube',
    description: 'Embed a YouTube video.',
    searchTerms: ['video', 'youtube', 'embed'],
    icon: <Youtube size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setYoutubeVideo({
            src: '',
          })
          .run()
      } else {
        // fallback: range가 없는 경우
        editor
          .chain()
          .focus()
          .setYoutubeVideo({
            src: '',
          })
          .run()
      }
    },
  },
  {
    title: 'Section',
    description: 'Create a structured section.',
    searchTerms: ['section', 'info', 'warning'],
    icon: <FileText size={18} />,
    command: ({ editor, range }: { editor: any; range: any }) => {
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'structuredSection',
            attrs: {
              type: 'info',
              title: '',
            },
            content: [
              {
                type: 'paragraph',
                content: [],
              },
            ],
          })
          .run()
      } else {
        // fallback: range가 없는 경우
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'structuredSection',
            attrs: {
              type: 'info',
              title: '',
            },
            content: [
              {
                type: 'paragraph',
                content: [],
              },
            ],
          })
          .run()
      }
    },
  },
])

// 가이드에 따른 하이브리드 방식: renderItems를 유지하면서 수동 렌더링 사용
export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems, // createSuggestionItems가 자동으로 필터링 처리
    render: renderItems, // 필수! Novel이 editor와 range를 자동 제공
  },
})
