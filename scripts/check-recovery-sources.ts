/**
 * 복구 가능한 소스 확인 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkRecoverySources(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('복구 가능한 소스 확인')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 1. registrations 테이블 확인 (웨비나 등록 데이터)
  console.log('1. registrations 테이블 확인')
  console.log('-'.repeat(80))
  
  // 캠페인과 연결된 웨비나 확인
  const { data: campaign } = await admin
    .from('event_survey_campaigns')
    .select('id, title, registration_webinar_id')
    .eq('id', campaignId)
    .single()
  
  if (campaign?.registration_webinar_id) {
    const { data: registrations } = await admin
      .from('registrations')
      .select('id, survey_no, code6, nickname, registration_data, created_at')
      .eq('webinar_id', campaign.registration_webinar_id)
      .order('survey_no', { ascending: true })
    
    console.log(`  웨비나 ID: ${campaign.registration_webinar_id}`)
    console.log(`  registrations 데이터: ${registrations?.length || 0}개`)
    
    if (registrations && registrations.length > 0) {
      console.log(`  survey_no 범위: ${registrations[0].survey_no} ~ ${registrations[registrations.length - 1].survey_no}`)
      console.log('  샘플 (상위 10개):')
      registrations.slice(0, 10).forEach((r: any) => {
        console.log(`    survey_no: ${r.survey_no}, name: ${r.nickname || r.registration_data?.name || '-'}, date: ${new Date(r.created_at).toISOString().split('T')[0]}`)
      })
    }
  } else {
    console.log('  연결된 웨비나 없음')
  }
  
  console.log('')
  
  // 2. form_submissions 확인
  console.log('2. form_submissions 테이블 확인')
  console.log('-'.repeat(80))
  
  const { data: campaignWithForm } = await admin
    .from('event_survey_campaigns')
    .select('form_id')
    .eq('id', campaignId)
    .single()
  
  if (campaignWithForm?.form_id) {
    const { data: submissions } = await admin
      .from('form_submissions')
      .select('id, submitted_at, participant_id')
      .eq('form_id', campaignWithForm.form_id)
      .order('submitted_at', { ascending: true })
    
    console.log(`  form_id: ${campaignWithForm.form_id}`)
    console.log(`  form_submissions 데이터: ${submissions?.length || 0}개`)
    
    if (submissions && submissions.length > 0) {
      console.log(`  날짜 범위: ${new Date(submissions[0].submitted_at).toISOString().split('T')[0]} ~ ${new Date(submissions[submissions.length - 1].submitted_at).toISOString().split('T')[0]}`)
    }
  } else {
    console.log('  연결된 form 없음')
  }
  
  console.log('')
  
  // 3. event_access_logs 확인 (방문 로그)
  console.log('3. event_access_logs 테이블 확인')
  console.log('-'.repeat(80))
  
  const { data: accessLogs } = await admin
    .from('event_access_logs')
    .select('id, accessed_at, converted_at, utm_source, utm_medium, utm_campaign')
    .eq('campaign_id', campaignId)
    .not('converted_at', 'is', null) // 전환된 것만
    .order('accessed_at', { ascending: true })
    .limit(200)
  
  console.log(`  전환된 방문 로그: ${accessLogs?.length || 0}개 (최대 200개 표시)`)
  
  if (accessLogs && accessLogs.length > 0) {
    const convertedCount = accessLogs.length
    console.log(`  날짜 범위: ${new Date(accessLogs[0].accessed_at).toISOString().split('T')[0]} ~ ${new Date(accessLogs[convertedCount - 1].accessed_at).toISOString().split('T')[0]}`)
  }
  
  console.log('')
  
  // 4. 현재 event_survey_entries 상태 요약
  console.log('4. 현재 event_survey_entries 상태')
  console.log('-'.repeat(80))
  
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('survey_no, name, completed_at')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  const realEntries = allEntries?.filter(e => !e.name?.includes('[보정]')) || []
  const dummyEntries = allEntries?.filter(e => e.name?.includes('[보정]')) || []
  
  console.log(`  전체: ${allEntries?.length || 0}개`)
  console.log(`  실제 데이터: ${realEntries.length}개`)
  console.log(`  더미 데이터: ${dummyEntries.length}개`)
  
  if (realEntries.length > 0) {
    console.log(`  실제 데이터 survey_no 범위: ${realEntries[0].survey_no} ~ ${realEntries[realEntries.length - 1].survey_no}`)
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('복구 방법:')
  console.log('1. Supabase 대시보드에서 백업 확인')
  console.log('2. registrations 테이블에서 데이터 복구 (웨비나 등록 데이터)')
  console.log('3. CSV/Excel 파일에서 데이터 복구')
  console.log('4. event_access_logs에서 전환 데이터 복구')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkRecoverySources(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
