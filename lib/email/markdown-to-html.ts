import { marked, Renderer } from 'marked'
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
  // <br> 태그는 보존하여 줄바꿈이 유지되도록 함
  
  // 먼저 코드 블록과 인라인 코드, <br> 태그를 임시로 마스킹
  const codeBlocks: string[] = []
  let maskedHtml = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  maskedHtml = maskedHtml.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // <br> 태그도 마스킹하여 보호
  const brTags: string[] = []
  maskedHtml = maskedHtml.replace(/<br\s*\/?>/gi, (match) => {
    brTags.push(match)
    return `__BR_TAG_${brTags.length - 1}__`
  })
  
  // HTML 태그를 제외한 텍스트 영역에서 연속된 공백 처리
  // 방법: 태그 사이의 텍스트를 찾아서 공백 변환
  // > 기호가 텍스트에 포함되어 있으면 제거
  maskedHtml = maskedHtml.replace(/(>)([^<]+?)(<)/g, (match, before, text, after) => {
    // 텍스트에서 > 기호 제거
    let cleanedText = text.replace(/>/g, '').replace(/&gt;/g, '')
    
    // 이미 &nbsp;가 포함된 경우는 제외 (중복 변환 방지)
    if (cleanedText.includes('&nbsp;')) {
      return before + cleanedText + after
    }
    
    // 연속된 공백 2개 이상을 &nbsp;로 변환
    // 단, 줄바꿈 문자는 제외
    const preserved = cleanedText.replace(/[ \t]{2,}/g, (spaces: string) => {
      return '&nbsp;'.repeat(spaces.length)
    })
    return before + preserved + after
  })
  
  // 마지막 태그 뒤의 텍스트도 처리 (문서 끝 부분)
  maskedHtml = maskedHtml.replace(/(>)([^<]+?)$/g, (match, before, text) => {
    // 텍스트에서 > 기호 제거
    let cleanedText = text.replace(/>/g, '').replace(/&gt;/g, '')
    
    if (cleanedText.includes('&nbsp;')) {
      return before + cleanedText
    }
    const preserved = cleanedText.replace(/[ \t]{2,}/g, (spaces: string) => {
      return '&nbsp;'.repeat(spaces.length)
    })
    return before + preserved
  })
  
  // <br> 태그 복원
  brTags.forEach((br, index) => {
    maskedHtml = maskedHtml.replace(`__BR_TAG_${index}__`, br)
  })
  
  // 마스킹된 코드 블록 복원
  codeBlocks.forEach((code, index) => {
    maskedHtml = maskedHtml.replace(`__CODE_BLOCK_${index}__`, code)
  })
  
  return maskedHtml
}

/**
 * - 텍스트 - 형식과 > 기호를 마크다운 변환에서 보호
 * @param markdown 마크다운 텍스트
 * @returns 보호된 마크다운 텍스트
 */
