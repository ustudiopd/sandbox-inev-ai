/**
 * 최종 확인: 더미 데이터가 없는지 확인
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function finalCheckNoDummy(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('최종 확인: 더미 데이터 확인')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 전체 데이터 확인
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, name, phone_norm, completed_at')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: true })
  
  console.log(`전체 데이터: ${allEntries?.length || 0}개`)
  console.log('')
  
  // 2. 더미 데이터 확인 (다양한 패턴)
  const dummyPatterns = [
    (e: any) => e.name?.includes('[보정]'),
    (e: any) => e.name?.includes('[복구]'),
    (e: any) => e.phone_norm?.startsWith('0100000'),
    (e: any) => e.name?.includes('dummy'),
    (e: any) => e.name?.includes('Dummy'),
    (e: any) => e.name?.includes('더미'),
  ]
  
  const dummyEntries: any[] = []
  allEntries?.forEach((e: any) => {
    for (const pattern of dummyPatterns) {
      if (pattern(e)) {
        dummyEntries.push(e)
        break
      }
    }
  })
  
  console.log(`더미 데이터: ${dummyEntries.length}개`)
  
  if (dummyEntries.length > 0) {
    console.log('')
    console.log('⚠️  더미 데이터 발견!')
    console.log('')
    console.log('더미 데이터 목록:')
    dummyEntries.forEach((e: any) => {
      const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
      console.log(`  survey_no ${e.survey_no}: ${e.name} (${e.phone_norm}) - ${dateStr}`)
    })
    console.log('')
    console.log('삭제하려면: npx tsx scripts/delete-all-dummy.ts --execute')
  } else {
    console.log('✅ 더미 데이터 없음')
  }
  
  console.log('')
  
  // 3. 실제 데이터 확인
  const realEntries = allEntries?.filter((e: any) => {
    return !dummyPatterns.some(pattern => pattern(e))
  }) || []
  
  console.log(`실제 데이터: ${realEntries.length}개`)
  
  if (realEntries.length > 0) {
    const surveyNos = realEntries.map(e => e.survey_no).filter(Boolean).sort((a, b) => a - b)
    console.log(`survey_no 범위: ${surveyNos[0]} ~ ${surveyNos[surveyNos.length - 1]}`)
  }
  
  console.log('')
  console.log('='.repeat(80))
  
  if (dummyEntries.length === 0) {
    console.log('✅ 완벽합니다! 더미 데이터가 없습니다.')
    console.log('   참여자 목록에는 실제 데이터만 표시됩니다.')
  } else {
    console.log('⚠️  더미 데이터가 있습니다. 삭제가 필요합니다.')
  }
  
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

finalCheckNoDummy(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
