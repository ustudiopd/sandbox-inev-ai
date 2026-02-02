import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findModuClient() {
  const admin = createAdminSupabase()
  
  console.log('🔍 모두의특강 계정 찾기...\n')
  
  const { data, error } = await admin
    .from('clients')
    .select('id, name, created_at')
    .ilike('name', '%모두의특강%')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ 모두의특강 계정을 찾을 수 없습니다.')
    console.log('\n대안: 비슷한 이름의 계정 찾기...')
    
    const { data: similar } = await admin
      .from('clients')
      .select('id, name, created_at')
      .or('name.ilike.%모두%,name.ilike.%특강%')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (similar && similar.length > 0) {
      console.log('\n비슷한 계정:')
      similar.forEach(c => {
        console.log(`- ${c.name}: ${c.id}`)
      })
    }
    return
  }
  
  console.log('✅ 모두의특강 계정:')
  data.forEach(c => {
    console.log(`- ${c.name}: ${c.id}`)
  })
  
  if (data.length > 0) {
    const clientId = data[0].id
    console.log(`\n📋 사용할 계정: ${data[0].name} (${clientId})`)
    console.log(`\n🔗 캠페인 링크 페이지: https://eventflow.kr/client/${clientId}/campaigns`)
  }
}

findModuClient().catch(console.error)
