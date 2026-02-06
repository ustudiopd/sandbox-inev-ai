'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

interface Form {
  id: string
  title: string
  description?: string
  kind: 'survey' | 'quiz'
  status: 'draft' | 'open' | 'closed'
  created_at: string
  time_limit_sec?: number
  max_attempts?: number
}

interface FormQuestion {
  id: string
  order_no: number
  type: 'single' | 'multiple' | 'text'
  body: string
  options?: Array<{ id: string; text: string }>
  points?: number
  answer_key?: { choiceIds?: string[]; text?: string }
}

interface NewQuestion {
  id: string
  type: 'single' | 'multiple' | 'text'
  body: string
  options?: Array<{ id: string; text: string }>
  points?: number
  answerKey?: { choiceIds?: string[]; text?: string }
}

interface FormManagementProps {
  webinarId: string
}

export default function FormManagement({ webinarId }: FormManagementProps) {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'survey' | 'quiz'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'open' | 'closed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
  const [resultsData, setResultsData] = useState<any>(null)
  const [loadingResults, setLoadingResults] = useState(false)
  
  // 새 폼 생성 상태
  const [newFormKind, setNewFormKind] = useState<'survey' | 'quiz'>('survey')
  const [newFormTitle, setNewFormTitle] = useState('')
  const [newFormDescription, setNewFormDescription] = useState('')
  const [newFormTimeLimit, setNewFormTimeLimit] = useState<number | ''>('')
  const [newFormMaxAttempts, setNewFormMaxAttempts] = useState<number | ''>('')
  const [newFormQuestions, setNewFormQuestions] = useState<NewQuestion[]>([])
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  const supabase = createClientSupabase()
  
  useEffect(() => {
    loadForms()
    
    // 실시간 구독
    const channel = supabase
      .channel(`webinar-${webinarId}-forms-management`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
          filter: `webinar_id=eq.${webinarId}`,
        },
        () => {
          loadForms()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'form_submissions',
        },
        () => {
          loadSubmissionCounts()
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [webinarId, filter, statusFilter])
  
  useEffect(() => {
    loadSubmissionCounts()
  }, [forms])
  
  const loadForms = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('forms')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('created_at', { ascending: false })
      
      if (filter === 'survey') {
        query = query.eq('kind', 'survey')
      } else if (filter === 'quiz') {
        query = query.eq('kind', 'quiz')
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setForms(data || [])
    } catch (error) {
      console.error('폼 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadSubmissionCounts = async () => {
    const counts: Record<string, number> = {}
    for (const form of forms) {
      const { count } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', form.id)
      counts[form.id] = count || 0
    }
    setSubmissionCounts(counts)
  }
  
  const handleStatusChange = async (formId: string, newStatus: 'draft' | 'open' | 'closed') => {
    try {
      const response = await fetch(`/api/webinars/${webinarId}/forms/${formId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '상태 변경 실패')
      }
      
      loadForms()
    } catch (error: any) {
      console.error('상태 변경 실패:', error)
      alert(error.message || '상태 변경에 실패했습니다')
    }
  }
  
  const handleDelete = async (formId: string) => {
    if (!confirm('이 폼을 삭제하시겠습니까? 모든 응답 데이터도 함께 삭제됩니다.')) return
    
    try {
      const response = await fetch(`/api/webinars/${webinarId}/forms/${formId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '삭제 실패')
      }
      
      loadForms()
    } catch (error: any) {
      console.error('삭제 실패:', error)
      alert(error.message || '삭제에 실패했습니다')
    }
  }
  
  const handleViewResults = async (formId: string) => {
    try {
      setLoadingResults(true)
      setShowResultsModal(true)
      
      const form = forms.find(f => f.id === formId)
      setSelectedForm(form || null)
      
      // 폼 상세 정보와 결과를 동시에 조회
      const [formResponse, resultsResponse] = await Promise.all([
        fetch(`/api/webinars/${webinarId}/forms/${formId}`),
        fetch(`/api/webinars/${webinarId}/forms/${formId}/results`)
      ])
      
      const formResult = await formResponse.json()
      const resultsResult = await resultsResponse.json()
      
      if (!formResponse.ok || formResult.error) {
        throw new Error(formResult.error || '폼 조회 실패')
      }
      
      if (!resultsResponse.ok || resultsResult.error) {
        throw new Error(resultsResult.error || '결과 조회 실패')
      }
      
      // 폼 정보와 결과 데이터를 함께 저장
      setSelectedForm(formResult.form)
      setResultsData({
        ...resultsResult.results,
        formQuestions: formResult.form.questions || [], // 문항 정보 (선택지 텍스트 포함)
      })
    } catch (error: any) {
      console.error('결과 조회 실패:', error)
      alert(error.message || '결과 조회에 실패했습니다')
      setShowResultsModal(false)
    } finally {
      setLoadingResults(false)
    }
  }
  
  const handleAddQuestion = () => {
    const newQuestion: NewQuestion = {
      id: `temp-${Date.now()}-${Math.random()}`,
      type: 'single',
      body: '',
      options: newFormKind === 'quiz' ? [] : [{ id: '1', text: '' }, { id: '2', text: '' }],
      points: newFormKind === 'quiz' ? 1 : undefined,
    }
    setNewFormQuestions([...newFormQuestions, newQuestion])
  }
  
  const handleRemoveQuestion = (questionId: string) => {
    setNewFormQuestions(newFormQuestions.filter(q => q.id !== questionId))
  }
  
  const handleUpdateQuestion = (questionId: string, updates: Partial<NewQuestion>) => {
    setNewFormQuestions(newFormQuestions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ))
  }
  
  const handleAddOption = (questionId: string) => {
    setNewFormQuestions(newFormQuestions.map(q => {
      if (q.id !== questionId) return q
      const newOptionId = String((q.options?.length || 0) + 1)
      return {
        ...q,
        options: [...(q.options || []), { id: newOptionId, text: '' }]
      }
    }))
  }
  
  const handleRemoveOption = (questionId: string, optionId: string) => {
    setNewFormQuestions(newFormQuestions.map(q => {
      if (q.id !== questionId) return q
      return {
        ...q,
        options: q.options?.filter(opt => opt.id !== optionId) || []
      }
    }))
  }
  
  const handleUpdateOption = (questionId: string, optionId: string, text: string) => {
    setNewFormQuestions(newFormQuestions.map(q => {
      if (q.id !== questionId) return q
      return {
        ...q,
        options: q.options?.map(opt => 
          opt.id === optionId ? { ...opt, text } : opt
        ) || []
      }
    }))
  }
  
  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) {
      alert('제목을 입력해주세요')
      return
    }
    
    if (newFormQuestions.length === 0) {
      alert('최소 1개 이상의 문항을 추가해주세요')
      return
    }
    
    // 문항 유효성 검사
    for (const q of newFormQuestions) {
      if (!q.body.trim()) {
        alert('모든 문항의 내용을 입력해주세요')
        return
      }
      
      if ((q.type === 'single' || q.type === 'multiple') && (!q.options || q.options.length < 2)) {
        alert('선택형 문항은 최소 2개 이상의 보기가 필요합니다')
        return
      }
      
      if ((q.type === 'single' || q.type === 'multiple') && q.options) {
        for (const opt of q.options) {
          if (!opt.text.trim()) {
            alert('모든 보기의 내용을 입력해주세요')
            return
          }
        }
      }
      
      if (newFormKind === 'quiz' && (!q.points || q.points <= 0)) {
        alert('퀴즈 문항은 배점을 입력해주세요')
        return
      }
    }
    
    setCreating(true)
    try {
      const questions = newFormQuestions.map(q => ({
        type: q.type,
        body: q.body.trim(),
        options: (q.type === 'single' || q.type === 'multiple') ? q.options : undefined,
        points: newFormKind === 'quiz' ? (q.points || 0) : undefined,
        answerKey: newFormKind === 'quiz' ? q.answerKey : undefined,
      }))
      
      const response = await fetch(`/api/webinars/${webinarId}/forms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFormTitle.trim(),
          description: newFormDescription.trim() || undefined,
          kind: newFormKind,
          timeLimitSec: newFormTimeLimit ? Number(newFormTimeLimit) : undefined,
          maxAttempts: newFormMaxAttempts ? Number(newFormMaxAttempts) : undefined,
          questions,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '폼 생성 실패')
      }
      
      // 성공 시 초기화 및 모달 닫기
      setNewFormTitle('')
      setNewFormDescription('')
      setNewFormTimeLimit('')
      setNewFormMaxAttempts('')
      setNewFormQuestions([])
      setNewFormKind('survey')
      setShowCreateModal(false)
      loadForms()
    } catch (error: any) {
      console.error('폼 생성 실패:', error)
      alert(error.message || '폼 생성에 실패했습니다')
    } finally {
      setCreating(false)
    }
  }
  
  const handleCancelCreate = () => {
    if (confirm('작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?')) {
      setNewFormTitle('')
      setNewFormDescription('')
      setNewFormTimeLimit('')
      setNewFormMaxAttempts('')
      setNewFormQuestions([])
      setNewFormKind('survey')
      setShowCreateModal(false)
    }
  }
  
  const handleEdit = async (formId: string) => {
    try {
      setEditingFormId(formId)
      setLoading(true)
      
      // 폼 상세 정보 조회
      const response = await fetch(`/api/webinars/${webinarId}/forms/${formId}`)
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '폼 조회 실패')
      }
      
      const form = result.form
      
      // 폼 데이터를 편집 상태로 설정
      setNewFormKind(form.kind)
      setNewFormTitle(form.title)
      setNewFormDescription(form.description || '')
      setNewFormTimeLimit(form.time_limit_sec || '')
      setNewFormMaxAttempts(form.max_attempts || '')
      
      // 문항 데이터 변환
      const questions: NewQuestion[] = (form.questions || []).map((q: any) => ({
        id: q.id || `temp-${Date.now()}-${Math.random()}`,
        type: q.type,
        body: q.body,
        options: q.options || undefined,
        points: q.points || undefined,
        answerKey: q.answer_key || undefined,
      }))
      
      setNewFormQuestions(questions)
      setShowEditModal(true)
    } catch (error: any) {
      console.error('폼 조회 실패:', error)
      alert(error.message || '폼 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpdateForm = async () => {
    if (!editingFormId) return
    
    if (!newFormTitle.trim()) {
      alert('제목을 입력해주세요')
      return
    }
    
    if (newFormQuestions.length === 0) {
      alert('최소 1개 이상의 문항을 추가해주세요')
      return
    }
    
    // 문항 유효성 검사
    for (const q of newFormQuestions) {
      if (!q.body.trim()) {
        alert('모든 문항의 내용을 입력해주세요')
        return
      }
      
      if ((q.type === 'single' || q.type === 'multiple') && (!q.options || q.options.length < 2)) {
        alert('선택형 문항은 최소 2개 이상의 보기가 필요합니다')
        return
      }
      
      if ((q.type === 'single' || q.type === 'multiple') && q.options) {
        for (const opt of q.options) {
          if (!opt.text.trim()) {
            alert('모든 보기의 내용을 입력해주세요')
            return
          }
        }
      }
      
      if (newFormKind === 'quiz' && (!q.points || q.points <= 0)) {
        alert('퀴즈 문항은 배점을 입력해주세요')
        return
      }
    }
    
    setUpdating(true)
    try {
      const questions = newFormQuestions.map(q => ({
        type: q.type,
        body: q.body.trim(),
        options: (q.type === 'single' || q.type === 'multiple') ? q.options : undefined,
        points: newFormKind === 'quiz' ? (q.points || 0) : undefined,
        answerKey: newFormKind === 'quiz' ? q.answerKey : undefined,
      }))
      
      const response = await fetch(`/api/webinars/${webinarId}/forms/${editingFormId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFormTitle.trim(),
          description: newFormDescription.trim() || undefined,
          timeLimitSec: newFormTimeLimit ? Number(newFormTimeLimit) : undefined,
          maxAttempts: newFormMaxAttempts ? Number(newFormMaxAttempts) : undefined,
          questions,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '폼 수정 실패')
      }
      
      // 성공 시 초기화 및 모달 닫기
      setNewFormTitle('')
      setNewFormDescription('')
      setNewFormTimeLimit('')
      setNewFormMaxAttempts('')
      setNewFormQuestions([])
      setNewFormKind('survey')
      setEditingFormId(null)
      setShowEditModal(false)
      loadForms()
    } catch (error: any) {
      console.error('폼 수정 실패:', error)
      alert(error.message || '폼 수정에 실패했습니다')
    } finally {
      setUpdating(false)
    }
  }
  
  const handleCancelEdit = () => {
    if (confirm('작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?')) {
      setNewFormTitle('')
      setNewFormDescription('')
      setNewFormTimeLimit('')
      setNewFormMaxAttempts('')
      setNewFormQuestions([])
      setNewFormKind('survey')
      setEditingFormId(null)
      setShowEditModal(false)
    }
  }
  
  return (
    <div>
      {/* 필터 및 액션 */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
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
            onClick={() => setFilter('survey')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'survey' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            설문
          </button>
          <button
            onClick={() => setFilter('quiz')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === 'quiz' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            퀴즈
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white"
          >
            <option value="all">모든 상태</option>
            <option value="draft">초안</option>
            <option value="open">진행 중</option>
            <option value="closed">마감</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // 테스트 폼 데이터로 자동 채우기
              setNewFormKind('survey')
              setNewFormTitle('[테스트] 설문')
              setNewFormDescription('만족도 조사 테스트 폼')
              setNewFormQuestions([{
                id: `temp-${Date.now()}`,
                type: 'single',
                body: '이 웨비나에 대한 전반적인 만족도는 어떠신가요?',
                options: [
                  { id: '1', text: '매우 만족' },
                  { id: '2', text: '만족' },
                  { id: '3', text: '보통' },
                  { id: '4', text: '불만족' },
                  { id: '5', text: '매우 불만족' }
                ]
              }])
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            테스트 폼 생성
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 새 폼 만들기
          </button>
        </div>
      </div>
      
      {/* 폼 목록 */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {loading && forms.length === 0 ? (
          <div className="text-center text-gray-500 py-8">폼을 불러오는 중...</div>
        ) : forms.length === 0 ? (
          <div className="text-center text-gray-500 py-8">폼이 없습니다</div>
        ) : (
          forms.map((form) => (
            <div
              key={form.id}
              className={`p-4 rounded-lg border-2 transition-colors ${
                form.status === 'open' 
                  ? 'border-green-200 bg-green-50' 
                  : form.status === 'closed'
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg">{form.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      form.kind === 'quiz' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {form.kind === 'quiz' ? '퀴즈' : '설문'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      form.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : form.status === 'closed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {form.status === 'open' ? '진행 중' : form.status === 'closed' ? '마감' : '초안'}
                    </span>
                    {submissionCounts[form.id] !== undefined && (
                      <span className="text-xs text-gray-600">
                        응답: {submissionCounts[form.id]}건
                      </span>
                    )}
                  </div>
                  {form.description && (
                    <p className="text-sm text-gray-600 mb-2">{form.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    생성: {new Date(form.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div className="flex gap-2 ml-4 flex-wrap">
                  {form.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleEdit(form.id)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleStatusChange(form.id, 'open')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                      >
                        오픈
                      </button>
                    </>
                  )}
                  {form.status === 'open' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(form.id, 'closed')}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                      >
                        마감
                      </button>
                      <button
                        onClick={() => handleViewResults(form.id)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                      >
                        결과 보기
                      </button>
                    </>
                  )}
                  {form.status === 'closed' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(form.id, 'open')}
                        className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                      >
                        다시 오픈
                      </button>
                      <button
                        onClick={() => handleViewResults(form.id)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                      >
                        결과 보기
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">새 폼 만들기</h3>
            
            {/* 폼 종류 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">폼 종류</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="survey"
                    checked={newFormKind === 'survey'}
                    onChange={(e) => {
                      setNewFormKind('survey')
                      setNewFormQuestions([])
                    }}
                    className="mr-2"
                  />
                  설문
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="quiz"
                    checked={newFormKind === 'quiz'}
                    onChange={(e) => {
                      setNewFormKind('quiz')
                      setNewFormQuestions([])
                    }}
                    className="mr-2"
                  />
                  퀴즈
                </label>
              </div>
            </div>
            
            {/* 제목 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="폼 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 설명 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <textarea
                value={newFormDescription}
                onChange={(e) => setNewFormDescription(e.target.value)}
                placeholder="폼 설명을 입력하세요 (선택사항)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 퀴즈 설정 */}
            {newFormKind === 'quiz' && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시간 제한 (초)
                  </label>
                  <input
                    type="number"
                    value={newFormTimeLimit}
                    onChange={(e) => setNewFormTimeLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="예: 300"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    최대 시도 횟수
                  </label>
                  <input
                    type="number"
                    value={newFormMaxAttempts}
                    onChange={(e) => setNewFormMaxAttempts(e.target.value ? Number(e.target.value) : '')}
                    placeholder="예: 3"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            {/* 문항 목록 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">문항</label>
                <button
                  onClick={handleAddQuestion}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  + 문항 추가
                </button>
              </div>
              
              {newFormQuestions.length === 0 ? (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  문항이 없습니다. &quot;문항 추가&quot; 버튼을 클릭하여 문항을 추가하세요.
                </div>
              ) : (
                <div className="space-y-4">
                  {newFormQuestions.map((question, index) => (
                    <div key={question.id} className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">문항 {index + 1}</span>
                        <button
                          onClick={() => handleRemoveQuestion(question.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </div>
                      
                      {/* 문항 유형 */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
                        <select
                          value={question.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'single' | 'multiple' | 'text'
                            handleUpdateQuestion(question.id, {
                              type: newType,
                              options: (newType === 'single' || newType === 'multiple') 
                                ? (question.options && question.options.length > 0 
                                    ? question.options 
                                    : [{ id: '1', text: '' }, { id: '2', text: '' }])
                                : undefined,
                            })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="single">단일 선택</option>
                          <option value="multiple">다중 선택</option>
                          <option value="text">텍스트</option>
                        </select>
                      </div>
                      
                      {/* 문항 내용 */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          문항 내용 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={question.body}
                          onChange={(e) => handleUpdateQuestion(question.id, { body: e.target.value })}
                          placeholder="문항 내용을 입력하세요"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {/* 보기 (선택형인 경우) */}
                      {(question.type === 'single' || question.type === 'multiple') && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            보기 <span className="text-red-500">*</span> (최소 2개)
                          </label>
                          <div className="space-y-2">
                            {question.options?.map((option) => (
                              <div key={option.id} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => handleUpdateOption(question.id, option.id, e.target.value)}
                                  placeholder="보기 내용"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => handleRemoveOption(question.id, option.id)}
                                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                                >
                                  삭제
                                </button>
                                {newFormKind === 'quiz' && (
                                  <label className="flex items-center px-3">
                                    <input
                                      type={question.type === 'single' ? 'radio' : 'checkbox'}
                                      name={`answer-${question.id}`}
                                      checked={
                                        question.type === 'single'
                                          ? Boolean(question.answerKey?.choiceIds?.[0] === option.id)
                                          : Boolean(question.answerKey?.choiceIds?.includes(option.id))
                                      }
                                      onChange={(e) => {
                                        const currentChoiceIds = question.answerKey?.choiceIds || []
                                        let newChoiceIds: string[]
                                        
                                        if (question.type === 'single') {
                                          newChoiceIds = e.target.checked ? [option.id] : []
                                        } else {
                                          if (e.target.checked) {
                                            newChoiceIds = [...currentChoiceIds, option.id]
                                          } else {
                                            newChoiceIds = currentChoiceIds.filter(id => id !== option.id)
                                          }
                                        }
                                        
                                        handleUpdateQuestion(question.id, {
                                          answerKey: { choiceIds: newChoiceIds }
                                        })
                                      }}
                                      className="mr-1"
                                    />
                                    <span className="text-sm text-gray-600">정답</span>
                                  </label>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => handleAddOption(question.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              + 보기 추가
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* 텍스트 정답 (텍스트 유형인 경우) */}
                      {question.type === 'text' && newFormKind === 'quiz' && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            정답 (선택사항)
                          </label>
                          <input
                            type="text"
                            value={question.answerKey?.text || ''}
                            onChange={(e) => handleUpdateQuestion(question.id, {
                              answerKey: { text: e.target.value }
                            })}
                            placeholder="정답을 입력하세요 (선택사항)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                      
                      {/* 배점 (퀴즈인 경우) */}
                      {newFormKind === 'quiz' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            배점 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={question.points || ''}
                            onChange={(e) => handleUpdateQuestion(question.id, {
                              points: e.target.value ? Number(e.target.value) : 0
                            })}
                            placeholder="예: 10"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleCancelCreate}
                disabled={creating}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleCreateForm}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {creating ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">폼 수정</h3>
            
            {/* 폼 종류 (수정 불가) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">폼 종류</label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                {newFormKind === 'quiz' ? '퀴즈' : '설문'}
              </div>
            </div>
            
            {/* 제목 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="폼 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 설명 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <textarea
                value={newFormDescription}
                onChange={(e) => setNewFormDescription(e.target.value)}
                placeholder="폼 설명을 입력하세요 (선택사항)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 퀴즈 설정 */}
            {newFormKind === 'quiz' && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시간 제한 (초)
                  </label>
                  <input
                    type="number"
                    value={newFormTimeLimit}
                    onChange={(e) => setNewFormTimeLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="예: 300"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    최대 시도 횟수
                  </label>
                  <input
                    type="number"
                    value={newFormMaxAttempts}
                    onChange={(e) => setNewFormMaxAttempts(e.target.value ? Number(e.target.value) : '')}
                    placeholder="예: 3"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            {/* 문항 목록 (생성 모달과 동일한 구조) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">문항</label>
                <button
                  onClick={handleAddQuestion}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  + 문항 추가
                </button>
              </div>
              
              {newFormQuestions.length === 0 ? (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  문항이 없습니다. &quot;문항 추가&quot; 버튼을 클릭하여 문항을 추가하세요.
                </div>
              ) : (
                <div className="space-y-4">
                  {newFormQuestions.map((question, index) => (
                    <div key={question.id} className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">문항 {index + 1}</span>
                        <button
                          onClick={() => handleRemoveQuestion(question.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </div>
                      
                      {/* 문항 유형 */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
                        <select
                          value={question.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'single' | 'multiple' | 'text'
                            handleUpdateQuestion(question.id, {
                              type: newType,
                              options: (newType === 'single' || newType === 'multiple') 
                                ? (question.options && question.options.length > 0 
                                    ? question.options 
                                    : [{ id: '1', text: '' }, { id: '2', text: '' }])
                                : undefined,
                            })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="single">단일 선택</option>
                          <option value="multiple">다중 선택</option>
                          <option value="text">텍스트</option>
                        </select>
                      </div>
                      
                      {/* 문항 내용 */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          문항 내용 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={question.body}
                          onChange={(e) => handleUpdateQuestion(question.id, { body: e.target.value })}
                          placeholder="문항 내용을 입력하세요"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {/* 보기 (선택형인 경우) */}
                      {(question.type === 'single' || question.type === 'multiple') && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            보기 <span className="text-red-500">*</span> (최소 2개)
                          </label>
                          <div className="space-y-2">
                            {question.options?.map((option) => (
                              <div key={option.id} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => handleUpdateOption(question.id, option.id, e.target.value)}
                                  placeholder="보기 내용"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => handleRemoveOption(question.id, option.id)}
                                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                                >
                                  삭제
                                </button>
                                {newFormKind === 'quiz' && (
                                  <label className="flex items-center px-3">
                                    <input
                                      type={question.type === 'single' ? 'radio' : 'checkbox'}
                                      name={`answer-${question.id}`}
                                      checked={
                                        question.type === 'single'
                                          ? Boolean(question.answerKey?.choiceIds?.[0] === option.id)
                                          : Boolean(question.answerKey?.choiceIds?.includes(option.id))
                                      }
                                      onChange={(e) => {
                                        const currentChoiceIds = question.answerKey?.choiceIds || []
                                        let newChoiceIds: string[]
                                        
                                        if (question.type === 'single') {
                                          newChoiceIds = e.target.checked ? [option.id] : []
                                        } else {
                                          if (e.target.checked) {
                                            newChoiceIds = [...currentChoiceIds, option.id]
                                          } else {
                                            newChoiceIds = currentChoiceIds.filter(id => id !== option.id)
                                          }
                                        }
                                        
                                        handleUpdateQuestion(question.id, {
                                          answerKey: { choiceIds: newChoiceIds }
                                        })
                                      }}
                                      className="mr-1"
                                    />
                                    <span className="text-sm text-gray-600">정답</span>
                                  </label>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => handleAddOption(question.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              + 보기 추가
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* 텍스트 정답 (텍스트 유형인 경우) */}
                      {question.type === 'text' && newFormKind === 'quiz' && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            정답 (선택사항)
                          </label>
                          <input
                            type="text"
                            value={question.answerKey?.text || ''}
                            onChange={(e) => handleUpdateQuestion(question.id, {
                              answerKey: { text: e.target.value }
                            })}
                            placeholder="정답을 입력하세요 (선택사항)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                      
                      {/* 배점 (퀴즈인 경우) */}
                      {newFormKind === 'quiz' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            배점 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={question.points || ''}
                            onChange={(e) => handleUpdateQuestion(question.id, {
                              points: e.target.value ? Number(e.target.value) : 0
                            })}
                            placeholder="예: 10"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleCancelEdit}
                disabled={updating}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleUpdateForm}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {updating ? '수정 중...' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 결과 모달 */}
      {showResultsModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {selectedForm.title} - 결과
              </h3>
              <button
                onClick={() => {
                  setShowResultsModal(false)
                  setResultsData(null)
                  setSelectedForm(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            {loadingResults ? (
              <div className="text-center py-8 text-gray-500">결과를 불러오는 중...</div>
            ) : resultsData ? (
              <div className="space-y-6">
                {/* 전체 통계 */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2">전체 통계</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    총 {resultsData.submissionCount}건 제출
                  </div>
                </div>
                
                {/* 퀴즈 점수 통계 */}
                {selectedForm.kind === 'quiz' && resultsData.scoreStats && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-lg mb-3">점수 통계</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">평균 점수</div>
                        <div className="text-xl font-bold text-purple-600">
                          {resultsData.scoreStats.averageScore.toFixed(1)}점
                        </div>
                        <div className="text-xs text-gray-500">
                          / {resultsData.scoreStats.totalPoints}점
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">최고 점수</div>
                        <div className="text-xl font-bold text-green-600">
                          {resultsData.scoreStats.maxScore}점
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">최저 점수</div>
                        <div className="text-xl font-bold text-red-600">
                          {resultsData.scoreStats.minScore}점
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">시도 횟수</div>
                        <div className="text-xl font-bold text-gray-700">
                          {resultsData.scoreStats.attemptCount}회
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 문항별 통계 */}
                <div>
                  <h4 className="font-semibold text-lg mb-3">문항별 통계</h4>
                  <div className="space-y-4">
                    {resultsData.questionStats.map((stat: any, index: number) => {
                      // 문항 정보 찾기 (선택지 텍스트를 위해)
                      const questionInfo = resultsData.formQuestions?.find((q: any) => q.id === stat.questionId)
                      
                      return (
                        <div key={stat.questionId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                문항 {index + 1}: {stat.questionBody}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                유형: {stat.questionType === 'single' ? '단일 선택' : stat.questionType === 'multiple' ? '다중 선택' : '텍스트'}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              응답: {stat.totalAnswers}건
                            </div>
                          </div>
                          
                          {/* 퀴즈 통계 */}
                          {selectedForm.kind === 'quiz' && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <div className="text-xs text-gray-600">정답률</div>
                                  <div className="text-lg font-semibold text-green-600">
                                    {stat.correctRate.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ({stat.correctCount}/{stat.totalAnswers})
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600">평균 배점</div>
                                  <div className="text-lg font-semibold text-blue-600">
                                    {stat.averagePoints.toFixed(1)}점
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 설문 선택지별 분포 */}
                          {selectedForm.kind === 'survey' && stat.choiceDistribution && questionInfo?.options && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm font-medium text-gray-700 mb-2">선택지별 분포</div>
                              <div className="space-y-2">
                                {Object.entries(stat.choiceDistribution).map(([choiceId, count]: [string, any]) => {
                                  // 선택지 텍스트 찾기
                                  const option = questionInfo.options.find((opt: any) => opt.id === choiceId)
                                  const optionText = option?.text || `선택지 ${choiceId}`
                                  const percentage = stat.totalAnswers > 0 
                                    ? ((count / stat.totalAnswers) * 100).toFixed(1) 
                                    : '0.0'
                                  
                                  return (
                                    <div key={choiceId} className="flex items-center gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm text-gray-700">{optionText}</span>
                                          <span className="text-sm font-medium text-gray-900">
                                            {count}건 ({percentage}%)
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 텍스트 응답 (설문) */}
                          {selectedForm.kind === 'survey' && stat.questionType === 'text' && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm text-gray-600">
                                텍스트 응답은 개별 조회가 필요합니다. (추후 구현 예정)
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">결과 데이터가 없습니다.</div>
            )}
            
            {/* 닫기 버튼 */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowResultsModal(false)
                  setResultsData(null)
                  setSelectedForm(null)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

