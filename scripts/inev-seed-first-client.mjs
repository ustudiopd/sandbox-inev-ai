/**
 * inev.ai 첫 Client 생성 (서비스 롤 사용, RLS 우회)
 * 사용: node scripts/inev-seed-first-client.mjs
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

const supabase = createClient(url, serviceKey)

async function main() {
  const { data: existing } = await supabase.from('clients').select('id').limit(1)
  if (existing?.length) {
    console.log('이미 Client가 있습니다:', existing[0].id)
    return
  }
  const name = process.argv[2] || 'Default Client'
  const slug = process.argv[3] || 'default'
  const { data: client, error } = await supabase.from('clients').insert({ name, slug }).select('id').single()
  if (error) {
    console.error('Client 생성 실패:', error.message)
    process.exit(1)
  }
  console.log('Client 생성됨:', client.id, name, slug)
}

main()
