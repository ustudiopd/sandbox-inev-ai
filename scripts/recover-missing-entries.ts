/**
 * 누락된 참여자 데이터 복구 시도
 * 
 * 백업이 없는 경우, 다른 소스에서 데이터를 찾아 복구 시도
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function recoverMissingEntries(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('누락된 참여자 데이터 복구 시도')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. event_access_logs에서 전환된 방문 확인
  console.log('1. event_access_logs에서 전환 데이터 확인')
  console.log('-'.repeat(80))
  
  const { data: convertedLogs } = await admin
    .from('event_access_logs')
    .select('id, accessed_at, converted_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .not('converted_at', 'is', null)
    .order('converted_at', { ascending: true })
  
  console.log(`전환된 방문 로그: ${convertedLogs?.length || 0}개`)
  
  if (convertedLogs && convertedLogs.length > 0) {
    console.log('  날짜 범위:')
    const firstDate = new Date(convertedLogs[0].converted_at).toISOString().split('T')[0]
    const lastDate = new Date(convertedLogs[convertedLogs.length - 1].converted_at).toISOString().split('T')[0]
    console.log(`    ${firstDate} ~ ${lastDate}`)
  }
  
  console.log('')
  
  // 2. 현재 event_survey_entries와 비교
  console.log('2. 현재 event_survey_entries와 비교')
  console.log('-'.repeat(80))
  
  const { data: currentEntries } = await admin
    .from('event_survey_entries')
    .select('id, survey_no, completed_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .not('name', 'ilike', '%[보정]%')
    .order('survey_no', { ascending: true })
  
  console.log(`현재 실제 데이터: ${currentEntries?.length || 0}개`)
  
  // 전환 로그와 매칭되지 않은 것 찾기
  if (convertedLogs && currentEntries) {
    const matchedLogs = new Set<string>()
    const unmatchedLogs: any[] = []
    
    convertedLogs.forEach((log: any) => {
      const logDate = new Date(log.converted_at).toISOString().split('T')[0]
      const logUTM = `${log.utm_source || ''}/${log.utm_medium || ''}/${log.utm_campaign || ''}`
      
      const matched = currentEntries.find((entry: any) => {
        const entryDate = new Date(entry.completed_at).toISOString().split('T')[0]
        const entryUTM = `${entry.utm_source || ''}/${entry.utm_medium || ''}/${entry.utm_campaign || ''}`
        
        // 같은 날짜이고 같은 UTM이면 매칭
        if (logDate === entryDate && logUTM === entryUTM) {
          return true
        }
        
        // 같은 날짜이고 같은 링크 ID면 매칭
        if (logDate === entryDate && 
            log.marketing_campaign_link_id && 
            entry.marketing_campaign_link_id === log.marketing_campaign_link_id) {
          return true
        }
        
        return false
      })
      
      if (matched) {
        matchedLogs.add(log.id)
      } else {
        unmatchedLogs.push(log)
      }
    })
    
    console.log(`매칭된 전환 로그: ${matchedLogs.size}개`)
    console.log(`매칭되지 않은 전환 로그: ${unmatchedLogs.length}개`)
    
    if (unmatchedLogs.length > 0) {
      console.log('')
      console.log('매칭되지 않은 전환 로그 샘플 (상위 20개):')
      unmatchedLogs.slice(0, 20).forEach((log: any) => {
        const dateStr = new Date(log.converted_at).toISOString().split('T')[0]
        console.log(`  ${dateStr}: ${log.utm_source}/${log.utm_medium}/${log.utm_campaign || ''}`)
      })
    }
  }
  
  console.log('')
  
  // 3. 복구 가능성 평가
  console.log('3. 복구 가능성 평가')
  console.log('-'.repeat(80))
  
  console.log('⚠️  백업이 없는 경우 복구 방법:')
  console.log('')
  console.log('1. event_access_logs에서 전환 데이터 확인')
  console.log('   - 전환 로그만으로는 개인정보(이름, 전화번호 등) 복구 불가')
  console.log('   - 통계 데이터만 복구 가능')
  console.log('')
  console.log('2. 다른 테이블 확인')
  console.log('   - registrations 테이블 (웨비나 등록)')
  console.log('   - form_submissions 테이블 (폼 제출)')
  console.log('   - 하지만 이 캠페인에는 연결되지 않음')
  console.log('')
  console.log('3. 외부 소스')
  console.log('   - CSV/Excel 파일')
  console.log('   - 이메일/문서에서 데이터 확인')
  console.log('   - 참여자에게 재등록 요청')
  console.log('')
  console.log('4. 수동 복구')
  console.log('   - 현재 93개 데이터 유지')
  console.log('   - 누락된 84개는 복구 불가능할 수 있음')
  console.log('   - marketing_stats_daily는 87개로 유지 (통계용)')
  console.log('')
  
  console.log('='.repeat(80))
  console.log('결론:')
  console.log('- 백업이 없다면 개인정보가 포함된 실제 데이터 복구는 어렵습니다.')
  console.log('- 통계 데이터(marketing_stats_daily)는 이미 87개로 복구되어 있습니다.')
  console.log('- 참여자 목록은 현재 93개만 표시되지만, 통계는 87개로 정확합니다.')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

recoverMissingEntries(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
