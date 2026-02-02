/**
 * survey_no 176, 177 삭제
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function delete176177(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('survey_no 176, 177 삭제')
  console.log('='.repeat(80))
  console.log('')
  
  // 삭제할 데이터 확인
  const { data: entriesToDelete } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, phone_norm')
    .eq('campaign_id', campaignId)
    .in('survey_no', [176, 177])
  
  if (!entriesToDelete || entriesToDelete.length === 0) {
    console.log('삭제할 데이터가 없습니다.')
    return
  }
  
  console.log(`삭제할 데이터: ${entriesToDelete.length}개`)
  entriesToDelete.forEach((e: any) => {
    console.log(`  survey_no ${e.survey_no}: ${e.name} (${e.phone_norm})`)
  })
  console.log('')
  
  // 삭제 실행
  const entryIds = entriesToDelete.map(e => e.id)
  const { error } = await admin
    .from('event_survey_entries')
    .delete()
    .in('id', entryIds)
  
  if (error) {
    console.error(`❌ 삭제 실패: ${error.message}`)
    return
  }
  
  console.log(`✅ ${entriesToDelete.length}개 데이터 삭제 완료`)
  console.log('')
  
  // 최종 확인
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .not('name', 'ilike', '%[보정]%')
    .not('name', 'ilike', '%[복구]%')
    .order('survey_no', { ascending: true })
  
  const finalCount = finalEntries?.length || 0
  const finalSurveyNos = finalEntries?.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b) || []
  
  console.log('최종 상태:')
  console.log(`  전체 실제 데이터: ${finalCount}개`)
  if (finalSurveyNos.length > 0) {
    console.log(`  survey_no 범위: ${finalSurveyNos[0]} ~ ${finalSurveyNos[finalSurveyNos.length - 1]}`)
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 삭제 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

delete176177(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
