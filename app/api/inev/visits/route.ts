import { NextResponse, NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getInevAuthOptional, ensureClientAccess } from '@/lib/auth/inev-api-auth'

/**
 * inev Phase 3: Visit 기록 (공개 페이지에서 호출, UTM 등 저장)
 * 로그인한 경우 해당 이벤트 client 소속이 아니면 403 (Cross-tenant write 차단)
 * Body: { slug: string, lead_id?: string, session_id?: string, utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?, referrer?, path? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    slug,
    lead_id,
    session_id: clientSessionId,
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
    session_id?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    referrer?: string
    path?: string
  }
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // session_id 추출 (클라이언트에서 보낸 값 또는 쿠키에서)
  let session_id = clientSessionId
  if (!session_id || typeof session_id !== 'string' || session_id.trim() === '') {
    const cookieSessionId = request.cookies.get('ef_session_id')?.value
    if (cookieSessionId && cookieSessionId.trim() !== '') {
      session_id = cookieSessionId
    }
  }

  const supabase = createAdminSupabase()
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, client_id, module_utm')
    .eq('slug', String(slug).trim())
    .limit(1)
    .single()

  if (eventErr || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // module_utm이 false여도 접속 기록은 남김 (UTM 필드는 null로 저장)

  const auth = await getInevAuthOptional(request)
  if (auth.userId) {
    const forbidden = ensureClientAccess(event.client_id, auth.allowedClientIds)
    if (forbidden) return forbidden
  }

  // module_utm이 false면 UTM 파라미터 무시하고 null로 저장
  const shouldStoreUTM = event.module_utm

  const { error: insertErr } = await supabase.from('event_visits').insert({
    event_id: event.id,
    lead_id: lead_id || null,
    session_id: session_id || null,  // D-OD-9: session_id 저장
    utm_source: shouldStoreUTM ? (utm_source || null) : null,
    utm_medium: shouldStoreUTM ? (utm_medium || null) : null,
    utm_campaign: shouldStoreUTM ? (utm_campaign || null) : null,
    utm_term: shouldStoreUTM ? (utm_term || null) : null,
    utm_content: shouldStoreUTM ? (utm_content || null) : null,
    referrer: referrer || null,
    path: path || null,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
