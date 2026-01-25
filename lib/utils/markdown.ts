import { JSONContent } from 'novel'
import { MarkdownManager } from '@tiptap/markdown'
import { generateHTML } from '@tiptap/html'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Youtube } from '@tiptap/extension-youtube'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Markdown } from '@tiptap/markdown'
import { Small } from '@/components/editor/extensions/Small'
import { StructuredSection } from '@/components/editor/extensions/StructuredSection'
import { InfoItem } from '@/components/editor/extensions/InfoItem'
import { Editor } from '@tiptap/core'

// 마크다운 변환용 확장들
const markdownExtensions = [
  StarterKit.configure({
  }),
  Markdown,
  Image,
  Link,
  Youtube,
  TaskList,
  TaskItem,
  HorizontalRule,
  Small,
  StructuredSection,
  InfoItem,
]

// MarkdownManager 인스턴스 생성
const markdownManager = new MarkdownManager({
  extensions: markdownExtensions,
})

/**
 * Tiptap JSON을 마크다운으로 변환
 */
export function jsonToMarkdown(json: JSONContent): string {
  try {
    // MarkdownManager의 serialize 메서드를 사용하여 마크다운 변환
    return markdownManager.serialize(json)
  } catch (error) {
    console.error('Markdown conversion error:', error)
    return ''
  }
}

/**
 * 마크다운 텍스트를 Tiptap JSON으로 변환
 */
export function markdownToJSON(markdown: string): JSONContent {
  try {
    // MarkdownManager의 parse 메서드를 사용하여 마크다운을 JSON으로 변환
    return markdownManager.parse(markdown)
  } catch (error) {
    console.error('JSON conversion error:', error)
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    }
  }
}

/**
 * 마크다운 파일을 읽어서 Tiptap JSON으로 변환
 */
export async function readMarkdownFile(file: File): Promise<JSONContent> {
  const text = await file.text()
  return markdownToJSON(text)
}

/**
 * 마크다운을 클립보드에 복사
 */
export async function copyMarkdownToClipboard(markdown: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(markdown)
  } catch (error) {
    console.error('Clipboard copy error:', error)
    throw error
  }
}

/**
 * 마크다운을 파일로 다운로드
 */
export function downloadMarkdownFile(markdown: string, filename: string = 'content.md'): void {
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
