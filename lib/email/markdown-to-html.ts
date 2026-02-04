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
  return html.replace(
    /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>([^<]+)<\/a>/gi,
    (match, attrs, href, text) => {
      // 이미 style 속성이 있으면 그대로 유지 (중복 변환 방지)
      if (attrs.includes('style=')) {
        return match
      }
      
      // href 이스케이프 처리
      const escapedHref = href.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      
      // 버튼 스타일 적용 (인라인 스타일로 이메일 클라이언트 호환성 보장)
      return `<div style="text-align: center; margin: 20px 0;"><a href="${escapedHref}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; font-weight: 600; font-size: 16px; padding: 14px 32px; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); min-width: 200px;">${escapedText}</a></div>`
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

  // 링크를 버튼 스타일로 변환
  const htmlWithButtons = convertLinksToButtons(sanitizedHtml)

  if (includeTemplate) {
    return wrapEmailTemplate(htmlWithButtons, headerImageUrl, footerText)
  }
  
  return htmlWithButtons
}

/**
 * 이메일 HTML 템플릿으로 감싸기
 */
function wrapEmailTemplate(
  body: string, 
  headerImageUrl?: string | null,
  footerText?: string | null
): string {
  // 헤더 이미지 HTML
  const headerImageHtml = headerImageUrl 
    ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${headerImageUrl}" alt="Header" style="max-width: 100%; height: auto;" /></div>`
    : ''
  
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
  footerHtml = sanitizedFooter
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          font-weight: 600;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        a {
          color: #667eea;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          ${headerImageHtml}
          ${body}
        </div>
        <div class="footer">
          ${footerHtml}
        </div>
      </div>
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
