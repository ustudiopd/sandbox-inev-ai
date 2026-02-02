import dotenv from 'dotenv'
import { createAdminSupabase } from '@/lib/supabase/admin'

dotenv.config({ path: '.env.local' })

/**
 * 서버 로그 기반 Source 추정 스크립트
 * 
 * UTM이 없는 등록 데이터를 서버 로그(Referer, User-Agent, Visit 로그)를 기반으로 추정
 * 
 * 사용법:
 * - 전체 추정: npx tsx scripts/estimate-source-from-logs.ts
 * - 특정 클라이언트: npx tsx scripts/estimate-source-from-logs.ts --clientId <clientId>
 * - 리포트만 생성: npx tsx scripts/estimate-source-from-logs.ts --report-only
 */

// Referer 기반 추정 룰셋
const REFERER_RULES: Array<{ pattern: RegExp; source: string; medium: string; confidence: 'high' | 'medium' | 'low' }> = [
  // 이메일 클라이언트
  { pattern: /mail\.google\.com|gmail\.com/i, source: 'gmail', medium: 'email', confidence: 'high' },
  { pattern: /outlook\.(live|office365|office)\.com|outlook\.com/i, source: 'outlook', medium: 'email', confidence: 'high' },
  { pattern: /mail\.yahoo\.com|yahoo\.com\/mail/i, source: 'yahoo', medium: 'email', confidence: 'high' },
  { pattern: /mail\.naver\.com/i, source: 'naver', medium: 'email', confidence: 'high' },
  { pattern: /mail\.daum\.net/i, source: 'daum', medium: 'email', confidence: 'high' },
  
  // 소셜 미디어
  { pattern: /linkedin\.com/i, source: 'linkedin', medium: 'social', confidence: 'high' },
  { pattern: /facebook\.com|fb\.com/i, source: 'facebook', medium: 'social', confidence: 'high' },
  { pattern: /twitter\.com|t\.co|x\.com/i, source: 'twitter', medium: 'social', confidence: 'high' },
  { pattern: /instagram\.com/i, source: 'instagram', medium: 'social', confidence: 'high' },
  
  // 검색 엔진
  { pattern: /google\.com\/search|google\.co\.kr\/search/i, source: 'google', medium: 'organic', confidence: 'high' },
  { pattern: /google\.com|google\.co\.kr/i, source: 'google', medium: 'cpc', confidence: 'medium' }, // 광고일 수도 있음
  
  // 직접 접속 (referer 없음)
  { pattern: /^$/, source: 'direct', medium: 'none', confidence: 'medium' },
]

// User-Agent 기반 추정 룰셋
const USER_AGENT_RULES: Array<{ pattern: RegExp; source: string; medium: string; confidence: 'high' | 'medium' | 'low' }> = [
  // 이메일 클라이언트
  { pattern: /GmailImageProxy|GoogleImageProxy/i, source: 'gmail', medium: 'email', confidence: 'high' },
  { pattern: /Outlook-iOS|Outlook-Android|Microsoft Office/i, source: 'outlook', medium: 'email', confidence: 'high' },
  
  // 소셜 미디어 앱
  { pattern: /LinkedInApp|LinkedInBot/i, source: 'linkedin', medium: 'social', confidence: 'high' },
  { pattern: /FBAN|FBAV|Facebook/i, source: 'facebook', medium: 'social', confidence: 'high' },
  { pattern: /Twitter|Tweetbot/i, source: 'twitter', medium: 'social', confidence: 'high' },
  
  // 검색 엔진 봇
  { pattern: /Googlebot|AdsBot/i, source: 'google', medium: 'organic', confidence: 'medium' },
]

// 추정 함수
function estimateSourceFromReferer(referer: string | null): { source: string; medium: string; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  if (!referer) {
    return { source: 'direct', medium: 'none', confidence: 'medium', reason: 'referer 없음' }
  }
  
  for (const rule of REFERER_RULES) {
    if (rule.pattern.test(referer)) {
      return {
        source: rule.source,
        medium: rule.medium,
        confidence: rule.confidence,
        reason: `referer: ${referer}`,
      }
    }
  }
  
  return null
}

