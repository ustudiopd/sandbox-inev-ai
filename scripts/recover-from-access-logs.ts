/**
 * event_access_logs에서 삭제된 데이터 복구
 * 
 * event_access_logs의 entry_id를 통해 삭제된 entry 정보 추적
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function recoverFromAccessLogs(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('event_access_logs에서 삭제된 데이터 복구 시도')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. event_access_logs에서 entry_id가 있지만 현재 entries에 없는 것 찾기
  console.log('1. 삭제된 entry 추적')
  console.log('-'.repeat(80))
  
  const { data: accessLogs } = await admin
    .from('event_access_logs')
    .select('id, entry_id, converted_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, accessed_at')
    .eq('campaign_id', campaignId)
    .not('entry_id', 'is', null)
    .not('converted_at', 'is', null)
    .order('converted_at', { ascending: true })
  
  console.log(`entry_id가 있는 전환 로그: ${accessLogs?.length || 0}개`)
  
  if (!accessLogs || accessLogs.length === 0) {
    console.log('  복구할 데이터가 없습니다.')
    return
  }
  
  // 현재 존재하는 entry_id 확인
  const { data: currentEntries } = await admin
    .from('event_survey_entries')
    .select('id')
    .eq('campaign_id', campaignId)
  
  const existingEntryIds = new Set(currentEntries?.map(e => e.id) || [])
  
  // 삭제된 entry_id 찾기
  const deletedEntryIds = new Set<string>()
  accessLogs.forEach((log: any) => {
    if (!existingEntryIds.has(log.entry_id)) {
      deletedEntryIds.add(log.entry_id)
    }
  })
  
  console.log(`삭제된 entry_id: ${deletedEntryIds.size}개`)
  
  if (deletedEntryIds.size === 0) {
    console.log('  복구할 삭제된 데이터가 없습니다.')
    return
  }
  
  console.log('')
  console.log('삭제된 entry_id 목록:')
  Array.from(deletedEntryIds).slice(0, 20).forEach(id => {
    console.log(`  ${id}`)
  })
  if (deletedEntryIds.size > 20) {
    console.log(`  ... 외 ${deletedEntryIds.size - 20}개`)
  }
  
  console.log('')
  
  // 2. 삭제된 entry의 정보를 로그에서 추출
  console.log('2. 삭제된 entry 정보 추출')
  console.log('-'.repeat(80))
  
  const deletedEntriesInfo: Array<{
    entry_id: string
    converted_at: string
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    marketing_campaign_link_id: string | null
    accessed_at: string
  }> = []
  
  accessLogs.forEach((log: any) => {
    if (deletedEntryIds.has(log.entry_id)) {
      // 중복 제거 (같은 entry_id는 하나만)
      if (!deletedEntriesInfo.find(e => e.entry_id === log.entry_id)) {
        deletedEntriesInfo.push({
          entry_id: log.entry_id,
          converted_at: log.converted_at,
          utm_source: log.utm_source,
          utm_medium: log.utm_medium,
          utm_campaign: log.utm_campaign,
          marketing_campaign_link_id: log.marketing_campaign_link_id,
          accessed_at: log.accessed_at,
        })
      }
    }
  })
  
  console.log(`복구 가능한 entry 정보: ${deletedEntriesInfo.length}개`)
  console.log('')
  
  // 3. 복구 시도 (하지만 개인정보는 없음)
  console.log('3. 복구 시도')
  console.log('-'.repeat(80))
  console.log('⚠️  주의: event_access_logs에는 개인정보(이름, 전화번호 등)가 없습니다.')
  console.log('   UTM 정보와 전환 시각만 복구 가능합니다.')
  console.log('')
  
  // 최대 survey_no 확인
  const { data: maxSurveyNoData } = await admin
    .from('event_survey_entries')
    .select('survey_no')
    .eq('campaign_id', campaignId)
    .order('survey_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  let currentSurveyNo = maxSurveyNoData?.survey_no || 0
  
  // 복구할 entry 생성 (개인정보는 더미로)
  const entriesToRecover: any[] = []
  
  for (const info of deletedEntriesInfo) {
    currentSurveyNo++
    const convertedDate = new Date(info.converted_at)
    
    entriesToRecover.push({
      id: info.entry_id, // 원래 ID 사용
      campaign_id: campaignId,
      client_id: clientId,
      name: `[복구] ${info.utm_source || 'Unknown'}_${currentSurveyNo}`, // 더미 이름
      phone_norm: `0100000${String(currentSurveyNo).padStart(4, '0')}`, // 더미 전화번호
      survey_no: currentSurveyNo,
      code6: String(currentSurveyNo).padStart(6, '0'),
      completed_at: convertedDate.toISOString(),
      utm_source: info.utm_source,
      utm_medium: info.utm_medium,
      utm_campaign: info.utm_campaign,
      marketing_campaign_link_id: info.marketing_campaign_link_id,
    })
  }
  
  console.log(`복구할 entry: ${entriesToRecover.length}개`)
  console.log('')
  console.log('⚠️  이 방법은 개인정보 없이 복구됩니다.')
  console.log('   실제 이름과 전화번호는 복구할 수 없습니다.')
  console.log('')
  
  // 사용자 확인 필요
  console.log('복구를 진행하시겠습니까? (y/n)')
  console.log('   - 개인정보는 더미 데이터로 채워집니다.')
  console.log('   - UTM 정보와 전환 시각은 정확합니다.')
  console.log('   - 통계 데이터는 정확하게 복구됩니다.')
  console.log('')
  
  // 일단은 정보만 출력
  console.log('복구할 데이터 샘플 (상위 10개):')
  entriesToRecover.slice(0, 10).forEach((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    console.log(`  survey_no: ${e.survey_no}, name: ${e.name}, date: ${dateStr}, utm: ${e.utm_source}/${e.utm_medium}`)
  })
  
  console.log('')
  console.log('='.repeat(80))
  console.log('복구 스크립트를 실행하려면:')
  console.log('  npx tsx scripts/recover-from-access-logs.ts --execute')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'
const execute = args.includes('--execute')

if (execute) {
  // 실제 복구 실행
  console.log('⚠️  실제 복구를 실행합니다...')
  // TODO: 실제 복구 로직 추가
} else {
  recoverFromAccessLogs(clientId, campaignId)
    .then(() => {
      setTimeout(() => process.exit(0), 100)
    })
    .catch((error) => {
      console.error('오류:', error)
      setTimeout(() => process.exit(1), 100)
    })
}
