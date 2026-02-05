import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkFailedEmailLogs() {
  const admin = createAdminSupabase()

  // 먼저 실패한 로그가 있는 모든 캠페인 찾기
  console.log('실패한 이메일 로그가 있는 캠페인 조회 중...\n')
  const { data: failedLogs, error: failedLogsError } = await admin
    .from('email_send_logs')
    .select('email_campaign_id, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })

  if (failedLogsError) {
    console.error('실패 로그 조회 오류:', failedLogsError)
    return
  }

  if (!failedLogs || failedLogs.length === 0) {
    console.log('실패한 이메일 로그가 없습니다.')
    return
  }

  // 고유한 캠페인 ID 추출
  const uniqueCampaignIds = [...new Set(failedLogs.map(log => log.email_campaign_id))]

  // 실패한 로그가 있는 캠페인 정보 조회
  const { data: campaigns, error: campaignError } = await admin
    .from('email_campaigns')
    .select('id, subject, status, created_at, sent_at')
    .in('id', uniqueCampaignIds)
    .order('created_at', { ascending: false })

  if (campaignError) {
    console.error('캠페인 조회 오류:', campaignError)
    return
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('실패한 로그가 있는 캠페인을 찾을 수 없습니다.')
    return
  }

  console.log(`\n총 ${campaigns.length}개의 캠페인에서 실패한 로그가 발견되었습니다.\n`)

  // "개인용 AI 에이전트의 가능성 엿보기" 관련 캠페인 우선 표시
  const targetCampaigns = campaigns.filter(c => 
    c.subject.includes('AI') || 
    c.subject.includes('에이전트') || 
    c.subject.includes('개인용')
  )

  if (targetCampaigns.length > 0) {
    console.log('⚠️  "AI 에이전트" 관련 캠페인:\n')
    targetCampaigns.forEach(camp => {
      console.log(`  - ${camp.subject} (${camp.id})`)
    })
    console.log('')
  }

  for (const campaign of campaigns) {
    console.log(`\n=== 캠페인: ${campaign.subject} ===`)
    console.log(`ID: ${campaign.id}`)
    console.log(`상태: ${campaign.status}`)
    console.log(`생성일: ${campaign.created_at}`)
    console.log(`발송일: ${campaign.sent_at || '미발송'}`)

    // 실패한 발송 로그 조회
    const { data: failedLogs, error: logError } = await admin
      .from('email_send_logs')
      .select('id, recipient_email, status, error_message, provider_message_id, dedupe_key, created_at')
      .eq('email_campaign_id', campaign.id)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })

    if (logError) {
      console.error('발송 로그 조회 오류:', logError)
      continue
    }

    if (!failedLogs || failedLogs.length === 0) {
      console.log('실패한 발송이 없습니다.')
    } else {
      console.log(`\n❌ 실패한 발송: ${failedLogs.length}건\n`)
      console.log('='.repeat(80))
      failedLogs.forEach((log, index) => {
        console.log(`\n[실패 ${index + 1}/${failedLogs.length}]`)
        console.log(`이메일 주소: ${log.recipient_email}`)
        console.log(`발생 시간: ${log.created_at}`)
        console.log(`오류 메시지: ${log.error_message || '(오류 메시지 없음)'}`)
        console.log(`Provider Message ID: ${log.provider_message_id || '(없음)'}`)
        console.log(`Dedupe Key: ${log.dedupe_key}`)
        console.log(`로그 ID: ${log.id}`)
        console.log('-'.repeat(80))
      })
    }

    // 전체 발송 통계
    const { data: allLogs } = await admin
      .from('email_send_logs')
      .select('status')
      .eq('email_campaign_id', campaign.id)

    const total = allLogs?.length || 0
    const sent = allLogs?.filter((log: any) => log.status === 'sent').length || 0
    const failed = allLogs?.filter((log: any) => log.status === 'failed').length || 0

    console.log(`\n전체 통계:`)
    console.log(`  총 발송: ${total}건`)
    console.log(`  성공: ${sent}건`)
    console.log(`  실패: ${failed}건`)
  }
}

checkFailedEmailLogs()
  .then(() => {
    console.log('\n완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
