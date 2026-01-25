import { createAdminSupabase } from '@/lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkManualRegistrationsByWebinar() {
  const admin = createAdminSupabase()
  
  console.log('=== 웨비나별 manual 등록 수 확인 ===\n')
  
  // 웨비나별 manual 등록 수 집계
  const { data: manualRegistrations, error: manualError } = await admin
    .from('registrations')
    .select(`
      webinar_id,
      webinars:webinar_id (
        id,
        slug,
        title,
        client_id,
        clients:client_id(name)
      )
    `)
    .eq('registered_via', 'manual')
  
  if (manualError) {
    console.error('❌ 조회 실패:', manualError)
    return
  }
  
  // 웨비나별로 그룹화
  const webinarMap = new Map<string, {
    slug: string | null,
    title: string | null,
    clientName: string | null,
    count: number,
    uniqueUsers: Set<string>
  }>()
  
  manualRegistrations?.forEach((reg: any) => {
    const webinarId = reg.webinar_id
    const webinar = reg.webinars
    
    if (!webinarMap.has(webinarId)) {
      webinarMap.set(webinarId, {
        slug: webinar?.slug || null,
        title: webinar?.title || null,
        clientName: webinar?.clients?.name || null,
        count: 0,
        uniqueUsers: new Set()
      })
    }
    
    const info = webinarMap.get(webinarId)!
    info.count++
  })
  
  // 사용자별 중복 확인을 위해 다시 조회
  const { data: allManualRegs } = await admin
    .from('registrations')
    .select('webinar_id, user_id')
    .eq('registered_via', 'manual')
  
  allManualRegs?.forEach((reg: any) => {
    const info = webinarMap.get(reg.webinar_id)
    if (info) {
      info.uniqueUsers.add(reg.user_id)
    }
  })
  
  console.log('웨비나별 manual 등록 통계:\n')
  const sortedWebinars = Array.from(webinarMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
  
  sortedWebinars.forEach(([webinarId, info], index) => {
    console.log(`[${index + 1}] ${info.title || '제목 없음'}`)
    console.log(`    Slug: ${info.slug || '없음'}`)
    console.log(`    클라이언트: ${info.clientName || '알 수 없음'}`)
    console.log(`    총 manual 등록 레코드: ${info.count}개`)
    console.log(`    고유 사용자 수: ${info.uniqueUsers.size}명`)
    console.log(`    평균 사용자당 등록 수: ${info.uniqueUsers.size > 0 ? (info.count / info.uniqueUsers.size).toFixed(2) : 0}회`)
    console.log()
  })
  
  // 중복 등록이 많은 사용자 확인
  console.log('\n=== 중복 manual 등록이 많은 사용자 (상위 10명) ===\n')
  
  const userMap = new Map<string, number>()
  allManualRegs?.forEach((reg: any) => {
    const count = userMap.get(reg.user_id) || 0
    userMap.set(reg.user_id, count + 1)
  })
  
  const sortedUsers = Array.from(userMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  
  if (sortedUsers.length > 0) {
    const userIds = sortedUsers.map(([userId]) => userId)
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .in('id', userIds)
    
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
    
    sortedUsers.forEach(([userId, count], index) => {
      const profile = profileMap.get(userId)
      console.log(`[${index + 1}] ${profile?.email || profile?.display_name || userId}`)
      console.log(`    manual 등록 횟수: ${count}회`)
    })
  }
}

checkManualRegistrationsByWebinar()
  .then(() => {
    console.log('\n✅ 확인 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 오류:', error)
    process.exit(1)
  })
