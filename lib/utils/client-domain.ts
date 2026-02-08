/**
 * Client Domain Policy 유틸리티
 * 
 * 규칙:
 * - public_base_url = canonical_domain ?? subdomain_domain
 * - 모든 외부 발송 링크는 public_base_url 기준으로 생성
 */

import { createAdminSupabase } from '@/lib/supabase/admin'

export interface ClientDomainInfo {
  canonical_domain: string | null
  subdomain_domain: string | null
  public_base_url: string
}

/**
 * 클라이언트의 public_base_url 계산
 * 
 * @param clientId 클라이언트 ID
 * @returns public_base_url (canonical_domain ?? subdomain_domain)
 */
export async function getClientPublicBaseUrl(clientId: string): Promise<string> {
  const admin = createAdminSupabase()
  
  const { data: client, error } = await admin
    .from('clients')
    .select('canonical_domain, subdomain_domain, slug')
    .eq('id', clientId)
    .single()
  
  if (error || !client) {
    // 폴백: 환경 변수 또는 기본값
    const fallback = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
    console.warn(`[getClientPublicBaseUrl] 클라이언트 ${clientId} 조회 실패, 폴백 사용:`, fallback)
    return fallback
  }
  
  // public_base_url = canonical_domain ?? subdomain_domain
  if (client.canonical_domain) {
    // canonical_domain이 있으면 https:// 프리픽스 확인
    return client.canonical_domain.startsWith('http') 
      ? client.canonical_domain 
      : `https://${client.canonical_domain}`
  }
  
  if (client.subdomain_domain) {
    // subdomain_domain이 있으면 https:// 프리픽스 확인
    return client.subdomain_domain.startsWith('http')
      ? client.subdomain_domain
      : `https://${client.subdomain_domain}`
  }
  
  // 둘 다 없으면 slug 기반 생성 (폴백)
  const fallback = `https://${client.slug}.inev.ai`
  console.warn(`[getClientPublicBaseUrl] 클라이언트 ${clientId}의 도메인 설정 없음, 폴백 사용:`, fallback)
  return fallback
}

/**
 * 클라이언트의 전체 도메인 정보 조회
 * 
 * @param clientId 클라이언트 ID
 * @returns ClientDomainInfo
 */
export async function getClientDomainInfo(clientId: string): Promise<ClientDomainInfo> {
  const admin = createAdminSupabase()
  
  const { data: client, error } = await admin
    .from('clients')
    .select('canonical_domain, subdomain_domain, slug')
    .eq('id', clientId)
    .single()
  
  if (error || !client) {
    // 폴백
    const fallback = process.env.NEXT_PUBLIC_APP_URL || 'https://eventflow.kr'
    return {
      canonical_domain: null,
      subdomain_domain: null,
      public_base_url: fallback,
    }
  }
  
  // public_base_url 계산
  let public_base_url: string
  if (client.canonical_domain) {
    public_base_url = client.canonical_domain.startsWith('http')
      ? client.canonical_domain
      : `https://${client.canonical_domain}`
  } else if (client.subdomain_domain) {
    public_base_url = client.subdomain_domain.startsWith('http')
      ? client.subdomain_domain
      : `https://${client.subdomain_domain}`
  } else {
    public_base_url = `https://${client.slug}.inev.ai`
  }
  
  return {
    canonical_domain: client.canonical_domain,
    subdomain_domain: client.subdomain_domain,
    public_base_url,
  }
}

/**
 * 클라이언트 ID로부터 public_base_url을 동기적으로 계산 (캐시 사용)
 * 
 * 주의: 이 함수는 서버 사이드에서만 사용 가능합니다.
 * 클라이언트 사이드에서는 getClientPublicBaseUrl을 사용하세요.
 */
const clientDomainCache = new Map<string, { url: string; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

export async function getClientPublicBaseUrlCached(clientId: string): Promise<string> {
  const cached = clientDomainCache.get(clientId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url
  }
  
  const url = await getClientPublicBaseUrl(clientId)
  clientDomainCache.set(clientId, {
    url,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  
  return url
}
