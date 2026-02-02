import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * A3C659 캠페인의 실제 카운트 확인
 */
async function verifyA3C659Count() {
  const admin = createAdminSupabase()
  
  console.log('=== A3C659 캠페인 카운트 확인 ===\n')
  
  // 1. dashboard_code로 캠페인 조회
  const { data: campaign, error: campaignError } = await admin
    .from('event_survey_campaigns')
    .select('id, title, dashboard_code')
    .eq('dashboard_code', 'A3C659')
    .maybeSingle()
  
  if (campaignError || !campaign) {
    console.error('❌ A3C659 캠페인을 찾을 수 없습니다.')
    process.exit(1)
  }
  
  console.log(`✅ 캠페인: ${campaign.title}`)
  console.log(`   ID: ${campaign.id}\n`)
  
  // 2. 실제 카운트 확인 (서버와 동일한 방식)
  const { count: completedCount, error: countError } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
  
  if (countError) {
    console.error('❌ 카운트 조회 실패:', countError.message)
    process.exit(1)
  }
  
  console.log(`📊 서버 API 방식 카운트: ${completedCount || 0}개\n`)
  
  // 3. 실제 데이터 개수 확인
  const { data: entries, error: entriesError } = await admin
    .from('event_survey_entries')
    .select('id, survey_no')
    .eq('campaign_id', campaign.id)
  
  if (entriesError) {
    console.error('❌ entry 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  console.log(`📊 실제 데이터 개수: ${entries?.length || 0}개`)
  console.log(`📊 최대 survey_no: ${Math.max(...(entries?.map(e => e.survey_no) || [0]))}`)
  
  if (completedCount !== entries?.length) {
    console.log(`\n⚠️  불일치 발견!`)
    console.log(`   서버 카운트: ${completedCount}`)
    console.log(`   실제 데이터: ${entries?.length}`)
  } else {
    console.log(`\n✅ 카운트 일치 확인!`)
  }
}

verifyA3C659Count().catch(console.error)
