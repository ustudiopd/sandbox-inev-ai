import { Node, mergeAttributes } from '@tiptap/core'

/**
 * 정보 아이템 노드 확장
 * 아이콘 + 제목 + 내용 구조
 */
export const InfoItem = Node.create({
  name: 'infoItem',

  group: 'block',

  content: 'block+',

  addAttributes() {
    return {
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-icon'),
        renderHTML: (attributes) => {
          if (!attributes.icon) {
            return {}
          }
          return {
            'data-icon': attributes.icon,
          }
        },
      },
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
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="infoItem"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'infoItem',
        class: 'info-item',
        'data-icon': node.attrs.icon || undefined,
        'data-title': node.attrs.title || undefined,
      }),
      0,
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div')
      dom.className = 'info-item'
      if (node.attrs.icon) {
        dom.setAttribute('data-icon', node.attrs.icon)
      }
      if (node.attrs.title) {
        dom.setAttribute('data-title', node.attrs.title)
      }

      const headerElement = document.createElement('div')
      headerElement.className = 'info-item-header'
      if (node.attrs.icon) {
        const iconElement = document.createElement('span')
        iconElement.className = 'info-item-icon'
        iconElement.textContent = node.attrs.icon
        headerElement.appendChild(iconElement)
      }
      if (node.attrs.title) {
        const titleElement = document.createElement('span')
        titleElement.className = 'info-item-title'
        titleElement.textContent = node.attrs.title
        headerElement.appendChild(titleElement)
      }
      if (node.attrs.icon || node.attrs.title) {
        dom.appendChild(headerElement)
      }

      const contentElement = document.createElement('div')
      contentElement.className = 'info-item-content'
      dom.appendChild(contentElement)

      return {
        dom,
        contentDOM: contentElement,
      }
    }
  },
})
