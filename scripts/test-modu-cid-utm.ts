import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function testModuCIDUTM() {
  const admin = createAdminSupabase()
  
  const campaignId = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6' // Test 설문조사 복사본
  const expectedLinkId = '58b5731a-8aab-4092-baf8-ff10c31c337f' // 생성한 테스트 링크 ID
  const expectedCid = 'KYYV8F87' // 생성한 테스트 CID
  
  console.log('🔍 모두의특강 CID 테스트 결과 확인...\n')
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`예상 링크 ID: ${expectedLinkId}`)
  console.log(`예상 CID: ${expectedCid}\n`)
  
  // 최근 5개 항목 조회 (cid 테스트 항목 확인)
  const { data: entries, error } = await admin
    .from('event_survey_entries')
    .select('id, name, phone_norm, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️ 항목이 없습니다.')
    return
  }
  
  console.log(`✅ 최근 ${entries.length}개 항목:\n`)
  
  // CID 테스트 항목 찾기
  const cidTestEntries = entries.filter(e => 
    e.marketing_campaign_link_id === expectedLinkId ||
    (e.utm_campaign === 'cid_test' || e.utm_source === 'test_cid')
  )
  
  entries.forEach((entry, index) => {
    const isCidTest = entry.marketing_campaign_link_id === expectedLinkId
    const marker = isCidTest ? '🎯' : '  '
    
    console.log(`${marker}${index + 1}. ${entry.name || '이름 없음'} (${entry.phone_norm || '전화번호 없음'})`)
    console.log(`   생성일: ${entry.created_at}`)
    console.log(`   UTM Source: ${entry.utm_source || '(없음)'}`)
    console.log(`   UTM Medium: ${entry.utm_medium || '(없음)'}`)
    console.log(`   UTM Campaign: ${entry.utm_campaign || '(없음)'}`)
    console.log(`   UTM Term: ${entry.utm_term || '(없음)'}`)
    console.log(`   UTM Content: ${entry.utm_content || '(없음)'}`)
    console.log(`   링크 ID: ${entry.marketing_campaign_link_id || '(없음)'}`)
    
    if (isCidTest) {
      console.log(`   ✅ CID 테스트 항목 확인됨!`)
      if (entry.marketing_campaign_link_id === expectedLinkId) {
        console.log(`   ✅ marketing_campaign_link_id 정상 저장`)
      } else {
        console.log(`   ⚠️ marketing_campaign_link_id 불일치 (예상: ${expectedLinkId}, 실제: ${entry.marketing_campaign_link_id})`)
      }
    }
    console.log('')
  })
  
  // 통계
  const withLinkId = entries.filter(e => e.marketing_campaign_link_id)
  const withUTM = entries.filter(e => e.utm_source || e.utm_medium || e.utm_campaign)
  
  console.log('📊 통계:')
  console.log(`- 총 항목: ${entries.length}개`)
  console.log(`- 링크 ID 있음: ${withLinkId.length}개`)
  console.log(`- UTM 있음: ${withUTM.length}개`)
  console.log(`- CID 테스트 항목: ${cidTestEntries.length}개\n`)
  
  if (cidTestEntries.length > 0) {
    console.log('✅ CID 테스트 성공!')
    cidTestEntries.forEach(entry => {
      console.log(`- ${entry.name} (${entry.created_at})`)
      console.log(`  UTM: source=${entry.utm_source}, medium=${entry.utm_medium}, campaign=${entry.utm_campaign}`)
      console.log(`  링크 ID: ${entry.marketing_campaign_link_id}`)
    })
  } else {
    console.log('⚠️ CID 테스트 항목이 아직 없습니다.')
    console.log('   CID가 포함된 URL로 설문조사를 완료해주세요.')
  }
  
  // 링크 정보 확인
  console.log('\n🔗 링크 정보 확인:')
  const { data: link } = await admin
    .from('campaign_link_meta')
    .select('id, cid, utm_source, utm_medium, utm_campaign, name')
    .eq('id', expectedLinkId)
    .single()
  
  if (link) {
    console.log(`- 이름: ${link.name}`)
    console.log(`- CID: ${link.cid}`)
    console.log(`- 링크의 UTM Source: ${link.utm_source}`)
    console.log(`- 링크의 UTM Medium: ${link.utm_medium}`)
    console.log(`- 링크의 UTM Campaign: ${link.utm_campaign}`)
  } else {
    console.log(`⚠️ 링크를 찾을 수 없습니다 (ID: ${expectedLinkId})`)
  }
}

testModuCIDUTM().catch(console.error)
