import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth, ensureClientAccess } from '@/lib/auth/inev-api-auth'

/**
 * inev: Event 목록 (client_id 필터) — 로그인 사용자가 소속된 client만 허용
 */
export async function GET(request: Request) {
  const auth = await getInevAuth(request)
  if (auth instanceof NextResponse) return auth
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const limit = parseInt(searchParams.get('limit') || '100', 10) // 기본값 100개
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  const forbidden = ensureClientAccess(clientId, auth.allowedClientIds)
  if (forbidden) return forbidden
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('id, client_id, code, slug, module_registration, module_survey, module_webinar, module_email, module_utm, module_ondemand, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 500)) // 최대 500개로 제한 (성능 보호)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * inev: Event 생성 — 로그인 사용자가 소속된 client만 허용
 */
export async function POST(request: Request) {
  const auth = await getInevAuth(request)
  if (auth instanceof NextResponse) return auth
  const body = await request.json()
  const { client_id, code, slug, module_registration = true, module_survey = false, module_webinar = false, module_email = false, module_utm = false, module_ondemand = false } = body as {
    client_id: string
    code: string
    slug: string
    module_registration?: boolean
    module_survey?: boolean
    module_webinar?: boolean
    module_email?: boolean
    module_utm?: boolean
    module_ondemand?: boolean
  }
  if (!client_id || !code || !slug) return NextResponse.json({ error: 'client_id, code, slug required' }, { status: 400 })
  const forbidden = ensureClientAccess(client_id, auth.allowedClientIds)
  if (forbidden) return forbidden
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('events')
    .insert({
      client_id,
      code: String(code).trim(),
      slug: String(slug).trim(),
      module_registration,
      module_survey,
      module_webinar,
      module_email,
      module_utm,
      module_ondemand,
    })
    .select('id, client_id, code, slug, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
