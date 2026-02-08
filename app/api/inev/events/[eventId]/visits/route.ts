import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * inev: 이벤트별 Visit 목록 + UTM 집계 (Admin) — 해당 이벤트의 client 소속만 허용
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await getInevAuth(request)
  if (auth instanceof NextResponse) return auth
  const { eventId } = await params
  const { searchParams } = new URL(request.url)
  const aggregate = searchParams.get('aggregate') === 'true'
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const supabase = createAdminSupabase()
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, client_id')
    .eq('id', eventId)
    .maybeSingle()
  if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const forbidden = ensureClientAccess(event.client_id, auth.allowedClientIds)
  if (forbidden) return forbidden

  if (aggregate) {
    const { data: rows, error } = await supabase
      .from('event_visits')
      .select('utm_source, utm_medium, utm_campaign')
      .eq('event_id', eventId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const bySource: Record<string, number> = {}
    const byMedium: Record<string, number> = {}
    const byCampaign: Record<string, number> = {}
    for (const r of rows || []) {
      const s = r.utm_source || '(없음)'
      bySource[s] = (bySource[s] || 0) + 1
      const m = r.utm_medium || '(없음)'
      byMedium[m] = (byMedium[m] || 0) + 1
      const c = r.utm_campaign || '(없음)'
      byCampaign[c] = (byCampaign[c] || 0) + 1
    }
    return NextResponse.json({
      total: (rows || []).length,
      by_utm_source: bySource,
      by_utm_medium: byMedium,
      by_utm_campaign: byCampaign,
    })
  }
  const { data, error } = await supabase
    .from('event_visits')
    .select('id, lead_id, utm_source, utm_medium, utm_campaign, path, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
