import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuthOptional, ensureClientAccess } from '@/lib/auth/inev-api-auth'

/**
 * inev Phase 3: Visit 기록 (공개 페이지에서 호출, UTM 등 저장)
 * 로그인한 경우 해당 이벤트 client 소속이 아니면 403 (Cross-tenant write 차단)
 * Body: { slug: string, lead_id?: string, utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?, referrer?, path? }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const {
    slug,
    lead_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referrer,
    path,
  } = body as {
    slug?: string
    lead_id?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    referrer?: string
    path?: string
  }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = createAdminSupabase()
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, client_id, module_utm')
    .eq('slug', String(slug).trim())
    .limit(1)
    .single()

  if (eventErr || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!event.module_utm) return NextResponse.json({ ok: true, skipped: 'utm_off' })

  const auth = await getInevAuthOptional(request)
  if (auth.userId) {
    const forbidden = ensureClientAccess(event.client_id, auth.allowedClientIds)
    if (forbidden) return forbidden
  }

  const { error: insertErr } = await supabase.from('event_visits').insert({
    event_id: event.id,
    lead_id: lead_id || null,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    utm_term: utm_term || null,
    utm_content: utm_content || null,
    referrer: referrer || null,
    path: path || null,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
