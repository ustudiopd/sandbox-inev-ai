/**
 * 같은 캠페인의 event_survey_entries에서 누락된 데이터 복구
 * 
 * Wert 웨비나(149402)와 같은 캠페인 ID를 사용하므로,
 * event_survey_entries에 모든 데이터가 있을 수 있습니다.
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function recoverFromSameCampaign(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('같은 캠페인에서 누락된 데이터 복구')
  console.log('='.repeat(80))
  console.log('')
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 1. 전체 event_survey_entries 확인
  console.log('1. 전체 event_survey_entries 확인')
  console.log('-'.repeat(80))
  
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, phone_norm, completed_at, registration_data')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 2. survey_no 91~174 범위 데이터 확인
  console.log('2. survey_no 91~174 범위 데이터 확인')
  console.log('-'.repeat(80))
  
  const targetRange = allEntries?.filter(e => {
    const no = e.survey_no
    return no >= 91 && no <= 174
  }) || []
  
  console.log(`survey_no 91~174 범위: ${targetRange.length}개`)
  console.log('')
  
  // 더미 데이터와 실제 데이터 구분
  const dummyInRange = targetRange.filter(e => 
    e.name?.includes('[보정]') || e.name?.includes('[복구]')
  )
  const realInRange = targetRange.filter(e => 
    !e.name?.includes('[보정]') && !e.name?.includes('[복구]')
  )
  
  console.log(`  더미 데이터: ${dummyInRange.length}개`)
  console.log(`  실제 데이터: ${realInRange.length}개`)
  console.log('')
  
  if (realInRange.length > 0) {
    console.log('✅ 실제 데이터가 이미 존재합니다!')
    console.log('')
    console.log('실제 데이터 샘플 (상위 20개):')
    realInRange.slice(0, 20).forEach((e: any) => {
      const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
      const email = e.registration_data?.email || '-'
      console.log(`  ${e.survey_no}: ${e.name} (${e.phone_norm}) ${email !== '-' ? `[${email}]` : ''} - ${dateStr}`)
    })
    console.log('')
    console.log('='.repeat(80))
    console.log('✅ 복구 완료! 실제 데이터가 이미 존재합니다.')
    console.log(`   survey_no 91~174 범위에 실제 데이터 ${realInRange.length}개가 있습니다.`)
    return
  }
  
  // 3. 더미 데이터 확인 및 실제 데이터 패턴 분석
  console.log('3. 더미 데이터 확인')
  console.log('-'.repeat(80))
  
  if (dummyInRange.length > 0) {
    console.log(`더미 데이터: ${dummyInRange.length}개`)
    console.log('')
    console.log('더미 데이터 샘플:')
    dummyInRange.slice(0, 10).forEach((e: any) => {
      const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
      console.log(`  ${e.survey_no}: ${e.name} (${e.phone_norm}) - ${dateStr}`)
    })
  }
  
  // 4. survey_no 1~90과 175~177의 패턴 분석
  console.log('')
  console.log('4. 기존 데이터 패턴 분석')
  console.log('-'.repeat(80))
  
  const before90 = allEntries?.filter(e => {
    const no = e.survey_no
    return no >= 1 && no <= 90 && !e.name?.includes('[보정]') && !e.name?.includes('[복구]')
  }) || []
  
  const after174 = allEntries?.filter(e => {
    const no = e.survey_no
    return no >= 175 && no <= 177 && !e.name?.includes('[보정]') && !e.name?.includes('[복구]')
  }) || []
  
  console.log(`survey_no 1~90 실제 데이터: ${before90.length}개`)
  console.log(`survey_no 175~177 실제 데이터: ${after174.length}개`)
  console.log('')
  
  // 날짜 분포 확인
  const datePattern = new Map<string, number>()
  before90.forEach(e => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    datePattern.set(dateStr, (datePattern.get(dateStr) || 0) + 1)
  })
  
  console.log('날짜별 분포 (survey_no 1~90):')
  Array.from(datePattern.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count}개`)
    })
  
  console.log('')
  console.log('='.repeat(80))
  console.log('결론:')
  
  if (realInRange.length > 0) {
    console.log(`✅ survey_no 91~174 범위에 실제 데이터 ${realInRange.length}개가 이미 존재합니다!`)
    console.log('   더미 데이터를 삭제하면 실제 데이터만 남습니다.')
  } else {
    console.log('⚠️  survey_no 91~174 범위에 실제 데이터가 없습니다.')
    console.log('   더미 데이터만 존재합니다.')
    console.log('   백업에서 복구하거나 수동으로 입력해야 합니다.')
  }
  
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

recoverFromSameCampaign(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
