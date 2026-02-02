/**
 * 더미 전환 데이터 삭제 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function removeDummyEntries(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('더미 전환 데이터 삭제')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 더미 데이터 찾기 (이름에 "전환_" 포함)
  const { data: dummyEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, created_at, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .ilike('name', '%전환_%')
    .order('survey_no', { ascending: true })
  
  if (!dummyEntries || dummyEntries.length === 0) {
    console.log('  ✅ 더미 데이터가 없습니다.')
    return
  }
  
  console.log(`  발견된 더미 데이터: ${dummyEntries.length}개`)
  console.log('')
  console.log('  삭제할 항목:')
  dummyEntries.forEach((entry: any) => {
    console.log(`    - survey_no: ${entry.survey_no}, name: ${entry.name}, created_at: ${entry.created_at}`)
  })
  console.log('')
  
  // 삭제 확인
  const entryIds = dummyEntries.map(e => e.id)
  
  const { error: deleteError } = await admin
    .from('event_survey_entries')
    .delete()
    .in('id', entryIds)
  
  if (deleteError) {
    console.error('  ❌ 삭제 오류:', deleteError)
    return
  }
  
  console.log(`  ✅ ${dummyEntries.length}개 더미 데이터 삭제 완료`)
  console.log('')
  
  // 최종 확인
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('id')
    .eq('campaign_id', campaignId)
  
  console.log(`  최종 전환 데이터: ${finalEntries?.length || 0}개`)
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

removeDummyEntries(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
