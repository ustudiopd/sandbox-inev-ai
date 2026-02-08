import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

/**
 * inev: slug로 이벤트 1건 조회 (public용, client 구분은 추후 서브도메인으로)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const clientSlug = searchParams.get('client') // 옵션: 클라이언트 슬러그로 범위 제한
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const supabase = createAdminSupabase()
  let query = supabase
    .from('events')
    .select('id, client_id, code, slug, module_registration, module_survey, module_webinar, module_email, module_utm, module_ondemand')
    .eq('slug', slug)
    .limit(1)
  if (clientSlug) {
    const { data: clients } = await supabase.from('clients').select('id').eq('slug', clientSlug).limit(1)
    const clientId = clients?.[0]?.id
    if (clientId) query = query.eq('client_id', clientId)
  }
  const { data, error } = await query.single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
