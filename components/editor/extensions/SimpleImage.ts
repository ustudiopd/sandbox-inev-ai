import { Image as TiptapImage } from '@tiptap/extension-image'
import { NodeView } from '@tiptap/core'

/**
 * NodeView 없이 작동하는 Image 확장
 * 기본 Image 확장을 확장하되 addNodeView를 기본 DOM NodeView로 오버라이드
 */
export const SimpleImage = TiptapImage.extend({
  // addNodeView를 기본 DOM NodeView로 오버라이드
  // 이렇게 하면 React NodeView 대신 기본 DOM 렌더링을 사용
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const img = document.createElement('img')
      img.src = node.attrs.src || ''
      img.alt = node.attrs.alt || ''
      img.className = 'rounded-lg'
      
      // HTMLAttributes 적용
      Object.keys(HTMLAttributes || {}).forEach((key) => {
        img.setAttribute(key, HTMLAttributes[key])
      })
      
      return {
        dom: img,
      }
    }
  },
  
  // renderHTML을 오버라이드하여 스타일 적용
  renderHTML({ HTMLAttributes }) {
    return ['img', { ...HTMLAttributes, class: 'rounded-lg' }]
  },
})
