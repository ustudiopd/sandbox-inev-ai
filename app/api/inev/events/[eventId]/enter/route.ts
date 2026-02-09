import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * inev Phase 5: Entry Gate API
 * POST /api/inev/events/[eventId]/enter
 * Body: { email: string, name?: string }
 * 
 * 자동입장: email만으로 등록 정보 조회
 * 수동입장: email + name으로 등록 확인/생성
 * 
 * 표시이름: 등록 데이터에서 조회 (이메일 로컬파트 fallback 방지)
 * 버튼 클릭 시에만 호출되어야 함 (side effect 금지)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { email, name } = body as { email?: string; name?: string }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const trimmedEmail = String(email).trim().toLowerCase()
    if (!trimmedEmail) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    // 이벤트 조회 (온디맨드 모듈 확인 포함)
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, slug, code, client_id, module_ondemand')
      .eq('id', eventId)
      .maybeSingle()

    if (eventErr) {
      return NextResponse.json({ error: eventErr.message }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: '이벤트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 등록 정보 조회 (이메일 기반)
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, email, name, created_at')
      .eq('event_id', eventId)
      .eq('email', trimmedEmail)
      .maybeSingle()

    if (leadErr) {
      return NextResponse.json({ error: leadErr.message }, { status: 500 })
    }

    // 표시이름 결정 (등록 데이터 기반, 이메일 로컬파트 fallback 방지)
    let displayName: string | null = null
    let finalLead: { id: string; email: string; name: string | null } | null = null

    if (lead) {
      // 등록 정보가 있으면 등록 시 이름 사용
      displayName = lead.name || null
      finalLead = lead
    } else if (name) {
      // 등록 정보가 없고 name이 제공되면 등록 생성
      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          event_id: eventId,
          email: trimmedEmail,
          name: String(name).trim() || null,
        })
        .select('id, email, name, created_at')
        .single()

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }

      displayName = newLead.name || null
      finalLead = newLead
    } else {
      // 등록 정보도 없고 name도 없으면 에러 (자동입장 불가)
      return NextResponse.json(
        {
          error: '등록 정보를 찾을 수 없습니다.',
          code: 'NOT_REGISTERED',
          requiresName: true, // 수동입장 필요
        },
        { status: 404 }
      )
    }

    // 표시이름이 없으면 에러 (이메일 로컬파트로 떨어지지 않도록)
    if (!displayName) {
      return NextResponse.json(
        {
          error: '이름 정보가 필요합니다.',
          code: 'NAME_REQUIRED',
          requiresName: true,
        },
        { status: 400 }
      )
    }

    // 입장 성공 응답 (세션 생성은 클라이언트에서 처리)
    // 온디맨드 이벤트인 경우 온디맨드 시청 페이지로 리다이렉트
    const redirectTo = event.module_ondemand 
      ? `/event/${event.slug}/ondemand`
      : `/event/${event.slug}`

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        slug: event.slug,
        code: event.code,
      },
      lead: {
        id: finalLead.id,
        email: finalLead.email,
        name: displayName,
      },
      displayName, // 표시이름 명시적으로 반환
      redirectTo, // 온디맨드면 온디맨드 페이지, 아니면 이벤트 페이지로 리다이렉트
    })
  } catch (error: any) {
    console.error('Entry Gate API 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
