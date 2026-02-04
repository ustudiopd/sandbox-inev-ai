import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/email/resend'
import { markdownToHtml, markdownToText } from '@/lib/email/markdown-to-html'
import { processTemplate } from '@/lib/email/template-processor'
import { getCampaignEmailPolicy } from '@/lib/email/send-campaign'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/client/emails/[id]/test-send
 * 지원하지 않는 메서드
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  )
}

/**
 * POST /api/client/emails/[id]/test-send
 * 테스트 이메일 발송
 * 
 * ⚠️ 중요: Vercel 프로덕션 호환을 위해 params를 일반 객체로 처리
 * Next.js 16 타입 정의는 Promise를 요구하지만, 실제 Vercel 런타임에서는 일반 객체로 전달됨
 */
// @ts-expect-error - Vercel 프로덕션 호환: 런타임에서는 일반 객체로 전달됨
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: campaignId } = params
    const body = await req.json()
    const { testEmails } = body

    if (!testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'testEmails 배열이 필요합니다' },
        { status: 400 }
      )
    }

    if (testEmails.length > 10) {
      return NextResponse.json(
        { success: false, error: '테스트 이메일은 최대 10개까지 가능합니다' },
        { status: 400 }
      )
    }

    const admin = createAdminSupabase()

    // 캠페인 조회 (IDOR 방지)
    const { data: campaign, error: campaignError } = await admin
      .from('email_campaigns')
      .select('id, client_id, status, subject, body_md, variables_json, audience_query_json, from_domain, from_localpart, from_name, reply_to, header_image_url, footer_text')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인
    const { user } = await requireClientMember(campaign.client_id, ['owner', 'admin', 'operator'])

    // ready 상태에서만 테스트 발송 가능
    if (campaign.status !== 'ready') {
      return NextResponse.json(
        { success: false, error: `${campaign.status} 상태에서는 테스트 발송할 수 없습니다` },
        { status: 400 }
      )
    }

    // 발송 정책 조회
    const emailPolicy = await getCampaignEmailPolicy(campaign.client_id, {
      from_domain: campaign.from_domain,
      from_localpart: campaign.from_localpart,
      from_name: campaign.from_name,
      reply_to: campaign.reply_to,
    })

    // 템플릿 변수 치환
    const variables = (campaign.variables_json || {}) as Record<string, string>
    
    // 테스트 발송 (각 이메일별로 개인화 변수 추가)
    const results = await Promise.allSettled(
      testEmails.map(async (email: string) => {
        // 개인화 변수 추가 (테스트용)
        // 실제 등록 정보에서 이름 찾기
        let recipientName = email.split('@')[0] // 기본값: 이메일 앞부분
        
        // 캠페인의 audience_query_json에서 등록 정보 조회
        const audienceQuery = (campaign.audience_query_json || {}) as any
        const emailLower = email.toLowerCase().trim()
        
        // registration_campaign_registrants 타입인 경우
        if (audienceQuery.type === 'registration_campaign_registrants' && audienceQuery.campaign_id) {
          const { data: entry } = await admin
            .from('event_survey_entries')
            .select('name, registration_data')
            .eq('campaign_id', audienceQuery.campaign_id)
            .eq('registration_data->>email', emailLower)
            .maybeSingle()
          
          if (entry) {
            // name 필드 우선, 없으면 registration_data에서 찾기
            recipientName = entry.name || (entry.registration_data as any)?.firstName || (entry.registration_data as any)?.name || recipientName
          }
        }
        // webinar_registrants 타입인 경우
        else if (audienceQuery.type === 'webinar_registrants' && audienceQuery.webinar_id) {
          const { data: registration } = await admin
            .from('registrations')
            .select('display_name')
            .eq('webinar_id', audienceQuery.webinar_id)
            .eq('email', emailLower)
            .maybeSingle()
          
          if (registration && registration.display_name) {
            recipientName = registration.display_name
          }
        }
        
        const personalizedVariables: Record<string, string> = {
          ...variables,
          email: email,
          recipient_email: email,
          name: recipientName,
          recipient_name: recipientName,
        }
        
        // 입장 링크 생성 (이메일+이름 파라미터 포함) - 실제 발송과 동일한 로직
        const baseEntryUrl = variables.url || variables.entryUrl || ''
        const entryUrl = baseEntryUrl 
          ? `${baseEntryUrl}?name=${encodeURIComponent(recipientName)}&email=${encodeURIComponent(email)}`
          : ''
        
        // entry_url 변수 추가
        if (entryUrl) {
          personalizedVariables.entry_url = entryUrl
        }
        
        const processedSubject = processTemplate(campaign.subject, personalizedVariables)
        const processedBody = processTemplate(campaign.body_md, personalizedVariables)
        
        // 푸터 텍스트 처리 (변수 치환)
        const processedFooter = campaign.footer_text && campaign.footer_text.trim()
          ? processTemplate(campaign.footer_text, personalizedVariables)
          : null

        // 마크다운 → HTML 변환 (헤더 이미지와 푸터 포함)
        const html = markdownToHtml(processedBody, true, campaign.header_image_url, processedFooter)
        const text = markdownToText(processedBody)
        
        return sendEmailViaResend({
          from: emailPolicy.from,
          to: email,
          subject: processedSubject,
          html,
          text,
          replyTo: emailPolicy.replyTo,
        })
      })
    )

    // 결과 분석
    const successfulResults: Array<{ email: string; messageId: string }> = []
    const failedResults: Array<{ email: string; error: string }> = []
    
    results.forEach((result, index) => {
      const email = testEmails[index]
      if (result.status === 'fulfilled') {
        const value = result.value as any
        if (value && value.id) {
          successfulResults.push({ email, messageId: value.id })
        } else if (value && value.error) {
          failedResults.push({ email, error: value.error })
        } else {
          failedResults.push({ email, error: '알 수 없는 오류' })
        }
      } else {
        failedResults.push({ email, error: result.reason?.message || '알 수 없는 오류' })
      }
    })

    const successCount = successfulResults.length
    const failedCount = failedResults.length

    // email_runs에 로그 기록 (서버 전용)
    await admin.from('email_runs').insert({
      email_campaign_id: campaignId,
      run_type: 'test_send',
      status: failedCount === 0 ? 'success' : 'failed',
      provider: 'resend',
      meta_json: {
        total: testEmails.length,
        success: successCount,
        failed: failedCount,
        failed_details: failedResults,
      },
      error: failedCount > 0 ? `${failedCount}개 실패: ${failedResults.map(r => r.error).join(', ')}` : null,
      created_by: user.id,
    })

    // audit_logs 기록
    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      client_id: campaign.client_id,
      action: 'EMAIL_CAMPAIGN_TEST_SEND',
      payload: {
        campaign_id: campaignId,
        test_emails: testEmails,
        success_count: successCount,
        failed_count: failedCount,
        failed_details: failedResults,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        run: {
          status: failedCount === 0 ? 'success' : 'failed',
          meta_json: {
            total: testEmails.length,
            success: successCount,
            failed: failedCount,
          },
          failed_details: failedResults,
        },
      },
    })
  } catch (error: any) {
    console.error('테스트 이메일 발송 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
