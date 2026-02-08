import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * inev: 이벤트 이메일 초안 조회/저장 (Admin)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('event_emails')
    .select('id, event_id, subject, body_html, from_name, updated_at')
    .eq('event_id', eventId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ subject: '', body_html: '', from_name: 'Inev.ai' })
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  const body = await request.json()
  const { subject, body_html, from_name } = body as { subject?: string; body_html?: string; from_name?: string }
  const supabase = createAdminSupabase()
  const { data: existing } = await supabase
    .from('event_emails')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  const payload = {
    subject: subject != null ? String(subject) : '',
    body_html: body_html != null ? String(body_html) : '',
    from_name: from_name != null ? String(from_name) : 'Inev.ai',
    updated_at: new Date().toISOString(),
  }
  if (existing) {
    const { data, error } = await supabase
      .from('event_emails')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const { data, error } = await supabase
    .from('event_emails')
    .insert({ event_id: eventId, ...payload })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
