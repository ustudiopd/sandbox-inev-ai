'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Session {
  session_key: string
  title: string
  description?: string
  provider: string
  asset_id: string
  order: number
  speaker?: string
}

export default function NewOnDemandPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params?.clientId as string
  
  const [formData, setFormData] = useState({
    projectName: '',
    title: '',
    description: '',
    isPublic: false,
    accessPolicy: 'auth' as 'auth' | 'guest_allowed' | 'invite_only' | 'email_auth' | 'name_email_auth',
    allowedEmails: [] as string[],
    publicPath: '', // 선택사항: 비워두면 자동 생성
  })
  
  const [sessions, setSessions] = useState<Session[]>([
    {
      session_key: 's1',
      title: '',
      description: '',
      provider: 'youtube',
      asset_id: '',
      order: 1,
      speaker: '',
    },
  ])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const addSession = () => {
    const newOrder = sessions.length + 1
    setSessions([
      ...sessions,
      {
        session_key: `s${newOrder}`,
        title: '',
        description: '',
        provider: 'youtube',
        asset_id: '',
        order: newOrder,
        speaker: '',
      },
    ])
  }
  
  const removeSession = (index: number) => {
    if (sessions.length <= 1) {
      alert('최소 1개의 세션이 필요합니다.')
      return
    }
    const newSessions = sessions.filter((_, i) => i !== index)
    // order 재정렬
    const reorderedSessions = newSessions.map((s, i) => ({
      ...s,
      order: i + 1,
      session_key: `s${i + 1}`,
    }))
    setSessions(reorderedSessions)
  }
  
  const updateSession = (index: number, field: keyof Session, value: string | number) => {
    const newSessions = [...sessions]
    newSessions[index] = {
      ...newSessions[index],
      [field]: value,
    }
    setSessions(newSessions)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (!clientId) {
      setError('클라이언트 ID가 없습니다.')
      setLoading(false)
      return
    }
    
    // 유효성 검사
    if (!formData.title) {
      setError('온디맨드 제목을 입력해주세요.')
      setLoading(false)
      return
    }
    
    if (sessions.length === 0) {
      setError('최소 1개의 세션이 필요합니다.')
      setLoading(false)
      return
    }
    
    // 세션 유효성 검사
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      if (!session.title) {
        setError(`${i + 1}번째 세션의 제목을 입력해주세요.`)
        setLoading(false)
        return
      }
      if (!session.asset_id) {
        setError(`${i + 1}번째 세션의 YouTube 영상 ID를 입력해주세요.`)
        setLoading(false)
        return
      }
    }
    
    try {
      // 세션 데이터 정리
      const cleanedSessions = sessions.map((s) => ({
        session_key: s.session_key,
        title: s.title.trim(),
        description: s.description?.trim() || undefined,
        provider: s.provider,
        asset_id: s.asset_id.trim(),
        order: s.order,
        speaker: s.speaker?.trim() || undefined,
      }))
      
      const requestBody = {
        clientId,
        projectName: formData.projectName || undefined,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        type: 'ondemand',
        isPublic: formData.isPublic,
        accessPolicy: formData.accessPolicy,
        allowedEmails: formData.accessPolicy === 'email_auth' ? formData.allowedEmails : undefined,
        publicPath: formData.publicPath || undefined,
        sessions: cleanedSessions,
      }
      
      console.log('온디맨드 생성 요청:', requestBody)
      
      const response = await fetch('/api/ondemand/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      
      console.log('응답 상태:', response.status, response.statusText)
      
      let result
      try {
        result = await response.json()
        console.log('응답 데이터:', result)
      } catch (jsonError) {
        console.error('JSON 파싱 오류:', jsonError)
        throw new Error('서버 응답을 파싱할 수 없습니다.')
      }
      
      if (!response.ok) {
        throw new Error(result.error || `서버 오류 (${response.status})`)
      }
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // 성공 시 온디맨드 목록 페이지로 이동 (또는 대시보드)
      const webinarSlug = result.webinar?.slug || '자동 생성됨'
      const ondemandUrl = `/ondemand/${webinarSlug}`
      alert(`온디맨드가 성공적으로 생성되었습니다!\n\n공개 경로: /${webinarSlug}\n접근 URL: ${ondemandUrl}`)
      router.push(`/client/${clientId}/dashboard`)
      router.refresh()
    } catch (err: any) {
      console.error('온디맨드 생성 오류:', err)
      const errorMessage = err.message || '온디맨드 생성 중 오류가 발생했습니다'
      setError(errorMessage)
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link 
            href={`/client/${clientId}/dashboard`}
            className="text-teal-600 hover:text-teal-700 hover:underline mb-4 inline-block"
          >
            ← 대시보드로 돌아가기
          </Link>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            온디맨드 생성
          </h1>
          <p className="text-gray-600">새로운 온디맨드 웨비나를 생성하세요</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프로젝트명
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="대시보드에 표시될 프로젝트명을 입력하세요"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    대시보드에 표시되는 프로젝트명입니다. 비워두면 온디맨드 제목이 사용됩니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    온디맨드 제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="온디맨드 웨비나 제목을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="온디맨드 웨비나에 대한 설명을 입력하세요"
                  />
                </div>
              </div>
            </div>

            {/* 세션 정보 */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">세션 정보</h2>
                <button
                  type="button"
                  onClick={addSession}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  + 세션 추가
                </button>
              </div>
              
              <div className="space-y-6">
                {sessions.map((session, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        세션 {session.order}
                      </h3>
                      {sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSession(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          세션 제목 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={session.title}
                          onChange={(e) => updateSession(index, 'title', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="예: Session 1. Overview"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          YouTube 영상 ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={session.asset_id}
                          onChange={(e) => updateSession(index, 'asset_id', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="예: dQw4w9WgXcQ"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          YouTube URL에서 v= 뒤의 영상 ID만 입력하세요
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          강사명
                        </label>
                        <input
                          type="text"
                          value={session.speaker || ''}
                          onChange={(e) => updateSession(index, 'speaker', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="선택사항"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          순서
                        </label>
                        <input
                          type="number"
                          value={session.order}
                          onChange={(e) => updateSession(index, 'order', parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          세션 설명
                        </label>
                        <textarea
                          value={session.description || ''}
                          onChange={(e) => updateSession(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="선택사항"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 접근 설정 */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">접근 설정</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="mr-2 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">공개 웨비나</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500 ml-6">
                    체크하면 누구나 접근할 수 있습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    접근 정책
                  </label>
                  <select
                    value={formData.accessPolicy}
                    onChange={(e) => setFormData({ ...formData, accessPolicy: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="auth">로그인 필요</option>
                    <option value="guest_allowed">게스트 허용</option>
                    <option value="email_auth">이메일 인증</option>
                    <option value="name_email_auth">이름+이메일 인증</option>
                    <option value="invite_only">초대 전용</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 공개 경로 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공개 경로 (선택사항)
              </label>
              <input
                type="text"
                value={formData.publicPath}
                onChange={(e) => setFormData({ ...formData, publicPath: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="비워두면 자동 생성됩니다"
              />
              <p className="mt-1 text-sm text-gray-500">
                URL에 사용될 경로입니다. 비워두면 제목 기반으로 자동 생성됩니다.
              </p>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 온디맨드 안내:</strong>
                <br />온디맨드는 라이브 스트리밍이 아닌 녹화 영상을 시청할 수 있는 웨비나입니다.
                <br />여러 세션으로 구성할 수 있으며, 각 세션별로 질문을 남길 수 있습니다.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Link
                href={`/client/${clientId}/dashboard`}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                {loading ? '생성 중...' : '온디맨드 생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
