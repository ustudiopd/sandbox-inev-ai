import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getOnDemandQuery } from '@/lib/utils/ondemand'
import { getOnDemandAuth } from '@/lib/utils/ondemand-auth'

/**
 * 온디맨드 설문 제출 여부 확인 API
 * GET /api/public/ondemand/[id]/survey/check
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // 인증 확인
    const authData = await getOnDemandAuth(webinarId)
    
    if (!authData) {
      return NextResponse.json({
        submitted: false,
      })
    }

    // 인증된 사용자의 이메일로 설문 제출 여부 확인 (등록 여부 재확인 제거 - 이미 인증된 사용자만 접근 가능)
    const userEmail = authData.email.toLowerCase().trim()

    // 이메일로 설문 응답 확인 (인덱스 활용하여 빠른 조회)
    const { data: existing } = await admin
      .from('ondemand_survey_responses')
      .select('survey_no, code6')
      .eq('webinar_id', webinarId)
      .eq('email', userEmail)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        submitted: true,
        survey_no: existing.survey_no,
        code6: existing.code6,
      })
    }

    return NextResponse.json({
      submitted: false,
    })
  } catch (err: any) {
    console.error('[ondemand-survey-check]', err)
    return NextResponse.json(
      { error: err.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
