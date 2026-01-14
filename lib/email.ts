import nodemailer from 'nodemailer'
import { createAdminSupabase } from './supabase/admin'

/**
 * 이메일 발송을 위한 transporter 생성
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
  const smtpUser = process.env.SMTP_USER || 'admin@modoolecture.com'
  // 환경 변수에서 따옴표 제거 (있을 경우)
  const smtpPass = process.env.SMTP_PASS?.replace(/^["']|["']$/g, '')

  if (!smtpPass) {
    console.warn('SMTP_PASS 환경 변수가 설정되지 않았습니다. 이메일 발송이 불가능합니다.')
    return null
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465 포트는 TLS 사용
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
}

/**
 * 웨비나 등록 확인 이메일 발송
 * @param webinarIdOrSlug - 웨비나 ID (UUID) 또는 slug
 */
export async function sendWebinarRegistrationEmail(
  to: string,
  displayName: string,
  webinarTitle: string,
  webinarIdOrSlug: string,
  startTime?: string | null
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    if (!transporter) {
      console.error('이메일 transporter 생성 실패')
      return false
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    
    // 웨비나 ID 확인 (UUID인지 slug인지 판별)
    const admin = createAdminSupabase()
    let webinarId: string
    let webinarSlug: string | null = null
    
    // UUID 형식인지 확인 (8-4-4-4-12 형식)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(webinarIdOrSlug)) {
      webinarId = webinarIdOrSlug
      // UUID인 경우 slug 조회
      const { data: webinar } = await admin
        .from('webinars')
        .select('slug')
        .eq('id', webinarId)
        .single()
      webinarSlug = webinar?.slug || null
    } else {
      // slug인 경우 웨비나 정보 조회
      const { data: webinar } = await admin
        .from('webinars')
        .select('id, slug')
        .eq('slug', webinarIdOrSlug)
        .single()
      
      if (!webinar) {
        console.error('웨비나를 찾을 수 없습니다:', webinarIdOrSlug)
        return false
      }
      webinarId = webinar.id
      webinarSlug = webinar.slug
    }
    
    // slug가 있으면 slug를 사용하고, 없으면 UUID 사용 (입장 페이지로 이동, 이메일 파라미터 포함)
    const webinarPath = webinarSlug || webinarId
    const entryUrl = `${baseUrl}/webinar/${webinarPath}?email=${encodeURIComponent(to)}`
    
    // 웨비나 설정에서 이메일 템플릿 및 썸네일 조회
    const { data: webinarSettings } = await admin
      .from('webinars')
      .select('email_template_text, email_thumbnail_url, start_time')
      .eq('id', webinarId)
      .single()
    
    // 썸네일 이미지 URL (설정된 것이 있으면 사용, 없으면 기본값)
    const thumbnailUrl = webinarSettings?.email_thumbnail_url || 
      `${supabaseUrl}/storage/v1/object/public/webinar-thumbnails/0114.jpg`
    
    // 날짜/시간 포맷팅
    let formattedDateTime = '2026.1.14일 7시'
    if (webinarSettings?.start_time) {
      const startDate = new Date(webinarSettings.start_time)
      const year = startDate.getFullYear()
      const month = startDate.getMonth() + 1
      const day = startDate.getDate()
      const hours = startDate.getHours()
      formattedDateTime = `${year}.${month}.${day}일 ${hours}시`
    } else if (startTime) {
      const startDate = new Date(startTime)
      const year = startDate.getFullYear()
      const month = startDate.getMonth() + 1
      const day = startDate.getDate()
      const hours = startDate.getHours()
      formattedDateTime = `${year}.${month}.${day}일 ${hours}시`
    }
    
    // 이메일 템플릿 문구 (설정된 것이 있으면 사용, 없으면 기본값)
    // 특정 웨비나(884372)에 대한 커스텀 템플릿
    let emailTemplate: string
    if (webinarSettings?.email_template_text) {
      emailTemplate = webinarSettings.email_template_text
    } else if (webinarSlug === '884372' || webinarId === '1a1eb091-290b-4451-8f74-62cb47ac37ea') {
      // 884372 웨비나의 커스텀 템플릿
      emailTemplate = `모두의 특강

${webinarTitle}

에 신청해주셔서 감사합니다

해당 라이브는

2026.1.14일 19시에 시작합니다

해당링크를 눌러 접속하시면됩니다`
    } else {
      // 기본 템플릿
      emailTemplate = `모두의 특강

${webinarTitle}

에 신청해주셔서 감사합니다

해당 라이브는

${formattedDateTime}에 시작합니다

해당링크를 눌러 접속하시면됩니다`
    }

    const mailOptions = {
      from: `"모두의특강" <${process.env.SMTP_USER || 'admin@modoolecture.com'}>`,
      to,
      subject: `[모두의특강] 웨비나 등록이 완료되었습니다: ${webinarTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; font-weight: 600; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>웨비나 등록 완료</h1>
            </div>
            <div class="content">
              ${thumbnailUrl ? `
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${thumbnailUrl}" alt="${webinarTitle}" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" />
              </div>
              ` : ''}
              
              <div style="margin: 30px 0;">
                ${emailTemplate.split('\n').map((line: string, index: number, lines: string[]) => {
                  const trimmedLine = line.trim()
                  if (!trimmedLine) return '<br />'
                  
                  // 첫 번째 줄 (모두의 특강)
                  if (index === 0 || (index === 1 && lines[0].trim() === '')) {
                    return `<p style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 15px;">${trimmedLine}</p>`
                  }
                  
                  // 웨비나 제목 (두 번째 또는 세 번째 줄)
                  if (trimmedLine === webinarTitle || (index === 2 && lines[1].trim() === webinarTitle)) {
                    return `<p style="font-size: 20px; font-weight: 700; color: #4b5563; margin-bottom: 20px; line-height: 1.5;">${trimmedLine}</p>`
                  }
                  
                  // 시작 시간이 포함된 줄
                  if (trimmedLine.includes('시작합니다') || trimmedLine.includes('시에')) {
                    return `<p style="font-size: 16px; color: #374151; line-height: 1.8; margin-bottom: 20px; font-weight: 600;">${trimmedLine}</p>`
                  }
                  
                  // 접속 관련 줄
                  if (trimmedLine.includes('접속') || trimmedLine.includes('링크')) {
                    return `<p style="font-size: 16px; color: #374151; line-height: 1.8; margin-bottom: 30px;">${trimmedLine}</p>`
                  }
                  
                  // 일반 텍스트
                  return `<p style="font-size: 16px; color: #374151; line-height: 1.8; margin-bottom: 10px;">${trimmedLine}</p>`
                }).join('')}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${entryUrl}" style="display: inline-block; background-color: #667eea; color: #ffffff !important; font-weight: 700; font-size: 16px; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); text-align: center; min-width: 200px;">웨비나 입장하기</a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
                또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
                <a href="${entryUrl}" style="color: #667eea; word-break: break-all;">${entryUrl}</a>
              </p>
              
              <p style="margin-top: 40px; font-size: 16px; color: #374151; text-align: center;">감사합니다</p>
            </div>
            <div class="footer">
              <p>본 이메일은 모두의특강 웨비나 등록 확인을 위해 발송되었습니다.</p>
              <p>(주)유스튜디오 | 모두의특강</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${emailTemplate}

${entryUrl}

감사합니다`.trim(),
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('이메일 발송 성공:', info.messageId)
    return true
  } catch (error) {
    console.error('이메일 발송 실패:', error)
    return false
  }
}

