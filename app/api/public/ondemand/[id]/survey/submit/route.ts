import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import { getOnDemandAuth } from '@/lib/utils/ondemand-auth'

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

    // 이름과 휴대폰 번호는 선택적 (설문 문항만 필수)
    const phoneNorm = phone ? phone.replace(/\D/g, '') : null

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

    // 인증 확인 (설문 제출은 인증된 사용자만 가능)
    console.log('[survey-submit] 인증 확인 시작:', { webinarId, id })
    const authData = await getOnDemandAuth(webinarId)
    
    if (!authData) {
      console.log('[survey-submit] 인증 실패:', { webinarId, id })
      return NextResponse.json(
        { error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' },
        { status: 401 }
      )
    }
    
    console.log('[survey-submit] 인증 성공:', { email: authData.email, name: authData.name })
    
    // 등록 여부 재확인 제거 - 이미 인증된 사용자만 접근 가능하므로 불필요
    // (인증 쿠키는 등록 확인 후에만 설정되므로)

    // 인증된 사용자의 이메일과 이름 사용
    const userEmail = authData.email.toLowerCase().trim()
    const userName = authData.name.trim()

    // 이메일 또는 전화번호로 중복 확인
    let existing = null
    
    // 1순위: 이메일로 중복 확인
    const { data: existingByEmail } = await admin
      .from('ondemand_survey_responses')
      .select('survey_no, code6')
      .eq('webinar_id', webinarId)
      .eq('email', userEmail)
      .maybeSingle()
    
    if (existingByEmail) {
      existing = existingByEmail
    }
    
    // 2순위: 전화번호로 중복 확인 (이메일이 없을 경우)
    if (!existing && phoneNorm) {
      const { data: existingByPhone } = await admin
        .from('ondemand_survey_responses')
        .select('survey_no, code6')
        .eq('webinar_id', webinarId)
        .eq('phone_norm', phoneNorm)
        .maybeSingle()
      
      if (existingByPhone) {
        existing = existingByPhone
      }
    }

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
        email: userEmail, // 인증된 사용자의 이메일 저장
        name: userName || name?.trim() || null, // 인증된 사용자의 이름 우선 사용
        company: company?.trim() || null,
        phone_norm: phoneNorm || null,
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
