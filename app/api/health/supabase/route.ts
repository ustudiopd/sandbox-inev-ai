import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase 연결 확인용 헬스 체크
 * GET /api/health/supabase
 * - anon 키로 연결 시도
 * - service_role 키로 연결 시도 (서버 전용)
 * 키/비밀값은 응답에 포함하지 않음.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_env',
        message: 'NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다. .env.local을 프로젝트 루트에 두었는지 확인하세요.',
      },
      { status: 503 }
    )
  }

  const result: {
    ok: boolean
    url?: string
    anon?: string
    serviceRole?: string
    error?: string
    message?: string
  } = {
    ok: false,
    url: url.replace(/^https?:\/\//, '').split('/')[0],
  }

  try {
    const anon = createClient(url, anonKey)
    const { error: anonError } = await anon.auth.getSession()
    result.anon = anonError ? `error: ${anonError.message}` : 'ok'
  } catch (e) {
    result.anon = `exception: ${e instanceof Error ? e.message : String(e)}`
  }

  if (serviceKey) {
    try {
      const admin = createClient(url, serviceKey)
      const { error: adminError } = await admin.auth.getSession()
      result.serviceRole = adminError ? `error: ${adminError.message}` : 'ok'
    } catch (e) {
      result.serviceRole = `exception: ${e instanceof Error ? e.message : String(e)}`
    }
  } else {
    result.serviceRole = 'skipped (SUPABASE_SERVICE_ROLE_KEY not set)'
  }

  result.ok = result.anon === 'ok' && (result.serviceRole === 'ok' || result.serviceRole?.startsWith('skipped'))

  return NextResponse.json(result)
}
