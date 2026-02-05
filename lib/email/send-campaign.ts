import { createAdminSupabase } from '../supabase/admin'
import { sendEmailViaResend } from './resend'
import { markdownToHtml, markdownToText } from './markdown-to-html'
import { processTemplate } from './template-processor'
import type { AudienceRecipient } from './audience-query'

// 환경변수로 설정 가능 (하드코딩 금지)
// Resend 기본 제한: 초당 2건 → MAX_CONCURRENT 2, 동시 배치 후 1초 대기 권장
const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '50', 10)
const BATCH_DELAY_MS = parseInt(process.env.EMAIL_BATCH_DELAY_MS || '500', 10)
const MAX_CONCURRENT = parseInt(process.env.EMAIL_MAX_CONCURRENT || '2', 10) // Resend 초당 2건 제한
const CONCURRENT_BATCH_DELAY_MS = parseInt(process.env.EMAIL_CONCURRENT_BATCH_DELAY_MS || '1000', 10) // 동시 2건 발송 후 대기(ms)

export interface CampaignEmailData {
  campaignId: string
  subject: string
  bodyMd: string
  variables: Record<string, string>
  from: string // "모두의특강 <notify@eventflow.kr>"
  replyTo?: string
  headerImageUrl?: string | null
  footerText?: string | null
}

interface SendSingleEmailParams {
  campaignId: string
  recipient: AudienceRecipient
  emailData: CampaignEmailData
}

/**
 * 단일 이메일 발송
 */
async function sendSingleEmail(
  params: SendSingleEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { campaignId, recipient, emailData } = params
  const admin = createAdminSupabase()

  // dedupe_key 생성 (캠페인 단위)
  const dedupeKey = `${campaignId}:${recipient.email.toLowerCase()}`

  try {
    // 중복 확인 (이미 발송된 경우 스킵)
    const { data: existingLog } = await admin
      .from('email_send_logs')
      .select('id, status')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle()

    if (existingLog) {
      if (existingLog.status === 'sent') {
        // 이미 발송됨 - 스킵
        return { success: true, messageId: 'duplicate' }
      }
      // failed 상태면 재시도 가능
    }

    // 개인화 변수 추가 (수신자별)
    // displayName이 없으면 등록 정보에서 실제 이름 조회
    let recipientName = recipient.displayName
    if (!recipientName) {
      // 캠페인 정보 조회하여 등록 정보에서 이름 찾기
      const { data: campaign } = await admin
        .from('email_campaigns')
        .select('scope_type, scope_id, audience_query_json')
        .eq('id', campaignId)
        .single()
      
      if (campaign) {
        const audienceQuery = (campaign.audience_query_json || {}) as any
        const emailLower = recipient.email.toLowerCase().trim()
        
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
            recipientName = entry.name || (entry.registration_data as any)?.firstName || (entry.registration_data as any)?.name
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
          
          if (registration) {
            recipientName = registration.display_name || undefined
          }
        }
      }
    }
    
    // 여전히 이름이 없으면 이메일 아이디 사용 (fallback)
    if (!recipientName) {
      recipientName = recipient.email.split('@')[0]
    }
    
    const personalizedVariables: Record<string, string> = {
      ...emailData.variables,
      email: recipient.email,
      recipient_email: recipient.email, // 별칭
      name: recipientName,
      recipient_name: recipientName, // 별칭
    }
    
    // 입장 링크 생성 (이메일+이름 파라미터 포함)
    const baseEntryUrl = emailData.variables.url || emailData.variables.entryUrl || ''
    const entryUrl = baseEntryUrl 
      ? `${baseEntryUrl}?name=${encodeURIComponent(recipientName)}&email=${encodeURIComponent(recipient.email)}`
      : ''
    
    // entry_url 변수 추가
    if (entryUrl) {
      personalizedVariables.entry_url = entryUrl
    }
    
    // 템플릿 변수 치환
    const processedSubject = processTemplate(emailData.subject, personalizedVariables)
    const processedBody = processTemplate(emailData.bodyMd, personalizedVariables)

    // 마크다운 → HTML 변환 (헤더 이미지와 푸터 텍스트 포함)
    const html = markdownToHtml(processedBody, true, emailData.headerImageUrl, emailData.footerText)
    const text = markdownToText(processedBody)

    // 이메일 발송
    const result = await sendEmailViaResend({
      from: emailData.from,
      to: recipient.email,
      subject: processedSubject,
      html,
      text,
      replyTo: emailData.replyTo,
    })

    if (!result || 'error' in result) {
      // 발송 실패 - 로그 기록
      const errorMessage = 'error' in result ? result.error : 'Resend 발송 실패'
      await admin.from('email_send_logs').insert({
        email_campaign_id: campaignId,
        recipient_email: recipient.email,
        status: 'failed',
        error_message: errorMessage,
        dedupe_key: dedupeKey,
      })
      return { success: false, error: errorMessage }
    }

    // 발송 성공 - 로그 기록
    const messageId = 'id' in result ? result.id : ''
    await admin.from('email_send_logs').insert({
      email_campaign_id: campaignId,
      recipient_email: recipient.email,
      status: 'sent',
      provider_message_id: messageId,
      dedupe_key: dedupeKey,
    })

    return { success: true, messageId }
  } catch (error: any) {
    // 예외 발생 - 로그 기록
    try {
      await admin.from('email_send_logs').insert({
        email_campaign_id: campaignId,
        recipient_email: recipient.email,
        status: 'failed',
        error_message: error.message || '알 수 없는 오류',
        dedupe_key: dedupeKey,
      })
    } catch (logError) {
      console.error('발송 로그 기록 실패:', logError)
    }

    return { success: false, error: error.message || '알 수 없는 오류' }
  }
}

