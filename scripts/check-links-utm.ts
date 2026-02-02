/**
 * 링크의 실제 UTM 값 확인 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkLinksUTM(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('링크 UTM 값 확인')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 해당 캠페인의 모든 활성 링크 조회
  const { data: links, error } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign, status, target_campaign_id')
    .eq('client_id', clientId)
    .eq('target_campaign_id', campaignId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('오류:', error)
    return
  }
  
  if (!links || links.length === 0) {
    console.log('링크가 없습니다.')
    return
  }
  
  console.log(`총 ${links.length}개 링크 발견`)
  console.log('')
  console.log('-'.repeat(80))
  
  links.forEach((link, idx) => {
    console.log(`${idx + 1}. ${link.name}`)
    console.log(`   ID: ${link.id}`)
    console.log(`   UTM: ${link.utm_source || '(null)'}/${link.utm_medium || '(null)'}/${link.utm_campaign || '(null)'}`)
    console.log(`   상태: ${link.status}`)
    console.log(`   타겟 캠페인: ${link.target_campaign_id || '(null)'}`)
    console.log('')
  })
  
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

checkLinksUTM(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
