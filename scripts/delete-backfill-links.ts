/**
 * 백필 링크 삭제 스크립트
 * 
 * 특정 백필 링크들을 찾아서 삭제합니다.
 * 
 * 사용법:
 *   npx tsx scripts/delete-backfill-links.ts [clientId] [campaignId 또는 webinarId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

// 삭제할 백필 링크들 (UTM 파라미터로 식별)
const LINKS_TO_DELETE = [
  {
    name: 'SNS/메시지',
    utm_source: 'sns',
    utm_medium: 'social',
    utm_campaign: 'sns_promotion',
  },
  {
    name: '협회/파트너',
    utm_source: 'partner',
    utm_medium: 'referral',
    utm_campaign: 'association',
  },
  {
    name: '키워트 배너',
    utm_source: 'keywordt',
    utm_medium: 'banner',
    utm_campaign: 'homepage_banner',
  },
]

async function deleteBackfillLinks(clientId?: string, targetId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('백필 링크 삭제')
  console.log('='.repeat(80))
  console.log('')
  
  if (!clientId) {
    console.log('❌ clientId가 필요합니다.')
    console.log('사용법: npx tsx scripts/delete-backfill-links.ts [clientId] [campaignId 또는 webinarId]')
    return
  }
  
  console.log(`클라이언트 ID: ${clientId}`)
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
      .select('id, registration_campaign_id')
      .eq('id', targetId)
      .maybeSingle()
    
    if (webinar) {
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
        .select('id')
        .eq('id', targetId)
        .maybeSingle()
      
      if (campaign) {
        campaignId = campaign.id
        console.log(`✅ 캠페인 찾음: ${campaignId}`)
      }
    }
  }
  
  // "AI 특허리서치 실무 활용 웨비나"로 검색
  if (!campaignId && !webinarId) {
    console.log('🔍 "AI 특허리서치 실무 활용 웨비나" 검색 중...')
    
    const { data: webinars } = await admin
      .from('webinars')
      .select('id, registration_campaign_id, title')
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
        .select('id, title')
        .ilike('title', '%AI 특허리서치%')
        .eq('client_id', clientId)
        .limit(5)
      
      if (campaigns && campaigns.length > 0) {
        campaignId = campaigns[0].id
        console.log(`✅ 캠페인 찾음: ${campaigns[0].title} (ID: ${campaignId})`)
      }
    }
  }
  
  if (!campaignId && !webinarId) {
    console.log('❌ 웨비나 또는 캠페인을 찾을 수 없습니다.')
    return
  }
  
  console.log('')
  
  // 2. 삭제할 링크 찾기
  console.log('2. 삭제할 백필 링크 찾기')
  console.log('-'.repeat(80))
  
  let linksQuery = admin
    .from('campaign_link_meta')
    .select('*')
    .eq('client_id', clientId)
  
  if (campaignId) {
    linksQuery = linksQuery.eq('target_campaign_id', campaignId)
  } else if (webinarId) {
    linksQuery = linksQuery.eq('target_webinar_id', webinarId)
  }
  
  const { data: allLinks, error: linksError } = await linksQuery.order('created_at', { ascending: false })
  
  if (linksError) {
    console.error('❌ 링크 조회 오류:', linksError)
    return
  }
  
  if (!allLinks || allLinks.length === 0) {
    console.log('  링크가 없습니다.')
    return
  }
  
  // UTM 파라미터로 삭제할 링크 찾기
  const linksToDelete: any[] = []
  
  for (const linkToDelete of LINKS_TO_DELETE) {
    const matchingLink = allLinks.find(link => 
      link.utm_source === linkToDelete.utm_source &&
      link.utm_medium === linkToDelete.utm_medium &&
      link.utm_campaign === linkToDelete.utm_campaign
    )
    
    if (matchingLink) {
      linksToDelete.push(matchingLink)
      console.log(`  ✅ 찾음: ${matchingLink.name} (${matchingLink.id})`)
      console.log(`     UTM: ${matchingLink.utm_source}/${matchingLink.utm_medium}/${matchingLink.utm_campaign}`)
    } else {
      console.log(`  ⚠️  찾을 수 없음: ${linkToDelete.name}`)
    }
  }
  
  if (linksToDelete.length === 0) {
    console.log('  삭제할 링크가 없습니다.')
    return
  }
  
  console.log('')
  
  // 3. 링크 삭제
  console.log('3. 링크 삭제')
  console.log('-'.repeat(80))
  
  let deletedCount = 0
  let statsDeletedCount = 0
  
  for (const link of linksToDelete) {
    console.log(`  삭제 중: ${link.name} (${link.id})`)
    
    // 통계 데이터 조회
    const { data: stats } = await admin
      .from('marketing_stats_daily')
      .select('id, visits, conversions')
      .eq('marketing_campaign_link_id', link.id)
    
    if (stats && stats.length > 0) {
      const totalVisits = stats.reduce((sum, s) => sum + (s.visits || 0), 0)
      const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      console.log(`    통계 데이터: Visits ${totalVisits}, 전환 ${totalConversions}`)
      
      // 통계 데이터 삭제
      const { error: deleteStatsError } = await admin
        .from('marketing_stats_daily')
        .delete()
        .eq('marketing_campaign_link_id', link.id)
      
      if (deleteStatsError) {
        console.error(`    ❌ 통계 데이터 삭제 오류:`, deleteStatsError)
      } else {
        console.log(`    ✅ 통계 데이터 삭제 완료 (${stats.length}개 레코드)`)
        statsDeletedCount += stats.length
      }
    } else {
      console.log(`    통계 데이터 없음`)
    }
    
    // 링크 삭제 (완전 삭제)
    const { error: deleteError } = await admin
      .from('campaign_link_meta')
      .delete()
      .eq('id', link.id)
    
    if (deleteError) {
      console.error(`    ❌ 링크 삭제 오류:`, deleteError)
    } else {
      console.log(`    ✅ 링크 삭제 완료`)
      deletedCount++
    }
    
    console.log('')
  }
  
  console.log('='.repeat(80))
  console.log('✅ 삭제 완료')
  console.log('')
  console.log(`  삭제된 링크: ${deletedCount}개`)
  console.log(`  삭제된 통계 레코드: ${statsDeletedCount}개`)
  console.log('')
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const targetId = args[1] || undefined

deleteBackfillLinks(clientId, targetId)
  .then(() => {
    console.log('완료')
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
