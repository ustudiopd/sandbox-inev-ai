/**
 * 광고메일 중복 데이터 수정 스크립트 (전체 기간)
 * 
 * 목적: 광고메일의 모든 날짜 데이터를 절반으로 줄이기
 * 
 * 사용법:
 *   npx tsx scripts/fix-email-duplicate-all.ts [clientId] [campaignId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function fixEmailDuplicateAll(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('광고메일 중복 데이터 수정 (전체 기간)')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
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
  
  // 2. 전체 기간 데이터 확인
  console.log('2. 전체 기간 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: allStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('marketing_campaign_link_id', emailLink.id)
    .order('bucket_date', { ascending: true })
  
  if (!allStats || allStats.length === 0) {
    console.log('  ⚠️  데이터가 없습니다.')
    return
  }
  
  const totalVisits = allStats.reduce((sum, s) => sum + (s.visits || 0), 0)
  const totalConversions = allStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
  
  console.log(`  총 레코드 수: ${allStats.length}개`)
  console.log(`  총 Visits: ${totalVisits}`)
  console.log(`  총 전환: ${totalConversions}`)
  console.log('')
  console.log('  날짜별 상세:')
  allStats.forEach((stat: any) => {
    const cvr = stat.visits > 0 
      ? ((stat.conversions / stat.visits) * 100).toFixed(2) 
      : '0.00'
    console.log(`    - ${stat.bucket_date}: Visits ${stat.visits}, 전환 ${stat.conversions}, CVR ${cvr}%`)
  })
  console.log('')
  
  // 3. 절반으로 줄이기
  console.log('3. 데이터 수정 (절반으로 줄이기)')
  console.log('-'.repeat(80))
  
  let updatedCount = 0
  let errorCount = 0
  
  for (const stat of allStats) {
    const newVisits = Math.round((stat.visits || 0) / 2)
    const newConversions = Math.round((stat.conversions || 0) / 2)
    
    const { error: updateError } = await admin
      .from('marketing_stats_daily')
      .update({
        visits: newVisits,
        conversions: newConversions,
      })
      .eq('id', stat.id)
    
    if (updateError) {
      console.error(`  ❌ ${stat.bucket_date}: ${updateError.message}`)
      errorCount++
    } else {
      console.log(`  ✅ ${stat.bucket_date}: Visits ${stat.visits} → ${newVisits}, 전환 ${stat.conversions} → ${newConversions}`)
      updatedCount++
    }
  }
  
  console.log('')
  console.log(`  완료: ${updatedCount}개 업데이트, ${errorCount}개 실패`)
  console.log('')
  
  // 4. 검증
  console.log('4. 검증')
  console.log('-'.repeat(80))
  
  const { data: updatedStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('marketing_campaign_link_id', emailLink.id)
    .order('bucket_date', { ascending: true })
  
  if (updatedStats && updatedStats.length > 0) {
    const finalTotalVisits = updatedStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    const finalTotalConversions = updatedStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    const finalCVR = finalTotalVisits > 0 
      ? ((finalTotalConversions / finalTotalVisits) * 100).toFixed(2) 
      : '0.00'
    
    console.log(`  최종 총 Visits: ${finalTotalVisits} (이전: ${totalVisits}, 감소: ${totalVisits - finalTotalVisits})`)
    console.log(`  최종 총 전환: ${finalTotalConversions} (이전: ${totalConversions}, 감소: ${totalConversions - finalTotalConversions})`)
    console.log(`  최종 CVR: ${finalCVR}%`)
    console.log('')
    console.log('  날짜별 최종 상세:')
    updatedStats.forEach((stat: any) => {
      const cvr = stat.visits > 0 
        ? ((stat.conversions / stat.visits) * 100).toFixed(2) 
        : '0.00'
      console.log(`    - ${stat.bucket_date}: Visits ${stat.visits}, 전환 ${stat.conversions}, CVR ${cvr}%`)
    })
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

fixEmailDuplicateAll(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
