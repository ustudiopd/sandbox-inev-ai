'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function InevAdminNewEventPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const [code, setCode] = useState('')
  const [slug, setSlug] = useState('')
  const [module_registration, setModuleRegistration] = useState(true)
  const [module_survey, setModuleSurvey] = useState(false)
  const [module_webinar, setModuleWebinar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/inev/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          code: code.trim() || undefined,
          slug: slug.trim() || undefined,
          module_registration,
          module_survey,
          module_webinar,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      router.push(`/inev-admin/clients/${clientId}/events`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <Link href={`/inev-admin/clients/${clientId}/events`} className="text-sm text-gray-500 hover:text-gray-700">← 이벤트 목록</Link>
      <h1 className="text-xl font-semibold text-gray-900">이벤트 추가</h1>
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">코드 (6자리 권장)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">슬러그</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="seminar1"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              required
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_registration} onChange={(e) => setModuleRegistration(e.target.checked)} />
              <span className="text-sm text-gray-700">등록</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_survey} onChange={(e) => setModuleSurvey(e.target.checked)} />
              <span className="text-sm text-gray-700">설문</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={module_webinar} onChange={(e) => setModuleWebinar(e.target.checked)} />
              <span className="text-sm text-gray-700">웨비나</span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? '생성 중...' : '생성'}
          </button>
          <Link
            href={`/inev-admin/clients/${clientId}/events`}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
