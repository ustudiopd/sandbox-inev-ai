import { createAdminSupabase } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ensureEventBelongsToDeployment } from '@/lib/utils/client-from-domain'
import { headers } from 'next/headers'
import EventGalleryPage from './EventGalleryPage'

type Props = { params: Promise<{ slug: string }> }

function isNumericCode(slug: string): boolean {
  return /^\d+$/.test(slug)
}

export default async function EventGalleryRoute({ params }: Props) {
  const { slug } = await params
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

  if (String(event.code) !== '222152') notFound()

  const headersList = await headers()
  const host = headersList.get('host') || undefined
  let allowed = true
  if (event.client_id) {
    try {
      allowed = await ensureEventBelongsToDeployment({ eventClientId: event.client_id, host })
    } catch {
      allowed = true
    }
  }
  if (!allowed) notFound()

  return <EventGalleryPage event={event} pathSlug={slug} />
}
