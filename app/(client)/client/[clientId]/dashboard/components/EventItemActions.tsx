'use client'

import Link from 'next/link'
import { Edit, ExternalLink } from 'lucide-react'

interface EventItemActionsProps {
  clientId: string
  eventId: string
  eventSlug: string | null
  eventCode: string
  createdAt: string
}

export default function EventItemActions({
  clientId,
  eventId,
  eventSlug,
  eventCode,
  createdAt,
}: EventItemActionsProps) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
        {new Date(createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
      </span>
      <Link
        href={`/inev-admin/clients/${clientId}/events/${eventId}`}
        className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="편집"
      >
        <Edit className="w-4 h-4" />
      </Link>
      <Link
        href={`/event/${eventSlug || eventCode}`}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center justify-center p-2 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        title="공개 페이지"
      >
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  )
}
