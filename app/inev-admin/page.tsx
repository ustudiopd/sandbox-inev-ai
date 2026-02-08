'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Client = { id: string; name: string; slug: string; created_at: string }

export default function InevAdminPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/inev/clients')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setClients(Array.isArray(data) ? data : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500">로딩 중...</div>
  if (error) return <div className="text-red-600">오류: {error}. Supabase에 inev 스키마가 적용되었는지 확인하세요.</div>

  if (clients.length === 0) {
    return (
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">첫 Client가 없습니다</h2>
        <p className="mt-2 text-sm text-gray-500">
          터미널에서 실행: <code className="rounded bg-gray-100 px-1 py-0.5">node scripts/inev-seed-first-client.mjs &quot;My Client&quot; myclient</code>
        </p>
        <p className="mt-2 text-sm text-gray-500">또는 Supabase Dashboard → SQL Editor에서 <code className="rounded bg-gray-100 px-1">supabase/inev/001_initial_schema.sql</code> 적용 후 다시 시드 실행.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
      <ul className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0">
            <span className="font-medium text-gray-900">{c.name}</span>
            <span className="text-sm text-gray-500">{c.slug}</span>
            <Link
              href={`/inev-admin/clients/${c.id}/events`}
              className="text-sm text-blue-600 hover:underline"
            >
              이벤트 →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
