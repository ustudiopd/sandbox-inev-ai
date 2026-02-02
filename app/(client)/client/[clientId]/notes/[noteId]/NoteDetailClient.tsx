'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, PinOff, Trash2 } from 'lucide-react'

interface NoteDetailClientProps {
  noteId: string
  clientId: string
  isPinned: boolean
}

export default function NoteDetailClient({ noteId, clientId, isPinned }: NoteDetailClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTogglingPin, setIsTogglingPin] = useState(false)
  
  const handleTogglePin = async () => {
    setIsTogglingPin(true)
    
    try {
      const response = await fetch(`/api/client/${clientId}/notes/${noteId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_pinned: !isPinned,
        }),
      })
      
      if (!response.ok) {
        throw new Error('고정 상태 변경에 실패했습니다.')
      }
      
      router.refresh()
    } catch (error: any) {
      console.error('고정 상태 변경 오류:', error)
      alert(error.message || '고정 상태 변경에 실패했습니다.')
    } finally {
      setIsTogglingPin(false)
    }
  }
  
  const handleDelete = async () => {
    if (!confirm('정말 이 노트를 삭제하시겠습니까?')) {
      return
    }
    
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/client/${clientId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('노트 삭제에 실패했습니다.')
      }
      
      router.push(`/client/${clientId}/notes`)
    } catch (error: any) {
      console.error('노트 삭제 오류:', error)
      alert(error.message || '노트 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <>
      <button
        onClick={handleTogglePin}
        disabled={isTogglingPin}
        className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
        title={isPinned ? '고정 해제' : '고정'}
      >
        {isPinned ? <PinOff size={20} /> : <Pin size={20} />}
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        title="삭제"
      >
        <Trash2 size={20} />
      </button>
    </>
  )
}
