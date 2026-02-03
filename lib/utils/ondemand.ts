/**
 * UUID 형식인지 확인
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * 온디맨드 ID 또는 slug로 온디맨드 조회
 * UUID인지 slug인지 자동 판별
 */
export function getOnDemandQuery(idOrSlug: string) {
  if (isUUID(idOrSlug)) {
    return { column: 'id', value: idOrSlug }
  } else {
    // URL 인코딩된 slug를 디코딩
    try {
      const decoded = decodeURIComponent(idOrSlug)
      return { column: 'slug', value: decoded }
    } catch {
      return { column: 'slug', value: idOrSlug }
    }
  }
}
