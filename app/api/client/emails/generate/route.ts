import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { buildWebinarVariables } from '@/lib/email/template-processor'

export const runtime = 'nodejs'

/**
 * POST /api/client/emails/generate
 * 이메일 캠페인 초안 생성
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      clientId,
      scopeType,
      scopeId,
      campaignType,
      scheduledSendAt,
    } = body

    if (!clientId || !scopeType || !scopeId || !campaignType) {
      return NextResponse.json(
        { success: false, error: 'clientId, scopeType, scopeId, campaignType는 필수입니다' },
        { status: 400 }
      )
    }

    // 권한 확인
    const { user } = await requireClientMember(clientId, ['owner', 'admin', 'operator'])

    const admin = createAdminSupabase()

    // 클라이언트 정보 조회 (템플릿에 사용)
    const { data: client } = await admin
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single()

    let clientName = client?.name || 'EventFlow'
    
    // 인텔리전트 → 인텔리전스로 변환 (발송자·제목·본문 등 모든 표기 통일)
    if (clientName.includes('인텔리전트')) {
      clientName = clientName.replace(/인텔리전트/g, '인텔리전스')
    }
    
    // 워트 클라이언트인 경우 기본 헤더 이미지 설정
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
    const isWertClient = clientName.includes('워트') || clientName.includes('모두의특강') || clientName.includes('Wert') || clientName.includes('wert')
    const defaultHeaderImageUrl = isWertClient 
      ? `${baseUrl}/img/wert/thumb_wert1.png`
      : null

    // IDOR 방지: scopeId가 해당 clientId에 속하는지 검증
    if (scopeType === 'webinar') {
      const { data: webinar } = await admin
        .from('webinars')
        .select('id, client_id, title, start_time, slug')
        .eq('id', scopeId)
        .single()

      if (!webinar) {
        return NextResponse.json(
          { success: false, error: '웨비나를 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      if (webinar.client_id !== clientId) {
        return NextResponse.json(
          { success: false, error: '권한이 없습니다' },
          { status: 403 }
        )
      }

      // 템플릿 기반 초안 생성
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
      const webinarPath = webinar.slug || scopeId
      const entryUrl = `${baseUrl}/webinar/${webinarPath}`

      // 변수 생성
      const variables = buildWebinarVariables({
        title: webinar.title || '웨비나',
        startTime: webinar.start_time,
        entryUrl,
        thumbnailUrl: null, // 추후 웨비나 썸네일 조회
      })

      // 기본 템플릿 (campaign_type에 따라 다름)
      let subject = ''
      let bodyMd = ''

      if (campaignType === 'reminder_d1') {
        subject = `[${clientName}] 내일 {{title}}이 시작됩니다`
        bodyMd = `${clientName}

{{title}}

에 신청해주셔서 감사합니다

해당 이벤트는

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      } else if (campaignType === 'reminder_h1') {
        subject = `[${clientName}] 1시간 후 {{title}}이 시작됩니다`
        bodyMd = `${clientName}

{{title}}

이 1시간 후에 시작됩니다

{{datetime}}에 시작합니다

해당링크를 눌러 접속하시면됩니다`
      } else if (campaignType === 'confirmation') {
        subject = `[${clientName}] 웨비나 등록이 완료되었습니다: {{title}}`
        bodyMd = `${clientName}

{{title}}

에 신청해주셔서 감사합니다

해당 이벤트는

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      } else {
        // custom
        subject = `[${clientName}] {{title}}`
        bodyMd = `${clientName}

{{title}}

에 신청해주셔서 감사합니다

해당 이벤트는

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      }

      // 캠페인 생성 (템플릿은 그대로 저장, 변수는 variables_json에만 저장)
      const { data: campaign, error: campaignError } = await admin
        .from('email_campaigns')
        .insert({
          client_id: clientId,
          scope_type: scopeType,
          scope_id: scopeId,
          campaign_type: campaignType,
          status: 'draft',
          subject: subject, // 템플릿 그대로 저장
          body_md: bodyMd, // 템플릿 그대로 저장
          variables_json: variables,
          audience_query_json: {
            type: 'webinar_registrants',
            webinar_id: scopeId,
            exclude_entered: false,
          },
          header_image_url: defaultHeaderImageUrl, // 워트 클라이언트인 경우 기본 헤더 이미지 설정
          scheduled_send_at: scheduledSendAt || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (campaignError) {
        console.error('캠페인 생성 실패:', campaignError)
        return NextResponse.json(
          { success: false, error: campaignError.message },
          { status: 500 }
        )
      }

      // email_runs에 로그 기록 (서버 전용)
      await admin.from('email_runs').insert({
        email_campaign_id: campaign.id,
        run_type: 'generate',
        status: 'success',
        provider: 'resend',
        meta_json: {},
        created_by: user.id,
      })

      // audit_logs 기록
      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        client_id: clientId,
        action: 'EMAIL_CAMPAIGN_GENERATE',
        payload: {
          campaign_id: campaign.id,
          scope_type: scopeType,
          scope_id: scopeId,
          campaign_type: campaignType,
        },
      })

      return NextResponse.json({
        success: true,
        data: { campaign },
      })
    } else if (scopeType === 'registration_campaign') {
      // 등록페이지 캠페인 조회
      const { data: campaignData } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id, title, public_path, type')
        .eq('id', scopeId)
        .eq('type', 'registration')
        .single()

      if (!campaignData) {
        return NextResponse.json(
          { success: false, error: '등록페이지 캠페인을 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      if (campaignData.client_id !== clientId) {
        return NextResponse.json(
          { success: false, error: '권한이 없습니다' },
          { status: 403 }
        )
      }

      // 템플릿 기반 초안 생성
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
      
      // 등록 캠페인과 연동된 웨비나 찾기 (입장 링크용)
      const { data: linkedWebinar } = await admin
        .from('webinars')
        .select('id, slug, start_time')
        .eq('registration_campaign_id', scopeId)
        .maybeSingle()
      
      // 웨비나가 있으면 웨비나 입장 링크, 없으면 등록 페이지 링크 사용
      const entryUrl = linkedWebinar
        ? `${baseUrl}/webinar/${linkedWebinar.slug || linkedWebinar.id}`
        : `${baseUrl}/event${campaignData.public_path}`
      
      // 워트 클라이언트인 경우 기본 헤더 이미지 설정 (위에서 이미 정의됨)

      // 변수 생성 (등록페이지용)
      const variables: Record<string, string> = {
        title: campaignData.title || '이벤트',
        url: entryUrl,
      }
      
      // 웨비나가 있으면 datetime 변수도 추가
      if (linkedWebinar?.start_time) {
        const startDate = new Date(linkedWebinar.start_time)
        const year = startDate.getFullYear()
        const month = startDate.getMonth() + 1
        const day = startDate.getDate()
        const hours = startDate.getHours()
        variables.date = `${year}.${month}.${day}일`
        variables.time = `${hours}시`
        variables.datetime = `${year}.${month}.${day}일 ${hours}시`
      } else {
        variables.date = ''
        variables.time = ''
        variables.datetime = ''
      }

      // 기본 템플릿 (campaign_type에 따라 다름)
      let subject = ''
      let bodyMd = ''

      if (campaignType === 'reminder_d1') {
        subject = `[${clientName}] 내일 {{title}}이 시작됩니다`
        bodyMd = `${clientName}

{{title}}

에 신청해주셔서 감사합니다

해당 이벤트는

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      } else if (campaignType === 'reminder_h1') {
        subject = `[${clientName}] 1시간 후 {{title}}이 시작됩니다`
        bodyMd = `${clientName}

{{title}}

이 1시간 후에 시작됩니다

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      } else if (campaignType === 'confirmation') {
        subject = `[${clientName}] 등록이 완료되었습니다: {{title}}`
        bodyMd = `${clientName}

{{title}}

에 신청해주셔서 감사합니다

해당 이벤트는

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      } else {
        // custom
        subject = `[${clientName}] {{title}}`
        bodyMd = `${clientName}

{{title}}

에 신청해주셔서 감사합니다

해당 이벤트는

{{datetime}}에 시작합니다

[해당링크를 눌러 접속하시면됩니다]({{entry_url}})`
      }

      // 캠페인 생성
      const { data: campaign, error: campaignError } = await admin
        .from('email_campaigns')
        .insert({
          client_id: clientId,
          scope_type: scopeType,
          scope_id: scopeId,
          campaign_type: campaignType,
          status: 'draft',
          subject: subject,
          body_md: bodyMd,
          variables_json: variables,
          audience_query_json: {
            type: 'registration_campaign_registrants',
            campaign_id: scopeId,
            exclude_entered: false,
          },
          header_image_url: defaultHeaderImageUrl, // 워트 클라이언트인 경우 기본 헤더 이미지 설정
          scheduled_send_at: scheduledSendAt || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (campaignError) {
        console.error('캠페인 생성 실패:', campaignError)
        return NextResponse.json(
          { success: false, error: campaignError.message },
          { status: 500 }
        )
      }

      // email_runs에 로그 기록
      await admin.from('email_runs').insert({
        email_campaign_id: campaign.id,
        run_type: 'generate',
        status: 'success',
        provider: 'resend',
        meta_json: {},
        created_by: user.id,
      })

      // audit_logs 기록
      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        client_id: clientId,
        action: 'EMAIL_CAMPAIGN_GENERATE',
        payload: {
          campaign_id: campaign.id,
          scope_type: scopeType,
          scope_id: scopeId,
          campaign_type: campaignType,
        },
      })

      return NextResponse.json({
        success: true,
        data: { campaign },
      })
    } else {
      return NextResponse.json(
        { success: false, error: `지원되지 않는 scopeType: ${scopeType}` },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('이메일 캠페인 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
