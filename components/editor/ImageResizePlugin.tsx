'use client'

import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const RESIZE_HANDLE_SIZE = 16

/**
 * 이미지 리사이즈 플러그인
 * 이미지 선택 시 우측 하단에 리사이즈 핸들 표시
 */
export function createImageResizePlugin() {
  return new Plugin({
    key: new PluginKey('imageResize'),
    state: {
      init() {
        return DecorationSet.empty
      },
      apply(tr, set) {
        const { selection } = tr
        const decorations: Decoration[] = []

        tr.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && selection.from <= pos && selection.to >= pos + node.nodeSize) {
            const dom = document.createElement('div')
            dom.className = 'resize-handle'
            dom.style.cssText = `
              position: absolute;
              width: ${RESIZE_HANDLE_SIZE}px;
              height: ${RESIZE_HANDLE_SIZE}px;
              background-color: #3b82f6;
              border: 2px solid white;
              border-radius: 50%;
              cursor: se-resize;
              z-index: 1000;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              transition: transform 0.1s;
            `

            decorations.push(
              Decoration.widget(pos + node.nodeSize, dom, {
                side: 1,
              })
            )
          }
        })

        return DecorationSet.create(tr.doc, decorations)
      },
    },
    props: {
      decorations(state) {
        return this.getState(state)
      },
    },
  })
}
