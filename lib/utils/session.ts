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
 * 쿠키를 우선 사용하되, 실패 시 localStorage를 폴백으로 사용합니다.
 * 크롬의 엄격한 쿠키 정책에 대응합니다.
 * 
 * @param cookieName - 쿠키 이름 (기본값: 'ef_session_id')
 * @param ttlMinutes - 세션 TTL (분 단위, 기본값: 30분)
 * @returns 세션 ID (에러 발생 시에도 항상 문자열 반환)
 */
export function getOrCreateSessionId(
  cookieName: string = 'ef_session_id',
  ttlMinutes: number = 30
): string {
  // 크롬 호환성: localStorage를 우선 사용하고 쿠키는 보조로 사용
  // 크롬의 엄격한 쿠키 정책 때문에 localStorage가 더 안정적입니다.
  
  try {
    // 1. localStorage에서 먼저 확인 (크롬 호환성 우선)
    let sessionId: string | null = null
    try {
      sessionId = localStorage.getItem(cookieName)
      if (sessionId && sessionId.trim()) {
        // localStorage에 유효한 값이 있으면 사용
        // 쿠키에도 동기화 시도 (실패해도 무시)
        try {
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
          setCookie(cookieName, sessionId, {
            maxAge: ttlMinutes * 60,
            path: '/',
            sameSite: 'lax',
            secure: isSecure,
          })
        } catch (cookieError) {
          // 쿠키 동기화 실패는 무시 (localStorage가 있으면 충분)
        }
        return sessionId
      }
    } catch (lsError) {
      // localStorage 읽기 실패는 무시하고 쿠키 확인으로 진행
      console.warn('[session] localStorage 읽기 실패:', lsError)
    }
    
    // 2. localStorage가 없으면 쿠키에서 확인
    sessionId = getCookie(cookieName)
    if (sessionId && sessionId.trim()) {
      // 쿠키에서 읽기 성공 - localStorage에 저장 (크롬 호환성)
      try {
        localStorage.setItem(cookieName, sessionId)
      } catch (lsError) {
        // localStorage 저장 실패해도 쿠키 값 사용
        console.warn('[session] localStorage 저장 실패 (쿠키 값 사용):', lsError)
      }
      return sessionId
    }
    
    // 3. 둘 다 없으면 새로 생성
    sessionId = generateSessionId()
    
    // localStorage에 먼저 저장 (크롬 호환성 우선)
    let localStorageSuccess = false
    try {
      localStorage.setItem(cookieName, sessionId)
      localStorageSuccess = true
    } catch (lsError) {
      console.warn('[session] localStorage 저장 실패:', lsError)
    }
    
    // 쿠키에도 저장 시도 (실패해도 localStorage가 있으면 OK)
    try {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
      setCookie(cookieName, sessionId, {
        maxAge: ttlMinutes * 60,
        path: '/',
        sameSite: 'lax',
        secure: isSecure,
      })
    } catch (cookieError) {
      // 쿠키 저장 실패는 무시 (localStorage가 있으면 충분)
      console.warn('[session] 쿠키 저장 실패 (localStorage 사용):', cookieError)
    }
    
    // localStorage 저장이 성공했으면 OK, 실패했어도 sessionId는 반환
    return sessionId
  } catch (error) {
    console.warn('[session] 세션 ID 생성 오류:', error)
    // 에러 발생 시에도 항상 유효한 세션 ID 반환
    return generateSessionId()
  }
}
