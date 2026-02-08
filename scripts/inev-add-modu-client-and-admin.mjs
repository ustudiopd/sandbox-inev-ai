/**
 * inev: "모두의 특강" 클라이언트 생성 + pd@ustudio.co.kr 관리자 등록
 * 사용: node scripts/inev-add-modu-client-and-admin.mjs
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

const CLIENT_NAME = '모두의 특강'
const CLIENT_SLUG = 'modoolecture'
const ADMIN_EMAIL = 'pd@ustudio.co.kr'
const ADMIN_PASSWORD = 'ustudio@82'

async function main() {
  console.log('1) 클라이언트 확인/생성:', CLIENT_NAME, '(' + CLIENT_SLUG + ')\n')

  const { data: existingClients } = await supabase.from('clients').select('id, name, slug').eq('slug', CLIENT_SLUG)
  let clientId
  if (existingClients?.length) {
    clientId = existingClients[0].id
    console.log('   이미 존재:', clientId, existingClients[0].name)
  } else {
    const { data: created, error: createErr } = await supabase
      .from('clients')
      .insert({ name: CLIENT_NAME, slug: CLIENT_SLUG })
      .select('id')
      .single()
    if (createErr) {
      console.error('   Client 생성 실패:', createErr.message)
      process.exit(1)
    }
    clientId = created.id
    console.log('   생성됨:', clientId)
  }

  console.log('\n2) 관리자 계정 확인/생성:', ADMIN_EMAIL)

  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const user = listData?.users?.find((u) => u.email === ADMIN_EMAIL)
  let userId
  if (user) {
    userId = user.id
    console.log('   이미 존재:', userId)
  } else {
    const { data: signUp, error: signErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    if (signErr) {
      console.error('   계정 생성 실패:', signErr.message)
      process.exit(1)
    }
    userId = signUp.user?.id
    console.log('   생성됨:', userId, '(비밀번호:', ADMIN_PASSWORD + ')')
  }

  console.log('\n3) client_members 등록 (관리자)')

  const { data: existingMember } = await supabase
    .from('client_members')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existingMember) {
    console.log('   이미 등록됨')
  } else {
    const { error: memberErr } = await supabase
      .from('client_members')
      .insert({ client_id: clientId, user_id: userId, role: 'admin' })
    if (memberErr) {
      console.error('   등록 실패:', memberErr.message)
      process.exit(1)
    }
    console.log('   등록 완료')
  }

  console.log('\n완료. inev-admin에서', CLIENT_NAME, '선택 후 로그인:', ADMIN_EMAIL, '/', ADMIN_PASSWORD)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
