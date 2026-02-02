/**
 * Backfill 링크를 기존 링크에 병합하는 스크립트
 * 
 * 목적: [Backfill] 접두사가 있는 링크의 데이터를 같은 UTM source/medium을 가진 기존 링크에 합치고,
 *       Backfill 링크는 삭제
 * 
 * 사용법:
 *   npx tsx scripts/merge-backfill-links.ts [clientId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function mergeBackfillLinks(clientId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('Backfill 링크를 기존 링크에 병합')
  console.log('='.repeat(80))
  console.log('')
  
  // 1. 클라이언트 확인
  if (!clientId) {
    console.log('❌ clientId가 필요합니다.')
    console.log('사용법: npx tsx scripts/merge-backfill-links.ts [clientId]')
    return
  }
  
  console.log(`클라이언트 ID: ${clientId}`)
  console.log('')
  
  // 2. [Backfill] 링크 찾기
  console.log('2. [Backfill] 링크 찾기')
  console.log('-'.repeat(80))
  
  const { data: backfillLinks, error: linksError } = await admin
    .from('campaign_link_meta')
    .select('*')
    .eq('client_id', clientId)
    .like('name', '[Backfill]%')
  
  if (linksError) {
    console.error('❌ 링크 조회 오류:', linksError)
    return
  }
  
  if (!backfillLinks || backfillLinks.length === 0) {
    console.log('  [Backfill] 링크가 없습니다.')
    return
  }
  
  console.log(`  [Backfill] 링크 ${backfillLinks.length}개 발견`)
  backfillLinks.forEach(link => {
    console.log(`    - ${link.name} (${link.id})`)
    console.log(`      UTM: ${link.utm_source}/${link.utm_medium}/${link.utm_campaign}`)
  })
  console.log('')
  
  // 3. 각 Backfill 링크에 대해 기존 링크 찾기 및 병합
  console.log('3. 기존 링크 찾기 및 병합')
  console.log('-'.repeat(80))
  
  let mergedCount = 0
  let deletedCount = 0
  let skippedCount = 0
  
  for (const backfillLink of backfillLinks) {
    // 광고메일(stibee/email)은 정확히 매칭, 나머지는 유연하게
    const isEmail = backfillLink.utm_source === 'stibee' && backfillLink.utm_medium === 'email'
    
    let existingLinks: any[] = []
    
    if (isEmail) {
      // 광고메일: 정확히 같은 source/medium 매칭
      const { data: exactMatches } = await admin
        .from('campaign_link_meta')
        .select('*')
        .eq('client_id', clientId)
        .eq('target_campaign_id', backfillLink.target_campaign_id)
        .eq('utm_source', 'stibee')
        .eq('utm_medium', 'email')
        .not('name', 'like', '[Backfill]%')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (exactMatches && exactMatches.length > 0) {
        existingLinks = exactMatches
      }
    } else {
      // 나머지 채널: 유연하게 매칭
      // 1차: 정확히 같은 source/medium
      const { data: exactMatches } = await admin
        .from('campaign_link_meta')
        .select('*')
        .eq('client_id', clientId)
        .eq('target_campaign_id', backfillLink.target_campaign_id)
        .eq('utm_source', backfillLink.utm_source || null)
        .eq('utm_medium', backfillLink.utm_medium || null)
        .not('name', 'like', '[Backfill]%')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (exactMatches && exactMatches.length > 0) {
        existingLinks = exactMatches
      } else {
        // 2차: 같은 source만 (medium은 다를 수 있음)
        const { data: sourceMatches } = await admin
          .from('campaign_link_meta')
          .select('*')
          .eq('client_id', clientId)
          .eq('target_campaign_id', backfillLink.target_campaign_id)
          .eq('utm_source', backfillLink.utm_source || null)
          .not('name', 'like', '[Backfill]%')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (sourceMatches && sourceMatches.length > 0) {
          existingLinks = sourceMatches
        }
      }
    }
    
    let existingLink: any = null
    
    if (existingLinks.length > 0) {
      existingLink = existingLinks[0]
    } else {
      // 기존 링크가 없으면 Backfill 링크의 이름에서 [Backfill]만 제거
      const newName = backfillLink.name.replace(/^\[Backfill\]\s*/, '')
      console.log(`  ⚠️  ${backfillLink.name}: 기존 링크 없음, 이름 변경: "${newName}"`)
      
      const { error: updateError } = await admin
        .from('campaign_link_meta')
        .update({ name: newName })
        .eq('id', backfillLink.id)
      
      if (updateError) {
        console.error(`     ❌ 이름 변경 오류:`, updateError)
        skippedCount++
      } else {
        console.log(`     ✅ 이름 변경 완료`)
        mergedCount++
      }
      continue
    }
    
    console.log(`  ✅ ${backfillLink.name}`)
    console.log(`     → 기존 링크: ${existingLink.name} (${existingLink.id})`)
    
    // marketing_stats_daily에서 Backfill 링크의 데이터 찾기
    const { data: backfillStats } = await admin
      .from('marketing_stats_daily')
      .select('*')
      .eq('client_id', clientId)
      .eq('marketing_campaign_link_id', backfillLink.id)
    
    if (!backfillStats || backfillStats.length === 0) {
      console.log(`     통계 데이터 없음, 링크만 삭제`)
      // 링크 삭제
      await admin
        .from('campaign_link_meta')
        .delete()
        .eq('id', backfillLink.id)
      deletedCount++
      continue
    }
    
    // 기존 링크의 통계 데이터와 합산
    let totalVisits = 0
    let totalConversions = 0
    
    for (const stat of backfillStats) {
      totalVisits += stat.visits || 0
      totalConversions += stat.conversions || 0
      
      // 같은 키(날짜, 캠페인, UTM)로 기존 링크의 통계 찾기
      // 광고메일은 utm_campaign도 정확히 매칭, 나머지는 유연하게
      let existingStatsQuery = admin
        .from('marketing_stats_daily')
        .select('id, visits, conversions')
        .eq('client_id', stat.client_id)
        .eq('campaign_id', stat.campaign_id)
        .eq('bucket_date', stat.bucket_date)
        .eq('marketing_campaign_link_id', existingLink.id)
        .eq('utm_source', stat.utm_source || null)
        .eq('utm_medium', stat.utm_medium || null)
      
      if (isEmail) {
        // 광고메일: utm_campaign도 정확히 매칭
        existingStatsQuery = existingStatsQuery.eq('utm_campaign', stat.utm_campaign || null)
      }
      // 나머지는 utm_campaign 무시 (유연하게)
      
      const { data: existingStats } = await existingStatsQuery.maybeSingle()
      
      if (existingStats) {
        // 합산 (기존 데이터에 추가)
        const { error: updateError } = await admin
          .from('marketing_stats_daily')
          .update({
            visits: (existingStats.visits || 0) + (stat.visits || 0),
            conversions: (existingStats.conversions || 0) + (stat.conversions || 0),
          })
          .eq('id', existingStats.id)
        
        if (!updateError) {
          // Backfill 통계 삭제
          await admin
            .from('marketing_stats_daily')
            .delete()
            .eq('id', stat.id)
        }
      } else {
        // 기존 통계가 없으면 링크 ID와 UTM 업데이트 (광고메일은 utm_campaign 유지, 나머지는 기존 링크의 utm_campaign 사용)
        const updateData: any = {
          marketing_campaign_link_id: existingLink.id,
        }
        
        if (!isEmail) {
          // 나머지 채널: 기존 링크의 utm_campaign 사용
          updateData.utm_campaign = existingLink.utm_campaign || null
        }
        // 광고메일은 utm_campaign 그대로 유지
        
        const { error: updateError } = await admin
          .from('marketing_stats_daily')
          .update(updateData)
          .eq('id', stat.id)
        
        if (updateError) {
          console.error(`     ❌ 통계 업데이트 오류:`, updateError)
        }
      }
    }
    
    console.log(`     통계 합산: Visits ${totalVisits}개, 전환 ${totalConversions}개`)
    
    // Backfill 링크 삭제
    const { error: deleteError } = await admin
      .from('campaign_link_meta')
      .delete()
      .eq('id', backfillLink.id)
    
    if (deleteError) {
      console.error(`     ❌ 링크 삭제 오류:`, deleteError)
    } else {
      mergedCount++
      deletedCount++
    }
    
    console.log('')
  }
  
  console.log('='.repeat(80))
  console.log('✅ 병합 완료')
  console.log('')
  console.log(`  병합된 링크: ${mergedCount}개`)
  console.log(`  삭제된 링크: ${deletedCount}개`)
  console.log(`  건너뛴 링크: ${skippedCount}개`)
  console.log('')
  console.log('📝 참고:')
  console.log('  - Backfill 링크의 통계 데이터가 기존 링크에 합산되었습니다.')
  console.log('  - Backfill 링크는 삭제되었습니다.')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined

mergeBackfillLinks(clientId)
  .then(() => {
    console.log('완료')
    // 비동기 작업이 완전히 종료되도록 짧은 지연 후 종료
    setTimeout(() => {
      process.exit(0)
    }, 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => {
      process.exit(1)
    }, 100)
  })
