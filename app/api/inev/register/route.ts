import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuthOptional, ensureClientAccess } from '@/lib/auth/inev-api-auth'

/**
 * inev: 공개 등록 (slug로 이벤트 조회 후 lead upsert)
 * 로그인한 경우 해당 이벤트 client 소속이 아니면 403 (Cross-tenant write 차단)
 * Body: { slug: string, email: string, name?: string }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { slug, email, name } = body as { slug?: string; email?: string; name?: string }
  if (!slug || !email || typeof email !== 'string') {
    return NextResponse.json({ error: 'slug, email required' }, { status: 400 })
  }
  const trimmedEmail = String(email).trim().toLowerCase()
  if (!trimmedEmail) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const supabase = createAdminSupabase()
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, client_id, module_registration')
    .eq('slug', String(slug).trim())
    .limit(1)
    .single()

  if (eventErr || !event) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
  if (!event.module_registration) return NextResponse.json({ error: '이 이벤트는 등록을 받지 않습니다.' }, { status: 400 })

  const auth = await getInevAuthOptional(request)
  if (auth.userId) {
    const forbidden = ensureClientAccess(event.client_id, auth.allowedClientIds)
    if (forbidden) return forbidden
  }

  const { data: existing } = await supabase
    .from('leads')
    .select('id, name')
    .eq('event_id', event.id)
    .eq('email', trimmedEmail)
    .limit(1)
    .single()

  if (existing) {
    const { data: updated, error: updateErr } = await supabase
      .from('leads')
      .update({ name: name != null ? String(name).trim() || null : existing.name, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id, email, name, created_at')
      .single()
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json({ updated: true, lead: updated, message: '기존 등록 정보를 갱신했습니다.' })
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('leads')
    .insert({
      event_id: event.id,
      email: trimmedEmail,
      name: name != null ? String(name).trim() || null : null,
    })
    .select('id, email, name, created_at')
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ updated: false, lead: inserted, message: '등록되었습니다.' })
}
