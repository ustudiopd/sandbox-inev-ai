/**
 * inev: "GC녹십자" 클라이언트 생성 + 관리자 계정 등록
 * 사용: node scripts/inev-add-gcgreen-cross-client-and-admins.mjs
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

const CLIENT_NAME = 'GC녹십자'
const CLIENT_SLUG = 'gcgreen-cross'

// 관리자 계정 목록
const ADMINS = [
  {
    email: 'pd@ustudio.co.kr',
    password: null, // 기존 계정이므로 비밀번호 변경 안 함
    isExisting: true
  },
  {
    email: 'odilee@sweetspot.co.kr',
    password: 'gcbiopharma1@',
    isExisting: false
  }
]

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

  // 모든 사용자 목록 조회 (한 번만)
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  
  // 각 관리자 계정 처리
  for (let i = 0; i < ADMINS.length; i++) {
    const admin = ADMINS[i]
    console.log(`\n${i + 2}) 관리자 계정 처리: ${admin.email}`)

    const user = listData?.users?.find((u) => u.email === admin.email)
    let userId
    
    if (user) {
      userId = user.id
      console.log('   이미 존재:', userId)
      if (!admin.isExisting && admin.password) {
        // 새 계정인데 이미 존재하면 비밀번호 업데이트
        const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
          password: admin.password
        })
        if (updateErr) {
          console.warn('   ⚠️  비밀번호 업데이트 실패 (무시됨):', updateErr.message)
        } else {
          console.log('   ✅ 비밀번호 업데이트 완료')
        }
      }
    } else {
      if (admin.isExisting) {
        console.error('   ❌ 기존 계정으로 표시되었지만 사용자를 찾을 수 없습니다:', admin.email)
        continue
      }
      
      const { data: signUp, error: signErr } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
      })
      if (signErr) {
        console.error('   계정 생성 실패:', signErr.message)
        continue
      }
      userId = signUp.user?.id
      console.log('   생성됨:', userId, '(비밀번호:', admin.password + ')')
    }

    // client_members 등록
    console.log(`   client_members 등록 확인...`)
    const { data: existingMember } = await supabase
      .from('client_members')
      .select('id, role')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .maybeSingle()
    
    if (existingMember) {
      console.log('   ✅ 이미 등록됨 (역할:', existingMember.role + ')')
    } else {
      const { error: memberErr } = await supabase
        .from('client_members')
        .insert({ client_id: clientId, user_id: userId, role: 'admin' })
      if (memberErr) {
        console.error('   ❌ 등록 실패:', memberErr.message)
        continue
      }
      console.log('   ✅ 등록 완료 (역할: admin)')
    }
  }

  console.log('\n✅ 완료!')
  console.log('\n📋 클라이언트 정보:')
  console.log('   이름:', CLIENT_NAME)
  console.log('   슬러그:', CLIENT_SLUG)
  console.log('   ID:', clientId)
  console.log('\n📋 관리자 계정:')
  ADMINS.forEach((admin, idx) => {
    console.log(`   ${idx + 1}. ${admin.email}${admin.password ? ' (비밀번호: ' + admin.password + ')' : ' (기존 계정)'}`)
  })
  console.log('\n💡 inev-admin에서', CLIENT_NAME, '선택 후 로그인하세요.')
}

main().catch((e) => {
  console.error(e)
  setTimeout(() => process.exit(1), 100)
})
