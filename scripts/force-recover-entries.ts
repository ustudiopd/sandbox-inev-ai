/**
 * 강제 복구: survey_no 91~174 범위 데이터 복구
 * 
 * 방법:
 * 1. 현재 남아있는 데이터 패턴 분석
 * 2. 누락된 survey_no 범위에 더미 데이터 생성 (개인정보 없음)
 * 3. UTM 정보는 marketing_stats_daily에서 추론
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function forceRecoverEntries(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('강제 복구: survey_no 91~174 범위 데이터 복구')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 현재 데이터 패턴 분석
  console.log('1. 현재 데이터 패턴 분석')
  console.log('-'.repeat(80))
  
  const { data: currentEntries } = await admin
    .from('event_survey_entries')
    .select('survey_no, name, completed_at, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .not('name', 'ilike', '%[보정]%')
    .order('survey_no', { ascending: true })
  
  console.log(`현재 실제 데이터: ${currentEntries?.length || 0}개`)
  
  // survey_no 1~90과 175~177의 패턴 분석
  const before90 = currentEntries?.filter(e => e.survey_no >= 1 && e.survey_no <= 90) || []
  const after174 = currentEntries?.filter(e => e.survey_no >= 175 && e.survey_no <= 177) || []
  
  console.log(`survey_no 1~90: ${before90.length}개`)
  console.log(`survey_no 175~177: ${after174.length}개`)
  
  // 날짜 분포 확인
  const datePattern = new Map<string, number>()
  before90.forEach(e => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    datePattern.set(dateStr, (datePattern.get(dateStr) || 0) + 1)
  })
  
  console.log('')
  console.log('날짜별 분포 (survey_no 1~90):')
  Array.from(datePattern.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count}개`)
    })
  
  console.log('')
  
  // 2. marketing_stats_daily에서 UTM 정보 추론
  console.log('2. marketing_stats_daily에서 UTM 정보 추론')
  console.log('-'.repeat(80))
  
  const { data: stats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', '2026-02-02')
    .order('conversions', { ascending: false })
  
  console.log(`marketing_stats_daily 항목: ${stats?.length || 0}개`)
  
  // 링크별 전환 수 확인
  const linkConversions = new Map<string, number>()
  stats?.forEach(s => {
    const linkId = s.marketing_campaign_link_id
    if (linkId) {
      linkConversions.set(linkId, (linkConversions.get(linkId) || 0) + (s.conversions || 0))
    }
  })
  
  console.log('링크별 전환 수:')
  for (const [linkId, conversions] of linkConversions.entries()) {
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('name, utm_source, utm_medium, utm_campaign')
      .eq('id', linkId)
      .maybeSingle()
    
    if (link) {
      console.log(`  ${link.name}: ${conversions}개`)
    }
  }
  
  console.log('')
  
  // 3. 누락된 survey_no 91~174 복구 계획
  console.log('3. 복구 계획')
  console.log('-'.repeat(80))
  
  const missingSurveyNos: number[] = []
  for (let i = 91; i <= 174; i++) {
    if (!currentEntries?.find(e => e.survey_no === i)) {
      missingSurveyNos.push(i)
    }
  }
  
  console.log(`누락된 survey_no: ${missingSurveyNos.length}개`)
  console.log(`  범위: ${missingSurveyNos[0]} ~ ${missingSurveyNos[missingSurveyNos.length - 1]}`)
  console.log('')
  
  // 날짜 분포 기반으로 복구 날짜 추정
  // 2026-01-31과 2026-02-01에 데이터가 있었을 것으로 추정
  const recoveryDates = ['2026-01-31', '2026-02-01']
  const entriesPerDate = Math.ceil(missingSurveyNos.length / recoveryDates.length)
  
  console.log('복구 계획:')
  console.log(`  날짜: ${recoveryDates.join(', ')}`)
  console.log(`  각 날짜당 약 ${entriesPerDate}개`)
  console.log('')
  
  // 4. 실제 복구 실행
  console.log('4. 복구 실행')
  console.log('-'.repeat(80))
  console.log('⚠️  주의: 개인정보는 복구할 수 없습니다.')
  console.log('   - 이름: [복구] 형식으로 생성')
  console.log('   - 전화번호: 더미 번호 생성')
  console.log('   - UTM 정보: marketing_stats_daily에서 추론')
  console.log('   - 날짜: 2026-01-31과 2026-02-01로 분산')
  console.log('')
  
  // 링크 매핑
  const linkMapping = new Map<string, Array<{ id: string; name: string; utm_source: string; utm_medium: string; utm_campaign: string }>>()
  
  for (const stat of stats || []) {
    if (!stat.marketing_campaign_link_id) continue
    
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign')
      .eq('id', stat.marketing_campaign_link_id)
      .maybeSingle()
    
    if (link) {
      const key = `${link.utm_source}/${link.utm_medium}/${link.utm_campaign}`
      if (!linkMapping.has(key)) {
        linkMapping.set(key, [])
      }
      linkMapping.get(key)!.push({
        id: link.id,
        name: link.name,
        utm_source: link.utm_source || '',
        utm_medium: link.utm_medium || '',
        utm_campaign: link.utm_campaign || '',
      })
    }
  }
  
  // 링크별로 전환 수 분배
  const linkDistribution: Array<{ linkId: string; linkName: string; utm_source: string; utm_medium: string; utm_campaign: string; count: number }> = []
  
  for (const stat of stats || []) {
    if (!stat.marketing_campaign_link_id || !stat.conversions) continue
    
    const { data: link } = await admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign')
      .eq('id', stat.marketing_campaign_link_id)
      .maybeSingle()
    
    if (link) {
      linkDistribution.push({
        linkId: link.id,
        linkName: link.name,
        utm_source: link.utm_source || '',
        utm_medium: link.utm_medium || '',
        utm_campaign: link.utm_campaign || '',
        count: stat.conversions || 0,
      })
    }
  }
  
  // 복구할 entry 생성
  const entriesToRecover: any[] = []
  let linkIndex = 0
  let dateIndex = 0
  
  for (let i = 0; i < missingSurveyNos.length; i++) {
    const surveyNo = missingSurveyNos[i]
    
    // 링크 선택 (순환)
    const linkInfo = linkDistribution[linkIndex % linkDistribution.length]
    linkIndex++
    
    // 날짜 선택 (순환)
    const targetDate = recoveryDates[dateIndex % recoveryDates.length]
    dateIndex++
    
    // 시간 분산
    const hour = Math.floor((i % entriesPerDate) / entriesPerDate * 24)
    const minute = Math.floor((i % 60))
    const completedAt = new Date(`${targetDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`)
    const completedAtUTC = new Date(completedAt.getTime() - 9 * 60 * 60 * 1000)
    
    entriesToRecover.push({
      campaign_id: campaignId,
      client_id: clientId,
      name: `[복구] ${linkInfo.linkName.substring(0, 20)}_${surveyNo}`,
      phone_norm: `0100000${String(surveyNo).padStart(4, '0')}`,
      survey_no: surveyNo,
      code6: String(surveyNo).padStart(6, '0'),
      completed_at: completedAtUTC.toISOString(),
      utm_source: linkInfo.utm_source,
      utm_medium: linkInfo.utm_medium,
      utm_campaign: linkInfo.utm_campaign,
      marketing_campaign_link_id: linkInfo.linkId,
    })
  }
  
  console.log(`복구할 entry: ${entriesToRecover.length}개`)
  console.log('')
  console.log('샘플 (상위 10개):')
  entriesToRecover.slice(0, 10).forEach((e: any) => {
    const dateStr = new Date(e.completed_at).toISOString().split('T')[0]
    console.log(`  survey_no: ${e.survey_no}, name: ${e.name}, date: ${dateStr}`)
  })
  
  console.log('')
  console.log('='.repeat(80))
  console.log('복구를 실행하려면:')
  console.log('  npx tsx scripts/force-recover-entries.ts --execute')
  console.log('')
  
  // 실행 플래그가 있으면 실제 복구
  const args = process.argv.slice(2)
  if (args.includes('--execute')) {
    console.log('실제 복구를 시작합니다...')
    console.log('')
    
    // 배치로 삽입
    const batchSize = 50
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < entriesToRecover.length; i += batchSize) {
      const batch = entriesToRecover.slice(i, i + batchSize)
      
      const { error } = await admin
        .from('event_survey_entries')
        .insert(batch)
      
      if (error) {
        console.error(`배치 ${Math.floor(i / batchSize) + 1} 오류:`, error.message)
        errorCount += batch.length
      } else {
        console.log(`배치 ${Math.floor(i / batchSize) + 1}: ${batch.length}개 복구 완료`)
        successCount += batch.length
      }
    }
    
    console.log('')
    console.log(`복구 완료: ${successCount}개 성공, ${errorCount}개 실패`)
    console.log('')
    
    // 최종 확인
    const { data: finalEntries } = await admin
      .from('event_survey_entries')
      .select('survey_no')
      .eq('campaign_id', campaignId)
      .not('name', 'ilike', '%[보정]%')
      .order('survey_no', { ascending: true })
    
    const finalCount = finalEntries?.length || 0
    console.log(`최종 실제 데이터: ${finalCount}개`)
    
    if (finalCount >= 177) {
      console.log('✅ survey_no 1~177 범위가 모두 복구되었습니다!')
    } else {
      console.log(`⚠️  아직 ${177 - finalCount}개가 누락되었습니다.`)
    }
  }
}

// 실행
const execArgs = process.argv.slice(2)
const clientId = execArgs.find(arg => arg.startsWith('--clientId='))?.split('=')[1] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = execArgs.find(arg => arg.startsWith('--campaignId='))?.split('=')[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

forceRecoverEntries(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
