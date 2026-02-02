/**
 * 백업에서 데이터 복구 스크립트
 * 
 * 주의: 이 스크립트는 백업 파일을 직접 다루지 않습니다.
 * Supabase 대시보드에서 백업을 복구한 후, 데이터를 확인하는 용도입니다.
 * 
 * 사용법:
 *   1. Supabase 대시보드에서 백업 복구 (2026-01-31 또는 2026-02-01)
 *   2. 복구 후 이 스크립트 실행하여 데이터 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkAfterRestore(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('백업 복구 후 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 전체 데이터 확인
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, completed_at, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 참여자 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 더미 데이터와 실제 데이터 구분
  const dummyEntries = allEntries?.filter(e => e.name?.includes('[보정]')) || []
  const realEntries = allEntries?.filter(e => !e.name?.includes('[보정]')) || []
  
  console.log(`더미 데이터: ${dummyEntries.length}개`)
  console.log(`실제 데이터: ${realEntries.length}개`)
  console.log('')
  
  // survey_no 범위 확인
  if (realEntries.length > 0) {
    const surveyNos = realEntries.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b)
    console.log(`실제 데이터 survey_no 범위: ${surveyNos[0]} ~ ${surveyNos[surveyNos.length - 1]}`)
    
    // 누락된 survey_no 확인
    const missingSurveyNos: number[] = []
    for (let i = 1; i <= 177; i++) {
      if (!surveyNos.includes(i)) {
        missingSurveyNos.push(i)
      }
    }
    
    if (missingSurveyNos.length > 0) {
      console.log(`누락된 survey_no: ${missingSurveyNos.length}개`)
      console.log(`  ${missingSurveyNos.slice(0, 20).join(', ')}${missingSurveyNos.length > 20 ? '...' : ''}`)
    } else {
      console.log('✅ 모든 survey_no (1~177)가 복구되었습니다!')
    }
  }
  
  console.log('')
  
  // 날짜별 분포 확인
  const byDate = new Map<string, { real: number; dummy: number }>()
  allEntries?.forEach((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, { real: 0, dummy: 0 })
    }
    if (e.name?.includes('[보정]')) {
      byDate.get(dateStr)!.dummy++
    } else {
      byDate.get(dateStr)!.real++
    }
  })
  
  console.log('날짜별 분포:')
  Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, counts]) => {
      console.log(`  ${date}: 실제 ${counts.real}개, 더미 ${counts.dummy}개`)
    })
  
  console.log('')
  console.log('='.repeat(80))
  
  // 복구 후 작업 안내
  if (realEntries.length >= 177) {
    console.log('✅ 복구 완료!')
    console.log('')
    console.log('다음 단계:')
    console.log('1. 더미 데이터 정리 (필요시)')
    console.log('2. marketing_stats_daily와 일치 확인')
    console.log('3. 참여자 목록에서 더미 데이터 필터링 확인')
  } else {
    console.log('⚠️  아직 일부 데이터가 누락되었습니다.')
    console.log('다른 백업 시점을 시도해보세요.')
  }
  
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkAfterRestore(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
