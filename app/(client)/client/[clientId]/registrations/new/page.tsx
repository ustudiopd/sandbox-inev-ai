'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function NewRegistrationPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params?.clientId as string
  
  const [formData, setFormData] = useState({
    title: '',
    host: '',
    publicPath: '', // 선택사항: 비워두면 6자리 숫자로 자동 생성
    status: 'draft' as 'draft' | 'published' | 'closed',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (!clientId) {
      setError('클라이언트 ID가 없습니다.')
      setLoading(false)
      return
    }
    
    if (!formData.title) {
      setError('제목은 필수 항목입니다.')
      setLoading(false)
      return
    }
    
    try {
      const requestBody = {
        clientId,
        title: formData.title,
        host: formData.host || null,
        publicPath: formData.publicPath,
        status: formData.status,
        type: 'registration', // 등록 페이지 타입
      }
      
      console.log('등록 페이지 캠페인 생성 요청:', requestBody)
      
      const response = await fetch('/api/event-survey/campaigns/create', {
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
      
      // 성공 시 설문조사 목록 페이지로 이동 (등록 페이지도 같은 경로 사용)
      const publicPath = result.campaign?.public_path || '자동 생성됨'
      const publicUrl = `/event${publicPath}`
      alert(`등록 페이지가 성공적으로 생성되었습니다!\n\n공개 경로: ${publicPath}\n접근 URL: ${publicUrl}`)
      router.push(`/client/${clientId}/surveys`)
      router.refresh()
    } catch (err: any) {
      console.error('등록 페이지 캠페인 생성 오류:', err)
      const errorMessage = err.message || '등록 페이지 캠페인 생성 중 오류가 발생했습니다'
      setError(errorMessage)
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link 
            href={`/client/${clientId}/dashboard`}
            className="text-blue-600 hover:text-blue-700 hover:underline mb-4 inline-block"
          >
            ← 대시보드로 돌아가기
          </Link>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            등록페이지 생성
          </h1>
          <p className="text-gray-600">새로운 이벤트 등록 페이지를 생성하세요</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                캠페인 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="예: 2025 트리즈 부스 등록"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공개 경로 (Public Path) <span className="text-gray-400 text-xs">(선택사항)</span>
              </label>
              <input
                type="text"
                value={formData.publicPath}
                onChange={(e) => setFormData({ ...formData, publicPath: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="비워두면 6자리 숫자로 자동 생성됩니다"
                pattern="^/[a-zA-Z0-9\/_-]+$"
              />
              <p className="mt-1 text-sm text-gray-500">
                비워두면 6자리 숫자(예: /123456)로 자동 생성됩니다.
                <br />직접 입력 시 슬래시(/)로 시작하는 유효한 경로를 입력하세요. 실제 접근 경로는 <code className="bg-gray-100 px-1 rounded">/event{'{'}경로{'}'}</code> 형태가 됩니다.
                <br />예: <code className="bg-gray-100 px-1 rounded">/test</code> 입력 시 → <code className="bg-gray-100 px-1 rounded">/event/test</code>로 접근 가능
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                호스트 (Host) <span className="text-gray-400 text-xs">(선택사항)</span>
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="example.com"
              />
              <p className="mt-1 text-sm text-gray-500">
                도메인 식별용입니다. 비워두면 기본 도메인을 사용합니다.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="draft">초안 (Draft)</option>
                <option value="published">발행됨 (Published)</option>
                <option value="closed">종료됨 (Closed)</option>
              </select>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 등록 페이지 안내:</strong>
                <br />등록 페이지는 등록자 정보(이름, 회사명, 전화번호)만 수집합니다.
                <br />등록 후 설문조사 기능을 연결하려면, 등록 페이지 콘솔에서 설문 폼을 연결할 수 있습니다.
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
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                {loading ? '생성 중...' : '등록페이지 생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
