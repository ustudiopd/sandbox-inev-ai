/**
 * 온디맨드 웨비나 등록 이름 수정 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixName() {
  const admin = createClient(url, serviceKey)
  
  const webinarId = 'b06118cb-0357-402f-bd46-51613d131861'
  
  const { data: registrations } = await admin
    .from('registrations')
    .select('*')
    .eq('webinar_id', webinarId)
  
  console.log(`총 ${registrations?.length || 0}개 등록 정보 확인 중...\n`)
  
  for (const reg of registrations || []) {
    const regData = reg.registration_data as any
    const currentName = regData?.name || '이름 없음'
    const email = regData?.email || '이메일 없음'
    
    console.log(`이름: ${currentName}, 이메일: ${email}`)
    
    if (currentName === '양승철2' || currentName?.includes('양승철2')) {
      console.log('  → 이름 수정 중...')
      const { error } = await admin
        .from('registrations')
        .update({
          registration_data: {
            ...regData,
            name: '양승철',
          }
        })
        .eq('webinar_id', reg.webinar_id)
        .eq('user_id', reg.user_id)
      
      if (error) {
        console.error('  ❌ 수정 실패:', error.message)
      } else {
        console.log('  ✅ 수정 완료: "양승철2" → "양승철"')
      }
    }
    console.log('')
  }
  
  console.log('✅ 이름 수정 작업 완료!')
}

fixName()
