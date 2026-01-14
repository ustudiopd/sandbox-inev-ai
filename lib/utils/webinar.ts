/**
 * UUID 형식인지 확인
 * UUID는 8-4-4-4-12 형식 (36자, 하이픈 포함)
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * 웨비나 ID 또는 slug로 웨비나 조회
 * UUID인지 slug인지 자동 판별
 */
export function getWebinarQuery(idOrSlug: string) {
  if (isUUID(idOrSlug)) {
    return { column: 'id', value: idOrSlug }
  } else {
    // URL 인코딩된 slug를 디코딩
    // 숫자 문자열(6자리 slug)은 디코딩 불필요하지만 시도해도 안전
    try {
      const decoded = decodeURIComponent(idOrSlug)
      // 디코딩 결과가 원본과 같으면(인코딩되지 않은 경우) 원본 사용
      // 숫자 문자열은 항상 원본과 같음
      return { column: 'slug', value: decoded }
    } catch {
      // 디코딩 실패 시 원본 사용
      return { column: 'slug', value: idOrSlug }
    }
  }
}

