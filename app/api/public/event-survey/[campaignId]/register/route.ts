import { NextResponse, NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeUTM } from '@/lib/utils/utm'
import { normalizeCID } from '@/lib/utils/cid'
import { restoreTrackingInfo } from '@/lib/tracking/restore-tracking'
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
  // Request를 NextRequest로 변환 (cookie 읽기용)
  const nextReq = req as unknown as NextRequest
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
    
    // 캠페인 조회 (웨비나 ID인 경우도 처리)
    let campaign = null
    let campaignError: any = null
    let isWebinarId = false // 웨비나 ID인지 여부
    
    // 먼저 캠페인으로 조회 시도
    const { data: campaignData, error: campaignErr } = await admin
      .from('event_survey_campaigns')
      .select('id, type, next_survey_no, client_id, agency_id')
      .eq('id', campaignId)
      .maybeSingle()
    
    if (campaignData) {
      campaign = campaignData
    } else {
      // 캠페인이 없으면 웨비나 ID인지 확인
      // campaignId가 UUID 형식이고 웨비나 테이블에 존재하는지 확인
      const { data: webinar } = await admin
        .from('webinars')
        .select('id, slug, title, client_id, agency_id')
        .eq('id', campaignId)
        .maybeSingle()
      
      if (webinar) {
        // 웨비나 ID인 경우: 웨비나 정보를 campaign처럼 사용
        // 실제 캠페인은 없지만, 웨비나 정보로 등록 처리
        isWebinarId = true
        campaign = {
          id: webinar.id,
          type: 'registration',
          next_survey_no: 1,
          client_id: webinar.client_id,
          agency_id: webinar.agency_id,
        } as any
        console.log('[register] 웨비나 ID를 캠페인처럼 사용:', { webinar_id: webinar.id, slug: webinar.slug })
      } else {
        campaignError = campaignErr || { message: 'Campaign not found' }
      }
    }
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // 추적 정보 복원 (URL > Cookie > Link 순서)
    const restoredTracking = await restoreTrackingInfo(
      nextReq,
      campaignId,
      campaign.client_id,
      isWebinarId,
      {
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
      },
      cid || null
    )
    
    // 복원된 추적 정보 사용
    const resolvedMarketingCampaignLinkId = restoredTracking.marketing_campaign_link_id || marketing_campaign_link_id || null
    const finalCid = restoredTracking.cid
    const finalUTMParams = {
      utm_source: restoredTracking.utm_source,
      utm_medium: restoredTracking.utm_medium,
      utm_campaign: restoredTracking.utm_campaign,
      utm_term: restoredTracking.utm_term,
      utm_content: restoredTracking.utm_content,
    }
    
    console.log('[register] 복원된 추적 정보:', {
      source: restoredTracking.source,
      cid: finalCid,
      utm_source: finalUTMParams.utm_source,
      link_id: resolvedMarketingCampaignLinkId,
      untracked_reason: restoredTracking.untracked_reason,
    })
    
    // UTM 파라미터 정규화 (graceful: 실패해도 계속 진행)
    let normalizedUTM: Record<string, string | null> = {}
    try {
      normalizedUTM = normalizeUTM(finalUTMParams)
      console.log('[register] 정규화된 UTM 파라미터:', normalizedUTM)
    } catch (utmError) {
      console.error('UTM 정규화 오류 (무시하고 계속):', utmError)
      // UTM 정규화 실패해도 등록은 계속 진행
    }
    
    // 웨비나 ID인 경우: registrations에만 저장 (event_survey_entries는 저장하지 않음)
    if (isWebinarId) {
      // 이메일이 없으면 에러 반환
      if (!registration_data?.email) {
        return NextResponse.json(
          { error: '이메일은 필수입니다.' },
          { status: 400 }
        )
      }
      
      try {
        // 웨비나 ID로 직접 조회
        const { data: webinar } = await admin
          .from('webinars')
          .select('id, slug, access_policy')
          .eq('id', campaignId)
          .maybeSingle()
        
        if (!webinar) {
          return NextResponse.json(
            { error: '웨비나를 찾을 수 없습니다.' },
            { status: 404 }
          )
        }
        
        const emailLower = registration_data.email.trim().toLowerCase()
        
        // 임시 비밀번호 생성 (자동 로그인용)
        const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!`
        
        // 이메일로 사용자 찾기 (profiles 테이블)
        let { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('email', emailLower)
          .maybeSingle()
        
        // 프로필이 없으면 자동 생성 (웨비나 등록 페이지용)
        if (!profile?.id) {
          // auth.users에서 이메일로 사용자 확인 (페이지네이션 사용)
          let existingAuthUser = null
          let page = 1
          const perPage = 1000
          
          while (!existingAuthUser && page <= 10) {
            const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
              page,
              perPage,
            })
            
            if (listError) {
              console.error('[register] 사용자 목록 조회 실패:', listError)
              break
            }
            
            existingAuthUser = authUsers?.users.find(u => u.email?.toLowerCase() === emailLower)
            
            if (existingAuthUser) {
              break
            }
            
            // 더 이상 사용자가 없으면 중단
            if (!authUsers?.users || authUsers.users.length < perPage) {
              break
            }
            
            page++
          }
          
          let userId: string
          
          if (existingAuthUser) {
            // auth.users에는 있지만 profiles에는 없는 경우
            userId = existingAuthUser.id
          } else {
            // auth.users에도 없는 경우 새로 생성
            const { data: newUser, error: createError } = await admin.auth.admin.createUser({
              email: emailLower,
              password: tempPassword,
              email_confirm: true, // 이메일 인증 없이 바로 활성화
              user_metadata: {
                display_name: registration_data.name || emailLower.split('@')[0],
                nickname: registration_data.name || null,
              }
            })
            
            if (createError || !newUser.user) {
              console.error('[register] auth.users 생성 실패:', createError)
              return NextResponse.json(
                { error: '사용자 계정 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
              )
            }
            
            userId = newUser.user.id
            console.log('[register] 새 사용자 생성:', userId)
          }
          
          // profiles에 프로필 생성
          const { error: profileError } = await admin
            .from('profiles')
            .insert({
              id: userId,
              email: emailLower,
              display_name: registration_data.name || emailLower.split('@')[0],
              nickname: registration_data.name || null,
            })
          
          if (profileError) {
            // 이미 존재하는 경우 (race condition) 다시 조회
            if (profileError.code === '23505') {
              const { data: existingProfile } = await admin
                .from('profiles')
                .select('id')
                .eq('email', emailLower)
                .maybeSingle()
              
              if (existingProfile) {
                profile = existingProfile
              } else {
                console.error('[register] 프로필 생성 실패:', profileError)
                return NextResponse.json(
                  { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                  { status: 500 }
                )
              }
            } else {
              console.error('[register] 프로필 생성 실패:', profileError)
              return NextResponse.json(
                { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
              )
            }
          } else {
            // 생성 성공, 다시 조회
            const { data: newProfile } = await admin
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle()
            
            if (!newProfile) {
              return NextResponse.json(
                { error: '프로필 생성 후 조회에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
              )
            }
            
            profile = newProfile
            console.log('[register] 프로필 자동 생성 완료:', profile.id)
          }
        } else {
          // 프로필이 이미 있는 경우: 비밀번호 재설정 (자동 로그인용)
          const { error: updateError } = await admin.auth.admin.updateUserById(
            profile.id,
            {
              password: tempPassword,
              email_confirm: true,
            }
          )
          
          if (updateError) {
            console.error('[register] 기존 사용자 비밀번호 재설정 실패:', updateError)
            // 비밀번호 재설정 실패해도 등록은 계속 진행
          } else {
            console.log('[register] 기존 사용자 비밀번호 재설정 완료:', profile.id)
          }
        }
        
        // 이미 등록한 경우 확인 (이메일 기반 중복 체크)
        // 이메일로 이미 등록된 사용자 확인 (이름 중복 허용, 이메일만 중복 금지)
        const { data: existingRegistration } = await admin
          .from('registrations')
          .select('webinar_id, user_id, registration_data')
          .eq('webinar_id', webinar.id)
          .eq('user_id', profile.id)
          .maybeSingle()
        
        if (existingRegistration) {
          // 이름이 "양승철2"로 되어 있으면 "양승철"로 수정
          const regData = existingRegistration.registration_data as any
          const currentName = regData?.name
          if (currentName === '양승철2' || currentName?.includes('양승철2')) {
            console.log(`[register] 이름 수정 중: "${currentName}" → "양승철"`)
            const { error: updateError } = await admin
              .from('registrations')
              .update({
                registration_data: {
                  ...regData,
                  name: '양승철',
                }
              })
              .eq('webinar_id', webinar.id)
              .eq('user_id', profile.id)
            
            if (updateError) {
              console.error('[register] 이름 수정 실패:', updateError)
            } else {
              console.log('[register] 이름 수정 완료')
            }
          }
          
          // 이미 등록한 경우에도 비밀번호 재설정 (자동 로그인용)
          const { error: updatePasswordError } = await admin.auth.admin.updateUserById(
            profile.id,
            {
              password: tempPassword,
              email_confirm: true,
            }
          )
          
          if (updatePasswordError) {
            console.error('[register] 이미 등록된 사용자 비밀번호 재설정 실패:', updatePasswordError)
            // 비밀번호 재설정 실패해도 계속 진행
          } else {
            console.log('[register] 이미 등록된 사용자 비밀번호 재설정 완료:', profile.id)
          }
          
          // 이미 등록한 경우에도 자동 로그인을 위해 이메일과 비밀번호 반환
          return NextResponse.json({
            success: true,
            alreadySubmitted: true,
            message: '이미 등록하셨습니다.',
            email: emailLower,
            password: tempPassword, // 자동 로그인용 임시 비밀번호
          })
        }
        
        // registration_data에 phone 정보 추가 및 정리
        const completeRegistrationData = {
          ...(registration_data || {}),
          // phone 정보 추가 (registration_data에 없을 수 있음)
          phone: phone || registration_data?.phone || null,
          phone_norm: phone_norm || registration_data?.phone_norm || null,
        }
        
        // CID 추가 (복원된 CID가 있을 때만)
        if (finalCid) {
          completeRegistrationData.cid = finalCid
        }
        
        // 빈 값 제거 (null, undefined, 빈 문자열만 제거, 배열과 boolean은 유지)
        const cleanedRegistrationData: Record<string, any> = {}
        for (const [key, value] of Object.entries(completeRegistrationData)) {
          // null, undefined, 빈 문자열만 제거
          // 배열([])과 boolean(false)는 유지
          if (value !== null && value !== undefined && value !== '') {
            cleanedRegistrationData[key] = value
          } else if (Array.isArray(value) || typeof value === 'boolean') {
            // 빈 배열이나 false도 유지
            cleanedRegistrationData[key] = value
          }
        }
        
        // registrations 테이블에만 등록 (모든 폼 데이터 포함)
        console.log('[register] 저장할 registration_data:', JSON.stringify(cleanedRegistrationData, null, 2))
        console.log('[register] CID 저장:', finalCid || '없음')
        
        const { error: regError } = await admin
          .from('registrations')
          .insert({
            webinar_id: webinar.id,
            user_id: profile.id,
            role: 'attendee',
            nickname: name ? name.trim() || null : null,
            registered_via: 'manual', // 등록 페이지를 통한 등록은 'manual'로 처리 (DB 제약: 'email', 'manual', 'invite'만 허용)
            registration_data: Object.keys(cleanedRegistrationData).length > 0 ? cleanedRegistrationData : null,
            // 마케팅 캠페인 링크 추적 (전환 추적용)
            marketing_campaign_link_id: resolvedMarketingCampaignLinkId || null,
          })
        
        if (regError) {
          console.error('[register] registrations 저장 오류:', {
            error: regError,
            message: regError.message,
            details: regError.details,
            hint: regError.hint,
            code: regError.code,
            webinar_id: webinar.id,
            user_id: profile.id,
            registration_data: cleanedRegistrationData
          })
          return NextResponse.json(
            { error: 'Failed to save registration', details: regError.message },
            { status: 500 }
          )
        }
        
        // webinar_allowed_emails에 추가 (email_auth 정책인 경우)
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
          }
        }
        
        console.log('[register] 웨비나 등록 성공:', { 
          email: emailLower,
          webinar_id: webinar.id,
          slug: webinar.slug,
          timestamp: new Date().toISOString()
        })
        
        // 자동 로그인을 위해 이메일과 비밀번호 반환
        return NextResponse.json({
          success: true,
          message: '등록이 완료되었습니다.',
          email: emailLower,
          password: tempPassword, // 자동 로그인용 임시 비밀번호
        })
      } catch (error: any) {
        console.error('[register] 웨비나 등록 오류:', {
          error,
          message: error?.message,
          stack: error?.stack,
          campaignId,
          registration_data,
          name,
          phone,
          phone_norm
        })
        return NextResponse.json(
          { error: error?.message || 'Internal server error', details: error?.stack },
          { status: 500 }
        )
      }
    }
    
    // 웨비나 ID가 아닌 경우: 일반 캠페인 등록 처리
    // name, phone, phone_norm 필수 검증
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
    
    // 원프레딕트 웨비나(426307) 확인: registration_campaign_id로 연결된 웨비나 찾기
    const { data: linkedWebinars } = await admin
      .from('webinars')
      .select('id, slug, access_policy')
      .eq('registration_campaign_id', campaignId)
    
    const onePredictWebinar = linkedWebinars?.find(w => w.slug === '426307')
    const isOnePredictWebinar = !!onePredictWebinar
    
    // 원프레딕트 웨비나인 경우: registrations에만 저장 (event_survey_entries는 저장하지 않음)
    if (isOnePredictWebinar && registration_data?.email) {
      try {
        const emailLower = registration_data.email.trim().toLowerCase()
        
        // 이메일로 사용자 찾기 (profiles 테이블)
        let { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('email', emailLower)
          .maybeSingle()
        
        // 프로필이 없으면 자동 생성 (웨비나 등록 페이지용)
        if (!profile?.id) {
          // auth.users에서 이메일로 사용자 확인 (페이지네이션 사용)
          let existingAuthUser = null
          let page = 1
          const perPage = 1000
          
          while (!existingAuthUser && page <= 10) {
            const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
              page,
              perPage,
            })
            
            if (listError) {
              console.error('[register] 사용자 목록 조회 실패:', listError)
              break
            }
            
            existingAuthUser = authUsers?.users.find(u => u.email?.toLowerCase() === emailLower)
            
            if (existingAuthUser) {
              break
            }
            
            // 더 이상 사용자가 없으면 중단
            if (!authUsers?.users || authUsers.users.length < perPage) {
              break
            }
            
            page++
          }
          
          let userId: string
          
          if (existingAuthUser) {
            // auth.users에는 있지만 profiles에는 없는 경우
            userId = existingAuthUser.id
          } else {
            // auth.users에도 없는 경우 새로 생성
            // 임시 비밀번호 생성 (나중에 비밀번호 재설정 필요)
            const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!`
            
            const { data: newUser, error: createError } = await admin.auth.admin.createUser({
              email: emailLower,
              password: tempPassword,
              email_confirm: true, // 이메일 인증 없이 바로 활성화
              user_metadata: {
                display_name: registration_data.name || emailLower.split('@')[0],
                nickname: registration_data.name || null,
              }
            })
            
            if (createError || !newUser.user) {
              console.error('[register] auth.users 생성 실패:', createError)
              return NextResponse.json(
                { error: '사용자 계정 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
              )
            }
            
            userId = newUser.user.id
            console.log('[register] 새 사용자 생성:', userId)
          }
          
          // profiles에 프로필 생성
          const { error: profileError } = await admin
            .from('profiles')
            .insert({
              id: userId,
              email: emailLower,
              display_name: registration_data.name || emailLower.split('@')[0],
              nickname: registration_data.name || null,
            })
          
          if (profileError) {
            // 이미 존재하는 경우 (race condition) 다시 조회
            if (profileError.code === '23505') {
              const { data: existingProfile } = await admin
                .from('profiles')
                .select('id')
                .eq('email', emailLower)
                .maybeSingle()
              
              if (existingProfile) {
                profile = existingProfile
              } else {
                console.error('[register] 프로필 생성 실패:', profileError)
                return NextResponse.json(
                  { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                  { status: 500 }
                )
              }
            } else {
              console.error('[register] 프로필 생성 실패:', profileError)
              return NextResponse.json(
                { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
              )
            }
          } else {
            // 생성 성공, 다시 조회
            const { data: newProfile } = await admin
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle()
            
            if (!newProfile) {
              return NextResponse.json(
                { error: '프로필 생성 후 조회에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
              )
            }
            
            profile = newProfile
            console.log('[register] 프로필 자동 생성 완료:', profile.id)
          }
        }
        
        // 이미 등록한 경우 확인 (registrations만 확인)
        const { data: existingRegistration } = await admin
          .from('registrations')
          .select('webinar_id, user_id, survey_no, code6')
          .eq('webinar_id', onePredictWebinar.id)
          .eq('user_id', profile.id)
          .maybeSingle()
        
        if (existingRegistration) {
          return NextResponse.json({
            success: true,
            alreadySubmitted: true,
            survey_no: existingRegistration.survey_no,
            code6: existingRegistration.code6,
            message: '이미 등록하셨습니다.',
          })
        }
        
        // survey_no 발급: 해당 웨비나의 기존 등록 수를 세어서 +1
        const { count: existingCount } = await admin
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('webinar_id', onePredictWebinar.id)
          .not('survey_no', 'is', null)
        
        const surveyNo = (existingCount || 0) + 1
        const code6 = String(surveyNo).padStart(6, '0')
        
        // registration_data에 phone 정보 추가 및 정리
        // registration_data가 없으면 빈 객체로 시작
        const baseData = registration_data && typeof registration_data === 'object' ? registration_data : {}
        const completeRegistrationData = {
          ...baseData,
          // phone 정보 추가 (registration_data에 없을 수 있음)
          phone: phone || baseData?.phone || null,
          phone_norm: phone_norm || baseData?.phone_norm || null,
        }
        
        // CID 추가 (복원된 CID가 있을 때만)
        if (finalCid) {
          completeRegistrationData.cid = finalCid
        }
        
        // 빈 값 제거 (null, undefined, 빈 문자열만 제거, 배열과 boolean은 유지)
        const cleanedRegistrationData: Record<string, any> = {}
        for (const [key, value] of Object.entries(completeRegistrationData)) {
          // null, undefined, 빈 문자열만 제거
          // 배열([])과 boolean(false)는 유지
          if (value !== null && value !== undefined && value !== '') {
            cleanedRegistrationData[key] = value
          } else if (Array.isArray(value) || typeof value === 'boolean') {
            // 빈 배열이나 false도 유지
            cleanedRegistrationData[key] = value
          }
        }
        
        // registrations 테이블에만 등록 (모든 폼 데이터 포함)
        console.log('[register] 저장할 registration_data:', JSON.stringify(cleanedRegistrationData, null, 2))
        console.log('[register] CID 저장:', finalCid || '없음')
        
        const { data: newRegistration, error: regError } = await admin
          .from('registrations')
          .insert({
            webinar_id: onePredictWebinar.id,
            user_id: profile.id,
            role: 'attendee',
            nickname: name ? name.trim() || null : null,
            registered_via: 'manual', // 등록 페이지를 통한 등록은 'manual'로 처리 (DB 제약: 'email', 'manual', 'invite'만 허용)
            registration_data: Object.keys(cleanedRegistrationData).length > 0 ? cleanedRegistrationData : null,
            survey_no: surveyNo,
            code6: code6,
          })
          .select('survey_no, code6')
          .single()
        
        if (regError) {
          console.error('[register] registrations 저장 오류:', {
            error: regError,
            message: regError.message,
            details: regError.details,
            hint: regError.hint,
            code: regError.code,
            webinar_id: onePredictWebinar.id,
            user_id: profile.id,
            registration_data: cleanedRegistrationData
          })
          return NextResponse.json(
            { error: 'Failed to save registration', details: regError.message },
            { status: 500 }
          )
        }
        
        // webinar_allowed_emails에 추가 (email_auth 정책인 경우)
        if (onePredictWebinar.access_policy === 'email_auth') {
          const { data: existingEmail } = await admin
            .from('webinar_allowed_emails')
            .select('email')
            .eq('webinar_id', onePredictWebinar.id)
            .eq('email', emailLower)
            .maybeSingle()
          
          if (!existingEmail) {
            await admin
              .from('webinar_allowed_emails')
              .insert({
                webinar_id: onePredictWebinar.id,
                email: emailLower,
                created_by: null,
              })
          }
        }
        
        console.log('[register] 원프레딕트 웨비나 등록 성공:', { 
          email: emailLower,
          webinar_id: onePredictWebinar.id,
          survey_no: newRegistration?.survey_no,
          code6: newRegistration?.code6,
          timestamp: new Date().toISOString()
        })
        
        return NextResponse.json({
          success: true,
          survey_no: newRegistration?.survey_no,
          code6: newRegistration?.code6,
          message: '등록이 완료되었습니다.',
        })
      } catch (error: any) {
        console.error('[register] 원프레딕트 웨비나 등록 오류:', {
          error,
          message: error?.message,
          stack: error?.stack,
          campaignId,
          registration_data,
          name,
          phone,
          phone_norm
        })
        return NextResponse.json(
          { error: error?.message || 'Internal server error', details: error?.stack },
          { status: 500 }
        )
      }
    }
    
    // 원프레딕트 웨비나가 아닌 경우: 기존 로직대로 event_survey_entries에 저장
    // 이미 등록한 경우 확인 (멱등성)
    // 이메일 기반 중복 체크 (이메일이 있는 경우)
    if (registration_data?.email) {
      const emailLower = registration_data.email.trim().toLowerCase()
      const { data: existingEntryByEmail } = await admin
        .from('event_survey_entries')
        .select('survey_no, code6')
        .eq('campaign_id', campaignId)
        .eq('registration_data->>email', emailLower)
        .maybeSingle()
      
      if (existingEntryByEmail) {
        return NextResponse.json({
          success: false,
          error: '이미 등록된 이메일입니다.',
          alreadySubmitted: true,
          survey_no: existingEntryByEmail.survey_no,
          code6: existingEntryByEmail.code6,
        }, { status: 400 })
      }
    }
    
    // 전화번호 기반 중복 체크 (이메일이 없는 경우 대비)
    const { data: existingEntry } = await admin
      .from('event_survey_entries')
      .select('survey_no, code6')
      .eq('campaign_id', campaignId)
      .eq('phone_norm', phoneNorm)
      .maybeSingle()
    
    if (existingEntry) {
      // 이메일이 없고 전화번호만 있는 경우에만 중복으로 처리
      if (!registration_data?.email) {
        return NextResponse.json({
          success: true,
          alreadySubmitted: true,
          survey_no: existingEntry.survey_no,
          code6: existingEntry.code6,
          message: '이미 등록하셨습니다.',
        })
      }
      // 이메일이 있는 경우는 위에서 이미 체크했으므로 계속 진행
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
                      nickname: name ? name.trim() || null : null,
                      registered_via: 'manual', // 등록 페이지를 통한 등록은 'manual'로 처리 (DB 제약: 'email', 'manual', 'invite'만 허용)
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
      // 정규화 (빈 문자열도 유지 - 필수 필드일 수 있음)
      const cleanedData: Record<string, any> = {}
      for (const [key, value] of Object.entries(normalizedRegistrationData)) {
        // null과 undefined만 제거, 빈 문자열은 유지 (필수 필드일 수 있음)
        if (value !== null && value !== undefined) {
          // 문자열인 경우 trim만 수행
          if (typeof value === 'string') {
            cleanedData[key] = value.trim()
          } else {
            cleanedData[key] = value
          }
        }
      }
      
      // 이메일 소문자 정규화
      if (cleanedData.email) {
        cleanedData.email = cleanedData.email.trim().toLowerCase()
      }
      
      normalizedRegistrationData = Object.keys(cleanedData).length > 0 ? cleanedData : null
    }
    
    // CID를 registration_data에 추가 (복원된 CID가 있을 때만)
    if (finalCid && normalizedRegistrationData) {
      normalizedRegistrationData.cid = finalCid
    } else if (finalCid && !normalizedRegistrationData) {
      // registration_data가 없으면 새로 생성
      normalizedRegistrationData = { cid: finalCid }
    }
    
    // 디버깅: registration_data 확인
    console.log('[register] registration_data:', JSON.stringify(normalizedRegistrationData, null, 2))
    console.log('[register] CID 저장:', finalCid || '없음')
    
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
        // untracked_reason 저장 (선택적, 추적 실패 이유)
        ...(restoredTracking.untracked_reason ? { 
          // untracked_reason은 추후 tracking_snapshot에 저장될 예정
        } : {}),
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
        const { data: visitUpdate, error: visitUpdateError } = await admin
          .from('event_access_logs')
          .update({
            converted_at: new Date().toISOString(),
            entry_id: entry.id,
          })
          .eq('campaign_id', campaignId)
          .eq('session_id', session_id)
          .is('converted_at', null) // 아직 전환되지 않은 것만
          .select('id')
        
        // Visit이 없거나 연결 실패한 경우 경고 로그
        if (visitUpdateError || !visitUpdate || visitUpdate.length === 0) {
          console.warn('[VisitMissingOnConvert]', JSON.stringify({
            campaignId,
            sessionId: session_id,
            entryId: entry.id,
            reason: visitUpdateError ? 'VISIT_UPDATE_FAILED' : 'VISIT_NOT_FOUND',
            error: visitUpdateError?.message || null,
            timestamp: new Date().toISOString()
          }))
        }
      } catch (visitError: any) {
        // Visit 연결 실패는 경고만 하고 등록은 성공으로 처리
        console.warn('[VisitMissingOnConvert]', JSON.stringify({
          campaignId,
          sessionId: session_id,
          entryId: entry?.id,
          reason: 'VISIT_CONNECTION_EXCEPTION',
          error: visitError.message,
          timestamp: new Date().toISOString()
        }))
      }
    } else if (!session_id && entry?.id) {
      // session_id가 없어서 Visit 연결이 불가능한 경우 (정상 케이스일 수 있음)
      console.warn('[VisitMissingOnConvert]', JSON.stringify({
        campaignId,
        sessionId: null,
        entryId: entry.id,
        reason: 'NO_SESSION_ID',
        timestamp: new Date().toISOString()
      }))
    }
    
    console.log('[register] 등록 성공:', { 
      survey_no: entry?.survey_no, 
      code6: entry?.code6,
      email: normalizedRegistrationData?.email,
      utm_source: normalizedUTM.utm_source || null,
      utm_medium: normalizedUTM.utm_medium || null,
      marketing_campaign_link_id: resolvedMarketingCampaignLinkId,
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
                    registered_via: 'manual', // 등록 페이지를 통한 등록은 'manual'로 처리 (DB 제약: 'email', 'manual', 'invite'만 허용)
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
