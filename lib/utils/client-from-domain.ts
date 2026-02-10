/**
 * 도메인 → client_id 해석 (sandbox.inev.ai 운영 명세 2.2)
 *
 * sandbox.inev.ai → sandbox client_id
 * wert.inev.ai → wert client_id
 * 도메인 기반으로 client_id를 결정하여 격리 강제
 */

import { createAdminSupabase } from '@/lib/supabase/admin'

/** hostname에서 프로토콜·포트 제거 후 정규화 */
function normalizeHost(host: string): string {
  try {
    let h = host.trim().toLowerCase()
    if (h.startsWith('http://') || h.startsWith('https://')) {
      try {
        h = new URL(h).hostname
      } catch {
        h = h.replace(/^https?:\/\//, '').split('/')[0] ?? h
      }
    }
    return h.split(':')[0] ?? h
  } catch {
    return host
  }
}

const cache = new Map<string, { clientId: string; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

/**
 * hostname으로 client_id 조회
 * clients.subdomain_domain, canonical_domain과 매칭
 */
export async function getClientIdFromHost(hostname: string): Promise<string | null> {
  const host = normalizeHost(hostname)
  if (!host) return null

  const cached = cache.get(host)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.clientId
  }

  const admin = createAdminSupabase()
  const { data: clients } = await admin
    .from('clients')
    .select('id, subdomain_domain, canonical_domain')

  const client = clients?.find((c) => {
    const sub = c.subdomain_domain ? normalizeHost(c.subdomain_domain) : ''
    const can = c.canonical_domain ? normalizeHost(c.canonical_domain) : ''
    return (sub && sub === host) || (can && can === host)
  })

  if (client) {
    cache.set(host, { clientId: client.id, expiresAt: Date.now() + CACHE_TTL_MS })
    return client.id
  }
  return null
}

/**
 * NEXT_PUBLIC_APP_URL(또는 request host)에서 배포용 client_id 조회
 * sandbox.inev.ai 배포는 sandbox client만 접근 가능하게 할 때 사용
 */
export async function getDeploymentClientId(options?: {
  appUrl?: string
  host?: string
}): Promise<string | null> {
  const host =
    options?.host ??
    (options?.appUrl ? new URL(options.appUrl).hostname : null) ??
    (typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
      ? (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
          } catch {
            return null
          }
        })()
      : null)

  return host ? getClientIdFromHost(host) : null
}

/**
 * 이벤트가 현재 배포 client에 속하는지 검증 (sandbox 격리)
 * sandbox.inev.ai에서는 sandbox client 이벤트만 허용
 */
export async function ensureEventBelongsToDeployment(params: {
  eventClientId: string
  host?: string
  appUrl?: string
}): Promise<boolean> {
  const deploymentClientId = await getDeploymentClientId({
    host: params.host,
    appUrl: params.appUrl,
  })
  if (!deploymentClientId) return true // 배포 client 미정이면 검증 생략(dev/멀티)
  return params.eventClientId === deploymentClientId
}
