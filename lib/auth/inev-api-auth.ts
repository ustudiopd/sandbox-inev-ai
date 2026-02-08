import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export type InevAuthResult = { userId: string; allowedClientIds: string[] }

/**
 * inev Admin API: 로그인 사용자와 소속 client_id 목록 반환.
 * request 제공 시 Authorization: Bearer <jwt> 도 확인 (테스트/스크립트용).
 * 미인증 시 401, 소속 클라이언트 없으면 allowedClientIds=[] (403 처리 시 사용).
 */
export async function getInevAuth(request?: Request): Promise<NextResponse | InevAuthResult> {
  const supabase = await createServerSupabase()
  const bearer = request?.headers?.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  const { data: { user }, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminSupabase()
  const { data: memberships } = await admin
    .from('client_members')
    .select('client_id')
    .eq('user_id', user.id)
  const allowedClientIds = (memberships ?? []).map((m) => m.client_id)
  return { userId: user.id, allowedClientIds }
}

/**
 * clientId가 허용 목록에 있는지 확인. 없으면 403 Response 반환.
 */
export function ensureClientAccess(
  clientId: string,
  allowedClientIds: string[]
): NextResponse | null {
  if (!clientId || !allowedClientIds.includes(clientId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * 로그인 여부와 관계없이 반환. 미로그인 시 allowedClientIds=[].
 * request 제공 시 Authorization: Bearer <jwt> 도 확인 (테스트/스크립트용).
 */
export async function getInevAuthOptional(request?: Request): Promise<{ userId: string | null; allowedClientIds: string[] }> {
  const supabase = await createServerSupabase()
  const bearer = request?.headers?.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  const { data: { user } } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser()
  if (!user) return { userId: null, allowedClientIds: [] }
  const admin = createAdminSupabase()
  const { data: memberships } = await admin
    .from('client_members')
    .select('client_id')
    .eq('user_id', user.id)
  const allowedClientIds = (memberships ?? []).map((m) => m.client_id)
  return { userId: user.id, allowedClientIds }
}
