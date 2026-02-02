import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function testModuSurveyUTM() {
  const admin = createAdminSupabase()
  
  const campaignId = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6' // Test 설문조사 복사본
  
  console.log('🔍 모두의특강 설문조사 UTM 저장 상태 확인...\n')
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`Public Path: /test-survey-copy-modu`)
  console.log(`테스트 URL: https://eventflow.kr/event/test-survey-copy-modu?utm_source=test&utm_medium=email&utm_campaign=modu_test\n`)
  
  // 최근 10개 항목 조회
  const { data: entries, error } = await admin
    .from('event_survey_entries')
    .select('id, name, phone_norm, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️ 아직 제출된 항목이 없습니다.')
    console.log('\n📝 테스트 방법:')
    console.log('1. 다음 URL로 접속:')
    console.log('   https://eventflow.kr/event/test-survey-copy-modu?utm_source=test&utm_medium=email&utm_campaign=modu_test')
    console.log('2. 설문조사 완료')
    console.log('3. 이 스크립트를 다시 실행하여 UTM 저장 확인')
    return
  }
  
  console.log(`✅ 총 ${entries.length}개 항목 발견\n`)
  
  // UTM 저장 통계
  const withUTM = entries.filter(e => e.utm_source || e.utm_medium || e.utm_campaign)
  const withoutUTM = entries.filter(e => !e.utm_source && !e.utm_medium && !e.utm_campaign)
  const withLinkId = entries.filter(e => e.marketing_campaign_link_id)
  
  console.log('📊 UTM 저장 통계:')
  console.log(`- UTM 있음: ${withUTM.length}개`)
  console.log(`- UTM 없음: ${withoutUTM.length}개`)
  console.log(`- 링크 ID 있음: ${withLinkId.length}개\n`)
  
  // 최근 항목 상세
  console.log('📋 최근 항목 상세:')
  entries.forEach((entry, index) => {
    console.log(`\n${index + 1}. ${entry.name || '이름 없음'} (${entry.phone_norm || '전화번호 없음'})`)
    console.log(`   생성일: ${entry.created_at}`)
    console.log(`   UTM Source: ${entry.utm_source || '(없음)'}`)
    console.log(`   UTM Medium: ${entry.utm_medium || '(없음)'}`)
    console.log(`   UTM Campaign: ${entry.utm_campaign || '(없음)'}`)
    console.log(`   UTM Term: ${entry.utm_term || '(없음)'}`)
    console.log(`   UTM Content: ${entry.utm_content || '(없음)'}`)
    console.log(`   링크 ID: ${entry.marketing_campaign_link_id || '(없음)'}`)
  })
  
  // 테스트 항목 확인
  const testEntries = entries.filter(e => 
    e.utm_source === 'test' || 
    e.utm_campaign === 'modu_test'
  )
  
  if (testEntries.length > 0) {
    console.log(`\n✅ 테스트 항목 발견: ${testEntries.length}개`)
    testEntries.forEach(entry => {
      console.log(`- ${entry.name} (${entry.created_at})`)
      console.log(`  UTM: source=${entry.utm_source}, medium=${entry.utm_medium}, campaign=${entry.utm_campaign}`)
    })
  } else {
    console.log('\n⚠️ 테스트 항목이 아직 없습니다.')
    console.log('   UTM 파라미터가 포함된 URL로 설문조사를 완료해주세요.')
  }
}

testModuSurveyUTM().catch(console.error)
