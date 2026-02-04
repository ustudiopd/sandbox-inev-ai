/**
 * 템플릿 변수 치환 및 HTML escape
 */

/**
 * HTML 특수문자 escape
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * 템플릿 변수 치환
 * @param template 마크다운 템플릿 (예: "{{title}}에 신청해주셔서 감사합니다")
 * @param variables 변수 객체 (예: { title: "웨비나 제목", date: "2026.1.14일" })
 * @returns 치환된 템플릿
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    // HTML escape: 변수 값에 스크립트가 포함될 수 있으므로 escape
    const escapedValue = escapeHtml(value)
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, escapedValue)
  }
  return result
}

/**
 * 웨비나 데이터로부터 템플릿 변수 생성
 */
export function buildWebinarVariables(params: {
  title: string
  startTime?: string | null
  entryUrl: string
  thumbnailUrl?: string | null
}): Record<string, string> {
  const variables: Record<string, string> = {
    title: params.title,
    url: params.entryUrl,
  }

  if (params.startTime) {
    const startDate = new Date(params.startTime)
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

  if (params.thumbnailUrl) {
    variables.thumbnail_url = params.thumbnailUrl
  } else {
    variables.thumbnail_url = ''
  }

  return variables
}
