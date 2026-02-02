/**
 * 2026-02-02 보정치 조정 스크립트
 * 
 * 목적: 광고메일 전환을 15개 줄이고, 0인 링크들에 분배
 * 
 * 사용법:
 *   npx tsx scripts/adjust-2026-02-02-stats.ts [clientId] [campaignId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

const BUCKET_DATE = '2026-02-02'

// 조정할 링크 목록
const ADJUSTMENTS = [
  {
    // 광고메일: 전환 65 → 50 (15개 감소)
    utm_source: 'stibee',
    utm_medium: 'email',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 844,
    conversions: 50, // 65에서 15 감소
  },
  {
    // 오픈카톡: 전환 추가 (현재 0)
    utm_source: 'kakao',
    utm_medium: 'opentalk',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 78,
    conversions: 2, // 추가
  },
  {
    // 협회: 전환 추가 (현재 0)
    utm_source: 'association',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 89,
    conversions: 2, // 추가
  },
  {
    // 워트홈페이지_상세페이지: 전환 추가 (현재 0)
    utm_source: 'heythere',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 64,
    conversions: 2, // 추가 (기존 1에서 2로)
    note: '워트홈페이지_상세페이지',
  },
  {
    // 인스타그램_상세페이지: 전환 추가 (현재 0)
    utm_source: 'insta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 103,
    conversions: 2, // 추가
    note: '인스타그램_상세페이지',
  },
  {
    // 메타 콘텐츠_상세페이지: 전환 추가 (현재 0)
    utm_source: 'meta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_meta',
    visits: 95,
    conversions: 2, // 추가
    note: '메타 콘텐츠_상세페이지',
  },
  {
    // 링크드인 콘텐츠_상세페이지: 전환 추가 (현재 0)
    utm_source: 'linkedin',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 86,
    conversions: 2, // 추가
    note: '링크드인 콘텐츠_상세페이지',
  },
  {
    // 인블로그 (보관): 전환 추가 (현재 0)
    utm_source: 'inblog',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 112,
    conversions: 2, // 추가
    note: '인블로그 (보관)',
  },
  {
    // 카카오채널메세지 (보관): 전환 추가 (현재 0)
    utm_source: 'kakao',
    utm_medium: 'message',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 132,
    conversions: 1, // 추가
    note: '카카오채널메세지 (보관)',
  },
]

// 전환 합계 검증: 50 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 = 65
// 기존 87에서 광고메일 15 감소 = 72
// 하지만 0인 링크들에 15개 추가하면 총합은 동일하게 유지
// 실제로는 광고메일만 줄이고 나머지는 기존 값 유지 + 0인 것들에 추가

async function adjust20260202Stats(clientId: string, campaignId: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 보정치 조정')
  console.log('='.repeat(80))
  console.log('')
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`캠페인 ID: ${campaignId}`)
  console.log(`버킷 날짜: ${BUCKET_DATE}`)
  console.log('')
  
  // 1. 링크 매핑
  console.log('1. 링크 매핑')
  console.log('-'.repeat(80))
  
  const linkMapping: Array<{
    adjustment: typeof ADJUSTMENTS[0]
    linkId: string | null
    linkName: string | null
  }> = []
  
  for (const adjustment of ADJUSTMENTS) {
    // 같은 UTM 조합의 링크 찾기
    let linksQuery = admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign, status')
      .eq('client_id', clientId)
      .eq('target_campaign_id', campaignId)
      .eq('utm_source', adjustment.utm_source)
      .eq('utm_medium', adjustment.utm_medium)
      .eq('utm_campaign', adjustment.utm_campaign)
    
    // 특정 링크를 찾아야 하는 경우 (같은 UTM이 여러 개일 때)
    if (adjustment.note) {
      // 이름으로 필터링 시도
      if (adjustment.note.includes('상세페이지')) {
        linksQuery = linksQuery.ilike('name', '%상세페이지%')
      } else if (adjustment.note.includes('보관')) {
        linksQuery = linksQuery.eq('status', 'archived')
      }
    }
    
    const { data: links } = await linksQuery.order('created_at', { ascending: true }).limit(10)
    
    if (links && links.length > 0) {
      // 같은 UTM이 여러 개인 경우, note에 따라 선택
      let selectedLink = links[0]
      
      if (adjustment.note) {
        if (adjustment.note.includes('상세페이지')) {
          selectedLink = links.find(l => l.name.includes('상세페이지')) || links[0]
        } else if (adjustment.note.includes('보관')) {
          selectedLink = links.find(l => l.status === 'archived') || links[0]
        }
      }
      
      linkMapping.push({
        adjustment,
        linkId: selectedLink.id,
        linkName: selectedLink.name,
      })
      
      const note = adjustment.note ? ` (${adjustment.note})` : ''
      console.log(`  ✅ ${adjustment.utm_source}/${adjustment.utm_medium}: ${selectedLink.name}${note}`)
    } else {
      linkMapping.push({
        adjustment,
        linkId: null,
        linkName: null,
      })
      console.log(`  ⚠️  찾을 수 없음: ${adjustment.utm_source}/${adjustment.utm_medium}/${adjustment.utm_campaign}`)
    }
  }
  
  const foundLinks = linkMapping.filter(m => m.linkId !== null)
  if (foundLinks.length === 0) {
    console.log('❌ 매칭되는 링크가 없습니다.')
    return
  }
  
  console.log('')
  console.log(`  총 ${foundLinks.length}개 링크 매핑 완료`)
  console.log('')
  
  // 2. 기존 데이터 확인
  console.log('2. 기존 데이터 확인')
  console.log('-'.repeat(80))
  
  const linkIds = foundLinks.map(m => m.linkId!).filter((id, idx, arr) => arr.indexOf(id) === idx)
  
  const { data: existingStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  if (existingStats && existingStats.length > 0) {
    console.log(`  기존 데이터 발견: ${existingStats.length}개 레코드`)
    existingStats.forEach((stat: any) => {
      const mapping = linkMapping.find(m => m.linkId === stat.marketing_campaign_link_id)
      const linkName = mapping?.linkName || '알 수 없음'
      console.log(`    - ${linkName}: Visits ${stat.visits}, 전환 ${stat.conversions}`)
    })
  } else {
    console.log('  기존 데이터 없음')
  }
  
  console.log('')
  
  // 3. 데이터 업데이트/삽입
  console.log('3. 데이터 업데이트/삽입')
  console.log('-'.repeat(80))
  
  let updatedCount = 0
  let insertedCount = 0
  let errorCount = 0
  
  for (const mapping of foundLinks) {
    const stat = {
      client_id: clientId,
      campaign_id: campaignId,
      bucket_date: BUCKET_DATE,
      marketing_campaign_link_id: mapping.linkId!,
      utm_source: mapping.adjustment.utm_source,
      utm_medium: mapping.adjustment.utm_medium,
      utm_campaign: mapping.adjustment.utm_campaign,
      visits: mapping.adjustment.visits,
      conversions: mapping.adjustment.conversions,
    }
    
    // 존재 여부 확인
    const { data: existing } = await admin
      .from('marketing_stats_daily')
      .select('id, visits, conversions')
      .eq('client_id', stat.client_id)
      .eq('bucket_date', stat.bucket_date)
      .eq('campaign_id', stat.campaign_id)
      .eq('marketing_campaign_link_id', stat.marketing_campaign_link_id)
      .eq('utm_source', stat.utm_source || null)
      .eq('utm_medium', stat.utm_medium || null)
      .eq('utm_campaign', stat.utm_campaign || null)
      .maybeSingle()
    
    if (existing) {
      // Update
      const { error: updateError } = await admin
        .from('marketing_stats_daily')
        .update({
          visits: stat.visits,
          conversions: stat.conversions,
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error(`  ❌ ${mapping.linkName}: ${updateError.message}`)
        errorCount++
      } else {
        const change = stat.conversions - (existing.conversions || 0)
        const changeStr = change > 0 ? `+${change}` : change.toString()
        console.log(`  ✅ ${mapping.linkName}: Visits ${stat.visits}, 전환 ${stat.conversions} (${changeStr})`)
        updatedCount++
      }
    } else {
      // Insert
      const { error: insertError } = await admin
        .from('marketing_stats_daily')
        .insert(stat)
      
      if (insertError) {
        console.error(`  ❌ ${mapping.linkName}: ${insertError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ ${mapping.linkName}: Visits ${stat.visits}, 전환 ${stat.conversions} (신규)`)
        insertedCount++
      }
    }
  }
  
  console.log('')
  console.log(`  완료: ${updatedCount}개 업데이트, ${insertedCount}개 삽입, ${errorCount}개 실패`)
  console.log('')
  
  // 4. 검증
  console.log('4. 검증')
  console.log('-'.repeat(80))
  
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
  
  if (finalStats && finalStats.length > 0) {
    const totalVisits = finalStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    const totalConversions = finalStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    
    console.log(`  총 Visits: ${totalVisits}`)
    console.log(`  총 전환: ${totalConversions}`)
    console.log('')
    console.log('  링크별 상세:')
    
    // 조정된 링크들만 표시
    foundLinks.forEach(mapping => {
      const stat = finalStats.find((s: any) => s.marketing_campaign_link_id === mapping.linkId)
      if (stat) {
        const cvr = stat.visits > 0 ? ((stat.conversions / stat.visits) * 100).toFixed(2) : '0.00'
        console.log(`    - ${mapping.linkName}: Visits ${stat.visits}, 전환 ${stat.conversions}, CVR ${cvr}%`)
      }
    })
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 조정 완료')
  console.log('')
  console.log('📝 참고:')
  console.log('  - 광고메일 전환을 65 → 50으로 감소 (15개 감소)')
  console.log('  - 0이었던 링크들에 전환 추가')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || '55317496-d3d6-4e65-81d3-405892de78ab'
const campaignId = args[1] || '3a88682e-6fab-463c-8328-6b403c8c5c7a'

adjust20260202Stats(clientId, campaignId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
