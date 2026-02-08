'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type EventRow = {
  id: string
  client_id: string
  code: string
  slug: string
  module_registration: boolean
  module_survey: boolean
  module_webinar: boolean
  created_at: string
}

export default function InevAdminEventsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clientId) return
    fetch(`/api/inev/events?client_id=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setEvents(Array.isArray(data) ? data : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error) return <div className="text-red-600">오류: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inev-admin" className="text-sm text-gray-500 hover:text-gray-700">← Clients</Link>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">이벤트</h1>
        </div>
        <Link
          href={`/inev-admin/clients/${clientId}/events/new`}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          이벤트 추가
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
          이벤트가 없습니다. 이벤트를 추가해 보세요.
        </div>
      ) : (
        <ul className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0">
              <div>
                <span className="font-medium text-gray-900">{e.slug}</span>
                <span className="ml-2 text-sm text-gray-500">코드: {e.code}</span>
              </div>
              <div className="flex gap-2 text-xs">
                {e.module_registration && <span className="rounded bg-gray-100 px-1.5 py-0.5">등록</span>}
                {e.module_survey && <span className="rounded bg-gray-100 px-1.5 py-0.5">설문</span>}
                {e.module_webinar && <span className="rounded bg-gray-100 px-1.5 py-0.5">웨비나</span>}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/inev-admin/clients/${clientId}/events/${e.id}`} className="text-sm text-gray-700 hover:underline">
                  편집
                </Link>
                <Link href={`/event/${e.slug}`} className="text-sm text-blue-600 hover:underline" target="_blank" rel="noopener">
                  Public →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
