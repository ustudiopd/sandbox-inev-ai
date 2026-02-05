import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'

/**
 * 온디맨드 설문 제출 API (웨비나 설문 로직과 동일)
 * POST /api/public/ondemand/[id]/survey/submit
 * body: { name, company?, phone, answers: [{ questionKey, choiceKey }] }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, company, phone, answers } = body as {
      name?: string
      company?: string
      phone?: string
      answers?: Array<{ questionKey: string; choiceKey: string }>
    }

    if (!name || !phone) {
      return NextResponse.json(
        { error: '이름과 휴대폰 번호는 필수입니다.' },
        { status: 400 }
      )
    }

    const phoneNorm = phone.replace(/\D/g, '')
    if (!phoneNorm) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해 주세요.' },
        { status: 400 }
      )
    }

    const admin = createAdminSupabase()
    const query = getOnDemandQuery(id)

    let q = admin.from('webinars').select('id').eq('type', 'ondemand')
    if (query.column === 'slug') {
      q = q.eq('slug', String(query.value)).not('slug', 'is', null)
    } else {
      q = q.eq(query.column, query.value)
    }
    const { data: ondemand, error: ondemandError } = await q.maybeSingle()

    if (ondemandError || !ondemand) {
      return NextResponse.json(
        { error: '온디맨드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const webinarId = ondemand.id

    // 이미 제출한 전화번호인지 확인
    const { data: existing } = await admin
      .from('ondemand_survey_responses')
      .select('survey_no, code6')
      .eq('webinar_id', webinarId)
      .eq('phone_norm', phoneNorm)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        survey_no: existing.survey_no,
        code6: existing.code6,
        message: '이미 참여하셨습니다.',
      })
    }

    // 다음 survey_no 조회
    const { data: maxRow } = await admin
      .from('ondemand_survey_responses')
      .select('survey_no')
      .eq('webinar_id', webinarId)
      .order('survey_no', { ascending: false })
      .limit(1)
      .maybeSingle()

    const surveyNo = (maxRow?.survey_no ?? 0) + 1

    // code6 생성 (6자 영숫자)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const generateCode6 = (): string => {
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    let code6 = generateCode6()
    let attempts = 0
    while (attempts < 100) {
      const { data: dup } = await admin
        .from('ondemand_survey_responses')
        .select('id')
        .eq('webinar_id', webinarId)
        .eq('code6', code6)
        .maybeSingle()
      if (!dup) break
      code6 = generateCode6()
      attempts++
    }

    const { data: entry, error: insertError } = await admin
      .from('ondemand_survey_responses')
      .insert({
        webinar_id: webinarId,
        name: name.trim() || null,
        company: company?.trim() || null,
        phone_norm: phoneNorm,
        answers: Array.isArray(answers) ? answers : [],
        survey_no: surveyNo,
        code6,
      })
      .select('id, survey_no, code6')
      .single()

    if (insertError) {
      console.error('[ondemand-survey-submit]', insertError)
      return NextResponse.json(
        { error: insertError.message || '제출 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      survey_no: entry.survey_no,
      code6: entry.code6,
      message: '설문이 제출되었습니다.',
    })
  } catch (err: any) {
    console.error('[ondemand-survey-submit]', err)
    return NextResponse.json(
      { error: err.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
