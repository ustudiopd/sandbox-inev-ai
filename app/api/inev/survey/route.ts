import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * inev: 공개 설문 제출
 * Body: { slug: string, email?: string, name?: string, response: Record<string, unknown> }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { slug, email, name, response } = body as {
    slug?: string
    email?: string
    name?: string
    response?: Record<string, unknown>
  }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const payload = response != null && typeof response === 'object' ? response : {}

  const supabase = createAdminSupabase()
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, module_survey')
    .eq('slug', String(slug).trim())
    .limit(1)
    .single()

  if (eventErr || !event) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
  if (!event.module_survey) return NextResponse.json({ error: '이 이벤트는 설문을 받지 않습니다.' }, { status: 400 })

  let leadId: string | null = null
  if (email && String(email).trim()) {
    const trimmedEmail = String(email).trim().toLowerCase()
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('event_id', event.id)
      .eq('email', trimmedEmail)
      .limit(1)
      .single()
    if (lead) leadId = lead.id
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('event_survey_responses')
    .insert({
      event_id: event.id,
      lead_id: leadId || null,
      email: email != null ? String(email).trim() || null : null,
      response: payload,
    })
    .select('id, created_at')
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: inserted.id, message: '설문이 제출되었습니다.' })
}
