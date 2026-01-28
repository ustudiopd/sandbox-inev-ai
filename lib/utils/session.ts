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
 * 스토리지에서 안전하게 읽기 (모바일 브라우저 호환)
 */
function safeStorageGet(storage: Storage | null, key: string): string | null {
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch (error) {
    // 모바일 브라우저에서 localStorage가 비활성화된 경우
    return null
  }
}

/**
 * 스토리지에 안전하게 저장 (모바일 브라우저 호환)
 */
function safeStorageSet(storage: Storage | null, key: string, value: string): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, value)
    // 저장 확인 (모바일 브라우저에서 쿼터 제한 등으로 실패할 수 있음)
    return storage.getItem(key) === value
  } catch (error) {
    // 모바일 브라우저에서 localStorage가 비활성화되거나 쿼터 초과
    return false
  }
}

/**
 * 세션 ID 가져오기 또는 생성
 * 
 * 모바일 브라우저 호환성을 위해 다중 폴백 전략 사용:
 * 1. localStorage (데스크톱 크롬 호환)
 * 2. sessionStorage (모바일 브라우저 호환)
 * 3. 쿠키 (보조 수단)
 * 4. 메모리 기반 (최후의 수단)
 * 
 * @param cookieName - 쿠키 이름 (기본값: 'ef_session_id')
 * @param ttlMinutes - 세션 TTL (분 단위, 기본값: 30분)
 * @returns 세션 ID (에러 발생 시에도 항상 문자열 반환)
 */
export function getOrCreateSessionId(
  cookieName: string = 'ef_session_id',
  ttlMinutes: number = 30
): string {
  // 모바일 브라우저 호환성: 다중 폴백 전략
  // localStorage -> sessionStorage -> 쿠키 -> 메모리
  
  try {
    const isClient = typeof window !== 'undefined'
    if (!isClient) {
      // 서버 사이드에서는 항상 새 세션 ID 생성
      return generateSessionId()
    }
    
    const localStorage = isClient ? window.localStorage : null
    const sessionStorage = isClient ? window.sessionStorage : null
    
    let sessionId: string | null = null
    
    // 1. localStorage에서 확인 (데스크톱 크롬 호환)
    sessionId = safeStorageGet(localStorage, cookieName)
    if (sessionId && sessionId.trim()) {
      // 다른 스토리지에도 동기화 시도 (실패해도 무시)
      safeStorageSet(sessionStorage, cookieName, sessionId)
      try {
        const isSecure = window.location.protocol === 'https:'
        setCookie(cookieName, sessionId, {
          maxAge: ttlMinutes * 60,
          path: '/',
          sameSite: 'lax',
          secure: isSecure,
        })
      } catch (cookieError) {
        // 쿠키 동기화 실패는 무시
      }
      return sessionId
    }
    
    // 2. sessionStorage에서 확인 (모바일 브라우저 호환)
    sessionId = safeStorageGet(sessionStorage, cookieName)
    if (sessionId && sessionId.trim()) {
      // localStorage에도 동기화 시도 (실패해도 무시)
      safeStorageSet(localStorage, cookieName, sessionId)
      try {
        const isSecure = window.location.protocol === 'https:'
        setCookie(cookieName, sessionId, {
          maxAge: ttlMinutes * 60,
          path: '/',
          sameSite: 'lax',
          secure: isSecure,
        })
      } catch (cookieError) {
        // 쿠키 동기화 실패는 무시
      }
      return sessionId
    }
    
    // 3. 쿠키에서 확인
    sessionId = getCookie(cookieName)
    if (sessionId && sessionId.trim()) {
      // 모든 스토리지에 동기화 시도 (실패해도 무시)
      safeStorageSet(localStorage, cookieName, sessionId)
      safeStorageSet(sessionStorage, cookieName, sessionId)
      return sessionId
    }
    
    // 4. 새로 생성
    sessionId = generateSessionId()
    
    // 모든 스토리지에 저장 시도 (하나라도 성공하면 OK)
    let saved = false
    
    // localStorage 저장 시도
    if (safeStorageSet(localStorage, cookieName, sessionId)) {
      saved = true
    }
    
    // sessionStorage 저장 시도 (모바일 브라우저 호환)
    if (safeStorageSet(sessionStorage, cookieName, sessionId)) {
      saved = true
    }
    
    // 쿠키 저장 시도
    try {
      const isSecure = window.location.protocol === 'https:'
      setCookie(cookieName, sessionId, {
        maxAge: ttlMinutes * 60,
        path: '/',
        sameSite: 'lax',
        secure: isSecure,
      })
      // 쿠키 저장 확인
      if (getCookie(cookieName) === sessionId) {
        saved = true
      }
    } catch (cookieError) {
      // 쿠키 저장 실패는 무시
    }
    
    // 모든 스토리지가 실패해도 세션 ID는 반환 (메모리 기반)
    // 다음 요청에서 다시 생성되지만, 최소한 등록은 진행 가능
    if (!saved) {
      console.warn('[session] 모든 스토리지 저장 실패 (메모리 기반 세션 사용)')
    }
    
    return sessionId
  } catch (error) {
    console.warn('[session] 세션 ID 생성 오류:', error)
    // 에러 발생 시에도 항상 유효한 세션 ID 반환
    return generateSessionId()
  }
}