function estimateSourceFromUserAgent(userAgent: string | null): { source: string; medium: string; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  if (!userAgent) {
    return null
  }
  
  for (const rule of USER_AGENT_RULES) {
    if (rule.pattern.test(userAgent)) {
      return {
        source: rule.source,
        medium: rule.medium,
        confidence: rule.confidence,
        reason: `user-agent: ${userAgent.substring(0, 50)}...`,
      }
    }
  }
  
  return null
}

// 추정 우선순위: Visit 로그 > Referer > User-Agent
async function estimateSourceForEntry(
  entry: any,
  visitLogs: Array<any>,
  admin: any
): Promise<{
  estimated_source: string | null
  estimated_medium: string | null
  estimation_reason: string
  confidence: 'high' | 'medium' | 'low'
}> {
  // 1순위: Visit 로그에서 session_id 매칭
  if (entry.session_id) {
    const matchingVisit = visitLogs.find((v: any) => 
      v.session_id === entry.session_id &&
      v.campaign_id === entry.campaign_id
    )
    
    if (matchingVisit) {
      // Visit 로그에 UTM이 있으면 사용 (가장 정확)
      if (matchingVisit.utm_source) {
        return {
          estimated_source: matchingVisit.utm_source,
          estimated_medium: matchingVisit.utm_medium || null,
          estimation_reason: 'visit_log_utm',
          confidence: 'high',
        }
      }
      
      // Visit 로그의 referer 사용
      if (matchingVisit.referrer) {
        const refererEstimate = estimateSourceFromReferer(matchingVisit.referrer)
        if (refererEstimate) {
          return {
            estimated_source: refererEstimate.source,
            estimated_medium: refererEstimate.medium,
            estimation_reason: `visit_log_referer: ${refererEstimate.reason}`,
            confidence: refererEstimate.confidence,
          }
        }
      }
      
      // Visit 로그의 user-agent 사용
      if (matchingVisit.user_agent) {
        const uaEstimate = estimateSourceFromUserAgent(matchingVisit.user_agent)
        if (uaEstimate) {
          return {
            estimated_source: uaEstimate.source,
            estimated_medium: uaEstimate.medium,
            estimation_reason: `visit_log_ua: ${uaEstimate.reason}`,
            confidence: uaEstimate.confidence,
          }
        }
      }
    }
  }
  
  // 2순위: 시간 상관관계로 Visit 로그 매칭 (±5분)
  const entryTime = new Date(entry.created_at).getTime()
  const matchingVisitByTime = visitLogs.find((v: any) => {
    if (v.campaign_id !== entry.campaign_id) return false
    
    const visitTime = new Date(v.accessed_at).getTime()
    const timeDiff = Math.abs(entryTime - visitTime)
    return timeDiff <= 5 * 60 * 1000 // 5분 이내
  })
  
  if (matchingVisitByTime) {
    if (matchingVisitByTime.referrer) {
      const refererEstimate = estimateSourceFromReferer(matchingVisitByTime.referrer)
      if (refererEstimate) {
        return {
          estimated_source: refererEstimate.source,
          estimated_medium: refererEstimate.medium,
          estimation_reason: `time_correlation_referer: ${refererEstimate.reason}`,
          confidence: refererEstimate.confidence === 'high' ? 'medium' : 'low',
        }
      }
    }
  }
  
  // 3순위: entry의 utm_referrer 사용 (가장 확실한 단서)
  if (entry.utm_referrer) {
    const refererEstimate = estimateSourceFromReferer(entry.utm_referrer)
    if (refererEstimate) {
      return {
        estimated_source: refererEstimate.source,
        estimated_medium: refererEstimate.medium,
        estimation_reason: `entry_referer: ${refererEstimate.reason}`,
        confidence: refererEstimate.confidence,
      }
    }
  }
  
  // 4순위: 시간대 패턴 분석 (같은 시간대에 몰린 경우 캠페인 유입 가능성)
  // 이건 나중에 별도 분석으로
  
  // 추정 불가
  return {
    estimated_source: null,
    estimated_medium: null,
    estimation_reason: 'insufficient_data',
    confidence: 'low',
  }
}

