/**
 * 모든 참여자 데이터 확인 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkAllEntries(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('모든 참여자 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 전체 데이터
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, completed_at, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 참여자 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 더미 데이터
  const dummyEntries = allEntries?.filter(e => e.name?.includes('[보정]')) || []
  console.log(`더미 데이터 ([보정] 포함): ${dummyEntries.length}개`)
  
  // 실제 데이터
  const realEntries = allEntries?.filter(e => !e.name?.includes('[보정]')) || []
  console.log(`실제 데이터: ${realEntries.length}개`)
  console.log('')
  
  // 날짜별 분류
  const byDate = new Map<string, number>()
  allEntries?.forEach((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    byDate.set(dateStr, (byDate.get(dateStr) || 0) + 1)
  })
  
  console.log('날짜별 분포:')
  Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, count]) => {
      const dummyCount = allEntries?.filter(e => {
        const eDate = new Date(e.completed_at).toISOString().split('T')[0]
        return eDate === date && e.name?.includes('[보정]')
      }).length || 0
      const realCount = count - dummyCount
      console.log(`  ${date}: 총 ${count}개 (실제: ${realCount}개, 더미: ${dummyCount}개)`)
    })
  
  console.log('')
  
  // survey_no 범위 확인
  if (allEntries && allEntries.length > 0) {
    const surveyNos = allEntries.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b)
    console.log(`survey_no 범위: ${surveyNos[0]} ~ ${surveyNos[surveyNos.length - 1]}`)
    console.log('')
    
    // 실제 데이터의 survey_no 범위
    const realSurveyNos = realEntries.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b)
    if (realSurveyNos.length > 0) {
      console.log(`실제 데이터 survey_no 범위: ${realSurveyNos[0]} ~ ${realSurveyNos[realSurveyNos.length - 1]}`)
    }
  }
  
  console.log('')
  console.log('='.repeat(80))
  
  // 상위 20개 샘플
  console.log('상위 20개 샘플:')
  allEntries?.slice(0, 20).forEach((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    const isDummy = e.name?.includes('[보정]') ? '[더미]' : '[실제]'
    console.log(`  ${e.survey_no}: ${e.name} (${dateStr}) ${isDummy}`)
  })
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkAllEntries(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
