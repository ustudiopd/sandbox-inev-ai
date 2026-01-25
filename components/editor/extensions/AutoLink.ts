import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

/**
 * 자동 링크 변환 확장
 * http:// 또는 https://로 시작하는 URL을 자동으로 링크로 변환
 */
export const AutoLink = Extension.create({
  name: 'autoLink',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          // newState와 doc이 존재하는지 확인
          if (!newState || !newState.doc) {
            return null
          }

          const { tr } = newState
          let modified = false

          // 변경된 부분만 확인
          transactions.forEach((transaction) => {
            if (!transaction.docChanged) return

            transaction.steps.forEach((step) => {
              // step이 유효한지 확인
              if (!step || typeof step !== 'object') return
              
              if ('from' in step && 'to' in step) {
                const from = step.from as number
                const to = step.to as number

                // 범위가 유효한지 확인
                if (typeof from !== 'number' || typeof to !== 'number' || from < 0 || to < 0 || from > to) {
                  return
                }

                // doc이 존재하는지 다시 확인
                if (!newState.doc || !newState.doc.content.size) return

                // 범위가 doc 크기를 초과하지 않는지 확인
                if (from > newState.doc.content.size || to > newState.doc.content.size) {
                  return
                }

                try {
                  // nodesBetween 호출 전에 doc이 유효한지 다시 확인
                  if (!newState.doc || typeof newState.doc.nodesBetween !== 'function') {
                    return
                  }

                  newState.doc.nodesBetween(from, Math.min(to, newState.doc.content.size), (node, pos) => {
                    // node가 유효한지 확인
                    if (!node || !node.isText) return

                    const text = node.textContent
                    if (!text) return

                    const urlPattern = /(https?:\/\/[^\s]+)/g
                    let match

                    while ((match = urlPattern.exec(text)) !== null) {
                      const url = match[1]
                      const start = pos + match.index
                      const end = start + url.length

                      // 범위가 유효한지 확인
                      if (start < 0 || end < 0 || start >= end) continue

                      // 이미 링크 마크가 있는지 확인
                      const marks = node.marks
                      const hasLink = marks && marks.some((mark) => mark && mark.type && mark.type.name === 'link')

                      if (!hasLink && newState.schema && newState.schema.marks && newState.schema.marks.link) {
                        try {
                          // 링크 마크 추가
                          const linkMark = newState.schema.marks.link.create({
                            href: url,
                          })
                          if (linkMark) {
                            tr.addMark(start, end, linkMark)
                            modified = true
                          }
                        } catch (markError) {
                          // 마크 생성 실패 시 무시
                          console.warn('AutoLink mark creation error:', markError)
                        }
                      }
                    }
                  })
                } catch (error) {
                  // 에러 발생 시 무시하고 계속 진행
                  console.warn('AutoLink extension error:', error)
                }
              }
            })
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})
