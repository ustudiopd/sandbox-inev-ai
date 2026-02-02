/**
 * 전체 event_survey_entries에서 실제 데이터 찾기
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function findRealDataInAllEntries(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('전체 event_survey_entries에서 실제 데이터 찾기')
  console.log('='.repeat(80))
  console.log('')
  
  // 전체 데이터 확인
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, phone_norm, completed_at, registration_data')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 실제 데이터만 필터링
  const realEntries = allEntries?.filter(e => {
    const name = e.name || ''
    const phone = e.phone_norm || ''
    
    // 더미 패턴이 아닌 경우
    return !name.includes('[보정]') && 
           !name.includes('[복구]') &&
           !phone.startsWith('0100000') &&
           name.length > 1 &&
           phone.length === 11
  }) || []
  
  console.log(`실제 데이터: ${realEntries.length}개`)
  console.log('')
  
  // survey_no 범위 확인
  if (realEntries.length > 0) {
    const surveyNos = realEntries.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b)
    console.log(`실제 데이터 survey_no 범위: ${surveyNos[0]} ~ ${surveyNos[surveyNos.length - 1]}`)
    console.log('')
    
    // survey_no 91~174 범위에 실제 데이터가 있는지 확인
    const targetRange = realEntries.filter(e => {
      const no = e.survey_no
      return no >= 91 && no <= 174
    })
    
    console.log(`survey_no 91~174 범위 실제 데이터: ${targetRange.length}개`)
    
    if (targetRange.length > 0) {
      console.log('')
      console.log('✅ 실제 데이터가 존재합니다!')
      console.log('')
      console.log('실제 데이터 샘플:')
      targetRange.slice(0, 20).forEach((e: any) => {
        const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
        const email = e.registration_data?.email || '-'
        console.log(`  ${e.survey_no}: ${e.name} (${e.phone_norm}) ${email !== '-' ? `[${email}]` : ''} - ${dateStr}`)
      })
      
      // 누락된 survey_no 확인
      const existingSurveyNos = new Set(targetRange.map(e => e.survey_no))
      const missingSurveyNos: number[] = []
      for (let i = 91; i <= 174; i++) {
        if (!existingSurveyNos.has(i)) {
          missingSurveyNos.push(i)
        }
      }
      
      if (missingSurveyNos.length > 0) {
        console.log('')
        console.log(`누락된 survey_no: ${missingSurveyNos.length}개`)
        console.log(`  ${missingSurveyNos.slice(0, 20).join(', ')}${missingSurveyNos.length > 20 ? '...' : ''}`)
      } else {
        console.log('')
        console.log('✅ survey_no 91~174 범위가 모두 복구되었습니다!')
      }
    } else {
      console.log('')
      console.log('⚠️  survey_no 91~174 범위에 실제 데이터가 없습니다.')
      
      // 다른 범위에 실제 데이터가 있는지 확인
      const otherRanges = realEntries.filter(e => {
        const no = e.survey_no
        return no < 91 || no > 174
      })
      
      console.log(`다른 범위 실제 데이터: ${otherRanges.length}개`)
      
      if (otherRanges.length > 0) {
        const otherSurveyNos = otherRanges.map(e => e.survey_no).sort((a, b) => a - b)
        console.log(`  범위: ${otherSurveyNos[0]} ~ ${otherSurveyNos[otherSurveyNos.length - 1]}`)
      }
    }
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

findRealDataInAllEntries(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
