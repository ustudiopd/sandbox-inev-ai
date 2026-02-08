/**
 * Supabase 연결 확인 스크립트
 * 사용: node scripts/test-supabase-connection.mjs
 * .env.local을 프로젝트 루트 또는 app/ 에 두면 로드함.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = join(process.cwd())
const envPaths = [
  join(root, '.env.local'),
  join(root, 'app', '.env.local'),
]

for (const p of envPaths) {
  if (existsSync(p)) {
    const content = readFileSync(p, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m) {
        const key = m[1]
        const val = m[2].replace(/^["']|["']$/g, '').trim()
        if (!process.env[key]) process.env[key] = val
      }
    }
    console.log('Loaded env from:', p)
    break
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n--- Supabase 연결 테스트 (inev.ai) ---')
console.log('URL:', url ? `${url.replace(/^https?:\/\//, '').split('/')[0]} ✓` : '✗ 없음')
console.log('Anon Key:', anonKey ? `${anonKey.slice(0, 20)}... ✓` : '✗ 없음')
console.log('Service Role Key:', serviceKey ? `${serviceKey.slice(0, 20)}... ✓` : '(선택) 없음')

if (!url || !anonKey) {
  console.error('\n❌ NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.')
  console.error('   .env.local 을 프로젝트 루트 또는 app/ 에 두고 다시 실행하세요.')
  process.exit(1)
}

let ok = true

try {
  const anon = createClient(url, anonKey)
  const { data, error } = await anon.auth.getSession()
  if (error) {
    console.error('\n❌ Anon 연결 실패:', error.message)
    ok = false
  } else {
    console.log('\n✅ Anon 키 연결 성공 (session:', data?.session ? '있음' : '없음', ')')
  }
} catch (e) {
  console.error('\n❌ Anon 연결 예외:', e.message)
  ok = false
}

if (serviceKey) {
  try {
    const admin = createClient(url, serviceKey)
    const { data, error } = await admin.auth.getSession()
    if (error) {
      console.error('❌ Service Role 연결 실패:', error.message)
      ok = false
    } else {
      console.log('✅ Service Role 키 연결 성공')
    }
  } catch (e) {
    console.error('❌ Service Role 연결 예외:', e.message)
    ok = false
  }
}

console.log('\n' + (ok ? '--- 전체 연결 확인 완료 ---' : '--- 일부 실패 ---'))
process.exit(ok ? 0 : 1)
