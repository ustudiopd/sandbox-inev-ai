import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuth } from '@/lib/auth/inev-api-auth'

/**
 * inev: Client 목록 — 로그인한 사용자가 소속된(client_members) 클라이언트만 반환
 * Authorization: Bearer <jwt> 지원 (테스트/스크립트용)
 */
export async function GET(request: Request) {
  const auth = await getInevAuth(request)
  if (auth instanceof NextResponse) return auth
  const clientIds = auth.allowedClientIds
  if (clientIds.length === 0) return NextResponse.json([])
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('clients')
    .select('id, name, slug, created_at')
    .in('id', clientIds)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * inev: Client 생성 (서비스 롤, 첫 Client용)
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { name, slug } = body as { name?: string; slug?: string }
  if (!name || !slug) return NextResponse.json({ error: 'name, slug required' }, { status: 400 })
  const supabase = createAdminSupabase()
  const { data, error } = await supabase.from('clients').insert({ name, slug }).select('id, name, slug').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
