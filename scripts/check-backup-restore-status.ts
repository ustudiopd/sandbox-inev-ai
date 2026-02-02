/**
 * 백업 복구 후 상태 확인 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkBackupRestoreStatus(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('백업 복구 후 상태 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // 전체 데이터 확인
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, completed_at, phone_norm, registration_data')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 참여자 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 더미 데이터와 실제 데이터 구분
  const dummyEntries = allEntries?.filter(e => 
    e.name?.includes('[보정]') || e.name?.includes('[복구]')
  ) || []
  const realEntries = allEntries?.filter(e => 
    !e.name?.includes('[보정]') && !e.name?.includes('[복구]')
  ) || []
  
  console.log(`더미 데이터 ([보정] 또는 [복구]): ${dummyEntries.length}개`)
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
  
  // 개인정보 확인 (이름과 전화번호가 실제인지)
  const entriesWithRealInfo = realEntries.filter((e: any) => {
    const name = e.name || ''
    const phone = e.phone_norm || ''
    const email = e.registration_data?.email || ''
    
    // 더미 패턴이 아닌 경우
    return !name.includes('[보정]') && 
           !name.includes('[복구]') &&
           !phone.startsWith('0100000') &&
           name.length > 1 &&
           phone.length === 11
  })
  
  console.log(`실제 개인정보가 있는 데이터: ${entriesWithRealInfo.length}개`)
  console.log('')
  
  // 날짜별 분포
  const byDate = new Map<string, { real: number; dummy: number }>()
  allEntries?.forEach((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, { real: 0, dummy: 0 })
    }
    if (e.name?.includes('[보정]') || e.name?.includes('[복구]')) {
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
  
  if (realEntries.length >= 177 && entriesWithRealInfo.length >= 177) {
    console.log('✅ 완벽하게 복구되었습니다!')
    console.log('   - survey_no 1~177 모두 존재')
    console.log('   - 실제 개인정보 모두 복구됨')
  } else if (realEntries.length >= 177) {
    console.log('⚠️  survey_no는 모두 복구되었지만, 일부 개인정보가 더미 데이터입니다.')
    console.log(`   - 실제 개인정보: ${entriesWithRealInfo.length}개`)
    console.log(`   - 더미 데이터: ${realEntries.length - entriesWithRealInfo.length}개`)
  } else {
    console.log('⚠️  아직 일부 데이터가 누락되었습니다.')
    console.log(`   - 현재: ${realEntries.length}개`)
    console.log(`   - 목표: 177개`)
  }
  
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkBackupRestoreStatus(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
