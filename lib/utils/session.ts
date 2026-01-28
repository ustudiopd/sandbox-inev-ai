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
  try {
    // 1. 쿠키에서 먼저 시도
    let sessionId = getCookie(cookieName)
    
    if (sessionId) {
      // 쿠키에서 읽기 성공 - localStorage에도 동기화
      try {
        localStorage.setItem(cookieName, sessionId)
      } catch (lsError) {
        // localStorage 동기화 실패는 무시
      }
      return sessionId
    }
    
    // 2. 쿠키가 없으면 localStorage에서 확인
    try {
      const storedSessionId = localStorage.getItem(cookieName)
      if (storedSessionId) {
        // localStorage에 있으면 쿠키에도 저장 시도
        try {
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
          setCookie(cookieName, storedSessionId, {
            maxAge: ttlMinutes * 60,
            path: '/',
            sameSite: 'lax',
            secure: isSecure, // HTTPS인 경우에만 secure 플래그
          })
        } catch (cookieError) {
          // 쿠키 저장 실패해도 localStorage 값 사용
          console.warn('[session] 쿠키 저장 실패 (localStorage 사용):', cookieError)
        }
        return storedSessionId
      }
    } catch (lsError) {
      // localStorage 읽기 실패는 무시하고 계속 진행
      console.warn('[session] localStorage 읽기 실패:', lsError)
    }
    
    // 3. 둘 다 없으면 새로 생성
    sessionId = generateSessionId()
    
    // 쿠키에 저장 시도
    try {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
      setCookie(cookieName, sessionId, {
        maxAge: ttlMinutes * 60,
        path: '/',
        sameSite: 'lax',
        secure: isSecure, // HTTPS인 경우에만 secure 플래그
      })
      
      // 쿠키 저장 확인 (크롬에서 쿠키가 실제로 저장되었는지 검증)
      const verifyCookie = getCookie(cookieName)
      if (!verifyCookie || verifyCookie !== sessionId) {
        // 쿠키 저장 실패 - localStorage에 저장
        console.warn('[session] 쿠키 저장 검증 실패 (localStorage로 폴백)')
        try {
          localStorage.setItem(cookieName, sessionId)
        } catch (lsError) {
          console.warn('[session] localStorage 저장 실패:', lsError)
        }
      }
    } catch (cookieError) {
      // 쿠키 저장 실패해도 localStorage에 저장
      console.warn('[session] 쿠키 저장 실패 (localStorage로 폴백):', cookieError)
      try {
        localStorage.setItem(cookieName, sessionId)
      } catch (lsError) {
        console.warn('[session] localStorage 저장 실패:', lsError)
      }
    }
    
    // localStorage에도 저장 (쿠키 실패 시 대비)
    try {
      localStorage.setItem(cookieName, sessionId)
    } catch (lsError) {
      // localStorage도 실패하면 그냥 sessionId 반환
      console.warn('[session] localStorage 저장 실패:', lsError)
    }
    
    return sessionId
  } catch (error) {
    console.warn('[session] 세션 ID 생성 오류:', error)
    // 에러 발생 시에도 항상 유효한 세션 ID 반환
    return generateSessionId()
  }
}
