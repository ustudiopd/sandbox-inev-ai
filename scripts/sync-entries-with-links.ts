/**
 * 전환 성과 데이터(event_survey_entries)에 캠페인 링크 ID 매칭 스크립트
 * 
 * 목적: event_survey_entries의 전환 데이터에 marketing_campaign_link_id를 채워서
 *       캠페인 링크와 매칭되도록 함
 * 
 * 사용법:
 *   npx tsx scripts/sync-entries-with-links.ts [clientId] [campaignId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function syncEntriesWithLinks(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('전환 성과 데이터에 캠페인 링크 ID 매칭')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 1. 캠페인의 모든 링크 조회
  console.log('1. 캠페인 링크 조회')
  console.log('-'.repeat(80))
  
  const { data: links } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign, status')
    .eq('client_id', clientId)
    .eq('target_campaign_id', campaignId)
    .order('created_at', { ascending: true })
  
  if (!links || links.length === 0) {
    console.log('  ⚠️  링크가 없습니다.')
    return
  }
  
  console.log(`  총 ${links.length}개 링크 발견`)
  console.log('')
  
  // 2. 모든 전환 데이터 조회 (링크 ID 유무 관계없이)
  console.log('2. 전환 데이터 조회 및 UTM 매칭 확인')
  console.log('-'.repeat(80))
  
  const { data: allEntries } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign, marketing_campaign_link_id, created_at')
    .eq('campaign_id', campaignId)
    .not('utm_source', 'is', null)
  
  if (!allEntries || allEntries.length === 0) {
    console.log('  ⚠️  전환 데이터가 없습니다.')
    return
  }
  
  console.log(`  총 전환 데이터: ${allEntries.length}개`)
  
  // 3. UTM 조합으로 올바른 링크 매칭
  console.log('3. UTM 조합으로 올바른 링크 매칭')
  console.log('-'.repeat(80))
  
  const matchResults: Array<{
    entryId: string
    currentLinkId: string | null
    correctLinkId: string
    linkName: string
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
  }> = []
  
  const unmatchedEntries: Array<{
    entryId: string
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
  }> = []
  
  for (const entry of allEntries) {
    // UTM 조합으로 매칭되는 링크 찾기
    const matchedLink = links.find(link => 
      link.utm_source === entry.utm_source &&
      link.utm_medium === entry.utm_medium &&
      link.utm_campaign === entry.utm_campaign
    )
    
    if (matchedLink) {
      // 현재 링크 ID와 올바른 링크 ID가 다른 경우만 추가
      if (entry.marketing_campaign_link_id !== matchedLink.id) {
        matchResults.push({
          entryId: entry.id,
          currentLinkId: entry.marketing_campaign_link_id,
          correctLinkId: matchedLink.id,
          linkName: matchedLink.name,
          utmSource: entry.utm_source,
          utmMedium: entry.utm_medium,
          utmCampaign: entry.utm_campaign,
        })
      }
    } else {
      unmatchedEntries.push({
        entryId: entry.id,
        utmSource: entry.utm_source,
        utmMedium: entry.utm_medium,
        utmCampaign: entry.utm_campaign,
      })
    }
  }
  
  if (matchResults.length === 0 && unmatchedEntries.length === 0) {
    console.log('  ✅ 모든 전환 데이터가 올바른 링크와 매칭되어 있습니다.')
    return
  }
  
  console.log(`  수정 필요: ${matchResults.length}개`)
  console.log(`  매칭 실패: ${unmatchedEntries.length}개`)
  
  if (unmatchedEntries.length > 0) {
    console.log('')
    console.log('  매칭 실패한 UTM 조합:')
    unmatchedEntries.forEach(entry => {
      console.log(`    - ${entry.utmSource}/${entry.utmMedium}/${entry.utmCampaign || '(null)'}`)
    })
  }
  
  console.log(`  매칭 성공: ${matchResults.length}개`)
  console.log(`  매칭 실패: ${unmatchedEntries.length}개`)
  
  if (unmatchedEntries.length > 0) {
    console.log('')
    console.log('  매칭 실패한 UTM 조합:')
    unmatchedEntries.forEach(entry => {
      console.log(`    - ${entry.utmSource}/${entry.utmMedium}/${entry.utmCampaign || '(null)'}`)
    })
  }
  console.log('')
  
  // 4. 링크 ID 업데이트
  console.log('4. 전환 데이터에 올바른 링크 ID 업데이트')
  console.log('-'.repeat(80))
  
  let updatedCount = 0
  let errorCount = 0
  
  // 링크별로 그룹화하여 출력
  const linkGroups = new Map<string, Array<typeof matchResults[0]>>()
  matchResults.forEach(result => {
    const existing = linkGroups.get(result.correctLinkId) || []
    existing.push(result)
    linkGroups.set(result.correctLinkId, existing)
  })
  
  for (const [linkId, entries] of linkGroups.entries()) {
    const link = links.find(l => l.id === linkId)
    const linkName = link?.name || '알 수 없음'
    
    // 배치 업데이트
    const entryIds = entries.map(e => e.entryId)
    
    const { error: updateError } = await admin
      .from('event_survey_entries')
      .update({ marketing_campaign_link_id: linkId })
      .in('id', entryIds)
    
    if (updateError) {
      console.error(`  ❌ ${linkName}: ${updateError.message}`)
      errorCount += entries.length
    } else {
      const currentLinkInfo = entries[0].currentLinkId 
        ? ` (기존: ${links.find(l => l.id === entries[0].currentLinkId)?.name || entries[0].currentLinkId})` 
        : ' (기존: 없음)'
      console.log(`  ✅ ${linkName}: ${entries.length}개 전환 데이터 매칭${currentLinkInfo}`)
      updatedCount += entries.length
    }
  }
  
  console.log('')
  console.log(`  완료: ${updatedCount}개 업데이트, ${errorCount}개 오류`)
  console.log('')
  
  // 5. 최종 검증
  console.log('5. 최종 검증')
  console.log('-'.repeat(80))
  
  // 링크별 전환 수 확인
  const { data: finalEntries } = await admin
    .from('event_survey_entries')
    .select('marketing_campaign_link_id')
    .eq('campaign_id', campaignId)
    .not('marketing_campaign_link_id', 'is', null)
  
  const linkConversionMap = new Map<string, number>()
  if (finalEntries) {
    finalEntries.forEach((entry: any) => {
      const linkId = entry.marketing_campaign_link_id
      const count = linkConversionMap.get(linkId) || 0
      linkConversionMap.set(linkId, count + 1)
    })
  }
  
  console.log('  링크별 전환 수:')
  for (const link of links) {
    const conversions = linkConversionMap.get(link.id) || 0
    if (conversions > 0) {
      console.log(`    - ${link.name}: ${conversions}개`)
    }
  }
  
  // 여전히 링크 ID가 없는 전환 데이터 확인
  const { data: stillUnmatched } = await admin
    .from('event_survey_entries')
    .select('id, utm_source, utm_medium, utm_campaign')
    .eq('campaign_id', campaignId)
    .is('marketing_campaign_link_id', null)
    .not('utm_source', 'is', null)
  
  if (stillUnmatched && stillUnmatched.length > 0) {
    console.log('')
    console.log(`  ⚠️  여전히 링크 ID가 없는 전환 데이터: ${stillUnmatched.length}개`)
    console.log('    (해당 UTM 조합의 링크가 없거나 매칭되지 않음)')
  } else {
    console.log('')
    console.log('  ✅ 모든 전환 데이터가 링크와 매칭되었습니다.')
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 동기화 완료')
  console.log('')
  console.log('📝 참고:')
  console.log('  - event_survey_entries의 전환 데이터에 marketing_campaign_link_id를 채웠습니다.')
  console.log('  - UTM 조합으로 캠페인 링크와 매칭했습니다.')
  console.log('  - 이제 marketing_stats_daily와 실제 전환 데이터가 일치하게 됩니다.')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

syncEntriesWithLinks(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
