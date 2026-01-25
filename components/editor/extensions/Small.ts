import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * 작은 글씨 마크 확장
 * Ctrl+Shift+S (Mac: Cmd+Shift+S)로 토글 가능
 */
export const Small = Mark.create({
  name: 'small',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'small',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['small', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setSmall: () => ({ commands }: any) => {
        return commands.setMark(this.name)
      },
      toggleSmall: () => ({ commands }: any) => {
        return commands.toggleMark(this.name)
      },
      unsetSmall: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    } as any
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => (this.editor.commands as any).toggleSmall(),
    }
  },
})
