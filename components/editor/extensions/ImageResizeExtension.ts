import { Extension } from '@tiptap/core'
import { createImageResizePlugin } from '../ImageResizePlugin'

/**
 * 이미지 리사이즈 확장
 * 이미지 선택 시 리사이즈 핸들 표시
 */
export const ImageResizeExtension = Extension.create({
  name: 'imageResizeExtension',

  addProseMirrorPlugins() {
    return [createImageResizePlugin()]
  },
})
