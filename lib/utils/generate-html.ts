import { JSONContent } from 'novel'
import { generateHTML } from '@tiptap/html'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Youtube } from '@tiptap/extension-youtube'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Small } from '@/components/editor/extensions/Small'
import { StructuredSection } from '@/components/editor/extensions/StructuredSection'
import { InfoItem } from '@/components/editor/extensions/InfoItem'

// HTML 생성용 확장들
const htmlExtensions = [
  StarterKit.configure({
    link: false, // 별도로 Link 확장을 사용하므로 비활성화
    horizontalRule: false, // 별도로 HorizontalRule 확장을 사용하므로 비활성화
    underline: false, // 별도로 Underline 확장을 사용하므로 비활성화
  }),
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

/**
 * Tiptap JSON을 HTML로 변환
 */
export function generateContentHTML(content: JSONContent): string {
  try {
    // generateHTML 함수를 사용하여 HTML로 변환
    return generateHTML(content, htmlExtensions)
  } catch (error) {
    console.error('HTML generation error:', error)
    return '<p>Error generating HTML</p>'
  }
}