function protectDashText(markdown: string): { protected: string; replacements: string[] } {
  const replacements: string[] = []
  let protectedMarkdown = markdown
  
  // - 텍스트 - 패턴 찾기 (줄 시작에 - 가 있고, 같은 줄에 - 로 끝나는 경우)
  // 단, 코드 블록 내부는 제외
  const codeBlocks: string[] = []
  protectedMarkdown = protectedMarkdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  protectedMarkdown = protectedMarkdown.replace(/`[^`]+`/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // > 기호로 시작하는 모든 줄을 먼저 제거 (인용구로 변환되지 않도록)
  // > 텍스트 형식과 > 만 있는 줄 모두 처리
  // 줄 단위로 처리하여 정확하게 매칭
  // placeholder로 교체하지 않고 아예 제거
  protectedMarkdown = protectedMarkdown.replace(/^>(.*)$/gm, (match, content) => {
    // > 기호와 그 뒤의 내용을 모두 제거 (빈 줄로 대체)
    return ''
  })
  
  // - 텍스트 - 패턴 보호 (줄 시작의 - 텍스트 - 형식)
  // 이 패턴은 불릿 리스트로 변환되지 않도록 보호
  // > 기호 제거 후에 처리하여, 보호된 텍스트에 > 기호가 포함되지 않도록 함
  protectedMarkdown = protectedMarkdown.replace(/^- (.+?) -$/gm, (match, text) => {
    // 보호된 텍스트에서 > 기호가 포함되어 있으면 제거
    const cleanedMatch = match.replace(/>/g, '')
    const placeholder = `__DASH_TEXT_${replacements.length}__`
    replacements.push(cleanedMatch) // > 기호가 제거된 텍스트만 저장
    return placeholder
  })
  
  // 코드 블록 복원
  codeBlocks.forEach((code, index) => {
    protectedMarkdown = protectedMarkdown.replace(`__CODE_BLOCK_${index}__`, code)
  })
  
  // 코드 블록 복원 후에도 > 기호가 다시 나타날 수 있으므로 한 번 더 제거
  protectedMarkdown = protectedMarkdown.replace(/^>(.*)$/gm, '')
  
  return { protected: protectedMarkdown, replacements }
}

/**
 * 보호된 텍스트를 원래대로 복원
 * @param html HTML 문자열
 * @param replacements 원래 텍스트 배열
 * @returns 복원된 HTML 문자열
 */
function restoreDashText(html: string, replacements: string[]): string {
  let restored = html
  
  // replacements 배열을 역순으로 처리하여 인덱스 충돌 방지
  for (let index = replacements.length - 1; index >= 0; index--) {
    const original = replacements[index]
    
    // - 텍스트 - 패턴인지 일반 불릿 리스트인지 확인
    // > 기호는 이미 protectDashText에서 제거되었으므로 여기서는 처리하지 않음
    const isDashPattern = original.startsWith('- ') && original.endsWith(' -')
    const isBulletPattern = original.startsWith('- ') && !original.endsWith(' -')
    
    let placeholder = ''
    if (isDashPattern) {
      placeholder = `__DASH_TEXT_${index}__`
    } else if (isBulletPattern) {
      placeholder = `__BULLET_${index}__`
    } else {
      continue // 알 수 없는 패턴은 건너뛰기
    }
    
    // 원래 텍스트를 HTML 이스케이프 처리
    // > 기호는 복원 시에도 제거하여 이메일에 나타나지 않도록 함
    let escaped = original
      .replace(/>/g, '') // > 기호 제거 (복원 시에도 > 기호가 나타나지 않도록)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
    
    // placeholder를 찾아서 복원 (여러 패턴 시도)
    // 1. <p> 태그 내부 (완전히 감싸진 경우)
    restored = restored.replace(new RegExp(`<p([^>]*)>\\s*${placeholder}\\s*</p>`, 'gi'), (match, attrs) => {
      return `<p${attrs}>${escaped}</p>`
    })
    // 2. <p> 태그 시작 부분
    restored = restored.replace(new RegExp(`<p([^>]*)>\\s*${placeholder}`, 'gi'), (match, attrs) => {
      return `<p${attrs}>${escaped}`
    })
    // 3. <p> 태그 끝 부분
    restored = restored.replace(new RegExp(`${placeholder}\\s*</p>`, 'gi'), `${escaped}</p>`)
    // 4. blockquote 내부 (blockquote가 아직 남아있을 수 있음)
    restored = restored.replace(new RegExp(`<blockquote[^>]*>\\s*${placeholder}\\s*</blockquote>`, 'gi'), escaped)
    // 5. 그 외 모든 경우
    restored = restored.replace(new RegExp(placeholder, 'g'), escaped)
  }
  
  // 마지막으로 남아있는 blockquote 태그 제거 (복원 후에도 남아있을 수 있음)
  restored = restored.replace(/<blockquote[^>]*>/gi, '')
  restored = restored.replace(/<\/blockquote>/gi, '')
  
  return restored
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
 * 불릿 리스트와 번호 리스트에 이메일 호환 스타일 추가
 * 불릿 리스트는 점 대신 - 기호 사용
 * @param html HTML 문자열
 * @returns 스타일이 적용된 HTML 문자열
 */
function addListStyles(html: string): string {
  let styledHtml = html
  
  // <ul> 태그에 스타일 추가 (list-style-type: none으로 설정하고 - 기호를 직접 추가)
  styledHtml = styledHtml.replace(/<ul(?![^>]*style=)/gi, (match) => {
    return '<ul style="margin: 10px 0; padding-left: 20px; list-style-type: none;">'
  })
  
  // <ul> 내부의 <li> 태그에 - 기호 추가 (이미 - 로 시작하지 않는 경우만)
  // <li> 태그와 그 내용을 함께 확인하여 처리
  styledHtml = styledHtml.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (ulMatch, content) => {
    // <ul> 태그를 찾아서 스타일 적용
    const ulTag = ulMatch.match(/<ul[^>]*>/i)?.[0] || '<ul>'
    const styledUlTag = ulTag.replace(/<ul(?![^>]*style=)/i, '<ul style="margin: 10px 0; padding-left: 20px; list-style-type: none;"')
    
    // <li> 태그들을 처리
    let processedContent = content.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (liMatch: string, attrs: string, liContent: string) => {
      // liContent의 시작 부분에 공백/줄바꿈 제거 후 확인
      // HTML 태그를 제거하고 텍스트만 확인
      const textOnly = liContent.replace(/<[^>]+>/g, '').trim()
      
      // 이미 - 로 시작하는지 확인 (HTML 이스케이프된 경우도 고려)
      const startsWithDash = textOnly.startsWith('- ') || 
                            textOnly.startsWith('&minus; ') ||
                            textOnly.startsWith('&#45; ') ||
                            liContent.trim().startsWith('- ')
      
      // style 속성 처리
      let styleAttr = ''
      if (attrs.includes('style=')) {
        styleAttr = attrs
      } else {
        styleAttr = `${attrs} style="margin: 5px 0; padding-left: 5px; line-height: 1.6;"`
      }
      
      // - 로 시작하지 않으면 - 추가
      if (!startsWithDash) {
        return `<li${styleAttr}>- ${liContent}</li>`
      } else {
        // 이미 - 로 시작하면 그대로 유지
        return `<li${styleAttr}>${liContent}</li>`
      }
    })
    
    return `${styledUlTag}${processedContent}</ul>`
  })
  
  // <ol> 태그에 스타일 추가
  styledHtml = styledHtml.replace(/<ol(?![^>]*style=)/gi, (match) => {
    return '<ol style="margin: 10px 0; padding-left: 20px; list-style-type: decimal;">'
  })
  
  // <ol> 내부의 <li> 태그에 스타일 추가
  styledHtml = styledHtml.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (olMatch, content) => {
    const olTag = olMatch.match(/<ol[^>]*>/i)?.[0] || '<ol>'
    const styledOlTag = olTag.replace(/<ol(?![^>]*style=)/i, '<ol style="margin: 10px 0; padding-left: 20px; list-style-type: decimal;"')
    
    const processedContent = content.replace(/<li([^>]*)>/gi, (match: string, attrs: string) => {
      if (attrs.includes('style=')) {
        return match
      } else {
        return `<li${attrs} style="margin: 5px 0; padding-left: 5px; line-height: 1.6;">`
      }
    })
    
    return `${styledOlTag}${processedContent}</ol>`
  })
  
  return styledHtml
}

/**
 * 링크를 버튼 스타일로 변환
 * @param html HTML 문자열
 * @returns 버튼 스타일이 적용된 HTML 문자열
 */
function convertLinksToButtons(html: string): string {
  // <a> 태그를 버튼 스타일로 변환
  // 단, 이미 버튼 스타일이 적용된 링크는 제외
  // 불릿 리스트(<li>) 내부의 링크는 버튼으로 변환하지 않음
  // 더 정확한 정규식: href 속성과 텍스트 내용을 모두 캡처
  
  // 먼저 불릿 리스트를 마스킹하여 내부 링크를 보호
  const listBlocks: string[] = []
  let maskedHtml = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    listBlocks.push(match)
    return `__LIST_BLOCK_${listBlocks.length - 1}__`
  })
  
  maskedHtml = maskedHtml.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    listBlocks.push(match)
    return `__LIST_BLOCK_${listBlocks.length - 1}__`
  })
  
  // 불릿 리스트 외부의 링크만 버튼으로 변환
  maskedHtml = maskedHtml.replace(
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
      // > 기호는 이스케이프하지 않음 (이메일에서 > 기호가 나타나는 문제 방지)
      // < 기호만 이스케이프하여 XSS 방지
      const escapedText = textOnly.replace(/</g, '&lt;')
      
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
  
  // 불릿 리스트 복원
  listBlocks.forEach((list, index) => {
    maskedHtml = maskedHtml.replace(`__LIST_BLOCK_${index}__`, list)
  })
  
  return maskedHtml
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
  // 1. - 텍스트 - 형식을 불릿 리스트로 변환되지 않도록 보호
  const { protected: protectedMarkdown, replacements } = protectDashText(markdown)
  
  // 2. 밑줄 문법(__텍스트__)을 <u> 태그로 변환
  const markdownWithUnderline = convertUnderline(protectedMarkdown)
  
  // 3. 마크다운 → HTML 변환
  // breaks: true로 설정하면 단일 줄바꿈도 <br>로 변환됨
  // blockquote 렌더러를 비활성화하여 > 기호가 blockquote로 변환되지 않도록 함
  const renderer = new Renderer()
  renderer.blockquote = ({ tokens }: any) => {
    // blockquote를 생성하지 않고 내용만 반환 (이메일에서는 blockquote가 필요 없음)
    // tokens를 HTML로 변환하지 않고 빈 문자열 반환
    return ''
  }
  
  const htmlBody = marked(markdownWithUnderline, {
    breaks: true, // 줄바꿈을 <br>로 변환
    gfm: true, // GitHub Flavored Markdown 지원
    renderer: renderer, // 커스텀 렌더러 사용
  }) as string

  // 4. XSS 방지: HTML sanitization (sanitize-html 사용, jsdom 의존성 없음)
  // blockquote 태그는 허용하지 않음 (이메일에서는 필요 없고, > 기호 문제를 방지하기 위함)
  const sanitizedHtml = sanitizeHtml(htmlBody, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'code', 'pre'
      // 'blockquote' 제거 - 이메일에서는 필요 없음
    ],
    allowedAttributes: {
      '*': ['href', 'src', 'alt', 'title', 'class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
  
  // sanitizeHtml이 텍스트 노드의 > 기호를 &gt;로 이스케이프할 수 있으므로 제거
  // HTML 태그 내부의 > 기호는 제거하지 않도록 주의
  // 텍스트 노드에서만 &gt; 제거 (태그 사이의 텍스트)
  // 방법: 태그 사이의 텍스트를 찾아서 &gt; 제거
  let sanitizedWithoutGt = sanitizedHtml.replace(/(>)([^<]+?)(<)/g, (match, tagStart, text, tagEnd) => {
    // 태그 사이의 텍스트에서 &gt;와 > 기호 모두 제거
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText + tagEnd
  })
  // 태그 뒤의 텍스트 (문서 끝 부분)
  sanitizedWithoutGt = sanitizedWithoutGt.replace(/(>)([^<]+?)$/g, (match, tagStart, text) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText
  })
  // 태그 앞의 텍스트 (문서 시작 부분)
  sanitizedWithoutGt = sanitizedWithoutGt.replace(/^([^>]+?)(<)/g, (match, text, tagEnd) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return cleanedText + tagEnd
  })
  // 혼자 있는 &gt; 제거 (안전장치)
  sanitizedWithoutGt = sanitizedWithoutGt.replace(/&gt;/g, '')
  
  // 5. 보호된 - 텍스트 - 형식 복원
  // blockquote는 이미 renderer에서 비활성화되고 sanitizeHtml에서도 제거되었으므로
  // 추가적인 blockquote 제거 로직은 불필요하지만, 안전장치로 남겨둠
  let htmlWithRestoredDash = restoreDashText(sanitizedWithoutGt, replacements)
  
  // 안전장치: 혹시 모를 blockquote 태그 제거 (renderer와 sanitizeHtml에서 이미 처리되었지만)
  htmlWithRestoredDash = htmlWithRestoredDash
    .replace(/<blockquote[^>]*>/gi, '')
    .replace(/<\/blockquote>/gi, '')
  
  // 빈 <p> 태그 제거
  htmlWithRestoredDash = htmlWithRestoredDash.replace(/<p[^>]*>\s*<\/p>/gi, '')

  // 6. 불릿 리스트 스타일 추가 (이메일 호환성)
  const htmlWithStyledLists = addListStyles(htmlWithRestoredDash)
  
  // 7. <p> 태그에 줄바꿈 보장 스타일 추가 (이메일 호환성)
  const htmlWithParagraphBreaks = htmlWithStyledLists.replace(/<p(?![^>]*style=)/gi, '<p style="margin: 10px 0; line-height: 1.6;">')

  // 8. 연속된 공백을 &nbsp;로 변환 (띄어쓰기 보존)
  const htmlWithSpaces = preserveSpaces(htmlWithParagraphBreaks)

  // 9. 링크를 버튼 스타일로 변환 (style 속성이 없는 링크만 변환)
  const htmlWithButtons = convertLinksToButtons(htmlWithSpaces)
  
  // 10. 최종 안전장치: 모든 텍스트 노드에서 > 기호와 &gt; 제거
  // HTML 태그 내부의 > 기호는 제거하지 않도록 주의
  // 태그 사이의 텍스트에서만 제거
  let finalHtml = htmlWithButtons.replace(/(>)([^<]+?)(<)/g, (match, tagStart, text, tagEnd) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText + tagEnd
  })
  // 태그 뒤의 텍스트 (문서 끝 부분)
  finalHtml = finalHtml.replace(/(>)([^<]+?)$/g, (match, tagStart, text) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText
  })
  // 혼자 있는 &gt; 제거 (안전장치)
  finalHtml = finalHtml.replace(/&gt;/g, '')

  if (includeTemplate) {
    return wrapEmailTemplate(finalHtml, headerImageUrl, footerText)
  }
  
  return finalHtml
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
  // 푸터에도 - 텍스트 - 및 > 기호 보호 적용
  const { protected: protectedFooterMarkdown, replacements: footerReplacements } = protectDashText(footerTextToUse)
  const footerMarkdownWithUnderline = convertUnderline(protectedFooterMarkdown)
  
  // 푸터에도 동일한 blockquote 비활성화 렌더러 사용
  const footerRenderer = new Renderer()
  footerRenderer.blockquote = ({ tokens }: any) => {
    // blockquote를 생성하지 않고 내용만 반환
    // tokens를 HTML로 변환하지 않고 빈 문자열 반환
    return ''
  }
  
  const footerMarkdown = marked(footerMarkdownWithUnderline, {
    breaks: true,
    gfm: true,
    renderer: footerRenderer, // 커스텀 렌더러 사용
  }) as string
  
  const sanitizedFooter = sanitizeHtml(footerMarkdown, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    // blockquote 태그는 허용하지 않음
    allowedAttributes: {
      '*': ['href', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
  
  // sanitizeHtml이 텍스트 노드의 > 기호를 &gt;로 이스케이프할 수 있으므로 제거
  // 푸터에도 본문과 동일한 로직 적용
  let footerWithoutGt = sanitizedFooter.replace(/(>)([^<]+?)(<)/g, (match, tagStart, text, tagEnd) => {
    // 태그 사이의 텍스트에서 &gt;와 > 기호 모두 제거
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText + tagEnd
  })
  // 태그 뒤의 텍스트 (문서 끝 부분)
  footerWithoutGt = footerWithoutGt.replace(/(>)([^<]+?)$/g, (match, tagStart, text) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText
  })
  // 혼자 있는 &gt; 제거 (안전장치)
  footerWithoutGt = footerWithoutGt.replace(/&gt;/g, '')
  
  // 푸터 보호된 텍스트 복원
  let footerRestored = restoreDashText(footerWithoutGt, footerReplacements)
  
  // 안전장치: 혹시 모를 blockquote 태그 제거
  footerRestored = footerRestored
    .replace(/<blockquote[^>]*>/gi, '')
    .replace(/<\/blockquote>/gi, '')
  
  // 빈 <p> 태그 제거
  footerRestored = footerRestored.replace(/<p[^>]*>\s*<\/p>/gi, '')
  
  // 최종 안전장치: 푸터 텍스트 노드에서 > 기호와 &gt; 제거
  footerRestored = footerRestored.replace(/(>)([^<]+?)(<)/g, (match, tagStart, text, tagEnd) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText + tagEnd
  })
  footerRestored = footerRestored.replace(/(>)([^<]+?)$/g, (match, tagStart, text) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText
  })
  footerRestored = footerRestored.replace(/&gt;/g, '')
  
  // 푸터 불릿 리스트 스타일 추가
  const footerWithStyledLists = addListStyles(footerRestored)
  
  // 푸터에도 공백 보존 적용
  const footerWithSpaces = preserveSpaces(footerWithStyledLists)
  
  // preserveSpaces 후에도 > 기호가 나타날 수 있으므로 다시 제거
  let footerCleaned = footerWithSpaces.replace(/(>)([^<]+?)(<)/g, (match, tagStart, text, tagEnd) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText + tagEnd
  })
  footerCleaned = footerCleaned.replace(/(>)([^<]+?)$/g, (match, tagStart, text) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText
  })
  footerCleaned = footerCleaned.replace(/&gt;/g, '')
  
  // 푸터의 <p> 태그에 인라인 스타일 추가 (왼쪽 정렬)
  const footerWithStyles = footerCleaned
    .replace(/<p(?![^>]*style=)/gi, '<p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #6b7280; text-align: left;">')
    .replace(/<a(?![^>]*style=)/gi, '<a style="color: #00A08C; text-decoration: none;"')
  
  // 최종 안전장치: 스타일 적용 후에도 > 기호 제거
  let finalFooterStyles = footerWithStyles.replace(/(>)([^<]+?)(<)/g, (match, tagStart, text, tagEnd) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText + tagEnd
  })
  finalFooterStyles = finalFooterStyles.replace(/(>)([^<]+?)$/g, (match, tagStart, text) => {
    const cleanedText = text.replace(/&gt;/g, '').replace(/>/g, '')
    return tagStart + cleanedText
  })
  finalFooterStyles = finalFooterStyles.replace(/&gt;/g, '')
  
  // 푸터를 테이블로 감싸서 왼쪽 정렬
  footerHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <tr>
        <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #6b7280; padding: 10px 0;">
          ${finalFooterStyles}
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
