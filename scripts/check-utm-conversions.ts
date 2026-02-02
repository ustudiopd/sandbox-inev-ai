/**
 * UTM 총 전환 데이터 확인 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/check-utm-conversions.ts [clientId] [campaignId]
 */

import dotenv from 'dotenv'
import { createAdminSupabase } from '../lib/supabase/admin'

dotenv.config({ path: '.env.local' })

async function checkUTMConversions(clientId?: string, campaignId?: string) {
  const admin = createAdminSupabase()
  
  console.log('='.repeat(80))
  console.log('UTM 총 전환 데이터 확인')
  console.log('='.repeat(80))
  if (clientId) {
    console.log(`클라이언트 ID: ${clientId}`)
  }
  if (campaignId) {
    console.log(`캠페인 ID: ${campaignId}`)
  }
  console.log('')
  
  // 1. Raw 데이터 확인 (event_survey_entries)
  console.log('1. Raw 데이터 확인 (event_survey_entries)')
  console.log('-'.repeat(80))
  
  let entriesQuery = admin
    .from('event_survey_entries')
    .select('id, name, company, created_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content, marketing_campaign_link_id')
    .or('utm_source.not.is.null,utm_medium.not.is.null,utm_campaign.not.is.null')
  
  if (campaignId) {
    entriesQuery = entriesQuery.eq('campaign_id', campaignId)
  } else if (clientId) {
    // 클라이언트의 캠페인 ID 목록 조회
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id)
      entriesQuery = entriesQuery.in('campaign_id', campaignIds)
    } else {
      console.log('  ⚠️  해당 클라이언트의 캠페인이 없습니다.')
      return
    }
  }
  
  const { data: entries, error: entriesError } = await entriesQuery.order('created_at', { ascending: false })
  
  if (entriesError) {
    console.error('  ❌ 오류:', entriesError)
    return
  }
  
  console.log(`  총 UTM 전환 수: ${entries?.length || 0}개`)
  console.log('')
  
  if (entries && entries.length > 0) {
    console.log('2. UTM별 상세 정보')
    console.log('-'.repeat(80))
    
    // UTM 소스별 그룹화
    const sourceMap = new Map<string, any[]>()
    entries.forEach(entry => {
      const key = `${entry.utm_source || 'null'}|${entry.utm_medium || 'null'}|${entry.utm_campaign || 'null'}`
      if (!sourceMap.has(key)) {
        sourceMap.set(key, [])
      }
      sourceMap.get(key)!.push(entry)
    })
    
    Array.from(sourceMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([key, entries]) => {
        const [source, medium, campaign] = key.split('|')
        console.log(`\n  [${entries.length}개] ${source} / ${medium} / ${campaign || '(없음)'}`)
        entries.forEach((entry, idx) => {
          const date = new Date(entry.created_at)
          const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
          const dateStr = kstDate.toISOString().split('T')[0]
          const timeStr = `${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`
          console.log(`    ${idx + 1}. ${entry.name || '(이름 없음)'} (${entry.company || '(회사 없음)'}) - ${dateStr} ${timeStr} KST`)
          if (entry.utm_term) console.log(`       utm_term: ${entry.utm_term}`)
          if (entry.utm_content) console.log(`       utm_content: ${entry.utm_content}`)
          if (entry.marketing_campaign_link_id) console.log(`       링크 ID: ${entry.marketing_campaign_link_id}`)
        })
      })
    
    console.log('')
    
    // 3. 집계 테이블 확인
    console.log('3. 집계 테이블 확인 (marketing_stats_daily)')
    console.log('-'.repeat(80))
    
    let statsQuery = admin
      .from('marketing_stats_daily')
      .select('*')
      .not('utm_source', 'is', null)
      .not('utm_medium', 'is', null)
    
    if (clientId) {
      statsQuery = statsQuery.eq('client_id', clientId)
    }
    if (campaignId) {
      statsQuery = statsQuery.eq('campaign_id', campaignId)
    }
    
    const { data: stats, error: statsError } = await statsQuery
    
    if (statsError) {
      console.error('  ❌ 오류:', statsError)
    } else {
      console.log(`  집계 레코드 수: ${stats?.length || 0}개`)
      
      if (stats && stats.length > 0) {
        const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
        console.log(`  집계된 총 전환 수: ${totalConversions}개`)
        
        console.log('\n  집계 테이블 상세:')
        stats.forEach((stat, idx) => {
          console.log(`\n  ${idx + 1}. ${stat.utm_source} / ${stat.utm_medium} / ${stat.utm_campaign || '(없음)'}`)
          console.log(`     전환: ${stat.conversions}개, Visits: ${stat.visits}개`)
          console.log(`     날짜: ${stat.bucket_date}`)
          if (stat.marketing_campaign_link_id) {
            console.log(`     링크 ID: ${stat.marketing_campaign_link_id}`)
          }
        })
      }
    }
    
    console.log('')
    
    // 4. 비교
    console.log('4. 비교')
    console.log('-'.repeat(80))
    if (stats && stats.length > 0) {
      const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)
      const rawCount = entries.length
      
      if (totalConversions === rawCount) {
        console.log(`  ✅ 일치: Raw ${rawCount}개 = 집계 ${totalConversions}개`)
      } else {
        console.log(`  ⚠️  불일치: Raw ${rawCount}개 ≠ 집계 ${totalConversions}개`)
        console.log(`  차이: ${rawCount - totalConversions}개`)
      }
    } else {
      console.log('  ⚠️  집계 테이블에 데이터가 없습니다.')
      console.log(`  Raw 데이터: ${entries.length}개`)
    }
  } else {
    console.log('  ⚠️  UTM이 있는 전환이 없습니다.')
  }
  
  console.log('='.repeat(80))
}

// 실행
const args = process.argv.slice(2)
const clientId = args[0] || undefined
const campaignId = args[1] || undefined

checkUTMConversions(clientId, campaignId)
  .then(() => {
    console.log('완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
