import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const WERT_CAMPAIGN_ID = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
const TEST_EMAIL = 'ju@naver.com'

/**
 * 워트 캠페인에서 테스트 등록(ju@naver.com) 삭제 및 next_survey_no 재설정
 */
async function deleteWertTestEntry() {
  const admin = createAdminSupabase()
  
  console.log('=== 워트 캠페인 테스트 등록 삭제 및 번호 재설정 ===\n')
  
  // 1. 캠페인 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, next_survey_no')
    .eq('id', WERT_CAMPAIGN_ID)
    .maybeSingle()
  
  if (campaignError) {
    console.error('❌ 캠페인 조회 실패:', campaignError.message)
    process.exit(1)
  }
  
  if (!campaign) {
    console.error('❌ 워트 캠페인을 찾을 수 없습니다.')
    process.exit(1)
  }
  
  console.log(`✅ 캠페인 찾음: ${campaign.title}`)
  console.log(`   ID: ${campaign.id}`)
  console.log(`   현재 next_survey_no: ${campaign.next_survey_no}\n`)
  
  // 2. 테스트 등록 조회 (이메일로)
  const { data: allEntries, error: allError } = await admin
    .from('event_survey_entries')
    .select('*')
    .eq('campaign_id', WERT_CAMPAIGN_ID)
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (allError) {
    console.error('❌ 등록 조회 실패:', allError.message)
    process.exit(1)
  }
  
  // registration_data에서 이메일로 필터링
  const testEntry = allEntries?.find(entry => {
    if (entry.registration_data && typeof entry.registration_data === 'object') {
      const regData = entry.registration_data as any
      const entryEmail = regData.email || ''
      return entryEmail.toLowerCase() === TEST_EMAIL.toLowerCase()
    }
    return false
  })
  
  if (!testEntry) {
    console.log(`⚠️  이메일 "${TEST_EMAIL}"로 등록된 entry를 찾을 수 없습니다.`)
    console.log('\n최근 등록 확인 중...')
    
    if (allEntries && allEntries.length > 0) {
      console.log('\n최근 entry들:')
      allEntries.slice(0, 10).forEach((entry: any) => {
        const regData = entry.registration_data && typeof entry.registration_data === 'object' 
          ? entry.registration_data as any 
          : null
        const email = regData?.email || 'N/A'
        console.log(`  - survey_no ${entry.survey_no}: ${entry.name || '(이름 없음)'} (${email})`)
      })
    }
    
    return
  }
  
  console.log(`\n🔍 테스트 등록 발견:\n`)
  console.log(`   ID: ${testEntry.id}`)
  console.log(`   이름: ${testEntry.name || '(이름 없음)'}`)
  console.log(`   이메일: ${TEST_EMAIL}`)
  console.log(`   survey_no: ${testEntry.survey_no}`)
  console.log(`   code6: ${testEntry.code6}`)
  console.log(`   전화번호: ${testEntry.phone_norm}`)
  console.log(`   등록일시: ${testEntry.created_at}`)
  console.log()
  
  const targetSurveyNo = testEntry.survey_no
  
  // 3. 테스트 등록 삭제
  console.log(`🗑️  survey_no ${targetSurveyNo}인 테스트 등록 삭제 중...`)
  const { error: deleteError } = await admin
    .from('event_survey_entries')
    .delete()
    .eq('id', testEntry.id)
  
  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  
  console.log(`✅ survey_no ${targetSurveyNo}인 테스트 등록 삭제 완료!\n`)
  
  // 4. next_survey_no를 삭제한 번호로 설정
  console.log(`📝 next_survey_no를 ${targetSurveyNo}으로 설정 중...`)
  const { error: updateError } = await admin
    .from('event_survey_campaigns')
    .update({ next_survey_no: targetSurveyNo })
    .eq('id', WERT_CAMPAIGN_ID)
  
  if (updateError) {
    console.error('❌ next_survey_no 업데이트 실패:', updateError.message)
    process.exit(1)
  }
  
  console.log(`✅ next_survey_no를 ${targetSurveyNo}으로 설정 완료!\n`)
  
  // 5. 확인
  const { data: updatedCampaign } = await admin
    .from('event_survey_campaigns')
    .select('next_survey_no')
    .eq('id', WERT_CAMPAIGN_ID)
    .maybeSingle()
  
  if (updatedCampaign) {
    console.log('=' .repeat(60))
    console.log('\n✅ 작업 완료!\n')
    console.log(`   삭제된 survey_no: ${targetSurveyNo}`)
    console.log(`   현재 next_survey_no: ${updatedCampaign.next_survey_no}`)
    console.log(`\n   다음 등록부터는 survey_no ${targetSurveyNo}부터 시작됩니다.\n`)
  }
}

deleteWertTestEntry().catch(console.error)
