import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

// 기본 푸터 텍스트 (마크다운 형식)
const DEFAULT_FOOTER_TEXT = `본 이메일은 워트 웨비나 등록 확인을 위해 발송되었습니다.

워트(WERT)

웨비나와 관련된 문의사항이 있으시면 아래 연락처를 통해 문의주시기 바랍니다.

메일문의: crm@wert.co.kr`

/**
 * 연속된 공백을 &nbsp;로 변환 (띄어쓰기 보존)
 * @param html HTML 문자열
 * @returns 공백이 보존된 HTML 문자열
 */
function preserveSpaces(html: string): string {
  // HTML 태그 내부가 아닌 텍스트 영역에서만 공백 처리
  // 연속된 공백 2개 이상을 &nbsp;로 변환하여 띄어쓰기 보존
  // 단, 코드 블록 내부와 이미 &nbsp;가 있는 경우는 제외
  
  // 먼저 코드 블록과 인라인 코드를 임시로 마스킹
  const codeBlocks: string[] = []
  let maskedHtml = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  maskedHtml = maskedHtml.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // HTML 태그를 제외한 텍스트 영역에서 연속된 공백 처리
  // 방법: 태그 사이의 텍스트를 찾아서 공백 변환
  maskedHtml = maskedHtml.replace(/(>)([^<]+?)(<)/g, (match, before, text, after) => {
    // 이미 &nbsp;가 포함된 경우는 제외 (중복 변환 방지)
    if (text.includes('&nbsp;')) {
      return match
    }
    
    // 연속된 공백 2개 이상을 &nbsp;로 변환
    // 단, 줄바꿈 문자는 제외
    const preserved = text.replace(/[ \t]{2,}/g, (spaces) => {
      return '&nbsp;'.repeat(spaces.length)
    })
    return before + preserved + after
  })
  
  // 마지막 태그 뒤의 텍스트도 처리 (문서 끝 부분)
  maskedHtml = maskedHtml.replace(/(>)([^<]+?)$/g, (match, before, text) => {
    if (text.includes('&nbsp;')) {
      return match
    }
    const preserved = text.replace(/[ \t]{2,}/g, (spaces) => {
      return '&nbsp;'.repeat(spaces.length)
    })
    return before + preserved
  })
  
  // 마스킹된 코드 블록 복원
  codeBlocks.forEach((code, index) => {
    maskedHtml = maskedHtml.replace(`__CODE_BLOCK_${index}__`, code)
  })
  
  return maskedHtml
}

/**
 * 마크다운 밑줄 문법(__텍스트__)을 HTML <u> 태그로 변환
 * @param markdown 마크다운 텍스트
 * @returns 밑줄이 변환된 마크다운 텍스트
 */
function convertUnderline(markdown: string): string {
  // 코드 블록과 인라인 코드를 임시로 마스킹
  const codeBlocks: string[] = []
  let maskedMarkdown = markdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  maskedMarkdown = maskedMarkdown.replace(/`[^`]+`/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // __텍스트__ 형식을 <u>텍스트</u>로 변환
  // 단, 앞뒤에 공백이나 문장 부호가 있어야 함 (단어 경계)
  maskedMarkdown = maskedMarkdown.replace(/(^|[^\w])__(.+?)__([^\w]|$)/g, (match, before, text, after) => {
    return before + '<u>' + text + '</u>' + after
  })
  
  // 마스킹된 코드 블록 복원
  codeBlocks.forEach((code, index) => {
    maskedMarkdown = maskedMarkdown.replace(`__CODE_BLOCK_${index}__`, code)
  })
  
  return maskedMarkdown
}

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
  // 1. 밑줄 문법(__텍스트__)을 <u> 태그로 변환
  const markdownWithUnderline = convertUnderline(markdown)
  
  // 2. 마크다운 → HTML 변환
  const htmlBody = marked(markdownWithUnderline, {
    breaks: true, // 줄바꿈을 <br>로 변환
    gfm: true, // GitHub Flavored Markdown 지원
  }) as string

  // 3. XSS 방지: HTML sanitization (sanitize-html 사용, jsdom 의존성 없음)
  const sanitizedHtml = sanitizeHtml(htmlBody, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'blockquote', 'code', 'pre'
    ],
    allowedAttributes: {
      '*': ['href', 'src', 'alt', 'title', 'class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })

  // 4. 연속된 공백을 &nbsp;로 변환 (띄어쓰기 보존)
  const htmlWithSpaces = preserveSpaces(sanitizedHtml)

  // 5. 링크를 버튼 스타일로 변환 (style 속성이 없는 링크만 변환)
  const htmlWithButtons = convertLinksToButtons(htmlWithSpaces)

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
  const footerMarkdownWithUnderline = convertUnderline(footerTextToUse)
  const footerMarkdown = marked(footerMarkdownWithUnderline, {
    breaks: true,
    gfm: true,
  }) as string
  const sanitizedFooter = sanitizeHtml(footerMarkdown, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    allowedAttributes: {
      '*': ['href', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
  
  // 푸터에도 공백 보존 적용
  const footerWithSpaces = preserveSpaces(sanitizedFooter)
  
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
