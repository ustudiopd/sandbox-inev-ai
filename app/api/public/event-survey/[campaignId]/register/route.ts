import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeUTM } from '@/lib/utils/utm'
import { normalizeCID } from '@/lib/utils/cid'
// import { sendWebinarRegistrationEmail } from '@/lib/email' // 이메일 발송 비활성화

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
    console.log('[register] 등록 요청 시작:', { campaignId, timestamp: new Date().toISOString() })
    
    const body = await req.json()
    const { 
      name, 
      company, 
      phone, 
      phone_norm, 
      registration_data,
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
    } = body
    
    console.log('[register] 요청 데이터:', { 
      name, 
      email: registration_data?.email,
      phone_norm,
      hasRegistrationData: !!registration_data
    })
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회 (client_id 필요)
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
        // cid lookup 실패해도 등록은 계속 진행
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
      // UTM 정규화 실패해도 등록은 계속 진행
    }
    
    if (!name || !phone || !phone_norm) {
      return NextResponse.json(
        { error: 'name, phone, and phone_norm are required' },
        { status: 400 }
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
      
      // 웨비나 연동: 등록 데이터에 이메일이 있으면 이 캠페인과 연동된 웨비나에도 등록
      if (registration_data?.email) {
        try {
          const emailLower = registration_data.email.trim().toLowerCase()
          
          // 이 캠페인과 연동된 웨비나 찾기 (registration_campaign_id로 연결된 웨비나)
          const { data: webinars } = await admin
            .from('webinars')
            .select('id, slug, access_policy')
            .eq('registration_campaign_id', campaignId)
          
          if (webinars && webinars.length > 0) {
            // 이메일로 사용자 찾기 (profiles 테이블)
            const { data: profile } = await admin
              .from('profiles')
              .select('id')
              .eq('email', emailLower)
              .maybeSingle()
            
            for (const webinar of webinars) {
              // 1. webinar_allowed_emails에 추가 (email_auth 정책인 경우)
              if (webinar.access_policy === 'email_auth') {
                const { data: existingEmail } = await admin
                  .from('webinar_allowed_emails')
                  .select('email')
                  .eq('webinar_id', webinar.id)
                  .eq('email', emailLower)
                  .maybeSingle()
                
                if (!existingEmail) {
                  await admin
                    .from('webinar_allowed_emails')
                    .insert({
                      webinar_id: webinar.id,
                      email: emailLower,
                      created_by: null,
                    })
                  
                  console.log(`[register] webinar_allowed_emails 추가: ${emailLower} → 웨비나 ${webinar.slug || webinar.id}`)
                }
              }
              
              // 2. registrations 테이블에 등록 (사용자가 있는 경우)
              if (profile?.id) {
                const { data: existingRegistration } = await admin
                  .from('registrations')
                  .select('webinar_id, user_id')
                  .eq('webinar_id', webinar.id)
                  .eq('user_id', profile.id)
                  .maybeSingle()
                
                if (!existingRegistration) {
                  const { error: regError } = await admin
                    .from('registrations')
                    .insert({
                      webinar_id: webinar.id,
                      user_id: profile.id,
                      role: 'attendee',
                      nickname: name.trim() || null,
                      registered_via: 'registration_page',
                    })
                  
                  if (regError) {
                    console.warn(`[register] registrations 저장 실패 (등록은 성공):`, regError)
                  } else {
                    console.log(`[register] registrations 추가: ${emailLower} → 웨비나 ${webinar.slug || webinar.id}`)
                  }
                }
              } else {
                console.log(`[register] 사용자 없음 (${emailLower}), registrations 건너뜀`)
              }
            }
          }
        } catch (webinarError) {
          // 웨비나 연동 실패는 경고만 하고 등록은 성공으로 처리
          console.warn('[register] 웨비나 연동 실패 (등록은 성공):', webinarError)
        }
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
    // registration_data의 이메일을 소문자로 정규화
    let normalizedRegistrationData = registration_data
    if (normalizedRegistrationData) {
      // 빈 문자열 필드 제거 및 정규화
      const cleanedData: Record<string, any> = {}
      for (const [key, value] of Object.entries(normalizedRegistrationData)) {
        if (value !== null && value !== undefined && value !== '') {
          cleanedData[key] = value
        }
      }
      
      // 이메일 소문자 정규화
      if (cleanedData.email) {
        cleanedData.email = cleanedData.email.trim().toLowerCase()
      }
      
      normalizedRegistrationData = Object.keys(cleanedData).length > 0 ? cleanedData : null
    }
    
    // 디버깅: registration_data 확인
    console.log('[register] registration_data:', JSON.stringify(normalizedRegistrationData, null, 2))
    
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
        registration_data: normalizedRegistrationData,
        // UTM 파라미터 저장 (graceful: 저장 실패해도 등록은 성공)
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
      console.error('[register] 등록자 정보 저장 오류:', entryError)
      return NextResponse.json(
        { error: 'Failed to save registration' },
        { status: 500 }
      )
    }
    
    // 전환 시 Visit과 연결 (Phase 3) - 실패해도 등록은 성공
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
        // Visit 연결 실패는 경고만 하고 등록은 성공으로 처리
        console.warn('[register] Visit 연결 실패 (등록은 성공):', visitError)
      }
    }
    
    console.log('[register] 등록 성공:', { 
      survey_no: entry?.survey_no, 
      code6: entry?.code6,
      email: normalizedRegistrationData?.email,
      timestamp: new Date().toISOString()
    })
    
    // 웨비나 연동: 등록 데이터에 이메일이 있으면 이 캠페인과 연동된 웨비나에도 등록
    if (normalizedRegistrationData?.email) {
      try {
        const emailLower = normalizedRegistrationData.email.trim().toLowerCase()
        
        // 이 캠페인과 연동된 웨비나 찾기 (registration_campaign_id로 연결된 웨비나)
        const { data: webinars } = await admin
          .from('webinars')
          .select('id, slug, access_policy')
          .eq('registration_campaign_id', campaignId)
        
        if (webinars && webinars.length > 0) {
          // 이메일로 사용자 찾기 (profiles 테이블)
          const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .eq('email', emailLower)
            .maybeSingle()
          
          for (const webinar of webinars) {
            // 1. webinar_allowed_emails에 추가 (email_auth 정책인 경우)
            if (webinar.access_policy === 'email_auth') {
              const { data: existingEmail } = await admin
                .from('webinar_allowed_emails')
                .select('email')
                .eq('webinar_id', webinar.id)
                .eq('email', emailLower)
                .maybeSingle()
              
              if (!existingEmail) {
                await admin
                  .from('webinar_allowed_emails')
                  .insert({
                    webinar_id: webinar.id,
                    email: emailLower,
                    created_by: null,
                  })
                
                console.log(`[register] webinar_allowed_emails 추가: ${emailLower} → 웨비나 ${webinar.slug || webinar.id}`)
              }
            }
            
            // 2. registrations 테이블에 등록 (사용자가 있는 경우)
            if (profile?.id) {
              const { data: existingRegistration } = await admin
                .from('registrations')
                .select('webinar_id, user_id')
                .eq('webinar_id', webinar.id)
                .eq('user_id', profile.id)
                .maybeSingle()
              
              if (!existingRegistration) {
                const { error: regError } = await admin
                  .from('registrations')
                  .insert({
                    webinar_id: webinar.id,
                    user_id: profile.id,
                    role: 'attendee',
                    nickname: name.trim() || null,
                    registered_via: 'registration_page',
                  })
                
                if (regError) {
                  console.warn(`[register] registrations 저장 실패 (등록은 성공):`, regError)
                } else {
                  console.log(`[register] registrations 추가: ${emailLower} → 웨비나 ${webinar.slug || webinar.id}`)
                }
              }
            } else {
              console.log(`[register] 사용자 없음 (${emailLower}), registrations 건너뜀`)
            }
          }
        }
      } catch (webinarError) {
        // 웨비나 연동 실패는 경고만 하고 등록은 성공으로 처리
        console.warn('[register] 웨비나 연동 실패 (등록은 성공):', webinarError)
      }
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
