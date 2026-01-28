/**
 * cid (Campaign Link Identifier) 생성 유틸리티
 * 
 * 명세서 요구사항:
 * - 8자리 Base32/Alnum 권장 (6자리/8자리/slug 옵션)
 * - 허용 문자: [A-Z0-9] (대문자)
 * - unique within (client_id, cid)
 */

/**
 * 8자리 Base32/Alnum cid 생성
 * 
 * @returns 8자리 랜덤 문자열 (A-Z0-9)
 */
export function generateCID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }
  
  return result
}

/**
 * cid 유효성 검증
 * 
 * @param cid - 검증할 cid 문자열
 * @returns 유효하면 true
 */
export function isValidCID(cid: string | null | undefined): boolean {
  if (!cid) return false
  
  // 8자리이고 A-Z0-9만 포함하는지 확인
  const cidRegex = /^[A-Z0-9]{8}$/
  return cidRegex.test(cid)
}

/**
 * cid 정규화 (대문자 변환, 공백 제거)
 * 
 * @param cid - 정규화할 cid 문자열
 * @returns 정규화된 cid 또는 null
 */
export function normalizeCID(cid: string | null | undefined): string | null {
  if (!cid) return null
  
  const normalized = cid.trim().toUpperCase()
  
  // 유효하지 않으면 null 반환
  if (!isValidCID(normalized)) {
    return null
  }
  
  return normalized
}
