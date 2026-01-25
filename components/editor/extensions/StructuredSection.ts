import { Node, mergeAttributes } from '@tiptap/core'

/**
 * 구조화된 섹션 노드 확장
 * 타입: info, warning, constraint, highlight
 */
export const StructuredSection = Node.create({
  name: 'structuredSection',

  group: 'block',

  content: 'block+',

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {}
          }
          return {
            'data-title': attributes.title,
          }
        },
      },
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-section-type') || 'info',
        renderHTML: (attributes) => {
          return {
            'data-section-type': attributes.type,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="structuredSection"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'structuredSection',
        class: 'structured-section',
        'data-section-type': node.attrs.type,
        'data-title': node.attrs.title || undefined,
      }),
      0,
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div')
      dom.className = 'structured-section'
      dom.setAttribute('data-section-type', node.attrs.type)
      if (node.attrs.title) {
        dom.setAttribute('data-title', node.attrs.title)
      }

      const titleElement = document.createElement('div')
      titleElement.className = 'structured-section-title'
      if (node.attrs.title) {
        titleElement.textContent = node.attrs.title
        dom.appendChild(titleElement)
      }

      const contentElement = document.createElement('div')
      contentElement.className = 'structured-section-content'
      dom.appendChild(contentElement)

      return {
        dom,
        contentDOM: contentElement,
      }
    }
  },
})
