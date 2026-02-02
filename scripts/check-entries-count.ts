/**
 * 전환 데이터 개수 확인 및 정리 스크립트
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkEntriesCount(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('전환 데이터 개수 확인')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 전체 전환 데이터 확인
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, created_at, marketing_campaign_link_id, name')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 전환 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 2026-02-02 데이터 확인
  const targetDate = new Date('2026-02-02')
  targetDate.setHours(0, 0, 0, 0)
  const targetDateEnd = new Date(targetDate)
  targetDateEnd.setHours(23, 59, 59, 999)
  
  const { data: dateEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, created_at, marketing_campaign_link_id, name, phone_norm')
    .eq('campaign_id', campaignId)
    .gte('created_at', targetDate.toISOString())
    .lte('created_at', targetDateEnd.toISOString())
    .order('survey_no', { ascending: true })
  
  console.log(`2026-02-02 전환 데이터: ${dateEntries?.length || 0}개`)
  console.log('')
  
  if (dateEntries && dateEntries.length > 0) {
    console.log('2026-02-02 전환 데이터 상세:')
    dateEntries.forEach((entry: any, idx: number) => {
      const linkInfo = entry.marketing_campaign_link_id ? `링크ID: ${entry.marketing_campaign_link_id}` : '링크ID 없음'
      const nameInfo = entry.name || '이름 없음'
      console.log(`  ${idx + 1}. survey_no: ${entry.survey_no}, ${nameInfo}, ${linkInfo}`)
    })
    
    // 최근에 생성된 것 같은 데이터 확인 (이름에 "전환_" 포함)
    const dummyEntries = dateEntries.filter((e: any) => 
      e.name && e.name.includes('전환_')
    )
    
    if (dummyEntries.length > 0) {
      console.log('')
      console.log(`⚠️  더미 데이터 발견: ${dummyEntries.length}개`)
      console.log('  삭제할 항목:')
      dummyEntries.forEach((entry: any) => {
        console.log(`    - survey_no: ${entry.survey_no}, name: ${entry.name}`)
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

checkEntriesCount(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
