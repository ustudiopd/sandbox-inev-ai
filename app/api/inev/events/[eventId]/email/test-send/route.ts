import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/email/resend'

type RouteParams = { params: Promise<{ eventId: string }> }

const FROM_DOMAIN = process.env.INEV_EMAIL_FROM_DOMAIN || process.env.EMAIL_FROM_DOMAIN || 'eventflow.kr'

/**
 * inev: 이벤트 이메일 테스트 발송 (Admin)
 * Body: { to: string }
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  const body = await request.json()
  const to = typeof body?.to === 'string' ? body.to.trim() : ''
  if (!to) return NextResponse.json({ error: 'to (이메일 주소) required' }, { status: 400 })

  const supabase = createAdminSupabase()
  const { data: emailRow, error: emailErr } = await supabase
    .from('event_emails')
    .select('subject, body_html, from_name')
    .eq('event_id', eventId)
    .maybeSingle()
  if (emailErr) return NextResponse.json({ error: emailErr.message }, { status: 500 })
  const subject = emailRow?.subject || '(제목 없음)'
  const html = emailRow?.body_html || '<p>본문 없음</p>'
  const fromName = emailRow?.from_name || 'Inev.ai'

  const result = await sendEmailViaResend({
    from: `${fromName} <notify@${FROM_DOMAIN}>`,
    to,
    subject: `[테스트] ${subject}`,
    html,
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, id: result.id })
}
