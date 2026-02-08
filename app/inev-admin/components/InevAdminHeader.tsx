'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function InevAdminHeader() {
  const pathname = usePathname()
  const [clientName, setClientName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // pathname에서 clientId 추출
  const clientIdMatch = pathname.match(/\/inev-admin\/clients\/([^\/]+)/)
  const clientId = clientIdMatch?.[1]

  useEffect(() => {
    if (clientId) {
      // 클라이언트 정보 조회 (API 또는 직접 조회)
      fetch(`/api/inev/clients`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const client = data.find((c: any) => c.id === clientId)
            if (client && client.name) {
              setClientName(client.name)
            }
          }
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [clientId])

  const isWertIntelligence = clientName?.includes('Wert Intelligence') || clientName?.includes('워트 인텔리전스')

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4">
        {isWertIntelligence ? (
          <Link href="/inev-admin" className="font-semibold text-gray-900">
            {clientName || 'Wert Intelligence'}
          </Link>
        ) : (
          <Link href="/inev-admin" className="font-semibold text-gray-900">
            inev.ai Admin
          </Link>
        )}
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 앱 홈</Link>
      </div>
    </header>
  )
}
