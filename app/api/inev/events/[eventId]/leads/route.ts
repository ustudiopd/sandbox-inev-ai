import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * inev: 이벤트별 등록자 목록 (Admin용) — 해당 이벤트의 client 소속만 허용
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await getInevAuth(request)
  if (auth instanceof NextResponse) return auth
  const { eventId } = await params
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
  const { data, error } = await supabase
    .from('leads')
    .select('id, email, name, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
