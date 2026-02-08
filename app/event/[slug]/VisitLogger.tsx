'use client'

import { useEffect, useRef } from 'react'

export function VisitLogger({
  slug,
  path,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  referrer,
}: {
  slug: string
  path?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
}) {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const ref = typeof window !== 'undefined' ? document.referrer || undefined : undefined
    fetch('/api/inev/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        path: path ?? (typeof window !== 'undefined' ? window.location.pathname : null),
        utm_source: utm_source || undefined,
        utm_medium: utm_medium || undefined,
        utm_campaign: utm_campaign || undefined,
        utm_term: utm_term || undefined,
        utm_content: utm_content || undefined,
        referrer: referrer || ref || undefined,
      }),
    }).catch(() => {})
  }, [slug, path, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer])
  return null
}
