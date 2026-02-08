/**
 * inev.ai Supabase Auth 관리자 계정 일괄 생성 (서비스 롤)
 * 사용: node scripts/inev-create-admin-users.mjs
 * .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
for (const p of [join(root, '.env.local'), join(root, 'app', '.env.local')]) {
  if (existsSync(p)) {
    const content = readFileSync(p, 'utf8')
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    })
    break
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const EMAILS = [
  'pd@ustudio.co.kr',
  'ad@ustudio.co.kr',
  'cue@ustudio.co.kr',
  'ysj@ustudio.co.kr',
  'charlie@ustudio.co.kr',
  'pumpkin@ustudio.co.kr',
  'asd@ustudio.co.kr',
  'lee@ustudio.co.kr',
  'chitor@ustudio.co.kr',
]
const PASSWORD = 'ustudio@82'

async function main() {
  console.log('inev.ai 관리자 계정 생성 (비밀번호: ustudio@82)\n')
  let ok = 0
  let skip = 0
  let err = 0
  for (const email of EMAILS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) {
      if (error.message && error.message.includes('already been registered')) {
        console.log('⏭', email, '(이미 존재)')
        skip++
      } else {
        console.error('❌', email, error.message)
        err++
      }
      continue
    }
    console.log('✅', email, data?.user?.id ?? '')
    ok++
  }
  console.log('\n완료: 생성', ok, ', 스킵', skip, ', 실패', err)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
