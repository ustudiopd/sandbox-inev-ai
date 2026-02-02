import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findModuCampaignLinks() {
  const admin = createAdminSupabase()
  
  const clientId = 'a556c562-03c3-4988-8b88-ae0a96648514' // 모두의특강
  
  console.log('🔍 모두의특강 캠페인 링크 찾기...\n')
  console.log(`클라이언트 ID: ${clientId}\n`)
  
  // 활성 상태인 캠페인 링크 조회
  const { data: links, error } = await admin
    .from('campaign_link_meta')
    .select('id, cid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, status, created_at')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!links || links.length === 0) {
    console.log('⚠️ 활성 상태인 캠페인 링크가 없습니다.')
    console.log('\n대안: 모든 상태의 링크 찾기...')
    
    const { data: allLinks } = await admin
      .from('campaign_link_meta')
      .select('id, cid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allLinks && allLinks.length > 0) {
      console.log('\n모든 캠페인 링크:')
      allLinks.forEach(link => {
        console.log(`- CID: ${link.cid}`)
        console.log(`  ID: ${link.id}`)
        console.log(`  UTM Source: ${link.utm_source || '(없음)'}`)
        console.log(`  UTM Medium: ${link.utm_medium || '(없음)'}`)
        console.log(`  UTM Campaign: ${link.utm_campaign || '(없음)'}`)
        console.log(`  상태: ${link.status}`)
        console.log(`  생성일: ${link.created_at}`)
        console.log('')
      })
    }
    return
  }
  
  console.log(`✅ 활성 캠페인 링크: ${links.length}개\n`)
  
  links.forEach((link, index) => {
    console.log(`${index + 1}. CID: ${link.cid}`)
    console.log(`   ID: ${link.id}`)
    console.log(`   UTM Source: ${link.utm_source || '(없음)'}`)
    console.log(`   UTM Medium: ${link.utm_medium || '(없음)'}`)
    console.log(`   UTM Campaign: ${link.utm_campaign || '(없음)'}`)
    console.log(`   UTM Term: ${link.utm_term || '(없음)'}`)
    console.log(`   UTM Content: ${link.utm_content || '(없음)'}`)
    console.log(`   생성일: ${link.created_at}`)
    console.log('')
  })
  
  if (links.length > 0) {
    const firstLink = links[0]
    console.log(`\n📋 테스트용 링크:`)
    console.log(`  CID: ${firstLink.cid}`)
    console.log(`  테스트 URL: http://localhost:3000/event/test-survey-copy-modu?cid=${firstLink.cid}`)
    
    // UTM이 있으면 함께 포함
    if (firstLink.utm_source || firstLink.utm_medium || firstLink.utm_campaign) {
      const params = new URLSearchParams()
      params.set('cid', firstLink.cid)
      if (firstLink.utm_source) params.set('utm_source', firstLink.utm_source)
      if (firstLink.utm_medium) params.set('utm_medium', firstLink.utm_medium)
      if (firstLink.utm_campaign) params.set('utm_campaign', firstLink.utm_campaign)
      if (firstLink.utm_term) params.set('utm_term', firstLink.utm_term)
      if (firstLink.utm_content) params.set('utm_content', firstLink.utm_content)
      
      console.log(`  UTM 포함 URL: http://localhost:3000/event/test-survey-copy-modu?${params.toString()}`)
    }
  }
}

findModuCampaignLinks().catch(console.error)
