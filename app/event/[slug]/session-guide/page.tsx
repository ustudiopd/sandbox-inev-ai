import { createAdminSupabase } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ensureEventBelongsToDeployment } from '@/lib/utils/client-from-domain'
import { headers } from 'next/headers'
import EventSessionGuidePage from './EventSessionGuidePage'

type Props = { params: Promise<{ slug: string }> }

function isNumericCode(slug: string): boolean {
  return /^\d+$/.test(slug)
}

function isLocalhost(host: string | undefined): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(':')[0]
  return h === 'localhost' || h === '127.0.0.1'
}

export default async function EventSessionGuideRoute({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const host = headersList.get('host') || undefined

  // 로컬 개발: localhost + 222152 접속 시 DB 없이 세션 안내 페이지 표시
  if (isLocalhost(host) && slug === '222152') {
    const mockEvent = { id: 'local-222152', code: '222152', slug: '222152' }
    return <EventSessionGuidePage event={mockEvent} pathSlug={slug} />
  }

  const supabase = createAdminSupabase()
  const query = isNumericCode(slug)
    ? supabase
        .from('events')
        .select('id, code, slug, client_id')
        .eq('code', slug)
        .limit(1)
        .single()
    : supabase
        .from('events')
        .select('id, code, slug, client_id')
        .eq('slug', slug)
        .limit(1)
        .single()

  const { data: event, error } = await query

  if (error || !event) notFound()

  if (event.code !== '222152') notFound()

  let allowed = true
  if (event.client_id) {
    try {
      allowed = await ensureEventBelongsToDeployment({ eventClientId: event.client_id, host })
    } catch {
      allowed = true
    }
  }
  if (!allowed) notFound()

  return <EventSessionGuidePage event={event} pathSlug={slug} />
}
