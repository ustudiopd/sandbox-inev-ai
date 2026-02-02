import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 최근 등록 항목의 registration_data 확인
 */
async function checkLatestEntryRegistrationData() {
  const campaignId = process.argv[2]
  
  if (!campaignId) {
    console.error('사용법: npx tsx scripts/check-latest-entry-registration-data.ts <campaignId>')
    process.exit(1)
  }
  
  const admin = createAdminSupabase()
  
  console.log(`=== 캠페인 ${campaignId}의 최근 등록 데이터 확인 ===\n`)
  
  // 최근 등록 5개 조회
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, registration_data, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  등록 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 최근 ${entries.length}개 항목 확인\n`)
  
  entries.forEach((entry: any, index: number) => {
    const regData = entry.registration_data || {}
    
    console.log(`${index + 1}. Survey No: ${entry.survey_no}, 이름: ${entry.name || '(없음)'}`)
    console.log(`   등록일시: ${new Date(entry.created_at).toLocaleString('ko-KR')}`)
    console.log(`   registration_data 전체:`)
    console.log(JSON.stringify(regData, null, 4))
    console.log('')
  })
}

checkLatestEntryRegistrationData().catch(console.error)
