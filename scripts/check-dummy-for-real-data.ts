/**
 * 더미 데이터 중 실제 데이터가 섞여 있는지 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkDummyForRealData(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('더미 데이터 중 실제 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // 더미 데이터 조회
  const { data: dummyEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, completed_at, phone_norm, registration_data')
    .eq('campaign_id', campaignId)
    .ilike('name', '%[보정]%')
    .order('survey_no', { ascending: true })
  
  console.log(`더미 데이터 총 ${dummyEntries?.length || 0}개`)
  console.log('')
  
  // survey_no 91~174 범위의 더미 데이터 확인
  const targetRange = dummyEntries?.filter(e => {
    const no = e.survey_no
    return no >= 91 && no <= 174
  }) || []
  
  console.log(`survey_no 91~174 범위의 더미 데이터: ${targetRange.length}개`)
  console.log('')
  
  // 실제 데이터처럼 보이는 것 확인 (이메일이나 실제 이름 패턴)
  const suspiciousEntries = dummyEntries?.filter(e => {
    const email = e.registration_data?.email
    const phone = e.phone_norm
    const name = e.name
    
    // 이메일이 있거나, 전화번호가 실제 패턴이거나, 이름이 실제 이름처럼 보이는 경우
    if (email && email !== '-' && !email.includes('@test') && !email.includes('@dummy')) {
      return true
    }
    
    // 전화번호가 실제 패턴 (010으로 시작하고 11자리)
    if (phone && phone.startsWith('010') && phone.length === 11 && !phone.startsWith('0100000')) {
      return true
    }
    
    // 이름이 실제 이름처럼 보이는 경우 ([보정] 제외하고 실제 이름 패턴)
    if (name && !name.includes('[보정]') && name.length > 1 && name.length < 20) {
      return true
    }
    
    return false
  }) || []
  
  console.log(`의심스러운 더미 데이터 (실제 데이터일 가능성): ${suspiciousEntries.length}개`)
  
  if (suspiciousEntries.length > 0) {
    console.log('')
    console.log('의심스러운 항목 샘플 (상위 20개):')
    suspiciousEntries.slice(0, 20).forEach((e: any) => {
      const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
      console.log(`  survey_no: ${e.survey_no}, name: ${e.name}, email: ${e.registration_data?.email || '-'}, phone: ${e.phone_norm}, date: ${dateStr}`)
    })
  }
  
  console.log('')
  console.log('='.repeat(80))
  
  // 2026-01-31과 2026-02-01의 더미 데이터 확인
  const jan31Dummy = dummyEntries?.filter(e => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    return dateStr === '2026-01-31'
  }) || []
  
  const feb01Dummy = dummyEntries?.filter(e => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    return dateStr === '2026-02-01'
  }) || []
  
  console.log(`2026-01-31 더미 데이터: ${jan31Dummy.length}개`)
  console.log(`2026-02-01 더미 데이터: ${feb01Dummy.length}개`)
  
  // 이 날짜의 더미 데이터 중 실제 데이터일 가능성이 있는 것 확인
  const jan31Suspicious = jan31Dummy.filter((e: any) => {
    const email = e.registration_data?.email
    const phone = e.phone_norm
    return (email && email !== '-' && !email.includes('@test') && !email.includes('@dummy')) ||
           (phone && phone.startsWith('010') && phone.length === 11 && !phone.startsWith('0100000'))
  })
  
  const feb01Suspicious = feb01Dummy.filter((e: any) => {
    const email = e.registration_data?.email
    const phone = e.phone_norm
    return (email && email !== '-' && !email.includes('@test') && !email.includes('@dummy')) ||
           (phone && phone.startsWith('010') && phone.length === 11 && !phone.startsWith('0100000'))
  })
  
  console.log(`2026-01-31 의심스러운 항목: ${jan31Suspicious.length}개`)
  console.log(`2026-02-01 의심스러운 항목: ${feb01Suspicious.length}개`)
  
  if (jan31Suspicious.length > 0 || feb01Suspicious.length > 0) {
    console.log('')
    console.log('의심스러운 항목 상세:')
    if (jan31Suspicious.length > 0) {
      console.log('2026-01-31:')
      jan31Suspicious.slice(0, 10).forEach((e: any) => {
        console.log(`  survey_no: ${e.survey_no}, name: ${e.name}, email: ${e.registration_data?.email || '-'}, phone: ${e.phone_norm}`)
      })
    }
    if (feb01Suspicious.length > 0) {
      console.log('2026-02-01:')
      feb01Suspicious.slice(0, 10).forEach((e: any) => {
        console.log(`  survey_no: ${e.survey_no}, name: ${e.name}, email: ${e.registration_data?.email || '-'}, phone: ${e.phone_norm}`)
      })
    }
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkDummyForRealData(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
