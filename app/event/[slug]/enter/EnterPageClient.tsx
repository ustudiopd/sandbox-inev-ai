'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type EventData = {
  id: string
  slug: string
  code: string
}

type LeadData = {
  id: string
  email: string
  name: string | null
}

type EnterResponse = {
  success: boolean
  event?: EventData
  lead?: LeadData
  displayName?: string
  redirectTo?: string
  error?: string
  code?: string
  requiresName?: boolean
}

export default function EnterPageClient({ event }: { event: EventData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')

  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [email, setEmail] = useState(emailParam || '')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entered, setEntered] = useState(false)

  // 자동입장 모드: 쿼리 파라미터로 이메일이 있으면 등록 정보 조회
  useEffect(() => {
    if (emailParam && mode === 'auto' && !entered && !loading) {
      checkRegistration(emailParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam])

  async function checkRegistration(emailToCheck: string) {
    if (!emailToCheck.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/inev/events/${event.id}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck.trim() }),
      })

      const data: EnterResponse = await response.json()

      if (!response.ok) {
        // 404 등록 정보 없음 또는 기타 에러
        if (data.requiresName || response.status === 404) {
          // 등록 정보가 없으면 수동입장 모드로 전환
          setMode('manual')
          setEmail(emailToCheck.trim())
        } else {
          setError(data.error || '등록 정보를 확인할 수 없습니다.')
        }
        return
      }

      if (data.success && data.displayName) {
        // 등록 정보가 있으면 표시이름 설정
        setDisplayName(data.displayName)
        setEmail(emailToCheck.trim())
      } else {
        setError(data.error || '등록 정보를 확인할 수 없습니다.')
      }
    } catch (err: any) {
      setError(err.message || '등록 정보 확인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnter() {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }

    if (mode === 'manual' && !name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/inev/events/${event.id}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: mode === 'manual' ? name.trim() : undefined,
        }),
      })

      const data: EnterResponse = await response.json()

      if (!response.ok) {
        // 에러 응답 처리
        if (data.requiresName || response.status === 404) {
          setMode('manual')
        }
        setError(data.error || '입장에 실패했습니다.')
        return
      }

      if (data.success && data.displayName) {
        // 입장 성공
        setDisplayName(data.displayName)
        setEntered(true)

        // 온디맨드 이벤트인 경우 온디맨드 시청 페이지를 새 창으로 열기
        // 일반 이벤트인 경우 redirectTo 사용
        if (data.redirectTo) {
          setTimeout(() => {
            // 온디맨드 페이지인지 확인
            if (data.redirectTo && data.redirectTo.includes('/ondemand')) {
              window.open(data.redirectTo, '_blank', 'noopener,noreferrer')
            } else if (data.redirectTo) {
              router.push(data.redirectTo)
            }
          }, 1000)
        } else {
          // 온디맨드 이벤트로 가정하고 온디맨드 페이지를 새 창으로 열기
          setTimeout(() => {
            window.open(`/event/${event.slug}/ondemand`, '_blank', 'noopener,noreferrer')
          }, 1000)
        }
      } else {
        setError(data.error || '입장에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '입장 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (entered && displayName) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">{displayName}님으로 입장합니다</h1>
            <p className="mt-2 text-xs text-gray-500">이벤트 페이지로 이동 중...</p>
            <div className="mt-6">
              <Link
                href={`/event/${event.slug}`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                이벤트로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">이벤트 입장</h1>
          <p className="mt-1 text-xs text-gray-500">이벤트: {event.slug}</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {mode === 'auto' && displayName ? (
          // 자동입장: 등록 정보 확인됨
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">{displayName}</span>님으로 입장하시겠습니까?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEnter}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? '처리 중...' : '입장하기'}
              </button>
              <Link
                href={`/event/${event.slug}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </Link>
            </div>
          </div>
        ) : (
          // 수동입장: 이메일+이름 입력
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleEnter()
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50"
                placeholder="example@company.com"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-500">
                이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50"
                placeholder="홍길동"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? '처리 중...' : '입장하기'}
              </button>
              <Link
                href={`/event/${event.slug}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </Link>
            </div>
          </form>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <Link href={`/event/${event.slug}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            ← 이벤트로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
