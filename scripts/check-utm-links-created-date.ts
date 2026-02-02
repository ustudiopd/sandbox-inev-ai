import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * UTM 링크 생성일 확인 스크립트
 */
async function checkUTMLinksCreatedDate() {
  const admin = createAdminSupabase()
  
  console.log('=== UTM 링크 생성일 확인 ===\n')
  
  // 모든 활성 링크 조회
  const { data: links, error: linksError } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign, created_at, updated_at, status, client_id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (linksError) {
    console.error('❌ 링크 조회 실패:', linksError.message)
    process.exit(1)
  }
  
  if (!links || links.length === 0) {
    console.log('⚠️  활성 링크가 없습니다.')
    return
  }
  
  console.log(`📊 활성 링크 수: ${links.length}개\n`)
  
  // 생성일별 집계
  const dateMap = new Map<string, number>()
  const linksByDate: Array<{ date: string; links: any[] }> = []
  
  links.forEach((link: any) => {
    const createdDate = new Date(link.created_at).toISOString().split('T')[0]
    
    if (!dateMap.has(createdDate)) {
      dateMap.set(createdDate, 0)
      linksByDate.push({ date: createdDate, links: [] })
    }
    
    dateMap.set(createdDate, (dateMap.get(createdDate) || 0) + 1)
    const dateGroup = linksByDate.find(d => d.date === createdDate)
    if (dateGroup) {
      dateGroup.links.push(link)
    }
  })
  
  // 날짜별 정렬
  linksByDate.sort((a, b) => b.date.localeCompare(a.date))
  
  console.log('📅 생성일별 분포:\n')
  linksByDate.forEach(({ date, links }) => {
    console.log(`${date}: ${links.length}개`)
    links.forEach((link: any) => {
      const utmInfo = [
        link.utm_source && `source=${link.utm_source}`,
        link.utm_medium && `medium=${link.utm_medium}`,
        link.utm_campaign && `campaign=${link.utm_campaign}`,
      ].filter(Boolean).join(', ')
      
      console.log(`  - ${link.name || link.id}`)
      if (utmInfo) {
        console.log(`    UTM: ${utmInfo}`)
      }
      console.log(`    생성: ${new Date(link.created_at).toLocaleString('ko-KR')}`)
      if (link.updated_at !== link.created_at) {
        console.log(`    수정: ${new Date(link.updated_at).toLocaleString('ko-KR')}`)
      }
    })
    console.log('')
  })
  
  // 전체 통계
  const oldestLink = links.reduce((oldest: any, link: any) => {
    return new Date(link.created_at) < new Date(oldest.created_at) ? link : oldest
  }, links[0])
  
  const newestLink = links.reduce((newest: any, link: any) => {
    return new Date(link.created_at) > new Date(newest.created_at) ? link : newest
  }, links[0])
  
  console.log('📈 전체 통계:')
  console.log(`  - 가장 오래된 링크: ${oldestLink.name || oldestLink.id}`)
  console.log(`    생성일: ${new Date(oldestLink.created_at).toLocaleString('ko-KR')}`)
  console.log(`  - 가장 최근 링크: ${newestLink.name || newestLink.id}`)
  console.log(`    생성일: ${new Date(newestLink.created_at).toLocaleString('ko-KR')}`)
  
  // UTM 파라미터가 있는 링크 수
  const linksWithUTM = links.filter((link: any) => 
    link.utm_source || link.utm_medium
  )
  
  console.log(`\n  - UTM 파라미터가 있는 링크: ${linksWithUTM.length}개`)
  console.log(`  - UTM 파라미터가 없는 링크: ${links.length - linksWithUTM.length}개`)
  
  // 클라이언트별 분포
  const clientMap = new Map<string, number>()
  links.forEach((link: any) => {
    const clientId = link.client_id || 'unknown'
    clientMap.set(clientId, (clientMap.get(clientId) || 0) + 1)
  })
  
  if (clientMap.size > 1) {
    console.log(`\n  - 클라이언트별 분포:`)
    Array.from(clientMap.entries()).forEach(([clientId, count]) => {
      console.log(`    ${clientId}: ${count}개`)
    })
  }
}

checkUTMLinksCreatedDate().catch(console.error)
