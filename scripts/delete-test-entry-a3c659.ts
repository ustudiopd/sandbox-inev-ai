import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function deleteTestEntryA3C659() {
  const admin = createAdminSupabase()
  
  console.log('=== A3C659 캠페인 테스트 계정 삭제 및 번호 재설정 ===\n')
  
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
  
  // 2. "테스트" 이름의 entry 조회
  const { data: testEntries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, name, survey_no, code6, phone_norm, completed_at')
    .eq('campaign_id', campaign.id)
    .eq('name', '테스트')
    .order('survey_no', { ascending: true })
  
  if (entriesError) {
    console.error('❌ 테스트 계정 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!testEntries || testEntries.length === 0) {
    console.log('⚠️  "테스트" 이름의 계정을 찾을 수 없습니다.')
    console.log('\n현재 모든 entry 확인 중...')
    
    const { data: allEntries } = await admin
      .from('event_survey_entries')
      .select('id, name, survey_no, code6, phone_norm')
      .eq('campaign_id', campaign.id)
      .order('survey_no', { ascending: true })
      .limit(10)
    
    if (allEntries && allEntries.length > 0) {
      console.log('\n최근 10개 entry:')
      allEntries.forEach((entry: any) => {
        console.log(`  - ${entry.survey_no}: ${entry.name || '(이름 없음)'} (${entry.code6})`)
      })
    }
    
    // 테스트 계정이 없어도 next_survey_no를 41로 설정
    console.log('\n📝 next_survey_no를 41로 설정 중...')
    const { error: updateError } = await admin
      .from('event_survey_campaigns')
      .update({ next_survey_no: 41 })
      .eq('id', campaign.id)
    
    if (updateError) {
      console.error('❌ next_survey_no 업데이트 실패:', updateError.message)
      process.exit(1)
    }
    
    console.log('✅ next_survey_no를 41로 설정 완료!')
    return
  }
  
  console.log(`\n🔍 "테스트" 계정 ${testEntries.length}개 발견:\n`)
  testEntries.forEach((entry: any, index: number) => {
    console.log(`${index + 1}. survey_no: ${entry.survey_no}, code6: ${entry.code6}, phone: ${entry.phone_norm}`)
  })
  console.log()
  
  // 3. 테스트 계정 삭제
  console.log('🗑️  테스트 계정 삭제 중...')
  const { error: deleteError } = await admin
    .from('event_survey_entries')
    .delete()
    .eq('campaign_id', campaign.id)
    .eq('name', '테스트')
  
  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  
  console.log(`✅ ${testEntries.length}개의 테스트 계정 삭제 완료!\n`)
  
  // 4. next_survey_no를 41로 설정
  console.log('📝 next_survey_no를 41로 설정 중...')
  const { error: updateError } = await admin
    .from('event_survey_campaigns')
    .update({ next_survey_no: 41 })
    .eq('id', campaign.id)
  
  if (updateError) {
    console.error('❌ next_survey_no 업데이트 실패:', updateError.message)
    process.exit(1)
  }
  
  console.log('✅ next_survey_no를 41로 설정 완료!')
  
  // 5. 확인
  const { data: updatedCampaign } = await admin
    .from('event_survey_campaigns')
    .select('next_survey_no')
    .eq('id', campaign.id)
    .single()
  
  console.log(`\n✅ 작업 완료!`)
  console.log(`   현재 next_survey_no: ${updatedCampaign?.next_survey_no}`)
  console.log(`   다음 등록자는 41번부터 시작됩니다.`)
}

deleteTestEntryA3C659().catch(console.error)
