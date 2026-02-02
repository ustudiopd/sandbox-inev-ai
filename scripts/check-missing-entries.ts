/**
 * 누락된 참여자 데이터 확인 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkMissingEntries(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('누락된 참여자 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // 전체 데이터
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, completed_at, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  // 실제 데이터만
  const realEntries = allEntries?.filter(e => !e.name?.includes('[보정]')) || []
  
  // survey_no 1~177 범위에서 누락된 것 확인
  const existingSurveyNos = new Set(realEntries.map(e => e.survey_no).filter(Boolean))
  const missingSurveyNos: number[] = []
  
  for (let i = 1; i <= 177; i++) {
    if (!existingSurveyNos.has(i)) {
      missingSurveyNos.push(i)
    }
  }
  
  console.log(`전체 데이터: ${allEntries?.length || 0}개`)
  console.log(`실제 데이터: ${realEntries.length}개`)
  console.log(`누락된 survey_no (1~177 범위): ${missingSurveyNos.length}개`)
  console.log('')
  
  if (missingSurveyNos.length > 0) {
    console.log('누락된 survey_no 목록:')
    console.log(missingSurveyNos.join(', '))
    console.log('')
    
    // 날짜별로 누락된 것 확인
    const missingByDate = new Map<string, number[]>()
    missingSurveyNos.forEach(no => {
      // survey_no로 날짜 추정 불가, 전체 데이터에서 확인
      const entry = allEntries?.find(e => e.survey_no === no)
      if (entry) {
        const dateStr = new Date(entry.completed_at).toISOString().split('T')[0]
        if (!missingByDate.has(dateStr)) {
          missingByDate.set(dateStr, [])
        }
        missingByDate.get(dateStr)!.push(no)
      }
    })
    
    console.log('날짜별 누락 현황:')
    Array.from(missingByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, nos]) => {
        console.log(`  ${date}: ${nos.length}개 (${nos.slice(0, 10).join(', ')}${nos.length > 10 ? '...' : ''})`)
      })
  }
  
  // 2026-01-31과 2026-02-01의 실제 데이터 확인
  console.log('')
  console.log('2026-01-31 실제 데이터:')
  const jan31Real = realEntries.filter(e => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    return dateStr === '2026-01-31'
  })
  console.log(`  ${jan31Real.length}개`)
  
  console.log('2026-02-01 실제 데이터:')
  const feb01Real = realEntries.filter(e => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    return dateStr === '2026-02-01'
  })
  console.log(`  ${feb01Real.length}개`)
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkMissingEntries(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
