/**
 * Sandbox 클라이언트에 pd, chitor, lee 가입 + chitor/lee는 다른 클라이언트 가입 해지
 * 사용: npx tsx scripts/setup-sandbox-client-and-members.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SANDBOX_CLIENT_ID = '3fd1a10c-99db-4d37-a2e3-4db7860e6150'
const PASSWORD = 'ustudio@82'

const ADD_TO_SANDBOX = ['pd@ustudio.co.kr', 'chitor@ustudio.co.kr', 'lee@ustudio.co.kr']
const REVOKE_OTHER_CLIENTS = ['chitor@ustudio.co.kr', 'lee@ustudio.co.kr'] // pd는 유지

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('=== Sandbox 클라이언트 멤버 설정 ===\n')
  console.log('Sandbox client_id:', SANDBOX_CLIENT_ID)

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    throw new Error(`사용자 목록 조회 실패: ${listError.message}`)
  }
  const users = listData?.users ?? []

  for (const email of ADD_TO_SANDBOX) {
    console.log(`\n📧 ${email}`)
    let user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      })
      if (createErr) {
        console.error('   계정 생성 실패:', createErr.message)
        continue
      }
      user = created.user
      console.log('   계정 생성됨 (비밀번호:', PASSWORD + ')')
    } else {
      console.log('   기존 계정:', user.id)
    }

    const { data: existing } = await admin
      .from('client_members')
      .select('id')
      .eq('client_id', SANDBOX_CLIENT_ID)
      .eq('user_id', user!.id)
      .maybeSingle()
    if (existing) {
      console.log('   Sandbox 멤버십: 이미 있음')
    } else {
      const { error: insertErr } = await admin
        .from('client_members')
        .insert({ client_id: SANDBOX_CLIENT_ID, user_id: user!.id, role: 'admin' })
      if (insertErr) {
        console.error('   Sandbox 멤버십 등록 실패:', insertErr.message)
      } else {
        console.log('   Sandbox 멤버십: 등록 완료')
      }
    }

    if (REVOKE_OTHER_CLIENTS.includes(email)) {
      const { data: removed, error: delErr } = await admin
        .from('client_members')
        .delete()
        .eq('user_id', user!.id)
        .neq('client_id', SANDBOX_CLIENT_ID)
        .select('id')
      if (delErr) {
        console.error('   다른 클라이언트 가입 해지 실패:', delErr.message)
      } else {
        console.log('   다른 클라이언트 가입 해지:', removed?.length ?? 0, '건')
      }
    }
  }

  console.log('\n✅ 완료. Sandbox(sandbox.inev.ai) 로그인:', ADD_TO_SANDBOX.join(', '), '/', PASSWORD)
}

main()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((err) => {
    console.error(err)
    setTimeout(() => process.exit(1), 100)
  })
