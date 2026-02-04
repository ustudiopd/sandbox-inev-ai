import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

// 기본 푸터 텍스트 (마크다운 형식)
const DEFAULT_FOOTER_TEXT = `본 이메일은 워트 웨비나 등록 확인을 위해 발송되었습니다.

워트(WERT)

웨비나와 관련된 문의사항이 있으시면 아래 연락처를 통해 문의주시기 바랍니다.

메일문의: crm@wert.co.kr`

/**
 * 링크를 버튼 스타일로 변환
 * @param html HTML 문자열
 * @returns 버튼 스타일이 적용된 HTML 문자열
 */
function convertLinksToButtons(html: string): string {
  // <a> 태그를 버튼 스타일로 변환
  // 단, 이미 버튼 스타일이 적용된 링크는 제외
  // 더 정확한 정규식: href 속성과 텍스트 내용을 모두 캡처
  return html.replace(
    /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>([^<]*(?:<[^<]+>[^<]*)*)<\/a>/gi,
    (match, attrsBefore, href, attrsAfter, text) => {
      const allAttrs = (attrsBefore + attrsAfter).toLowerCase()
      
      // 이미 style 속성이 있으면 그대로 유지 (중복 변환 방지)
      if (allAttrs.includes('style=')) {
        return match
      }
      
      // href 이스케이프 처리
      const escapedHref = href.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      // 텍스트 내용에서 HTML 태그 제거 (텍스트만 추출)
      const textOnly = text.replace(/<[^>]+>/g, '').trim()
      const escapedText = textOnly.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      
      if (!escapedText) {
        return match // 빈 텍스트면 변환하지 않음
      }
      
      // 버튼 스타일 적용 (테이블 기반, 네이버 메일 호환)
      // 워트 브랜드 컬러: #00A08C 사용
      return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
        <tr>
          <td align="center" style="padding: 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color: #00A08C; padding: 14px 32px; border-radius: 6px;">
                  <a href="${escapedHref}" style="display: inline-block; color: #ffffff !important; font-weight: 600; font-size: 16px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${escapedText}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `
    }
  )
}

/**
 * 마크다운을 HTML로 변환하고 sanitize
 * @param markdown 마크다운 텍스트
 * @param includeTemplate 템플릿으로 감쌀지 여부 (기본값: true)
 * @param headerImageUrl 헤더 이미지 URL (선택)
 * @param footerText 푸터 텍스트 (선택, 마크다운 지원)
 * @returns HTML 문자열
 */
export function markdownToHtml(
  markdown: string, 
  includeTemplate: boolean = true,
  headerImageUrl?: string | null,
  footerText?: string | null
): string {
  // 마크다운 → HTML 변환
  const htmlBody = marked(markdown, {
    breaks: true, // 줄바꿈을 <br>로 변환
    gfm: true, // GitHub Flavored Markdown 지원
  }) as string

  // XSS 방지: HTML sanitization
  const sanitizedHtml = DOMPurify.sanitize(htmlBody, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  })

  // 먼저 링크를 버튼 스타일로 변환 (style 속성이 없는 링크만 변환)
  const htmlWithButtons = convertLinksToButtons(sanitizedHtml)

  // 네이버 메일 호환: 모든 <p> 태그에 인라인 스타일 추가
  const htmlWithStyles = htmlWithButtons
    .replace(/<p>/gi, '<p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">')
    .replace(/<h1>/gi, '<h1 style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1.4;">')
    .replace(/<h2>/gi, '<h2 style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1f2937; line-height: 1.4;">')
    .replace(/<h3>/gi, '<h3 style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #374151; line-height: 1.4;">')
    .replace(/<ul>/gi, '<ul style="margin: 0 0 10px 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">')
    .replace(/<ol>/gi, '<ol style="margin: 0 0 10px 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">')
    .replace(/<li>/gi, '<li style="margin: 0 0 5px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">')
    // 버튼이 아닌 일반 링크에만 기본 스타일 추가
    .replace(/<a(?![^>]*style=)(?![^>]*background-color)/gi, '<a style="color: #00A08C; text-decoration: none;"')

  if (includeTemplate) {
    return wrapEmailTemplate(htmlWithButtons, headerImageUrl, footerText)
  }
  
  return htmlWithButtons
}

/**
 * 이메일 HTML 템플릿으로 감싸기
 * 네이버 메일 호환성을 위해 테이블 기반 레이아웃과 인라인 스타일 사용
 */
function wrapEmailTemplate(
  body: string, 
  headerImageUrl?: string | null,
  footerText?: string | null
): string {
  // 헤더 이미지 HTML (테이블 기반, 중앙 정렬)
  const headerImageHtml = headerImageUrl 
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
      <tr>
        <td align="center" style="padding: 0;">
          <img src="${headerImageUrl}" alt="Header" style="max-width: 100%; height: auto; display: block;" />
        </td>
      </tr>
    </table>
    `
    : ''
  
  // 본문 텍스트를 테이블로 감싸서 중앙 정렬
  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 20px 0;">
          ${body}
        </td>
      </tr>
    </table>
  `
  
  // 푸터 HTML
  let footerHtml = ''
  // footerText가 null이거나 빈 문자열이면 기본 푸터 사용
  const footerTextToUse = (footerText && footerText.trim()) ? footerText : DEFAULT_FOOTER_TEXT
  
  // 푸터 텍스트를 마크다운으로 처리
  const footerMarkdown = marked(footerTextToUse, {
    breaks: true,
    gfm: true,
  }) as string
  const sanitizedFooter = DOMPurify.sanitize(footerMarkdown, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'style'],
    ALLOW_DATA_ATTR: false,
  })
  
  // 푸터의 <p> 태그에 인라인 스타일 추가
  const footerWithStyles = sanitizedFooter
    .replace(/<p>/gi, '<p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #6b7280;">')
    .replace(/<a(?![^>]*style=)/gi, '<a style="color: #00A08C; text-decoration: none;"')
  
  // 푸터를 테이블로 감싸서 중앙 정렬
  footerHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <tr>
        <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #6b7280; padding: 10px 0;">
          ${footerWithStyles}
        </td>
      </tr>
    </table>
  `
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <!--[if mso]>
      <style type="text/css">
        body, table, td, a { font-family: Arial, sans-serif !important; }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; margin: 0 auto;">
              <tr>
                <td style="padding: 30px;">
                  ${headerImageHtml}
                  ${bodyHtml}
                  ${footerHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim()
}

/**
 * 마크다운을 텍스트로 변환 (이메일 텍스트 버전용)
 */
export function markdownToText(markdown: string): string {
  // 간단한 변환: 마크다운 문법 제거
  return markdown
    .replace(/^#+\s+/gm, '') // 헤더 제거
    .replace(/\*\*(.+?)\*\*/g, '$1') // 볼드 제거
    .replace(/\*(.+?)\*/g, '$1') // 이탤릭 제거
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 링크 텍스트만 남기기
    .replace(/`(.+?)`/g, '$1') // 인라인 코드 제거
    .trim()
}
