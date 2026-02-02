import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkTest1UTM() {
  const admin = createAdminSupabase()
  
  console.log('🔍 테스트1 계정 찾기...\n')
  
  // 모든 클라이언트 조회 (테스트 관련)
  const { data: allClients, error: allError } = await admin
    .from('clients')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (allError) {
    console.error('❌ 전체 조회 실패:', allError)
    return
  }
  
  // 테스트 관련 계정 필터링 (더 넓게)
  const testClients = (allClients || []).filter(c => 
    c.name && (
      c.name.includes('테스트1') || 
      c.name.includes('test1') || 
      c.name.includes('Test1') ||
      c.name.includes('테스트') ||
      c.name.toLowerCase().includes('test')
    )
  )
  
  if (testClients.length === 0) {
    console.log('⚠️ 테스트 관련 계정을 찾을 수 없습니다.')
    console.log('\n전체 클라이언트 목록 (최근 20개):')
    if (allClients && allClients.length > 0) {
      allClients.slice(0, 20).forEach(c => {
        console.log(`- ${c.name}: ${c.id}`)
      })
    }
    return
  }
  
  console.log('✅ 테스트 관련 계정:')
  testClients.forEach(c => {
    console.log(`- ${c.name}: ${c.id}`)
  })
  console.log('')
  
  const clientId = testClients[0].id
  const clientName = testClients[0].name
  
  console.log(`✅ 사용할 계정: ${clientName} (${clientId})\n`)
  
  // 캠페인 목록 조회
  console.log('📊 캠페인 목록 조회...\n')
  const { data: campaigns, error: campaignsError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, type, public_path, status, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (campaignsError) {
    console.error('❌ 캠페인 조회 실패:', campaignsError)
    return
  }
  
  if (!campaigns || campaigns.length === 0) {
    console.log('⚠️ 캠페인이 없습니다.')
    return
  }
  
  console.log(`✅ 캠페인 ${campaigns.length}개:\n`)
  campaigns.forEach((campaign, index) => {
    console.log(`${index + 1}. ${campaign.title}`)
    console.log(`   타입: ${campaign.type}`)
    console.log(`   경로: ${campaign.public_path}`)
    console.log(`   상태: ${campaign.status}`)
    console.log(`   ID: ${campaign.id}\n`)
  })
  
  // 각 캠페인별 최근 항목의 UTM 확인
  console.log('📊 최근 항목 UTM 확인...\n')
  
  for (const campaign of campaigns) {
    console.log(`\n📋 캠페인: ${campaign.title} (${campaign.type})`)
    console.log(`   경로: ${campaign.public_path}`)
    
    const { data: entries, error: entriesError } = await admin
      .from('event_survey_entries')
      .select('id, name, phone_norm, survey_no, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, created_at')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (entriesError) {
      console.error(`   ❌ 항목 조회 실패:`, entriesError)
      continue
    }
    
    if (!entries || entries.length === 0) {
      console.log(`   ⚠️ 항목이 없습니다.`)
      continue
    }
    
    console.log(`   ✅ 최근 ${entries.length}개 항목:\n`)
    
    entries.forEach((entry, index) => {
      const hasUTM = entry.utm_source || entry.utm_medium || entry.utm_campaign
      const hasLinkId = !!entry.marketing_campaign_link_id
      const marker = hasUTM || hasLinkId ? '🎯' : '  '
      
      console.log(`   ${marker}${index + 1}. ${entry.name || '이름 없음'} (${entry.phone_norm || '전화번호 없음'})`)
      console.log(`      설문번호: ${entry.survey_no}`)
      console.log(`      생성일: ${entry.created_at}`)
      
      if (hasUTM) {
        console.log(`      UTM Source: ${entry.utm_source || '(없음)'}`)
        console.log(`      UTM Medium: ${entry.utm_medium || '(없음)'}`)
        console.log(`      UTM Campaign: ${entry.utm_campaign || '(없음)'}`)
        console.log(`      UTM Term: ${entry.utm_term || '(없음)'}`)
        console.log(`      UTM Content: ${entry.utm_content || '(없음)'}`)
      } else {
        console.log(`      UTM: (없음)`)
      }
      
      if (hasLinkId) {
        console.log(`      링크 ID: ${entry.marketing_campaign_link_id}`)
      } else {
        console.log(`      링크 ID: (없음)`)
      }
      
      console.log('')
    })
    
    const withUTM = entries.filter(e => e.utm_source || e.utm_medium || e.utm_campaign)
    const withLinkId = entries.filter(e => e.marketing_campaign_link_id)
    
    console.log(`   📊 통계:`)
    console.log(`      총 항목: ${entries.length}개`)
    console.log(`      UTM 있음: ${withUTM.length}개`)
    console.log(`      링크 ID 있음: ${withLinkId.length}개`)
  }
  
  console.log('\n✅ 확인 완료!')
}

checkTest1UTM().catch(console.error)
