import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { ensureEventBelongsToDeployment } from '@/lib/utils/client-from-domain'
import EventLoginPage from './EventLoginPage'

type Props = { params: Promise<{ slug: string }> }

function isNumericCode(slug: string): boolean {
  return /^\d+$/.test(slug)
}

function isLocalhost(host: string | undefined): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(':')[0]
  return h === 'localhost' || h === '127.0.0.1'
}

export default async function EventLoginRoute({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const host = headersList.get('host') || undefined

  if (isLocalhost(host) && slug === '222152') {
    return <EventLoginPage slug={slug} />
  }

  const supabase = createAdminSupabase()
  const query = isNumericCode(slug)
    ? supabase.from('events').select('id, code, slug, client_id').eq('code', slug).limit(1).single()
    : supabase.from('events').select('id, code, slug, client_id').eq('slug', slug).limit(1).single()
  const { data: event, error } = await query

  if (error || !event) notFound()
  if (String(event.code) !== '222152') notFound()

  const allowed = event.client_id
    ? await ensureEventBelongsToDeployment({ eventClientId: event.client_id, host })
    : true
  if (!allowed) notFound()

  return <EventLoginPage slug={slug} />
}
