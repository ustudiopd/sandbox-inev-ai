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
    .select('id, client_id, code, slug, title, module_registration, module_survey, module_webinar, module_email, module_utm, module_ondemand, created_at')
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
  const { 
    client_id, 
    code, 
    slug, 
    title, 
    campaign_start_date,
    campaign_end_date,
    event_date_type = 'single',
    event_date,
    event_start_date,
    event_end_date,
    module_registration = true, 
    module_survey = false, 
    module_webinar = false, 
    module_email = false, 
    module_utm = false, 
    module_ondemand = false 
  } = body as {
    client_id: string
    code?: string
    slug?: string
    title?: string
    campaign_start_date?: string
    campaign_end_date?: string
    event_date_type?: 'single' | 'range'
    event_date?: string
    event_start_date?: string
    event_end_date?: string
    module_registration?: boolean
    module_survey?: boolean
    module_webinar?: boolean
    module_email?: boolean
    module_utm?: boolean
    module_ondemand?: boolean
  }
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  if (!campaign_start_date || !campaign_end_date) return NextResponse.json({ error: 'campaign_start_date, campaign_end_date required' }, { status: 400 })
  if (event_date_type === 'single' && !event_date) return NextResponse.json({ error: 'event_date required when event_date_type is single' }, { status: 400 })
  if (event_date_type === 'range' && (!event_start_date || !event_end_date)) return NextResponse.json({ error: 'event_start_date, event_end_date required when event_date_type is range' }, { status: 400 })
  const forbidden = ensureClientAccess(client_id, auth.allowedClientIds)
  if (forbidden) return forbidden
  const supabase = createAdminSupabase()
  
  // 코드가 없으면 자동 생성 (6자리 숫자)
  let finalCode = code?.trim()
  if (!finalCode) {
    // 중복되지 않는 코드 생성 (최대 10회 시도)
    for (let attempt = 0; attempt < 10; attempt++) {
      // 6자리 랜덤 숫자 생성 (100000 ~ 999999)
      finalCode = String(Math.floor(100000 + Math.random() * 900000))
      
      // 중복 체크
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('client_id', client_id)
        .eq('code', finalCode)
        .single()
      
      if (!existing) {
        break // 중복 없음, 사용 가능
      }
      
      if (attempt === 9) {
        return NextResponse.json({ error: '코드 자동 생성 실패. 수동으로 코드를 입력해주세요.' }, { status: 500 })
      }
    }
  }
  
  // slug가 없거나 빈 문자열이면 code를 slug로 사용
  const finalSlug = slug?.trim() || finalCode
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      client_id,
      code: finalCode,
      slug: finalSlug,
      title: title ? String(title).trim() : null,
      campaign_start_date: campaign_start_date || null,
      campaign_end_date: campaign_end_date || null,
      event_date_type: event_date_type || 'single',
      event_date: event_date_type === 'single' ? event_date || null : null,
      event_start_date: event_date_type === 'range' ? event_start_date || null : null,
      event_end_date: event_date_type === 'range' ? event_end_date || null : null,
      module_registration,
      module_survey,
      module_webinar,
      module_email,
      module_utm,
      module_ondemand,
    })
    .select('id, client_id, code, slug, title, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
