/**
 * 사용자 비밀번호 변경 스크립트
 * 
 * 사용법: 
 *   npx tsx scripts/change-password.ts <email> <newPassword>
 * 
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL (필수)
 *   SUPABASE_SERVICE_ROLE_KEY (필수)
 */

import dotenv from 'dotenv'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const email = process.argv[2]
const newPassword = process.argv[3]

if (!url || !serviceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

if (!email || !newPassword) {
  console.error('❌ 사용법: npx tsx scripts/change-password.ts <email> <newPassword>')
  process.exit(1)
}

;(async () => {
  const admin = createClient(url, serviceKey)

  try {
    // 사용자 조회
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`사용자 목록 조회 실패: ${listError.message}`)
    }

    const user = users?.find(u => u.email === email)

    if (!user) {
      console.error(`❌ 사용자를 찾을 수 없습니다: ${email}`)
      process.exit(1)
    }

    // 비밀번호 변경
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword
    })

    if (updateError) {
      throw new Error(`비밀번호 변경 실패: ${updateError.message}`)
    }

    console.log(`✅ 비밀번호 변경 완료: ${email}`)
    console.log(`   새 비밀번호: ${newPassword}`)
  } catch (error: any) {
    console.error('❌ 오류:', error.message)
    process.exit(1)
  }
})()

