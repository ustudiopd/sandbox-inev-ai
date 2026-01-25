import { createAdminSupabase } from '@/lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkWebinarCount() {
  const admin = createAdminSupabase()
  
  console.log('=== 웨비나 통계 확인 ===\n')
  
  // 1. 전체 웨비나 수
  const { count: totalWebinars, error: countError } = await admin
    .from('webinars')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('❌ 웨비나 수 조회 실패:', countError)
    return
  }
  
  console.log(`1. 전체 웨비나 수: ${totalWebinars}개\n`)
  
  // 2. 클라이언트별 웨비나 수
  const { data: webinarsByClient, error: clientError } = await admin
    .from('webinars')
    .select('client_id, clients:client_id(name)')
  
  if (!clientError && webinarsByClient) {
    const clientMap = new Map<string, { name: string, count: number }>()
    
    webinarsByClient.forEach((w: any) => {
      const clientId = w.client_id
      const clientName = w.clients?.name || '알 수 없음'
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, { name: clientName, count: 0 })
      }
      clientMap.get(clientId)!.count++
    })
    
    console.log('2. 클라이언트별 웨비나 수:')
    const sortedClients = Array.from(clientMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
    
    sortedClients.forEach(([clientId, info]) => {
      console.log(`   ${info.name}: ${info.count}개`)
    })
    console.log()
  }
  
  // 3. manual 등록이 있는 웨비나 수
  const { data: manualRegistrations, error: manualError } = await admin
    .from('registrations')
    .select('webinar_id')
    .eq('registered_via', 'manual')
  
  if (!manualError && manualRegistrations) {
    const uniqueWebinarIds = new Set(manualRegistrations.map((r: any) => r.webinar_id))
    console.log(`3. manual 등록이 있는 웨비나 수: ${uniqueWebinarIds.size}개`)
    console.log(`   (총 manual 등록 레코드 수: ${manualRegistrations.length}개)\n`)
  }
  
  // 4. 최근 생성된 웨비나 10개
  const { data: recentWebinars, error: recentError } = await admin
    .from('webinars')
    .select('id, slug, title, client_id, clients:client_id(name), created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (!recentError && recentWebinars) {
    console.log('4. 최근 생성된 웨비나 10개:')
    recentWebinars.forEach((w: any, index: number) => {
      console.log(`\n   [${index + 1}] ${w.title || '제목 없음'}`)
      console.log(`       Slug: ${w.slug || '없음'}`)
      console.log(`       클라이언트: ${w.clients?.name || '알 수 없음'}`)
      console.log(`       생성일: ${w.created_at ? new Date(w.created_at).toLocaleString('ko-KR') : '없음'}`)
    })
  }
}

checkWebinarCount()
  .then(() => {
    console.log('\n✅ 확인 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 오류:', error)
    process.exit(1)
  })
