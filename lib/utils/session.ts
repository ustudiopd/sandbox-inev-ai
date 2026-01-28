/**
 * 세션 관리 유틸리티 함수
 * 
 * Visit 추적을 위한 session_id 쿠키 관리
 */

/**
 * 쿠키에서 값 읽기
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  
  try {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null
    }
  } catch (error) {
    console.warn('[session] 쿠키 읽기 오류:', error)
  }
  
  return null
}

/**
 * 쿠키에 값 저장
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number // 초 단위
    expires?: Date
    path?: string
    domain?: string
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  } = {}
): void {
  if (typeof document === 'undefined') {
    return
  }
  
  try {
    let cookieString = `${name}=${value}`
    
    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`
    }
    
    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`
    }
    
    if (options.path) {
      cookieString += `; path=${options.path}`
    } else {
      cookieString += `; path=/`
    }
    
    if (options.domain) {
      cookieString += `; domain=${options.domain}`
    }
    
    if (options.secure) {
      cookieString += `; secure`
    }
    
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`
    }
    
    document.cookie = cookieString
  } catch (error) {
    console.warn('[session] 쿠키 저장 오류:', error)
  }
}

/**
 * UUID 생성 (간단한 버전)
 */
export function generateSessionId(): string {
  try {
    // 간단한 UUID v4 생성
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  } catch (error) {
    console.warn('[session] UUID 생성 오류:', error)
    // 폴백: 타임스탬프 기반 ID
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }
}

/**
 * 세션 ID 가져오기 또는 생성
 * 
 * @param cookieName - 쿠키 이름 (기본값: 'ef_session_id')
 * @param ttlMinutes - 세션 TTL (분 단위, 기본값: 30분)
 * @returns 세션 ID (에러 발생 시에도 항상 문자열 반환)
 */
export function getOrCreateSessionId(
  cookieName: string = 'ef_session_id',
  ttlMinutes: number = 30
): string {
  try {
    let sessionId = getCookie(cookieName)
    
    if (!sessionId) {
      sessionId = generateSessionId()
      setCookie(cookieName, sessionId, {
        maxAge: ttlMinutes * 60, // 초 단위로 변환
        path: '/',
        sameSite: 'lax',
      })
    }
    
    return sessionId || generateSessionId() // 폴백
  } catch (error) {
    console.warn('[session] 세션 ID 생성 오류:', error)
    // 에러 발생 시에도 항상 유효한 세션 ID 반환
    return generateSessionId()
  }
}
