import { createAdminSupabase } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listAllEmailCampaigns() {
  const admin = createAdminSupabase()

  console.log('📧 모든 이메일 캠페인 ID 조회 중...\n')

  // 모든 이메일 캠페인 조회
  const { data: campaigns, error } = await admin
    .from('email_campaigns')
    .select('id, subject, preheader, status, campaign_type, scope_type, scope_id, client_id, created_at, sent_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 캠페인 조회 오류:', error)
    return
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('이메일 캠페인이 없습니다.')
    return
  }

  console.log(`총 ${campaigns.length}개의 이메일 캠페인을 찾았습니다.\n`)
  console.log('='.repeat(100))
  console.log('')

  // 클라이언트 정보도 함께 조회
  const clientIds = [...new Set(campaigns.map(c => c.client_id))]
  const { data: clients } = await admin
    .from('clients')
    .select('id, name')
    .in('id', clientIds)

  const clientMap = new Map(clients?.map(c => [c.id, c.name]) || [])

  campaigns.forEach((campaign, index) => {
    const clientName = clientMap.get(campaign.client_id) || '(클라이언트 없음)'
    const createdDate = new Date(campaign.created_at).toLocaleDateString('ko-KR')
    const sentDate = campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString('ko-KR') : '미발송'

    console.log(`[${index + 1}] ${campaign.subject || '(제목 없음)'}`)
    console.log(`    ID: ${campaign.id}`)
    console.log(`    클라이언트: ${clientName} (${campaign.client_id})`)
    console.log(`    상태: ${campaign.status}`)
    console.log(`    캠페인 타입: ${campaign.campaign_type}`)
    console.log(`    범위 타입: ${campaign.scope_type}`)
    console.log(`    범위 ID: ${campaign.scope_id}`)
    if (campaign.preheader) {
      console.log(`    Preheader: ${campaign.preheader}`)
    }
    console.log(`    생성일: ${createdDate}`)
    console.log(`    발송일: ${sentDate}`)
    console.log('')
  })

  console.log('='.repeat(100))
  console.log(`\n총 ${campaigns.length}개의 캠페인 ID 목록:\n`)
  campaigns.forEach((campaign, index) => {
    console.log(`${index + 1}. ${campaign.id} - ${campaign.subject || '(제목 없음)'}`)
  })
}

listAllEmailCampaigns()
  .then(() => {
    console.log('\n완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
