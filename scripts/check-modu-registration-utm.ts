import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkModuRegistrationUTM() {
  const admin = createAdminSupabase()
  
  const campaignId = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98' // 등록 페이지 테스트 캠페인 ID
  
  console.log('🔍 모두의특강 등록 페이지 UTM 확인...\n')
  console.log(`캠페인 ID: ${campaignId}\n`)
  
  // 최신 항목 확인
  const { data: latestEntries, error: latestError } = await admin
    .from('event_survey_entries')
    .select('id, name, phone_norm, survey_no, code6, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, created_at, completed_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (latestError) {
    console.error('❌ 조회 실패:', latestError)
    return
  }
  
  if (!latestEntries || latestEntries.length === 0) {
    console.log('⚠️ 항목이 없습니다.')
    return
  }
  
  console.log(`✅ 최근 ${latestEntries.length}개 항목:\n`)
  
  latestEntries.forEach((entry, index) => {
    const hasUTM = entry.utm_source || entry.utm_medium || entry.utm_campaign
    const hasLinkId = !!entry.marketing_campaign_link_id
    const marker = hasUTM || hasLinkId ? '🎯' : '  '
    
    console.log(`${marker}${index + 1}. 설문번호: ${entry.survey_no}, 코드: ${entry.code6}`)
    console.log(`   이름: ${entry.name || '(없음)'}`)
    console.log(`   전화번호: ${entry.phone_norm || '(없음)'}`)
    console.log(`   생성일: ${entry.created_at}`)
    
    if (hasUTM) {
      console.log(`   UTM Source: ${entry.utm_source || '(없음)'}`)
      console.log(`   UTM Medium: ${entry.utm_medium || '(없음)'}`)
      console.log(`   UTM Campaign: ${entry.utm_campaign || '(없음)'}`)
      console.log(`   UTM Term: ${entry.utm_term || '(없음)'}`)
      console.log(`   UTM Content: ${entry.utm_content || '(없음)'}`)
    } else {
      console.log(`   UTM: (없음)`)
    }
    
    if (hasLinkId) {
      console.log(`   링크 ID: ${entry.marketing_campaign_link_id}`)
    } else {
      console.log(`   링크 ID: (없음)`)
    }
    console.log('')
  })
  
  // 가장 최신 항목 상세 확인
  const entry = latestEntries[0]
  
  console.log('\n📋 가장 최신 항목 상세 정보:')
  console.log(`- 이름: ${entry.name || '(없음)'}`)
  console.log(`- 전화번호: ${entry.phone_norm || '(없음)'}`)
  console.log(`- 설문 번호: ${entry.survey_no}`)
  console.log(`- 코드6: ${entry.code6}`)
  console.log(`- 생성일: ${entry.created_at}`)
  if (entry.completed_at) {
    console.log(`- 완료일: ${entry.completed_at}`)
  }
  console.log('')
  console.log('📊 UTM 정보:')
  console.log(`- UTM Source: ${entry.utm_source || '(없음)'}`)
  console.log(`- UTM Medium: ${entry.utm_medium || '(없음)'}`)
  console.log(`- UTM Campaign: ${entry.utm_campaign || '(없음)'}`)
  console.log(`- UTM Term: ${entry.utm_term || '(없음)'}`)
  console.log(`- UTM Content: ${entry.utm_content || '(없음)'}`)
  console.log('')
  console.log('🔗 링크 정보:')
  console.log(`- marketing_campaign_link_id: ${entry.marketing_campaign_link_id || '(없음)'}`)
  
  if (entry.marketing_campaign_link_id) {
    // 링크 정보도 조회
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('id, cid, name, utm_source, utm_medium, utm_campaign')
      .eq('id', entry.marketing_campaign_link_id)
      .single()
    
    if (link) {
      console.log('')
      console.log('✅ 링크 상세 정보:')
      console.log(`- 링크 이름: ${link.name}`)
      console.log(`- CID: ${link.cid}`)
      console.log(`- 링크의 UTM Source: ${link.utm_source || '(없음)'}`)
      console.log(`- 링크의 UTM Medium: ${link.utm_medium || '(없음)'}`)
      console.log(`- 링크의 UTM Campaign: ${link.utm_campaign || '(없음)'}`)
    }
  } else {
    console.log('')
    console.log('⚠️ marketing_campaign_link_id가 없습니다. CID가 저장되지 않았습니다.')
  }
  
  // UTM이 있는지 확인
  const hasUTM = entry.utm_source || entry.utm_medium || entry.utm_campaign
  if (!hasUTM) {
    console.log('')
    console.log('⚠️ UTM 파라미터가 저장되지 않았습니다.')
    console.log('   등록 시 UTM 파라미터가 URL에 포함되어 있었는지 확인해주세요.')
  } else {
    console.log('')
    console.log('✅ UTM 파라미터가 정상적으로 저장되었습니다!')
  }
}

checkModuRegistrationUTM().catch(console.error)
