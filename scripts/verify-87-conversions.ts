/**
 * 2026-02-02 전환 87개 검증 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function verify87Conversions(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 전환 87개 검증')
  console.log('='.repeat(80))
  console.log('')
  
  const targetDate = new Date('2026-02-02')
  targetDate.setHours(0, 0, 0, 0)
  const targetDateEnd = new Date(targetDate)
  targetDateEnd.setHours(23, 59, 59, 999)
  
  // 전체 전환 데이터
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, marketing_campaign_link_id, utm_source, utm_medium, utm_campaign')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .order('survey_no', { ascending: true })
  
  console.log(`전체 2026-02-02 전환 데이터: ${allEntries?.length || 0}개`)
  
  const withLinkId = allEntries?.filter(e => e.marketing_campaign_link_id) || []
  const withoutLinkId = allEntries?.filter(e => !e.marketing_campaign_link_id) || []
  
  console.log(`  - 링크 ID 있음: ${withLinkId.length}개`)
  console.log(`  - 링크 ID 없음: ${withoutLinkId.length}개`)
  console.log('')
  
  // 링크별 집계
  const linkMap = new Map<string, number>()
  withLinkId.forEach((entry: any) => {
    const linkId = entry.marketing_campaign_link_id
    linkMap.set(linkId, (linkMap.get(linkId) || 0) + 1)
  })
  
  console.log('링크별 전환 수:')
  for (const [linkId, count] of linkMap.entries()) {
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('name')
      .eq('id', linkId)
      .maybeSingle()
    console.log(`  - ${link?.name || linkId}: ${count}개`)
  }
  
  console.log('')
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

verify87Conversions(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
