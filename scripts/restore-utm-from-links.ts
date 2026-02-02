import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeUTM } from '@/lib/utils/utm'

dotenv.config({ path: '.env.local' })

/**
 * marketing_campaign_link_id가 있지만 UTM 파라미터가 없는 등록 데이터 복원
 * 링크의 UTM 파라미터를 사용하여 복원
 * 
 * 사용법:
 * - 전체 복원: npx tsx scripts/restore-utm-from-links.ts
 * - 특정 클라이언트만: npx tsx scripts/restore-utm-from-links.ts --clientId <clientId>
 * - 특정 캠페인만: npx tsx scripts/restore-utm-from-links.ts --campaignId <campaignId>
 * - 드라이런 (실제 업데이트 안 함): npx tsx scripts/restore-utm-from-links.ts --dry-run
 */
async function restoreUTMFromLinks() {
  const args = process.argv.slice(2)
  const clientIdIndex = args.indexOf('--clientId')
  const campaignIdIndex = args.indexOf('--campaignId')
  const dryRun = args.includes('--dry-run')
  
  const clientId = clientIdIndex >= 0 ? args[clientIdIndex + 1] : null
  const campaignId = campaignIdIndex >= 0 ? args[campaignIdIndex + 1] : null
  
  const admin = createAdminSupabase()
  
  console.log('=== UTM 파라미터 복원 스크립트 ===\n')
  console.log(`모드: ${dryRun ? '🔍 드라이런 (실제 업데이트 안 함)' : '✅ 실제 업데이트'}`)
  if (clientId) console.log(`클라이언트 ID: ${clientId}`)
  if (campaignId) console.log(`캠페인 ID: ${campaignId}`)
  console.log('')
  
  // 1. marketing_campaign_link_id가 있지만 utm_source가 null인 레코드 찾기
  let entriesQuery = admin
    .from('event_survey_entries')
    .select('id, campaign_id, marketing_campaign_link_id, utm_source, utm_medium, utm_campaign, created_at')
    .not('marketing_campaign_link_id', 'is', null)
    .is('utm_source', null)
  
  // 클라이언트 필터링
  if (clientId || campaignId) {
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id')
      .then(result => {
        if (result.error) {
          console.error('❌ 캠페인 조회 실패:', result.error.message)
          process.exit(1)
        }
        return result
      })
    
    const filteredCampaignIds = campaigns
      ?.filter((c: any) => {
        if (clientId && c.client_id !== clientId) return false
        if (campaignId && c.id !== campaignId) return false
        return true
      })
      .map((c: any) => c.id) || []
    
    if (filteredCampaignIds.length === 0) {
      console.log('⚠️  조건에 맞는 캠페인이 없습니다.')
      return
    }
    
    entriesQuery = entriesQuery.in('campaign_id', filteredCampaignIds)
  }
  
  const { data: entries, error: entriesError } = await entriesQuery
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  // 디버깅: 전체 통계 확인
  const { count: totalEntriesWithLink } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('marketing_campaign_link_id', 'is', null)
  
  const { count: totalEntriesWithUTM } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('marketing_campaign_link_id', 'is', null)
    .not('utm_source', 'is', null)
  
  const { count: totalEntriesWithoutUTM } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .not('marketing_campaign_link_id', 'is', null)
    .is('utm_source', null)
  
  console.log('\n📊 데이터베이스 통계:')
  console.log(`  - 링크가 있는 등록: ${totalEntriesWithLink || 0}개`)
  console.log(`  - 링크 + UTM 있는 등록: ${totalEntriesWithUTM || 0}개`)
  console.log(`  - 링크 + UTM 없는 등록: ${totalEntriesWithoutUTM || 0}개`)
  
  if (clientId || campaignId) {
    console.log(`  - 필터링된 복원 대상: ${entries?.length || 0}개\n`)
  } else {
    console.log(`  - 전체 복원 대상: ${entries?.length || 0}개\n`)
  }
  
  if (!entries || entries.length === 0) {
    console.log('✅ 복원할 데이터가 없습니다. (모든 등록에 UTM 파라미터가 있거나 링크가 없습니다)')
    return
  }
  
  console.log(`📊 복원 대상: ${entries.length}개 항목\n`)
  
  // 2. 링크별로 그룹화하여 한 번에 조회
  const linkIds = [...new Set(entries.map((e: any) => e.marketing_campaign_link_id).filter(Boolean))]
  
  console.log(`🔗 조회할 링크 수: ${linkIds.length}개\n`)
  
  const { data: links, error: linksError } = await admin
    .from('campaign_link_meta')
    .select('id, name, utm_source, utm_medium, utm_campaign, utm_term, utm_content')
    .in('id', linkIds)
  
  if (linksError) {
    console.error('❌ 링크 조회 실패:', linksError.message)
    process.exit(1)
  }
  
  const linkMap = new Map(links?.map((link: any) => [link.id, link]) || [])
  
  // 3. 복원할 항목 확인 및 통계
  let restoredCount = 0
  let skippedCount = 0
  const updates: Array<{ entryId: string; linkId: string; linkName: string; utm: any }> = []
  
  for (const entry of entries) {
    const linkId = entry.marketing_campaign_link_id
    const link = linkMap.get(linkId)
    
    if (!link) {
      console.warn(`⚠️  링크를 찾을 수 없음: entry ${entry.id}, linkId ${linkId}`)
      skippedCount++
      continue
    }
    
    // 링크에 UTM 파라미터가 있는지 확인
    if (!link.utm_source && !link.utm_medium) {
      console.warn(`⚠️  링크에 UTM 파라미터 없음: entry ${entry.id}, link ${link.name || link.id}`)
      skippedCount++
      continue
    }
    
    // UTM 파라미터 정규화
    const normalizedUTM = normalizeUTM({
      utm_source: link.utm_source || null,
      utm_medium: link.utm_medium || null,
      utm_campaign: link.utm_campaign || null,
      utm_term: link.utm_term || null,
      utm_content: link.utm_content || null,
    })
    
    updates.push({
      entryId: entry.id,
      linkId: link.id,
      linkName: link.name || link.id,
      utm: normalizedUTM,
    })
    
    restoredCount++
  }
  
  console.log(`\n📈 통계:`)
  console.log(`  - 복원 가능: ${restoredCount}개`)
  console.log(`  - 건너뜀: ${skippedCount}개`)
  console.log(`  - 총 대상: ${entries.length}개\n`)
  
  if (updates.length === 0) {
    console.log('✅ 복원할 항목이 없습니다.')
    return
  }
  
  // 4. 샘플 출력 (처음 5개)
  console.log('📋 복원 예시 (처음 5개):')
  updates.slice(0, 5).forEach((update, index) => {
    console.log(`\n${index + 1}. Entry ID: ${update.entryId}`)
    console.log(`   링크: ${update.linkName}`)
    console.log(`   UTM Source: ${update.utm.utm_source || '(없음)'}`)
    console.log(`   UTM Medium: ${update.utm.utm_medium || '(없음)'}`)
    console.log(`   UTM Campaign: ${update.utm.utm_campaign || '(없음)'}`)
  })
  
  if (updates.length > 5) {
    console.log(`\n... 외 ${updates.length - 5}개 항목\n`)
  }
  
  // 5. 실제 업데이트
  if (dryRun) {
    console.log('\n🔍 드라이런 모드: 실제 업데이트를 하지 않습니다.')
    console.log(`실제 업데이트하려면 --dry-run 옵션을 제거하세요.`)
    return
  }
  
  console.log(`\n🔄 업데이트 시작...\n`)
  
  let successCount = 0
  let errorCount = 0
  
  // 배치로 업데이트 (한 번에 너무 많이 하지 않도록)
  const batchSize = 50
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    
    console.log(`배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)} 처리 중... (${batch.length}개 항목)`)
    
    await Promise.all(
      batch.map(async (update) => {
        try {
          const { error: updateError } = await admin
            .from('event_survey_entries')
            .update({
              utm_source: update.utm.utm_source || null,
              utm_medium: update.utm.utm_medium || null,
              utm_campaign: update.utm.utm_campaign || null,
              utm_term: update.utm.utm_term || null,
              utm_content: update.utm.utm_content || null,
            })
            .eq('id', update.entryId)
          
          if (updateError) {
            console.error(`❌ 업데이트 실패: entry ${update.entryId}`, updateError.message)
            errorCount++
          } else {
            successCount++
          }
        } catch (error: any) {
          console.error(`❌ 업데이트 오류: entry ${update.entryId}`, error.message)
          errorCount++
        }
      })
    )
  }
  
  console.log(`\n✅ 업데이트 완료:`)
  console.log(`  - 성공: ${successCount}개`)
  console.log(`  - 실패: ${errorCount}개`)
  console.log(`  - 총: ${updates.length}개\n`)
}

restoreUTMFromLinks().catch(console.error)
