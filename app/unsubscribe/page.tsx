'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const phone = searchParams.get('phone')
  
  const [formData, setFormData] = useState({
    email: email || '',
    phone: phone || '',
    unsubscribeEmail: false,
    unsubscribePhone: false,
    unsubscribeSms: false,
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<any>(null)
  
  // 현재 수신거부 상태 조회
  useEffect(() => {
    if (email || phone) {
      const phoneNorm = phone?.replace(/\D/g, '')
      const queryParams = new URLSearchParams()
      if (email) queryParams.set('email', email)
      if (phoneNorm) queryParams.set('phone_norm', phoneNorm)
      
      fetch(`/api/public/unsubscribe?${queryParams.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.unsubscribe) {
            setCurrentStatus(data.unsubscribe)
            setFormData(prev => ({
              ...prev,
              unsubscribeEmail: data.unsubscribe.unsubscribe_email || false,
              unsubscribePhone: data.unsubscribe.unsubscribe_phone || false,
              unsubscribeSms: data.unsubscribe.unsubscribe_sms || false,
            }))
          }
        })
        .catch(err => {
          console.error('수신거부 상태 조회 오류:', err)
        })
    }
  }, [email, phone])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.email && !formData.phone) {
      setError('이메일 또는 전화번호를 입력해주세요.')
      return
    }
    
    const phoneNorm = formData.phone.replace(/\D/g, '')
    
    if (formData.phone && phoneNorm.length < 10) {
      setError('올바른 전화번호를 입력해주세요.')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email || null,
          phone: formData.phone || null,
          phone_norm: phoneNorm || null,
          unsubscribeEmail: formData.unsubscribeEmail,
          unsubscribePhone: formData.unsubscribePhone,
          unsubscribeSms: formData.unsubscribeSms,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '수신거부 설정에 실패했습니다.')
      }
      
      setSubmitted(true)
      setCurrentStatus(result.unsubscribe)
    } catch (err: any) {
      console.error('수신거부 설정 오류:', err)
      setError(err.message || '수신거부 설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              수신거부 설정이 완료되었습니다
            </h1>
            <p className="text-gray-600 mb-6">
              요청하신 수신거부 설정이 적용되었습니다.
            </p>
            {currentStatus && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">현재 설정:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className={currentStatus.unsubscribe_email ? 'text-red-500' : 'text-green-500'}>
                      {currentStatus.unsubscribe_email ? '✗' : '✓'}
                    </span>
                    이메일: {currentStatus.unsubscribe_email ? '수신거부' : '수신동의'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={currentStatus.unsubscribe_phone ? 'text-red-500' : 'text-green-500'}>
                      {currentStatus.unsubscribe_phone ? '✗' : '✓'}
                    </span>
                    전화번호: {currentStatus.unsubscribe_phone ? '수신거부' : '수신동의'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={currentStatus.unsubscribe_sms ? 'text-red-500' : 'text-green-500'}>
                      {currentStatus.unsubscribe_sms ? '✗' : '✓'}
                    </span>
                    SMS: {currentStatus.unsubscribe_sms ? '수신거부' : '수신동의'}
                  </li>
                </ul>
              </div>
            )}
            <button
              onClick={() => {
                setSubmitted(false)
                setFormData({
                  email: '',
                  phone: '',
                  unsubscribeEmail: false,
                  unsubscribePhone: false,
                  unsubscribeSms: false,
                })
              }}
              className="w-full px-6 py-3 bg-[#00B388] text-white rounded-lg hover:bg-[#008f6d] transition-colors font-medium"
            >
              다시 설정하기
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            마케팅 수신거부 설정
          </h1>
          <p className="text-sm text-gray-600">
            HPE의 마케팅 커뮤니케이션 수신을 원하지 않으시면 아래에서 설정하실 수 있습니다.
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B388] focus:border-transparent outline-none"
              placeholder="example@email.com"
              disabled={loading || !!email}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              전화번호
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B388] focus:border-transparent outline-none"
              placeholder="01012345678"
              disabled={loading || !!phone}
            />
            <p className="mt-1 text-xs text-gray-500">
              이메일 또는 전화번호 중 하나 이상 입력해주세요.
            </p>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-4">
              수신거부할 항목을 선택해주세요:
            </p>
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.unsubscribeEmail}
                  onChange={(e) => setFormData({ ...formData, unsubscribeEmail: e.target.checked })}
                  className="w-5 h-5 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                  disabled={loading}
                />
                <span className="ml-3 text-sm text-gray-700">이메일 수신거부</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.unsubscribePhone}
                  onChange={(e) => setFormData({ ...formData, unsubscribePhone: e.target.checked })}
                  className="w-5 h-5 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                  disabled={loading}
                />
                <span className="ml-3 text-sm text-gray-700">전화번호 수신거부</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.unsubscribeSms}
                  onChange={(e) => setFormData({ ...formData, unsubscribeSms: e.target.checked })}
                  className="w-5 h-5 text-[#00B388] border-gray-300 rounded focus:ring-[#00B388]"
                  disabled={loading}
                />
                <span className="ml-3 text-sm text-gray-700">SMS 수신거부</span>
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-[#00B388] text-white rounded-lg hover:bg-[#008f6d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '처리 중...' : '수신거부 설정하기'}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            수신거부 설정은 즉시 적용되며, 향후 마케팅 커뮤니케이션에서 제외됩니다.
            <br />
            설정을 변경하려면 언제든지 이 페이지를 다시 방문하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B388] mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
