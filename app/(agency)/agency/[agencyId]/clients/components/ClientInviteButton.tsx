'use client'

import { useState } from 'react'

interface ClientInviteButtonProps {
  agencyId: string
  clientId: string
  clientName: string
}

export default function ClientInviteButton({ agencyId, clientId, clientName }: ClientInviteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  
  const handleInvite = async () => {
    setError('')
    setLoading(true)
    
    try {
      const response = await fetch('/api/clients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          clientId,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || '초대 생성 실패')
      }
      
      setInviteLink(result.inviteLink)
      setShowModal(true)
    } catch (err: any) {
      setError(err.message || '초대 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      alert('초대 링크가 클립보드에 복사되었습니다!')
    }
  }
  
  return (
    <>
      <button
        onClick={handleInvite}
        disabled={loading}
        className="text-green-600 hover:text-green-800 font-medium hover:underline disabled:opacity-50"
      >
        {loading ? '생성 중...' : '초대'}
      </button>
      
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">클라이언트 초대 링크</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
            {inviteLink && (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{clientName}</strong> 클라이언트 초대 링크가 생성되었습니다.
                </p>
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500 break-all">{inviteLink}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    링크 복사
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setInviteLink('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