/**
 * 배치 발송
 */
export async function sendCampaignBatch(
  campaignId: string,
  recipients: AudienceRecipient[],
  emailData: CampaignEmailData
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)

    // 동시성 제한: MAX_CONCURRENT개씩만 동시 발송 (Resend 초당 2건 제한 준수)
    for (let j = 0; j < batch.length; j += MAX_CONCURRENT) {
      const concurrentBatch = batch.slice(j, j + MAX_CONCURRENT)
      const results = await Promise.allSettled(
        concurrentBatch.map(recipient =>
          sendSingleEmail({
            campaignId,
            recipient,
            emailData,
          })
        )
      )

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          success++
        } else {
          failed++
        }
      })

      // Resend rate limit(초당 2건) 준수를 위해 동시 발송 후 대기
      if (j + MAX_CONCURRENT < batch.length || i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, CONCURRENT_BATCH_DELAY_MS))
      }
    }

    // 배치 간 추가 딜레이
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  return { success, failed }
}

/**
 * 캠페인 발송 정책 조회
 */
export async function getCampaignEmailPolicy(
  clientId: string,
  campaignOverride?: {
    from_domain?: string | null
    from_localpart?: string | null
    from_name?: string | null
    reply_to?: string | null
  }
): Promise<{ from: string; replyTo: string }> {
  const admin = createAdminSupabase()

  // 클라이언트 정책 조회
  const { data: policy } = await admin
    .from('client_email_policies')
    .select('from_domain, from_localpart_default, from_name_default, reply_to_default')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!policy) {
    throw new Error(`클라이언트 ${clientId}의 이메일 정책이 설정되지 않았습니다`)
  }

  // 캠페인 override 우선
  const fromDomain = campaignOverride?.from_domain || policy.from_domain
  const fromLocalpart = campaignOverride?.from_localpart || policy.from_localpart_default
  let fromName = campaignOverride?.from_name || policy.from_name_default || ''
  // 발송자 표시명: 인텔리전트 → 인텔리전스 통일
  if (fromName && fromName.includes('인텔리전트')) {
    fromName = fromName.replace(/인텔리전트/g, '인텔리전스')
  }
  const replyTo = campaignOverride?.reply_to || policy.reply_to_default

  // From 주소 생성: "고객사명" <no-reply@eventflow.kr>
  // 항상 no-reply@eventflow.kr 사용, 표시명은 고객사명만
  const from = `"${fromName}" <no-reply@eventflow.kr>`

  return {
    from,
    replyTo,
  }
}
