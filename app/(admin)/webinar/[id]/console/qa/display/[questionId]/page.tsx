'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase/client'

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
    
    // postMessage로 질문 업데이트 받기 (페이지 리로드 없이 빠른 전환)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_QUESTION' && event.data?.question) {
        setQuestion(event.data.question)
        setLoading(false)
        // URL도 업데이트
        if (window.history && event.data.question.id) {
          window.history.pushState(
            null,
            '',
            `/webinar/${webinarId}/console/qa/display/${event.data.question.id}`
          )
        }
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // 실시간 구독
    const channel = supabase
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
      window.removeEventListener('message', handleMessage)
      channel.unsubscribe()
    }
  }, [webinarId, questionId])
  
  const loadQuestion = async () => {
    try {
      const response = await fetch(`/api/questions/${questionId}`)
      
      if (!response.ok) {
        throw new Error('질문 조회 실패')
      }
      
      const result = await response.json()
      setQuestion(result.question)
    } catch (error: any) {
      console.error('질문 로드 실패:', error)
    } finally {
      setLoading(false)
    }
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
