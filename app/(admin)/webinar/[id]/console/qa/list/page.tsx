'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function QAListPage() {
  const params = useParams()
  const webinarId = params.id as string
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'published' | 'answered' | 'pinned'>('all')
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)
  const displayWindowRef = useRef<Window | null>(null)
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadQuestions()
    
    // 실시간 구독
    const channel = supabase
      .channel(`webinar-${webinarId}-questions-list`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `webinar_id=eq.${webinarId}`,
        },
        () => {
          loadQuestions()
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [webinarId, filter])
  
  const loadQuestions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        onlyMine: 'false',
        filter: filter,
      })
      
      const response = await fetch(`/api/webinars/${webinarId}/questions?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: 질문 조회 실패`)
      }
      
      const result = await response.json()
      const loadedQuestions = result.questions || []
      
      setQuestions(loadedQuestions)
    } catch (error: any) {
      console.error('질문 로드 실패:', error)
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }
  
  const handleQuestionClick = (questionId: number) => {
    setSelectedQuestionId(questionId)
    // 기존 중계화면 창이 있고 닫히지 않았으면 그 창에서 URL 변경
    if (displayWindowRef.current && !displayWindowRef.current.closed) {
      displayWindowRef.current.location.href = `/webinar/${webinarId}/console/qa/display/${questionId}`
      displayWindowRef.current.focus()
    } else {
      // 기존 창이 없거나 닫혔으면 새 창 열기
      const url = `/webinar/${webinarId}/console/qa/display/${questionId}`
      displayWindowRef.current = window.open(url, 'qa-display', 'width=1920,height=1080')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Q&A 전체 리스트</h1>
        
        {/* 필터 */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('published')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'published' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            미답변
          </button>
          <button
            onClick={() => setFilter('answered')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'answered' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            답변됨
          </button>
          <button
            onClick={() => setFilter('pinned')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'pinned' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            고정됨
          </button>
        </div>
        
        {/* 질문 목록 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading && questions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">질문을 불러오는 중...</div>
          ) : questions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">질문이 없습니다</div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => handleQuestionClick(question.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    question.status === 'pinned' 
                      ? 'border-yellow-400 bg-yellow-50' 
                      : question.status === 'answered'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white'
                  } ${selectedQuestionId === question.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">{question.user?.display_name || '익명'}</span>
                        {question.status === 'pinned' && (
                          <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded">고정</span>
                        )}
                        {question.status === 'answered' && (
                          <span className="text-xs bg-green-400 text-green-900 px-2 py-0.5 rounded">답변됨</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(question.created_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{question.content}</p>
                      {question.answer && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-green-700 mb-1">답변:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-2">{question.answer}</p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 text-xs text-blue-600 font-medium">
                      클릭하여 중계화면 열기 →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
