'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

interface Message {
  id: number
  user_id: string
  content: string
  created_at: string
  hidden?: boolean
  user?: {
    display_name?: string
    email?: string
  }
}

interface ChatModerationProps {
  webinarId: string
}

export default function ChatModeration({ webinarId }: ChatModerationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadMessages()
    
    // 실시간 구독
    const channel = supabase
      .channel(`webinar-${webinarId}-messages-moderation`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `webinar_id=eq.${webinarId}`,
        },
        (payload) => {
          console.log('실시간 메시지 이벤트 (모더레이션):', payload.eventType, payload)
          
          if (payload.eventType === 'UPDATE') {
            // UPDATE 이벤트는 즉시 반영
            const updatedMsg = payload.new as any
            if (!updatedMsg?.id) {
              console.warn('UPDATE 이벤트에 id가 없습니다:', payload)
              return
            }
            
            console.log('메시지 업데이트 이벤트 수신 (모더레이션):', updatedMsg.id, 'hidden:', updatedMsg.hidden)
            
            setMessages((prev) => {
              const hasMessage = prev.some(msg => msg.id === updatedMsg.id)
              
              if (!hasMessage) {
                // 메시지가 목록에 없으면 전체 다시 로드 (새 메시지일 수 있음)
                console.log('업데이트된 메시지가 목록에 없음, 전체 다시 로드:', updatedMsg.id)
                loadMessages()
                return prev
              }
              
              // 메시지 업데이트 (운영 콘솔에서는 숨김 메시지도 표시)
              const updated = prev.map((msg) =>
                msg.id === updatedMsg.id
                  ? { ...msg, ...updatedMsg, hidden: updatedMsg.hidden ?? false }
                  : msg
              )
              
              console.log('메시지 업데이트 반영 완료 (모더레이션):', updatedMsg.id, 'hidden:', updatedMsg.hidden)
              
              return updated
            })
          } else if (payload.eventType === 'INSERT') {
            // 새 메시지 추가 시 전체 다시 로드 (프로필 정보 포함)
            loadMessages()
          } else if (payload.eventType === 'DELETE') {
            // 삭제된 메시지 제거
            const deletedMsg = payload.old as any
            if (deletedMsg?.id) {
              setMessages((prev) => prev.filter((msg) => msg.id !== deletedMsg.id))
            }
          }
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [webinarId])
  
  const loadMessages = async () => {
    setLoading(true)
    try {
      // API를 통해 메시지 조회 (프로필 정보 포함, RLS 우회)
      // 운영 콘솔에서는 숨김 메시지도 포함하여 조회
      const response = await fetch(`/api/webinars/${webinarId}/messages?limit=100&includeHidden=true`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: 메시지 조회 실패`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '메시지 조회 실패')
      }
      
      const loadedMessages = result.messages || []
      
      // 시간순 정렬 (오래된 것부터)
      const formattedMessages = loadedMessages.reverse()
      
      setMessages(formattedMessages)
    } catch (error: any) {
      console.error('메시지 로드 실패:', error)
      // 사용자에게 에러 메시지 표시
      setMessages([])
    } finally {
      setLoading(false)
    }
  }
  
  const handleHide = async (messageId: number) => {
    try {
      // Optimistic Update: 즉시 UI 업데이트
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, hidden: true } : msg
        )
      )
      
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: true }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        // 실패 시 롤백
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, hidden: false } : msg
          )
        )
        throw new Error(result.error || '메시지 숨김 실패')
      }
      
      // 성공 시 실시간 이벤트로 업데이트되므로 별도 처리 불필요
    } catch (error: any) {
      console.error('메시지 숨김 실패:', error)
      alert(error.message || '메시지 숨김에 실패했습니다')
    }
  }
  
  const handleShow = async (messageId: number) => {
    try {
      // Optimistic Update: 즉시 UI 업데이트
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, hidden: false } : msg
        )
      )
      
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: false }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        // 실패 시 롤백
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, hidden: true } : msg
          )
        )
        throw new Error(result.error || '메시지 표시 실패')
      }
      
      // 성공 시 실시간 이벤트로 업데이트되므로 별도 처리 불필요
    } catch (error: any) {
      console.error('메시지 표시 실패:', error)
      alert(error.message || '메시지 표시에 실패했습니다')
    }
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  
  return (
    <div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">메시지를 불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">메시지가 없습니다</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg border-2 flex items-start justify-between ${
                message.hidden
                  ? 'border-red-200 bg-red-50 opacity-60'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">
                    {message.user?.display_name || message.user?.email || '익명'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.created_at)}
                  </span>
                  {message.hidden && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">숨김</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 break-words">{message.content}</p>
              </div>
              <div className="ml-4 flex gap-2">
                {message.hidden ? (
                  <button
                    onClick={() => handleShow(message.id)}
                    className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                  >
                    표시
                  </button>
                ) : (
                  <button
                    onClick={() => handleHide(message.id)}
                    className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  >
                    숨김
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

