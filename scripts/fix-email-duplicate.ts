/**
 * 광고메일 중복 데이터 수정 스크립트
 * 
 * 목적: 광고메일의 Visits와 전환을 절반으로 줄이기
 * 
 * 사용법:
 *   npx tsx scripts/fix-email-duplicate.ts [clientId] [campaignId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const BUCKET_DATE = '2026-02-02'

async function fixEmailDuplicate(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('광고메일 중복 데이터 수정')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`버킷 날짜: ${BUCKET_DATE}`)
  console.log('')
  
  // 1. 광고메일 링크 찾기
  console.log('1. 광고메일 링크 찾기')
  console.log('-'.repeat(80))
  
  const { data: emailLink } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign')
    .eq('client_id', clientId)
    .eq('target_campaign_id', campaignId)
    .eq('utm_source', 'stibee')
    .eq('utm_medium', 'email')
    .eq('utm_campaign', '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom')
    .eq('status', 'active')
    .maybeSingle()
  
  if (!emailLink) {
    console.log('❌ 광고메일 링크를 찾을 수 없습니다.')
    return
  }
  
  console.log(`  ✅ 링크 찾음: ${emailLink.name} (${emailLink.id})`)
  console.log('')
  
  // 2. 기존 데이터 확인
  console.log('2. 기존 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: existingStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .eq('marketing_campaign_link_id', emailLink.id)
    .maybeSingle()
  
  if (!existingStats) {
    console.log('  ⚠️  해당 날짜의 데이터가 없습니다.')
    return
  }
  
  const currentVisits = existingStats.visits || 0
  const currentConversions = existingStats.conversions || 0
  
  console.log(`  현재 Visits: ${currentVisits}`)
  console.log(`  현재 전환: ${currentConversions}`)
  console.log('')
  
  // 3. 절반으로 줄이기
  const newVisits = Math.round(currentVisits / 2)
  const newConversions = Math.round(currentConversions / 2)
  
  console.log('3. 데이터 수정')
  console.log('-'.repeat(80))
  console.log(`  Visits: ${currentVisits} → ${newVisits} (${currentVisits - newVisits} 감소)`)
  console.log(`  전환: ${currentConversions} → ${newConversions} (${currentConversions - newConversions} 감소)`)
  console.log('')
  
  // 4. 업데이트
  const { error: updateError } = await admin
    .from('marketing_stats_daily')
    .update({
      visits: newVisits,
      conversions: newConversions,
    })
    .eq('id', existingStats.id)
  
  if (updateError) {
    console.error('  ❌ 업데이트 오류:', updateError)
    return
  }
  
  console.log('  ✅ 업데이트 완료')
  console.log('')
  
  // 5. 검증
  console.log('4. 검증')
  console.log('-'.repeat(80))
  
  const { data: updatedStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('id', existingStats.id)
    .single()
  
  if (updatedStats) {
    const cvr = updatedStats.visits > 0 
      ? ((updatedStats.conversions / updatedStats.visits) * 100).toFixed(2) 
      : '0.00'
    
    console.log(`  최종 Visits: ${updatedStats.visits}`)
    console.log(`  최종 전환: ${updatedStats.conversions}`)
    console.log(`  CVR: ${cvr}%`)
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 수정 완료')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

fixEmailDuplicate(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
