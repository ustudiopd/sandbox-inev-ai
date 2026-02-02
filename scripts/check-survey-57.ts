import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkSurvey57() {
  const admin = createAdminSupabase()
  
  const campaignId = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6' // Test 설문조사 복사본
  const surveyNo = 57
  
  console.log('🔍 설문 57번 확인...\n')
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`설문 번호: ${surveyNo}\n`)
  
  // 설문 57번 직접 조회
  const { data: entry, error } = await admin
    .from('event_survey_entries')
    .select('id, name, phone_norm, survey_no, code6, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id, created_at, completed_at')
    .eq('campaign_id', campaignId)
    .eq('survey_no', surveyNo)
    .single()
  
  if (error) {
    console.error('❌ 조회 실패:', error)
    return
  }
  
  if (!entry) {
    console.log('⚠️ 설문 57번을 찾을 수 없습니다.')
    return
  }
  
  console.log('✅ 설문 57번 정보:')
  console.log(`- 이름: ${entry.name || '(없음)'}`)
  console.log(`- 전화번호: ${entry.phone_norm || '(없음)'}`)
  console.log(`- 설문 번호: ${entry.survey_no}`)
  console.log(`- 코드6: ${entry.code6}`)
  console.log(`- 생성일: ${entry.created_at}`)
  console.log(`- 완료일: ${entry.completed_at}`)
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
}

checkSurvey57().catch(console.error)
