import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 등록 페이지 공개 등록 API
 * POST /api/public/event-survey/[campaignId]/register
 * body: { name, company, phone, phone_norm }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { name, company, phone, phone_norm, registration_data } = await req.json()
    
    if (!name || !phone || !phone_norm) {
      return NextResponse.json(
        { error: 'name, phone, and phone_norm are required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, type, next_survey_no, client_id, agency_id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // 등록 페이지 타입 확인
    if (campaign.type !== 'registration') {
      return NextResponse.json(
        { error: 'This endpoint is only for registration campaigns' },
        { status: 400 }
      )
    }
    
    // 전화번호 정규화
    const phoneNorm = phone_norm.replace(/\D/g, '')
    
    if (!phoneNorm) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }
    
    // 이미 등록한 경우 확인 (멱등성)
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
        message: '이미 등록하셨습니다.',
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
      // 동시성 충돌 시 재시도
      const { data: retryCampaign } = await admin
        .from('event_survey_campaigns')
        .select('next_survey_no')
        .eq('id', campaignId)
        .single()
      
      if (!retryCampaign) {
        return NextResponse.json(
          { error: 'Failed to allocate survey number' },
          { status: 500 }
        )
      }
      
      const retrySurveyNo = retryCampaign.next_survey_no || 1
      
      const { error: retryUpdateError } = await admin
        .from('event_survey_campaigns')
        .update({ next_survey_no: retrySurveyNo + 1 })
        .eq('id', campaignId)
        .eq('next_survey_no', retrySurveyNo)
      
      if (retryUpdateError) {
        return NextResponse.json(
          { error: 'Failed to allocate survey number' },
          { status: 500 }
        )
      }
      
      // 재시도 성공 시 survey_no 사용
      const finalSurveyNo = retrySurveyNo
      const code6 = String(finalSurveyNo).padStart(6, '0')
      
      // 등록자 정보 저장 (설문 답변 없이)
      const { data: entry, error: entryError } = await admin
        .from('event_survey_entries')
        .insert({
          campaign_id: campaignId,
          name: name.trim(),
          company: company?.trim() || null,
          phone_norm: phoneNorm,
          survey_no: finalSurveyNo,
          code6: code6,
          completed_at: new Date().toISOString(),
          registration_data: registration_data || null,
        })
        .select('survey_no, code6')
        .single()
      
      if (entryError) {
        console.error('등록자 정보 저장 오류:', entryError)
        return NextResponse.json(
          { error: 'Failed to save registration' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        survey_no: entry.survey_no,
        code6: entry.code6,
      })
    }
    
    // 정상 경로: survey_no 발급 성공
    const code6 = String(surveyNo).padStart(6, '0')
    
    // 등록자 정보 저장 (설문 답변 없이)
    const { data: entry, error: entryError } = await admin
      .from('event_survey_entries')
      .insert({
        campaign_id: campaignId,
        name: name.trim(),
        company: company?.trim() || null,
        phone_norm: phoneNorm,
        survey_no: surveyNo,
        code6: code6,
        completed_at: new Date().toISOString(),
        registration_data: registration_data || null,
      })
      .select('survey_no, code6')
      .single()
    
    if (entryError) {
      console.error('등록자 정보 저장 오류:', entryError)
      return NextResponse.json(
        { error: 'Failed to save registration' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      survey_no: entry.survey_no,
      code6: entry.code6,
    })
  } catch (error: any) {
    console.error('등록 API 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
