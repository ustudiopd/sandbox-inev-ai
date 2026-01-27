'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClientMemberInviteModalProps {
  clientId: string
}

export default function ClientMemberInviteModal({ clientId }: ClientMemberInviteModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    
    if (!email.trim()) {
      setError('이메일은 필수입니다')
      setLoading(false)
      return
    }
    
    // 새 사용자인 경우 비밀번호 필수
    if (!password.trim()) {
      setError('비밀번호는 필수입니다')
      setLoading(false)
      return
    }
    
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`/api/clients/${clientId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          displayName: displayName.trim() || undefined,
          nickname: nickname.trim() || undefined,
          role: role,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '멤버 추가 실패')
      }
      
      setSuccess(true)
      // 2초 후 자동으로 닫고 페이지 새로고침
      setTimeout(() => {
        setIsOpen(false)
        setEmail('')
        setPassword('')
        setDisplayName('')
        setNickname('')
        setRole('member')
        setSuccess(false)
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message || '멤버 추가 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const handleClose = () => {
    setIsOpen(false)
    setEmail('')
    setPassword('')
    setDisplayName('')
    setNickname('')
    setRole('member')
    setError('')
    setSuccess(false)
    router.refresh()
  }
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 border-2 border-white hover:border-blue-300 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold whitespace-nowrap"
      >
        + 멤버 추가
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">클라이언트 멤버 추가</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                멤버가 성공적으로 추가되었습니다!
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="member@example.com"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  기존 사용자는 자동으로 추가되고, 새 사용자는 계정이 생성됩니다.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="비밀번호 (최소 6자)"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  새 사용자 계정 생성 시 사용할 비밀번호입니다.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">이름</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="홍길동"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">닉네임</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="닉네임 (선택사항)"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">역할</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  disabled={loading}
                >
                  <option value="member">멤버</option>
                  <option value="viewer">조회자</option>
                  <option value="analyst">분석가</option>
                  <option value="operator">운영자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={loading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '추가 중...' : '멤버 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
