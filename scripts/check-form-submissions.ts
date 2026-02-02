/**
 * form_submissions에서 누락된 데이터 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkFormSubmissions(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('form_submissions 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // 캠페인의 form_id 확인
  const { data: campaign } = await admin
    .from('event_survey_campaigns')
    .select('id, form_id')
    .eq('id', campaignId)
    .single()
  
  if (!campaign?.form_id) {
    console.log('캠페인에 form_id가 없습니다.')
    return
  }
  
  console.log(`캠페인 form_id: ${campaign.form_id}`)
  console.log('')
  
  // form_submissions 조회
  const { data: submissions } = await admin
    .from('form_submissions')
    .select('id, submitted_at, participant_id')
    .eq('form_id', campaign.form_id)
    .order('submitted_at', { ascending: true })
  
  console.log(`form_submissions 총 ${submissions?.length || 0}개`)
  console.log('')
  
  // event_survey_entries와 연결 확인
  const { data: entries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, form_submission_id, name, completed_at')
    .eq('campaign_id', campaignId)
    .not('form_submission_id', 'is', null)
  
  const linkedSubmissionIds = new Set(entries?.map(e => e.form_submission_id).filter(Boolean) || [])
  
  console.log(`event_survey_entries에 연결된 form_submissions: ${linkedSubmissionIds.size}개`)
  console.log('')
  
  // 연결되지 않은 form_submissions 확인
  const unlinkedSubmissions = submissions?.filter(s => !linkedSubmissionIds.has(s.id)) || []
  console.log(`연결되지 않은 form_submissions: ${unlinkedSubmissions.length}개`)
  
  if (unlinkedSubmissions.length > 0) {
    console.log('')
    console.log('연결되지 않은 form_submissions 샘플 (상위 20개):')
    unlinkedSubmissions.slice(0, 20).forEach((s: any) => {
      const dateStr = new Date(s.submitted_at).toISOString().split('T')[0]
      console.log(`  id: ${s.id}, submitted_at: ${dateStr}, participant_id: ${s.participant_id || 'null'}`)
    })
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkFormSubmissions(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
