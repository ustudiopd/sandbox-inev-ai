import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeUTM } from '@/lib/utils/utm'
import { normalizeCID } from '@/lib/utils/cid'

export const runtime = 'nodejs'

/**
 * 설문조사 공개 제출 API
 * POST /api/public/event-survey/[campaignId]/submit
 * body: { name, company, phone, answers }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { 
      name, 
      company, 
      phone, 
      answers, 
      consentData,
      // UTM 파라미터
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      utm_first_visit_at,
      utm_referrer,
      marketing_campaign_link_id,
      cid, // cid 파라미터 추가
      session_id, // Visit 연결용 (Phase 3) - optional
    } = await req.json()
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회 (client_id 필요)
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, form_id, next_survey_no, client_id, agency_id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // cid로 링크 lookup (명세서 요구사항)
    let resolvedMarketingCampaignLinkId: string | null = marketing_campaign_link_id || null
    if (cid && !resolvedMarketingCampaignLinkId) {
      try {
        const normalizedCid = normalizeCID(cid)
        if (normalizedCid) {
          const { data: link } = await admin
            .from('campaign_link_meta')
            .select('id')
            .eq('client_id', campaign.client_id)
            .eq('cid', normalizedCid)
            .eq('status', 'active')
            .maybeSingle()
          
          if (link) {
            resolvedMarketingCampaignLinkId = link.id
          }
        }
      } catch (cidError) {
        console.error('cid lookup 오류 (무시하고 계속):', cidError)
        // cid lookup 실패해도 제출은 계속 진행
      }
    }
    
    // UTM 파라미터 정규화 (graceful: 실패해도 계속 진행)
    let normalizedUTM: Record<string, string | null> = {}
    try {
      normalizedUTM = normalizeUTM({
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
      })
    } catch (utmError) {
      console.error('UTM 정규화 오류 (무시하고 계속):', utmError)
      // UTM 정규화 실패해도 제출은 계속 진행
    }
    
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'name and phone are required' },
        { status: 400 }
      )
    }
    
    if (!campaign.form_id) {
      return NextResponse.json(
        { error: 'Form not configured for this campaign' },
        { status: 400 }
      )
    }
    
    // 전화번호 정규화 (숫자만 추출)
    const phoneNorm = phone.replace(/\D/g, '')
    
    if (!phoneNorm) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }
    
    // 이미 참여한 경우 확인 (멱등성)
    const { data: existingEntry } = await admin
      .from('event_survey_entries')
      .select('survey_no, code6')
      .eq('campaign_id', campaignId)
      .eq('phone_norm', phoneNorm)
      .maybeSingle()
    
    if (existingEntry) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        survey_no: existingEntry.survey_no,
        code6: existingEntry.code6,
        message: '이미 참여하셨습니다.',
      })
    }
    
    // survey_no 발급 (원자적 업데이트)
    const { data: currentCampaign } = await admin
      .from('event_survey_campaigns')
      .select('next_survey_no')
      .eq('id', campaignId)
      .single()
    
    if (!currentCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    const surveyNo = currentCampaign.next_survey_no || 1
    
    // next_survey_no 증가
    const { error: updateError } = await admin
      .from('event_survey_campaigns')
      .update({ next_survey_no: surveyNo + 1 })
      .eq('id', campaignId)
      .eq('next_survey_no', surveyNo) // 동시성 제어
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to allocate survey number. Please try again.' },
        { status: 500 }
      )
    }
    
    // code6 생성 (알파벳+숫자 혼합 6자리 랜덤 코드)
    const generateCode6 = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }
    
    // 중복 체크를 포함한 고유한 code6 생성
    let code6: string = ''
    let attempts = 0
    const maxAttempts = 100
    
    while (attempts < maxAttempts) {
      code6 = generateCode6()
      
      // 같은 캠페인 내에서 중복 체크
      const { data: existingCode } = await admin
        .from('event_survey_entries')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('code6', code6)
        .maybeSingle()
      
      if (!existingCode) {
        break // 고유한 코드 생성 성공
      }
      
      attempts++
    }
    
    if (attempts >= maxAttempts || !code6) {
      return NextResponse.json(
        { error: 'Failed to generate unique code. Please try again.' },
        { status: 500 }
      )
    }
    
    // 폼 제출 처리 (form_submissions와 form_answers 생성)
    let formSubmissionId: string | null = null
    
    if (answers && Array.isArray(answers) && answers.length > 0 && campaign.form_id) {
      // form_submission 생성 (participant_id는 null - 공개 설문)
      const { data: submission, error: subError } = await admin
        .from('form_submissions')
        .insert({
          form_id: campaign.form_id,
          participant_id: null, // 공개 설문이므로 null
        })
        .select()
        .single()
      
      if (subError) {
        console.error('form_submission 생성 오류:', subError)
        return NextResponse.json(
          { error: 'Failed to create form submission: ' + subError.message },
          { status: 500 }
        )
      }
      
      formSubmissionId = submission.id
      
      // form_answers 생성
      const answerRows = answers.map((a: any) => ({
        form_id: campaign.form_id,
        submission_id: submission.id,
        question_id: a.questionId,
        participant_id: null, // 공개 설문이므로 null
        choice_ids: a.choiceIds || null, // JSONB는 자동으로 처리됨
        text_answer: a.textAnswer || null,
      }))
      
      const { error: answerError } = await admin
        .from('form_answers')
        .insert(answerRows)
      
      if (answerError) {
        console.error('form_answers 생성 오류:', answerError)
        // submission은 이미 생성되었으므로 롤백하지 않고 계속 진행
        // 하지만 로그는 남김
      }
    }
    
    // entry 생성 (개인정보 동의 데이터 포함)
    const { data: entry, error: entryError } = await admin
      .from('event_survey_entries')
      .insert({
        campaign_id: campaignId,
        name,
        company: company || null,
        phone_norm: phoneNorm,
        survey_no: surveyNo,
        code6,
        form_submission_id: formSubmissionId,
        consent_data: consentData ? {
          ...consentData,
          consented_at: new Date().toISOString(),
        } : null,
        // UTM 파라미터 저장 (graceful: 저장 실패해도 제출은 성공)
        utm_source: normalizedUTM.utm_source || null,
        utm_medium: normalizedUTM.utm_medium || null,
        utm_campaign: normalizedUTM.utm_campaign || null,
        utm_term: normalizedUTM.utm_term || null,
        utm_content: normalizedUTM.utm_content || null,
        utm_first_visit_at: utm_first_visit_at || null,
        utm_referrer: utm_referrer || null,
        marketing_campaign_link_id: resolvedMarketingCampaignLinkId,
      })
      .select('id, survey_no, code6')
      .single()
    
    if (entryError) {
      return NextResponse.json(
        { error: entryError.message },
        { status: 500 }
      )
    }
    
    // 전환 시 Visit과 연결 (Phase 3) - 실패해도 제출은 성공
    if (session_id && entry?.id) {
      try {
        await admin
          .from('event_access_logs')
          .update({
            converted_at: new Date().toISOString(),
            entry_id: entry.id,
          })
          .eq('campaign_id', campaignId)
          .eq('session_id', session_id)
          .is('converted_at', null) // 아직 전환되지 않은 것만
      } catch (visitError) {
        // Visit 연결 실패는 경고만 하고 제출은 성공으로 처리
        console.warn('[submit] Visit 연결 실패 (제출은 성공):', visitError)
      }
    }
    
    return NextResponse.json({
      success: true,
      survey_no: surveyNo,
      code6,
      entry_id: entry.id,
    })
  } catch (error: any) {
    console.error('설문 제출 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

