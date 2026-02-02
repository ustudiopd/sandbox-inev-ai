import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * A3C659 캠페인의 survey_no 분포 확인
 */
async function checkA3C659SurveyNumbers() {
  const admin = createAdminSupabase()
  
  console.log('=== A3C659 캠페인 survey_no 분포 확인 ===\n')
  
  // 1. dashboard_code로 캠페인 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, dashboard_code, next_survey_no')
    .eq('dashboard_code', 'A3C659')
    .maybeSingle()
  
  if (campaignError || !campaign) {
    console.error('❌ A3C659 캠페인을 찾을 수 없습니다.')
    process.exit(1)
  }
  
  console.log(`✅ 캠페인: ${campaign.title}`)
  console.log(`   ID: ${campaign.id}`)
  console.log(`   현재 next_survey_no: ${campaign.next_survey_no}\n`)
  
  // 2. 모든 entry 조회
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, name, survey_no, code6, phone_norm, completed_at')
    .eq('campaign_id', campaign.id)
    .order('survey_no', { ascending: true })
  
  if (entriesError) {
    console.error('❌ entry 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  console.log(`📊 총 entry 수: ${entries?.length || 0}개\n`)
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  등록된 entry가 없습니다.')
    return
  }
  
  // 3. survey_no 분포 확인
  const surveyNos = entries.map(e => e.survey_no).sort((a, b) => a - b)
  const minSurveyNo = Math.min(...surveyNos)
  const maxSurveyNo = Math.max(...surveyNos)
  
  console.log(`📈 survey_no 범위: ${minSurveyNo} ~ ${maxSurveyNo}`)
  console.log(`   최대 survey_no: ${maxSurveyNo}`)
  console.log(`   실제 entry 수: ${entries.length}개`)
  console.log(`   차이: ${maxSurveyNo - entries.length}개\n`)
  
  // 4. 누락된 survey_no 확인
  const missingNos: number[] = []
  for (let i = minSurveyNo; i <= maxSurveyNo; i++) {
    if (!surveyNos.includes(i)) {
      missingNos.push(i)
    }
  }
  
  if (missingNos.length > 0) {
    console.log(`⚠️  누락된 survey_no (${missingNos.length}개):`)
    console.log(`   ${missingNos.join(', ')}\n`)
  } else {
    console.log(`✅ 모든 survey_no가 연속적으로 존재합니다.\n`)
  }
  
  // 5. 최근 10개 entry 표시
  console.log('📋 최근 10개 entry:')
  entries.slice(-10).forEach((entry: any) => {
    console.log(`   ${entry.survey_no.toString().padStart(3)}: ${entry.name || '(이름 없음)'} (${entry.code6})`)
  })
  
  console.log('\n✅ 확인 완료!')
}

checkA3C659SurveyNumbers().catch(console.error)
