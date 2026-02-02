import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 캠페인의 registration_data 필드 확인
 */
async function checkRegistrationDataFields() {
  const campaignId = process.argv[2]
  
  if (!campaignId) {
    console.error('사용법: npx tsx scripts/check-registration-data-fields.ts <campaignId>')
    process.exit(1)
  }
  
  const admin = createAdminSupabase()
  
  console.log(`=== 캠페인 ${campaignId}의 registration_data 필드 확인 ===\n`)
  
  // 캠페인 정보 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, public_path')
    .eq('id', campaignId)
    .maybeSingle()
  
  if (campaignError || !campaign) {
    console.error('❌ 캠페인을 찾을 수 없습니다.')
    process.exit(1)
  }
  
  console.log(`✅ 캠페인: ${campaign.title}`)
  console.log(`   Public Path: ${campaign.public_path}\n`)
  
  // 등록 데이터 조회
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, registration_data')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
    .limit(20)
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️  등록 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 총 ${entries.length}개 항목 확인\n`)
  
  // 각 항목의 registration_data 필드 확인
  entries.forEach((entry: any, index: number) => {
    const regData = entry.registration_data || {}
    
    console.log(`${index + 1}. Survey No: ${entry.survey_no}, 이름: ${entry.name || '(없음)'}`)
    console.log(`   registration_data 필드:`)
    console.log(`     - position: ${regData.position || '(없음)'}`)
    console.log(`     - jobTitle: ${regData.jobTitle || '(없음)'}`)
    console.log(`     - yearsOfExperience: ${regData.yearsOfExperience || '(없음)'}`)
    console.log(`     - question: ${regData.question || '(없음)'}`)
    console.log(`     - message: ${regData.message || '(없음)'}`)
    console.log(`     - department: ${regData.department || '(없음)'}`)
    console.log(`     - organization: ${regData.organization || '(없음)'}`)
    console.log(`     - email: ${regData.email || '(없음)'}`)
    console.log(`   전체 registration_data:`, JSON.stringify(regData, null, 2))
    console.log('')
  })
  
  // 필드별 통계
  const fieldStats = {
    position: 0,
    jobTitle: 0,
    yearsOfExperience: 0,
    question: 0,
    message: 0,
    department: 0,
    organization: 0,
    email: 0,
  }
  
  entries.forEach((entry: any) => {
    const regData = entry.registration_data || {}
    if (regData.position) fieldStats.position++
    if (regData.jobTitle) fieldStats.jobTitle++
    if (regData.yearsOfExperience) fieldStats.yearsOfExperience++
    if (regData.question) fieldStats.question++
    if (regData.message) fieldStats.message++
    if (regData.department) fieldStats.department++
    if (regData.organization) fieldStats.organization++
    if (regData.email) fieldStats.email++
  })
  
  console.log('📈 필드별 통계:')
  console.log(`   position: ${fieldStats.position}/${entries.length}`)
  console.log(`   jobTitle: ${fieldStats.jobTitle}/${entries.length}`)
  console.log(`   yearsOfExperience: ${fieldStats.yearsOfExperience}/${entries.length}`)
  console.log(`   question: ${fieldStats.question}/${entries.length}`)
  console.log(`   message: ${fieldStats.message}/${entries.length}`)
  console.log(`   department: ${fieldStats.department}/${entries.length}`)
  console.log(`   organization: ${fieldStats.organization}/${entries.length}`)
  console.log(`   email: ${fieldStats.email}/${entries.length}`)
}

checkRegistrationDataFields().catch(console.error)
