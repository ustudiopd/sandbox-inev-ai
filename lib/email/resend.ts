import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey) {
  console.warn('RESEND_API_KEY 환경 변수가 설정되지 않았습니다. 이메일 발송이 불가능합니다.')
}

const resend = resendApiKey ? new Resend(resendApiKey) : null

export interface SendEmailParams {
  from: string // 예: "모두의특강 <notify@eventflow.kr>"
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface SendEmailResult {
  id: string
}

export interface SendEmailError {
  error: string
  details?: any
}

/**
 * Resend를 통한 이메일 발송
 * @param params 이메일 발송 파라미터
 * @returns Resend message ID 또는 오류 정보 (실패 시)
 */
export async function sendEmailViaResend(
  params: SendEmailParams
): Promise<SendEmailResult | SendEmailError> {
  if (!resend) {
    const errorMsg = 'Resend 클라이언트가 초기화되지 않았습니다. RESEND_API_KEY를 확인하세요.'
    console.error(errorMsg)
    return { error: errorMsg }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    })

    if (error) {
      const errorMsg = error.message || JSON.stringify(error)
      console.error('Resend 발송 실패:', error)
      return { error: errorMsg, details: error }
    }

    if (!data?.id) {
      const errorMsg = 'Resend 응답에 message ID가 없습니다'
      console.error(errorMsg, data)
      return { error: errorMsg, details: data }
    }

    return { id: data.id }
  } catch (error: any) {
    const errorMsg = error.message || '알 수 없는 오류'
    console.error('Resend 발송 예외:', error)
    return { error: errorMsg, details: error }
  }
}
