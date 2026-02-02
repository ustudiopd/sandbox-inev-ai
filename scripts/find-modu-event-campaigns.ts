import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findModuEventCampaigns() {
  const admin = createAdminSupabase()
  
  const clientId = 'a556c562-03c3-4988-8b88-ae0a96648514'
  
  console.log('🔍 모두의특강 event 캠페인 찾기...\n')
  
  // 등록 타입 캠페인 찾기
  const { data: campaigns, error } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path, type, status, created_at')
    .eq('client_id', clientId)
    .eq('type', 'registration')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!campaigns || campaigns.length === 0) {
    console.log('⚠️ 등록 타입 캠페인을 찾을 수 없습니다.')
    console.log('\n대안: 모든 타입의 캠페인 찾기...')
    
    const { data: allCampaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, title, public_path, type, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allCampaigns && allCampaigns.length > 0) {
      console.log('\n모든 캠페인:')
      allCampaigns.forEach(c => {
        console.log(`- ${c.title} (${c.type})`)
        console.log(`  ID: ${c.id}`)
        console.log(`  Public Path: ${c.public_path}`)
        console.log(`  상태: ${c.status}`)
        console.log(`  생성일: ${c.created_at}`)
        console.log(`  URL: https://eventflow.kr/event${c.public_path}`)
        console.log('')
      })
    }
    return
  }
  
  console.log('✅ 등록 타입 캠페인:')
  campaigns.forEach(c => {
    console.log(`- ${c.title}`)
    console.log(`  ID: ${c.id}`)
    console.log(`  Public Path: ${c.public_path}`)
    console.log(`  상태: ${c.status}`)
    console.log(`  생성일: ${c.created_at}`)
    console.log(`  URL: https://eventflow.kr/event${c.public_path}`)
    console.log('')
  })
  
  if (campaigns.length > 0) {
    const firstCampaign = campaigns[0]
    console.log(`\n📋 테스트용 캠페인:`)
    console.log(`  제목: ${firstCampaign.title}`)
    console.log(`  Public Path: ${firstCampaign.public_path}`)
    console.log(`  등록 페이지: https://eventflow.kr/event${firstCampaign.public_path}/register`)
    console.log(`  UTM 테스트 URL: https://eventflow.kr/event${firstCampaign.public_path}/register?utm_source=test&utm_medium=email&utm_campaign=modu_test`)
  }
}

findModuEventCampaigns().catch(console.error)
