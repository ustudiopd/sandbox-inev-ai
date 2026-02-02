import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * A3C659 캠페인에서 survey_no 43인 테스트 데이터 삭제 및 next_survey_no를 43으로 설정
 */
async function deleteSurvey43A3C659() {
  const admin = createAdminSupabase()
  
  console.log('=== A3C659 캠페인 survey_no 43 삭제 및 번호 재설정 ===\n')
  
  // 1. dashboard_code로 캠페인 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, dashboard_code, next_survey_no')
    .eq('dashboard_code', 'A3C659')
    .maybeSingle()
  
  if (campaignError) {
    console.error('❌ 캠페인 조회 실패:', campaignError.message)
    process.exit(1)
  }
  
  if (!campaign) {
    console.error('❌ A3C659 캠페인을 찾을 수 없습니다.')
    process.exit(1)
  }
  
  console.log(`✅ 캠페인 찾음: ${campaign.title}`)
  console.log(`   ID: ${campaign.id}`)
  console.log(`   현재 next_survey_no: ${campaign.next_survey_no}\n`)
  
  // 2. survey_no가 43인 entry 조회
  const { data: entry43, error: entryError } = await admin
    .from('event_survey_entries')
    .select('id, name, survey_no, code6, phone_norm, completed_at')
    .eq('campaign_id', campaign.id)
    .eq('survey_no', 43)
    .maybeSingle()
  
  if (entryError) {
    console.error('❌ entry 조회 실패:', entryError.message)
    process.exit(1)
  }
  
  if (!entry43) {
    console.log('⚠️  survey_no가 43인 entry를 찾을 수 없습니다.')
    console.log('\n현재 모든 entry 확인 중...')
    
    const { data: allEntries } = await admin
      .from('event_survey_entries')
      .select('id, name, survey_no, code6, phone_norm')
      .eq('campaign_id', campaign.id)
      .order('survey_no', { ascending: true })
      .limit(50)
    
    if (allEntries && allEntries.length > 0) {
      console.log('\n최근 entry들:')
      allEntries.forEach((entry: any) => {
        console.log(`  - ${entry.survey_no}: ${entry.name || '(이름 없음)'} (${entry.code6})`)
      })
    }
    
    // entry가 없어도 next_survey_no를 43으로 설정
    console.log('\n📝 next_survey_no를 43으로 설정 중...')
    const { error: updateError } = await admin
      .from('event_survey_campaigns')
      .update({ next_survey_no: 43 })
      .eq('id', campaign.id)
    
    if (updateError) {
      console.error('❌ next_survey_no 업데이트 실패:', updateError.message)
      process.exit(1)
    }
    
    console.log('✅ next_survey_no를 43으로 설정 완료!')
    return
  }
  
  console.log(`\n🔍 survey_no 43인 entry 발견:\n`)
  console.log(`   이름: ${entry43.name || '(이름 없음)'}`)
  console.log(`   survey_no: ${entry43.survey_no}`)
  console.log(`   code6: ${entry43.code6}`)
  console.log(`   전화번호: ${entry43.phone_norm}`)
  console.log(`   등록일시: ${entry43.completed_at}`)
  console.log()
  
  // 3. survey_no 43인 entry 삭제
  console.log('🗑️  survey_no 43인 entry 삭제 중...')
  const { error: deleteError } = await admin
    .from('event_survey_entries')
    .delete()
    .eq('campaign_id', campaign.id)
    .eq('survey_no', 43)
  
  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  
  console.log('✅ survey_no 43인 entry 삭제 완료!\n')
  
  // 4. next_survey_no를 43으로 설정
  console.log('📝 next_survey_no를 43으로 설정 중...')
  const { error: updateError } = await admin
    .from('event_survey_campaigns')
    .update({ next_survey_no: 43 })
    .eq('id', campaign.id)
  
  if (updateError) {
    console.error('❌ next_survey_no 업데이트 실패:', updateError.message)
    process.exit(1)
  }
  
  console.log('✅ next_survey_no를 43으로 설정 완료!')
  
  // 5. 확인
  const { data: updatedCampaign } = await admin
    .from('event_survey_campaigns')
    .select('next_survey_no')
    .eq('id', campaign.id)
    .single()
  
  console.log(`\n✅ 작업 완료!`)
  console.log(`   현재 next_survey_no: ${updatedCampaign?.next_survey_no}`)
  console.log(`   다음 등록자는 43번부터 시작됩니다.`)
}

deleteSurvey43A3C659().catch(console.error)
