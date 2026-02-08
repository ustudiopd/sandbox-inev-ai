import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * inev: 이벤트 1건 조회 (Admin용)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('id, client_id, code, slug, module_registration, module_survey, module_webinar, module_email, module_utm, module_ondemand, created_at, updated_at')
    .eq('id', eventId)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

/**
 * inev: 이벤트 수정 (code, client_id 불변 / slug, 모듈 ON·OFF만)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  const body = await request.json()
  const {
    slug,
    module_registration,
    module_survey,
    module_webinar,
    module_email,
    module_utm,
    module_ondemand,
  } = body as {
    slug?: string
    module_registration?: boolean
    module_survey?: boolean
    module_webinar?: boolean
    module_email?: boolean
    module_utm?: boolean
    module_ondemand?: boolean
  }
  const supabase = createAdminSupabase()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (slug !== undefined) updates.slug = String(slug).trim()
  if (module_registration !== undefined) updates.module_registration = module_registration
  if (module_survey !== undefined) updates.module_survey = module_survey
  if (module_webinar !== undefined) updates.module_webinar = module_webinar
  if (module_email !== undefined) updates.module_email = module_email
  if (module_utm !== undefined) updates.module_utm = module_utm
  if (module_ondemand !== undefined) updates.module_ondemand = module_ondemand

  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select('id, client_id, code, slug, module_registration, module_survey, module_webinar, module_email, module_utm, module_ondemand, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
