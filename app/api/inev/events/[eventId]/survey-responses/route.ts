import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * inev: 이벤트별 설문 응답 목록 (Admin용)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('event_survey_responses')
    .select('id, lead_id, email, response, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