async function estimateSourceFromLogs() {
  const args = process.argv.slice(2)
  const clientIdIndex = args.indexOf('--clientId')
  const reportOnly = args.includes('--report-only')
  
  const clientId = clientIdIndex >= 0 ? args[clientIdIndex + 1] : null
  
  const admin = createAdminSupabase()
  
  console.log('=== 서버 로그 기반 Source 추정 ===\n')
  if (clientId) console.log(`클라이언트 ID: ${clientId}\n`)
  
  // 1. 추정 대상 등록 데이터 조회
  let entriesQuery = admin
    .from('event_survey_entries')
    .select('id, campaign_id, created_at, utm_source, utm_medium, marketing_campaign_link_id, utm_referrer')
    .is('utm_source', null)
    .is('marketing_campaign_link_id', null)
  
  // utm_referrer가 있는 항목 확인
  const { data: sampleEntries } = await admin
    .from('event_survey_entries')
    .select('id, utm_referrer')
    .is('utm_source', null)
    .not('utm_referrer', 'is', null)
    .limit(5)
  
  console.log(`📋 utm_referrer가 있는 항목 샘플: ${sampleEntries?.length || 0}개`)
  if (sampleEntries && sampleEntries.length > 0) {
    console.log('  샘플:', sampleEntries.map((e: any) => e.utm_referrer).slice(0, 3))
  }
  console.log('')
  
  // 클라이언트 필터링
  if (clientId) {
    const { data: campaigns } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    if (!campaigns || campaigns.length === 0) {
      console.log('⚠️  조건에 맞는 캠페인이 없습니다.')
      return
    }
    
    const campaignIds = campaigns.map((c: any) => c.id)
    entriesQuery = entriesQuery.in('campaign_id', campaignIds)
  }
  
  const { data: entries, error: entriesError } = await entriesQuery
  
  if (entriesError) {
    console.error('❌ 등록 데이터 조회 실패:', entriesError.message)
    process.exit(1)
  }
  
  if (!entries || entries.length === 0) {
    console.log('✅ 추정할 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 추정 대상: ${entries.length}개 항목\n`)
  
  // 2. Visit 로그 조회 (같은 캠페인, 최근 30일로 확대)
  const campaignIds = [...new Set(entries.map((e: any) => e.campaign_id))]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // entries의 최소/최대 시간 확인
  const entryTimes = entries.map((e: any) => new Date(e.created_at).getTime())
  const minEntryTime = Math.min(...entryTimes)
  const maxEntryTime = Math.max(...entryTimes)
  const minEntryDate = new Date(minEntryTime - 24 * 60 * 60 * 1000) // 1일 전부터
  const maxEntryDate = new Date(maxEntryTime + 24 * 60 * 60 * 1000) // 1일 후까지
  
  console.log(`📅 Entry 시간 범위: ${minEntryDate.toISOString()} ~ ${maxEntryDate.toISOString()}\n`)
  
  const { data: visitLogs, error: visitError } = await admin
    .from('event_access_logs')
    .select('id, campaign_id, session_id, utm_source, utm_medium, referrer, user_agent, accessed_at')
    .in('campaign_id', campaignIds)
    .gte('accessed_at', minEntryDate.toISOString())
    .lte('accessed_at', maxEntryDate.toISOString())
  
  if (visitError) {
    console.error('❌ Visit 로그 조회 실패:', visitError.message)
    process.exit(1)
  }
  
  console.log(`🔗 참조할 Visit 로그: ${visitLogs?.length || 0}개\n`)
  
  // 3. 각 entry에 대해 추정 수행
  console.log('🔄 추정 수행 중...\n')
  
  const estimates: Array<{
    entry_id: string
    campaign_id: string
    created_at: string
    estimated_source: string | null
    estimated_medium: string | null
    estimation_reason: string
    confidence: 'high' | 'medium' | 'low'
  }> = []
  
  let processed = 0
  for (const entry of entries) {
    const estimate = await estimateSourceForEntry(entry, visitLogs || [], admin)
    
    estimates.push({
      entry_id: entry.id,
      campaign_id: entry.campaign_id,
      created_at: entry.created_at,
      ...estimate,
    })
    
    processed++
    if (processed % 50 === 0) {
      console.log(`  처리 중: ${processed}/${entries.length}`)
    }
  }
  
  console.log(`\n✅ 추정 완료: ${estimates.length}개 항목\n`)
  
  // 4. 추정 결과 집계
  const sourceMap = new Map<string, number>()
  const mediumMap = new Map<string, number>()
  const confidenceMap = new Map<'high' | 'medium' | 'low', number>()
  const reasonMap = new Map<string, number>()
  
  estimates.forEach(est => {
    const source = est.estimated_source || 'unknown'
    const medium = est.estimated_medium || 'unknown'
    
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    mediumMap.set(medium, (mediumMap.get(medium) || 0) + 1)
    confidenceMap.set(est.confidence, (confidenceMap.get(est.confidence) || 0) + 1)
    reasonMap.set(est.estimation_reason, (reasonMap.get(est.estimation_reason) || 0) + 1)
  })
  
  // 5. 리포트 출력
  console.log('📊 추정 결과 집계:\n')
  
  console.log('Source별 분포:')
  const sortedSources = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
  
  sortedSources.forEach(([source, count]) => {
    const pct = ((count / estimates.length) * 100).toFixed(1)
    console.log(`  - ${source}: ${count}개 (${pct}%)`)
  })
  
  console.log('\nMedium별 분포:')
  const sortedMediums = Array.from(mediumMap.entries())
    .sort((a, b) => b[1] - a[1])
  
  sortedMediums.forEach(([medium, count]) => {
    const pct = ((count / estimates.length) * 100).toFixed(1)
    console.log(`  - ${medium}: ${count}개 (${pct}%)`)
  })
  
  console.log('\n신뢰도 분포:')
  console.log(`  - High: ${confidenceMap.get('high') || 0}개`)
  console.log(`  - Medium: ${confidenceMap.get('medium') || 0}개`)
  console.log(`  - Low: ${confidenceMap.get('low') || 0}개`)
  
  console.log('\n추정 근거 분포:')
  const sortedReasons = Array.from(reasonMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  
  sortedReasons.forEach(([reason, count]) => {
    console.log(`  - ${reason}: ${count}개`)
  })
  
  // 6. 상세 리포트 생성 (CSV)
  if (!reportOnly) {
    const csvLines = [
      'entry_id,campaign_id,created_at,estimated_source,estimated_medium,estimation_reason,confidence',
      ...estimates.map(est => 
        `${est.entry_id},${est.campaign_id},${est.created_at},${est.estimated_source || ''},${est.estimated_medium || ''},${est.estimation_reason},${est.confidence}`
      ),
    ]
    
    const fs = require('fs')
    const path = require('path')
    const reportPath = path.join(process.cwd(), 'reports', `source-estimation-${new Date().toISOString().split('T')[0]}.csv`)
    
    // reports 디렉토리 생성
    const reportsDir = path.join(process.cwd(), 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    fs.writeFileSync(reportPath, csvLines.join('\n'), 'utf-8')
    console.log(`\n📄 상세 리포트 저장: ${reportPath}`)
  }
  
  console.log('\n✅ 완료')
}

estimateSourceFromLogs().catch(console.error)
