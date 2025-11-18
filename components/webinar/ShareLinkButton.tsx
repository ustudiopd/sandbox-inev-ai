'use client'

import { useState } from 'react'

interface ShareLinkButtonProps {
  webinarId: string
  webinarTitle?: string
  className?: string
}

export default function ShareLinkButton({ 
  webinarId, 
  webinarTitle,
  className = '' 
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shortUrl, setShortUrl] = useState<string | null>(null)

  const handleCopy = async () => {
    setLoading(true)
    try {
      // 짧은 링크 생성/조회
      const response = await fetch(`/api/webinars/${webinarId}/short-link`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate short link')
      }

      const data = await response.json()
      const urlToCopy = data.shortUrl || data.fullUrl
      setShortUrl(urlToCopy)

      // 클립보드에 복사
      await navigator.clipboard.writeText(urlToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('링크 복사에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    setLoading(true)
    try {
      // 짧은 링크 생성/조회
      const response = await fetch(`/api/webinars/${webinarId}/short-link`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate short link')
      }

      const data = await response.json()
      const urlToShare = data.shortUrl || data.fullUrl
      const title = data.webinarTitle || webinarTitle || '웨비나'

      // Web Share API 사용 (지원되는 경우)
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `${title} - EventLive 웨비나에 참여하세요`,
          url: urlToShare,
        })
      } else {
        // Web Share API를 지원하지 않는 경우 클립보드에 복사
        await navigator.clipboard.writeText(urlToShare)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error: any) {
      // 사용자가 공유를 취소한 경우는 에러로 처리하지 않음
      if (error.name !== 'AbortError') {
        console.error('Failed to share:', error)
        alert('공유에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleCopy}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
        title="링크 복사"
      >
        {copied ? (
          <>
            ✓ 복사됨
          </>
        ) : (
          <>
            📋 링크 복사
          </>
        )}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleShare}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
          title="공유하기"
        >
          🔗 공유
        </button>
      )}
    </div>
  )
}

