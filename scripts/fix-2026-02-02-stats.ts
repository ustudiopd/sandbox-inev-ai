/**
 * 2026-02-02 하루 보정치(전환 87) 링크별 고정 주입 스크립트
 * 
 * 목적: 2026-02-02 하루 동안의 보정치를 marketing_stats_daily에 강제 주입
 * - marketing_campaign_link_id를 반드시 채워서 기존 링크/캠페인 UI 집계가 즉시 반영되게 함
 * - 총 전환 87개를 목표값으로 고정
 * 
 * 사용법:
 *   npx tsx scripts/fix-2026-02-02-stats.ts [clientId] [webinarId 또는 campaignId]
 * 
 * 예시:
 *   npx tsx scripts/fix-2026-02-02-stats.ts 55317496-d3d6-4e65-81d3-405892de78ab f257ce42-723a-4fad-a9a5-1bd8c154d7ce
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

// 보정 데이터: 링크별 고정 값 (전환 합계 = 87)
const CORRECTION_DATA = [
  {
    utm_source: 'stibee',
    utm_medium: 'email',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 844,
    conversions: 65,
  },
  {
    utm_source: 'community',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 323,
    conversions: 6,
  },
  {
    utm_source: 'keywert',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 57,
    conversions: 1,
    note: '전환 1 찍힌 항목',
  },
  {
    utm_source: 'association',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 89,
    conversions: 2,
  },
  {
    utm_source: 'kakao',
    utm_medium: 'message',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 132,
    conversions: 3,
    note: '상세페이지',
  },
  {
    utm_source: 'kakao',
    utm_medium: 'opentalk',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 78,
    conversions: 2,
  },
  {
    utm_source: 'heythere',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 64,
    conversions: 1,
    note: '상세페이지',
  },
  {
    utm_source: 'keywert',
    utm_medium: 'banner',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 41,
    conversions: 1,
    note: '다른 항목: visits 2였던 것',
  },
  {
    utm_source: 'insta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 103,
    conversions: 2,
    note: '상세페이지',
  },
  {
    utm_source: 'meta',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_meta',
    visits: 95,
    conversions: 1,
  },
  {
    utm_source: 'linkedin',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 86,
    conversions: 1,
  },
  {
    utm_source: 'inblog',
    utm_medium: 'contents',
    utm_campaign: '워트인텔리전트_ai_특허리서치_실무_활용_웨비나_202601_custom',
    visits: 112,
    conversions: 2,
  },
]

// 전환 합계 검증
const totalConversions = CORRECTION_DATA.reduce((sum, d) => sum + d.conversions, 0)
if (totalConversions !== 87) {
  throw new Error(`전환 합계가 87이 아닙니다: ${totalConversions}`)
}

const BUCKET_DATE = '2026-02-02'

async function fix20260202Stats(clientId?: string, targetId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('2026-02-02 하루 보정치(전환 87) 링크별 고정 주입')
  console.log('='.repeat(80))
  console.log('')
  
  if (!clientId) {
    console.log('❌ clientId가 필요합니다.')
    console.log('사용법: npx tsx scripts/fix-2026-02-02-stats.ts [clientId] [webinarId 또는 campaignId]')
    return
  }
  
  console.log(`클라이언트 ID: ${clientId}`)
  console.log(`버킷 날짜: ${BUCKET_DATE}`)
  if (targetId) {
    console.log(`타겟 ID: ${targetId}`)
  }
  console.log('')
  
  // 1. 웨비나 또는 캠페인 찾기
  let campaignId: string | null = null
  let webinarId: string | null = null
  
  if (targetId) {
    // 웨비나인지 확인
    const { data: webinar } = await admin
      .from('webinars')
      .select('id, registration_campaign_id, client_id')
      .eq('id', targetId)
      .maybeSingle()
    
    if (webinar) {
      if (webinar.client_id !== clientId) {
        console.log('❌ 웨비나의 client_id가 일치하지 않습니다.')
        return
      }
      webinarId = webinar.id
      campaignId = webinar.registration_campaign_id
      console.log(`✅ 웨비나 찾음: ${webinarId}`)
      if (campaignId) {
        console.log(`   등록 캠페인 ID: ${campaignId}`)
      }
    } else {
      // 캠페인인지 확인
      const { data: campaign } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id')
        .eq('id', targetId)
        .maybeSingle()
      
      if (campaign) {
        if (campaign.client_id !== clientId) {
          console.log('❌ 캠페인의 client_id가 일치하지 않습니다.')
          return
        }
        campaignId = campaign.id
        console.log(`✅ 캠페인 찾음: ${campaignId}`)
      }
    }
  }
  
  // "AI 특허리서치 실무 활용 웨비나"로 검색
  if (!campaignId) {
    console.log('🔍 "AI 특허리서치 실무 활용 웨비나" 검색 중...')
    
    const { data: webinars } = await admin
      .from('webinars')
      .select('id, registration_campaign_id, title, client_id')
      .ilike('title', '%AI 특허리서치%')
      .eq('client_id', clientId)
      .limit(5)
    
    if (webinars && webinars.length > 0) {
      const webinar = webinars[0]
      webinarId = webinar.id
      campaignId = webinar.registration_campaign_id
      console.log(`✅ 웨비나 찾음: ${webinar.title} (ID: ${webinarId})`)
      if (campaignId) {
        console.log(`   등록 캠페인 ID: ${campaignId}`)
      }
    } else {
      // 캠페인으로 검색
      const { data: campaigns } = await admin
        .from('event_survey_campaigns')
        .select('id, title, client_id')
        .ilike('title', '%AI 특허리서치%')
        .eq('client_id', clientId)
        .limit(5)
      
      if (campaigns && campaigns.length > 0) {
        campaignId = campaigns[0].id
        console.log(`✅ 캠페인 찾음: ${campaigns[0].title} (ID: ${campaignId})`)
      }
    }
  }
  
  if (!campaignId) {
    console.log('❌ 캠페인을 찾을 수 없습니다.')
    return
  }
  
  console.log('')
  
  // 2. 링크 매핑 (UTM 조합별로 link_id 찾기)
  console.log('2. 링크 매핑 (UTM 조합별 link_id 찾기)')
  console.log('-'.repeat(80))
  
  const linkMapping: Array<{
    correctionData: typeof CORRECTION_DATA[0]
    linkId: string | null
    linkName: string | null
  }> = []
  
  // 같은 UTM 조합의 링크들을 추적하여 중복 처리
  const usedLinkIds = new Set<string>()
  
  for (let i = 0; i < CORRECTION_DATA.length; i++) {
    const correction = CORRECTION_DATA[i]
    
    // 같은 client_id에서 (utm_source, utm_medium, utm_campaign) 조합이 동일한 링크 찾기
    const linksQuery = admin
      .from('campaign_link_meta')
      .select('id, name, utm_source, utm_medium, utm_campaign')
      .eq('client_id', clientId)
      .eq('target_campaign_id', campaignId)
      .eq('utm_source', correction.utm_source)
      .eq('utm_medium', correction.utm_medium)
      .eq('utm_campaign', correction.utm_campaign)
      .eq('status', 'active')
    
    const { data: links } = await linksQuery.order('created_at', { ascending: true }).limit(10)
    
    if (links && links.length > 0) {
      // 같은 UTM 조합이 여러 번 나오는 경우 (예: keywert/banner가 두 개)
      // 이미 사용한 link_id는 제외하고 다음 링크 선택
      let selectedLink = links.find(link => !usedLinkIds.has(link.id))
      
      // 모두 사용했으면 첫 번째 링크 사용 (같은 링크에 여러 번 기록)
      if (!selectedLink) {
        selectedLink = links[0]
      }
      
      usedLinkIds.add(selectedLink.id)
      
      linkMapping.push({
        correctionData: correction,
        linkId: selectedLink.id,
        linkName: selectedLink.name,
      })
      
      const note = correction.note ? ` (${correction.note})` : ''
      if (links.length > 1) {
        console.log(`  ✅ ${correction.utm_source}/${correction.utm_medium}: ${selectedLink.name} (${linkMapping.length}/${links.length}${note})`)
      } else {
        console.log(`  ✅ ${correction.utm_source}/${correction.utm_medium}: ${selectedLink.name}${note}`)
      }
    } else {
      linkMapping.push({
        correctionData: correction,
        linkId: null,
        linkName: null,
      })
      console.log(`  ⚠️  찾을 수 없음: ${correction.utm_source}/${correction.utm_medium}/${correction.utm_campaign}`)
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
  
  // 3. 기존 데이터 백업 및 삭제
  console.log('3. 기존 데이터 백업 및 삭제')
  console.log('-'.repeat(80))
  
  const linkIds = foundLinks.map(m => m.linkId!).filter((id, idx, arr) => arr.indexOf(id) === idx)
  
  // 기존 데이터 조회 (백업용)
  const { data: existingStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  if (existingStats && existingStats.length > 0) {
    console.log(`  기존 데이터 발견: ${existingStats.length}개 레코드`)
    const totalVisits = existingStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    const totalConversions = existingStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    console.log(`    총 Visits: ${totalVisits}, 총 전환: ${totalConversions}`)
    
    // 백업 (콘솔 출력)
    console.log('')
    console.log('  [백업 데이터]')
    existingStats.forEach((stat: any) => {
      console.log(`    - ${stat.marketing_campaign_link_id}: Visits ${stat.visits}, 전환 ${stat.conversions}`)
    })
  } else {
    console.log('  기존 데이터 없음')
  }
  
  console.log('')
  
  // 기존 데이터 삭제
  console.log('  기존 데이터 삭제 중...')
  const { error: deleteError } = await admin
    .from('marketing_stats_daily')
    .delete()
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  if (deleteError) {
    console.error('  ❌ 삭제 오류:', deleteError)
    return
  }
  
  console.log('  ✅ 기존 데이터 삭제 완료')
  console.log('')
  
  // 4. 보정 데이터 삽입
  console.log('4. 보정 데이터 삽입')
  console.log('-'.repeat(80))
  
  const statsToInsert = foundLinks.map(mapping => ({
    client_id: clientId,
    campaign_id: campaignId,
    bucket_date: BUCKET_DATE,
    marketing_campaign_link_id: mapping.linkId!,
    utm_source: mapping.correctionData.utm_source,
    utm_medium: mapping.correctionData.utm_medium,
    utm_campaign: mapping.correctionData.utm_campaign,
    visits: mapping.correctionData.visits,
    conversions: mapping.correctionData.conversions,
  }))
  
  let insertedCount = 0
  let updatedCount = 0
  let errorCount = 0
  
  for (const stat of statsToInsert) {
    // unique index 기반으로 존재 여부 확인 후 upsert
    const { data: existing } = await admin
      .from('marketing_stats_daily')
      .select('id')
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
        console.error(`  ❌ ${stat.utm_source}/${stat.utm_medium}: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ ${stat.utm_source}/${stat.utm_medium}: Visits ${stat.visits}, 전환 ${stat.conversions} (업데이트)`)
        updatedCount++
      }
    } else {
      // Insert
      const { error: insertError } = await admin
        .from('marketing_stats_daily')
        .insert(stat)
      
      if (insertError) {
        console.error(`  ❌ ${stat.utm_source}/${stat.utm_medium}: ${insertError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ ${stat.utm_source}/${stat.utm_medium}: Visits ${stat.visits}, 전환 ${stat.conversions} (삽입)`)
        insertedCount++
      }
    }
  }
  
  console.log('')
  console.log(`  삽입 완료: ${insertedCount}개 삽입, ${updatedCount}개 업데이트, ${errorCount}개 실패`)
  console.log('')
  
  // 5. 검증
  console.log('5. 검증')
  console.log('-'.repeat(80))
  
  const { data: finalStats } = await admin
    .from('marketing_stats_daily')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .eq('bucket_date', BUCKET_DATE)
    .in('marketing_campaign_link_id', linkIds)
  
  if (finalStats && finalStats.length > 0) {
    const totalVisits = finalStats.reduce((sum, s) => sum + (s.visits || 0), 0)
    const totalConversions = finalStats.reduce((sum, s) => sum + (s.conversions || 0), 0)
    
    console.log(`  총 Visits: ${totalVisits}`)
    console.log(`  총 전환: ${totalConversions} (목표: 87)`)
    
    if (totalConversions === 87) {
      console.log('  ✅ 전환 합계 검증 통과')
    } else {
      console.log(`  ⚠️  전환 합계가 목표값과 다릅니다 (차이: ${totalConversions - 87})`)
    }
    
    console.log('')
    console.log('  링크별 상세:')
    finalStats.forEach((stat: any) => {
      const mapping = linkMapping.find(m => m.linkId === stat.marketing_campaign_link_id)
      const linkName = mapping?.linkName || '알 수 없음'
      const cvr = stat.visits > 0 ? ((stat.conversions / stat.visits) * 100).toFixed(2) : '0.00'
      console.log(`    - ${linkName}: Visits ${stat.visits}, 전환 ${stat.conversions}, CVR ${cvr}%`)
    })
  } else {
    console.log('  ⚠️  삽입된 데이터를 찾을 수 없습니다.')
  }
  
  console.log('')
  console.log('='.repeat(80))
  console.log('✅ 보정 완료')
  console.log('')
  console.log('📝 참고:')
  console.log(`  - ${BUCKET_DATE} 하루만 보정했습니다.`)
  console.log('  - 다른 날짜 데이터는 변경하지 않았습니다.')
  console.log('  - marketing_campaign_link_id를 채워 넣어 기존 UI가 즉시 반영됩니다.')
  console.log('  - 재실행 시 동일한 결과가 나옵니다 (멱등성 보장).')
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const targetId = args[1] || undefined

fix20260202Stats(clientId, targetId)
  .then(() => {
    setTimeout(() => process.exit(0), 100)
  })
  .catch((error) => {
    console.error('오류:', error)
    setTimeout(() => process.exit(1), 100)
  })
