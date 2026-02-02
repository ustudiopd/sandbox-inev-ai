'use client'

'use client'

import { useState, useEffect } from 'react'
import { User, Clock, Send, Edit2, Trash2 } from 'lucide-react'
import { createClientSupabase } from '@/lib/supabase/client'

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  author_id: string
  profiles: {
    display_name: string | null
    email: string
  } | null
}

interface NoteCommentsClientProps {
  noteId: string
  clientId: string
  initialComments: Comment[]
}

export default function NoteCommentsClient({
  noteId,
  clientId,
  initialComments,
}: NoteCommentsClientProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
      }
    })
  }, [supabase])
  
  const handleSubmit = async () => {
    if (!newComment.trim()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/client/${clientId}/notes/${noteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '댓글 작성에 실패했습니다.')
      }
      
      const data = await response.json()
      setComments([...comments, data])
      setNewComment('')
    } catch (error: any) {
      console.error('댓글 작성 오류:', error)
      alert(error.message || '댓글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) {
      return
    }
    
    try {
      const response = await fetch(`/api/client/${clientId}/notes/${noteId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
        }),
      })
      
      if (!response.ok) {
        throw new Error('댓글 수정에 실패했습니다.')
      }
      
      setComments(comments.map(c => c.id === commentId ? { ...c, content: editContent } : c))
      setEditingId(null)
      setEditContent('')
    } catch (error: any) {
      console.error('댓글 수정 오류:', error)
      alert(error.message || '댓글 수정에 실패했습니다.')
    }
  }
  
  const handleDelete = async (commentId: string) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/client/${clientId}/notes/${noteId}/comments/${commentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('댓글 삭제에 실패했습니다.')
      }
      
      setComments(comments.filter(c => c.id !== commentId))
    } catch (error: any) {
      console.error('댓글 삭제 오류:', error)
      alert(error.message || '댓글 삭제에 실패했습니다.')
    }
  }
  
  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  
  return (
    <div>
      {/* 댓글 목록 */}
      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
            {editingId === comment.id ? (
              <div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(comment.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditContent('')
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} />
                    <span className="font-medium">
                      {comment.profiles?.display_name || comment.profiles?.email || '알 수 없음'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                  {currentUserId === comment.author_id && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(comment.id)
                          setEditContent(comment.content)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{comment.content}</p>
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* 댓글 작성 */}
      <div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !newComment.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          <span>{isSubmitting ? '작성 중...' : '댓글 작성'}</span>
        </button>
      </div>
    </div>
  )
}
