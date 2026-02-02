/**
 * registrations 테이블에서 복구 가능한 데이터 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkRegistrationsForRecovery() {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('registrations 테이블에서 복구 가능한 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // Wert 웨비나 ID
  const webinarId = 'f257ce42-723a-4fad-a9a5-1bd8c154d7ce'
  const campaignId = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
  
  console.log(`웨비나 ID: ${webinarId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // registrations 확인
  console.log('1. registrations 테이블 확인')
  console.log('-'.repeat(80))
  
  const { data: registrations } = await admin
    .from('registrations')
    .select('id, survey_no, code6, nickname, registration_data, created_at, phone_norm')
    .eq('webinar_id', webinarId)
    .order('survey_no', { ascending: true })
  
  console.log(`registrations 데이터: ${registrations?.length || 0}개`)
  
  if (registrations && registrations.length > 0) {
    console.log(`survey_no 범위: ${registrations[0].survey_no} ~ ${registrations[registrations.length - 1].survey_no}`)
    console.log('')
    console.log('샘플 (상위 20개):')
    registrations.slice(0, 20).forEach((r: any) => {
      const dateStr = new Date(r.created_at).toISOString().split('T')[0]
      const name = r.nickname || r.registration_data?.name || '-'
      const phone = r.phone_norm || r.registration_data?.phone || r.registration_data?.phoneNorm || '-'
      const email = r.registration_data?.email || '-'
      console.log(`  ${r.survey_no}: ${name} (${phone}) ${email !== '-' ? `[${email}]` : ''} - ${dateStr}`)
    })
    
    // survey_no 91~174 범위 확인
    const targetRange = registrations.filter((r: any) => {
      const no = r.survey_no
      return no >= 91 && no <= 174
    })
    
    console.log('')
    console.log(`survey_no 91~174 범위: ${targetRange.length}개`)
    
    if (targetRange.length > 0) {
      console.log('')
      console.log('✅ 복구 가능한 데이터가 있습니다!')
      console.log('')
      console.log('복구 가능한 데이터 샘플:')
      targetRange.slice(0, 20).forEach((r: any) => {
        const dateStr = new Date(r.created_at).toISOString().split('T')[0]
        const name = r.nickname || r.registration_data?.name || '-'
        const phone = r.phone_norm || r.registration_data?.phone || r.registration_data?.phoneNorm || '-'
        const email = r.registration_data?.email || '-'
        console.log(`  ${r.survey_no}: ${name} (${phone}) ${email !== '-' ? `[${email}]` : ''} - ${dateStr}`)
      })
      
      console.log('')
      console.log('='.repeat(80))
      console.log('복구 방법:')
      console.log('  registrations 데이터를 event_survey_entries로 복사')
      console.log('  npx tsx scripts/recover-from-registrations.ts --execute')
    }
  } else {
    console.log('registrations 테이블에 데이터가 없습니다.')
  }
  
  console.log('')
  console.log('='.repeat(80))
}

checkRegistrationsForRecovery()
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
