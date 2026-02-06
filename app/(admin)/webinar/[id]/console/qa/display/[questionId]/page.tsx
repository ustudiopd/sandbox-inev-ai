'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'
import type { BroadcastEnvelope } from '@/lib/webinar/realtime'
import { isValidBroadcastEnvelope } from '@/lib/webinar/realtime'

interface Question {
  id: number
  user_id: string
  content: string
  status: 'published' | 'answered' | 'hidden' | 'pinned'
  created_at: string
  answered_by?: string
  answered_at?: string
  answer?: string
  user?: {
    display_name?: string
    email?: string
  }
}

export default function QADisplayPage() {
  const params = useParams()
  const webinarId = params.id as string
  const questionId = Number(params.questionId)
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadQuestion()
    
    // Broadcast 이벤트 구독 (다른 관리자가 클릭한 질문도 모든 중계화면에 동기화)
    const broadcastChannel = supabase
      .channel(`webinar:${webinarId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'broadcast',
        { event: 'qa:display' },
        (payload: any) => {
          const env = (payload?.payload || payload) as BroadcastEnvelope | undefined
          
          if (!isValidBroadcastEnvelope(env) || env.t !== 'qa:display') {
            return
          }
          
          const data = env.payload as { questionId: number; question?: Question }
          if (data && data.questionId) {
            // 질문 데이터가 함께 전송되었으면 즉시 표시 (API 호출 없이 빠른 전환)
            if (data.question) {
              const newQuestionId = data.questionId
              window.history.pushState(
                null,
                '',
                `/webinar/${webinarId}/console/qa/display/${newQuestionId}`
              )
              setQuestion(data.question)
              setLoading(false)
            } else {
              // 질문 데이터가 없으면 API로 조회
              const newQuestionId = data.questionId
              window.history.pushState(
                null,
                '',
                `/webinar/${webinarId}/console/qa/display/${newQuestionId}`
              )
              loadQuestionById(newQuestionId, false)
            }
          }
        }
      )
      .subscribe()
    
    // 현재 질문의 실시간 구독
    const questionChannel = supabase
      .channel(`webinar-${webinarId}-question-${questionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `id=eq.${questionId}`,
        },
        () => {
          loadQuestion()
        }
      )
      .subscribe()
    
    return () => {
      broadcastChannel.unsubscribe()
      questionChannel.unsubscribe()
    }
  }, [webinarId, questionId])
  
  const loadQuestionById = async (id: number, showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const response = await fetch(`/api/questions/${id}`)
      
      if (!response.ok) {
        throw new Error('질문 조회 실패')
      }
      
      const result = await response.json()
      setQuestion(result.question)
      setLoading(false)
    } catch (error: any) {
      console.error('질문 로드 실패:', error)
      setQuestion(null)
      setLoading(false)
    }
  }
  
  const loadQuestion = async () => {
    await loadQuestionById(questionId)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#038D7C] flex items-center justify-center">
        <div className="text-white text-xl">질문을 불러오는 중...</div>
      </div>
    )
  }
  
  if (!question) {
    return (
      <div className="min-h-screen bg-[#038D7C] flex items-center justify-center">
        <div className="text-white text-xl">질문을 찾을 수 없습니다</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#038D7C] flex items-center justify-center p-12">
      <div className="max-w-7xl w-full">
        {/* 질문만 표시 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/20">
          <div className="flex items-center gap-4 mb-6">
            {question.status === 'pinned' && (
              <span className="text-sm bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-medium">고정</span>
            )}
            {question.status === 'answered' && (
              <span className="text-sm bg-green-400 text-green-900 px-4 py-2 rounded-full font-medium">답변됨</span>
            )}
            <span className="text-white/80 text-xl font-medium">{question.user?.display_name || '익명'}</span>
            <span className="text-white/60 text-base">
              {new Date(question.created_at).toLocaleString('ko-KR')}
            </span>
          </div>
          <p className="text-white text-5xl md:text-6xl font-medium leading-relaxed whitespace-pre-wrap">{question.content}</p>
        </div>
      </div>
    </div>
  )
}
