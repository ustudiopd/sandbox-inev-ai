/**
 * UTM 파라미터 관련 유틸리티 함수
 * 
 * 광고/캠페인 모듈에서 UTM 파라미터를 추출, 정규화, URL에 추가하는 기능 제공
 */

/**
 * UTM 파라미터 추출
 * 
 * @param searchParams - URLSearchParams 또는 Record<string, string | string[] | undefined>
 * @returns UTM 파라미터만 포함된 객체
 */
export function extractUTMParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string> {
  const utmParams: Record<string, string> = {}
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  
  utmKeys.forEach(key => {
    let value: string | null = null
    
    if (searchParams instanceof URLSearchParams) {
      value = searchParams.get(key)
    } else {
      const paramValue = searchParams[key]
      if (paramValue) {
        value = Array.isArray(paramValue) ? paramValue[0] : paramValue
      }
    }
    
    if (value && typeof value === 'string' && value.trim()) {
      utmParams[key] = value.trim()
    }
  })
  
  return utmParams
}

/**
 * UTM 파라미터를 정규화 (trim + lowercase + length 제한)
 * 
 * @param utmParams - UTM 파라미터 객체
 * @returns 정규화된 UTM 파라미터 객체
 */
export function normalizeUTM(
  utmParams: Record<string, string | null | undefined>
): Record<string, string | null> {
  const normalized: Record<string, string | null> = {}
  const maxLength = 200
  
  Object.entries(utmParams).forEach(([key, value]) => {
    if (!value || typeof value !== 'string') {
      normalized[key] = null
      return
    }
    
    // trim + lowercase
    let normalizedValue = value.trim().toLowerCase()
    
    // 길이 제한
    if (normalizedValue.length > maxLength) {
      normalizedValue = normalizedValue.slice(0, maxLength)
    }
    
    // 빈 문자열은 null로 변환
    normalized[key] = normalizedValue || null
  })
  
  return normalized
}

/**
 * URL에 UTM 파라미터 추가
 * 
 * @param url - 기본 URL
 * @param utmParams - UTM 파라미터 객체
 * @returns UTM 파라미터가 추가된 URL
 */
export function appendUTMToURL(
  url: string,
  utmParams: Record<string, string | null | undefined>
): string {
  if (!utmParams || Object.keys(utmParams).length === 0) {
    return url
  }
  
  // 정규화된 UTM 파라미터만 사용
  const normalized = normalizeUTM(utmParams)
  const queryParams = new URLSearchParams()
  
  Object.entries(normalized).forEach(([key, value]) => {
    if (value) {
      queryParams.set(key, value)
    }
  })
  
  const queryString = queryParams.toString()
  if (!queryString) {
    return url
  }
  
  // URL에 이미 querystring이 있는지 확인
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${queryString}`
}

/**
 * Referrer에서 도메인만 추출
 * 
 * @param referrer - HTTP Referer 헤더 값
 * @returns 도메인만 추출된 문자열 (예: "google.com")
 */
export function extractDomain(referrer: string | null | undefined): string | null {
  if (!referrer) {
    return null
  }
  
  try {
    const url = new URL(referrer)
    return url.hostname
  } catch {
    // URL 파싱 실패 시 원본 반환 (graceful)
    return referrer
  }
}
