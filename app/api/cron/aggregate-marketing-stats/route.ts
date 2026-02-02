/**
 * Phase 1: 마케팅 통계 일별 집계 크론 잡
 * 
 * 목적: event_access_logs와 event_survey_entries를 일별로 집계하여
 *       marketing_stats_daily 테이블에 저장 (사전 집계)
 * 
 * 실행 주기: 5분마다 (Vercel Cron)
 * 멱등성: 보장 (upsert 기반)
 * 백필: 지원 (쿼리 파라미터로 날짜 범위 지정 가능)
 */

import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Vercel Cron 보안: Authorization 헤더 확인
const CRON_SECRET = process.env.CRON_SECRET || ''

export async function aggregateMarketingStats(
  fromDate?: Date,
  toDate?: Date,
  clientId?: string
) {
  const admin = createAdminSupabase()
  
  // 기본값: 최근 1일 (증분 집계)
  const defaultToDate = toDate || new Date()
  const defaultFromDate = fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  // 날짜를 UTC 기준으로 정규화 (일 단위 버킷)
  const normalizeDate = (date: Date): string => {
    const utcDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ))
    return utcDate.toISOString().split('T')[0] // YYYY-MM-DD
  }
  
  const fromBucketDate = normalizeDate(defaultFromDate)
  const toBucketDate = normalizeDate(defaultToDate)
  
  console.log('[AggregateMarketingStats] 집계 시작:', {
    fromDate: fromBucketDate,
    toDate: toBucketDate,
    clientId: clientId || 'all',
    mode: fromDate ? 'backfill' : 'incremental'
  })
  
  try {
    // 날짜 범위 계산: toBucketDate의 다음 날 00:00:00까지 포함
    const toDateEnd = new Date(toBucketDate)
    toDateEnd.setUTCDate(toDateEnd.getUTCDate() + 1)
    const toDateEndStr = toDateEnd.toISOString().split('T')[0] + 'T00:00:00Z'
    
    // 1. Visits 집계 (event_access_logs)
    // 일별, 캠페인별, 링크별, UTM별로 집계
    let visitsQuery = admin
      .from('event_access_logs')
      .select('campaign_id, marketing_campaign_link_id, utm_source, utm_medium, utm_campaign, session_id, accessed_at')
      .gte('accessed_at', `${fromBucketDate}T00:00:00Z`)
      .lt('accessed_at', toDateEndStr) // 다음 날 00:00:00 전까지 (toBucketDate 포함)
    
    // campaign_id가 null이 아닌 것만 조회 (webinar_id만 있는 것은 제외)
    visitsQuery = visitsQuery.not('campaign_id', 'is', null)
    
    const { data: visits, error: visitsError } = await visitsQuery
    
    if (visitsError) {
      console.error('[AggregateMarketingStats] Visits 조회 오류:', visitsError)
      throw visitsError
    }
    
    console.log('[AggregateMarketingStats] Visits 조회 완료:', {
      count: visits?.length || 0,
      dateRange: `${fromBucketDate}T00:00:00Z ~ ${toDateEndStr}`
    })
    
    // 캠페인별 client_id 조회 (필요한 경우)
    const campaignIds = [...new Set(visits?.map(v => v.campaign_id).filter(Boolean) || [])]
    const campaignClientMap = new Map<string, string>()
    
    if (campaignIds.length > 0) {
      const { data: campaigns, error: campaignsError } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id')
        .in('id', campaignIds)
      
      if (campaignsError) {
        console.error('[AggregateMarketingStats] 캠페인 조회 오류:', campaignsError)
      } else {
        campaigns?.forEach(c => {
          campaignClientMap.set(c.id, c.client_id)
        })
        console.log('[AggregateMarketingStats] 캠페인-클라이언트 매핑:', campaignClientMap.size, '개')
      }
    }
    
    // client_id 필터링 (필요한 경우)
    let filteredVisits = visits
    if (clientId) {
      filteredVisits = visits?.filter(v => {
        const cid = campaignClientMap.get(v.campaign_id || '')
        return cid === clientId
      })
      console.log('[AggregateMarketingStats] 클라이언트 필터링 후 Visits:', filteredVisits?.length || 0)
    }
    
    // 2. Conversions 집계 (event_survey_entries)
    let conversionsQuery = admin
      .from('event_survey_entries')
      .select('campaign_id, marketing_campaign_link_id, utm_source, utm_medium, utm_campaign, id, created_at')
      .gte('created_at', `${fromBucketDate}T00:00:00Z`)
      .lt('created_at', toDateEndStr) // 다음 날 00:00:00 전까지 (toBucketDate 포함)
    
    const { data: conversions, error: conversionsError } = await conversionsQuery
    
    if (conversionsError) {
      console.error('[AggregateMarketingStats] Conversions 조회 오류:', conversionsError)
      throw conversionsError
    }
    
    console.log('[AggregateMarketingStats] Conversions 조회 완료:', conversions?.length || 0)
    
    // 3. 일별 버킷으로 그룹핑 및 집계
    const statsMap = new Map<string, {
      client_id: string
      bucket_date: string
      campaign_id: string | null
      marketing_campaign_link_id: string | null
      utm_source: string | null
      utm_medium: string | null
      utm_campaign: string | null
      visits: Set<string> // session_id 집합
      conversions: number
    }>()
    
    // Visits 집계
    let skippedVisits = 0
    let visitsWithoutSessionId = 0
    
    filteredVisits?.forEach(visit => {
      const bucketDate = normalizeDate(new Date(visit.accessed_at))
      const visitClientId = campaignClientMap.get(visit.campaign_id || '')
      
      // client_id를 찾지 못하거나 campaign_id가 없으면 스킵 (로그만 남김)
      if (!visitClientId || !visit.campaign_id) {
        skippedVisits++
        if (skippedVisits <= 5) {
          console.warn('[AggregateMarketingStats] Visit 스킵 (client_id 또는 campaign_id 없음):', {
            campaign_id: visit.campaign_id,
            accessed_at: visit.accessed_at
          })
        }
        return
      }
      
      const key = [
        visitClientId,
        bucketDate,
        visit.campaign_id || '',
        visit.marketing_campaign_link_id || '',
        visit.utm_source || '__null__',
        visit.utm_medium || '__null__',
        visit.utm_campaign || '__null__'
      ].join('|')
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          client_id: visitClientId,
          bucket_date: bucketDate,
          campaign_id: visit.campaign_id,
          marketing_campaign_link_id: visit.marketing_campaign_link_id || null,
          utm_source: visit.utm_source || null,
          utm_medium: visit.utm_medium || null,
          utm_campaign: visit.utm_campaign || null,
          visits: new Set(),
          conversions: 0
        })
      }
      
      const stat = statsMap.get(key)!
      // session_id가 있으면 Set에 추가 (DISTINCT 카운트)
      if (visit.session_id) {
        stat.visits.add(visit.session_id)
      } else {
        visitsWithoutSessionId++
        // session_id가 없으면 각 레코드를 고유하게 카운트하기 위해 id 기반 임시 ID 사용
        // 실제로는 session_id가 없는 Visit도 집계해야 하므로, accessed_at + 랜덤으로 고유성 보장
        // 향후 개선: session_id가 없는 Visit을 별도 지표로 집계하거나, id를 사용
        const tempId = `no_session_${visit.accessed_at}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        stat.visits.add(tempId)
      }
    })
    
    if (skippedVisits > 0) {
      console.warn('[AggregateMarketingStats] 스킵된 Visits:', skippedVisits, '개')
    }
    if (visitsWithoutSessionId > 0) {
      console.warn('[AggregateMarketingStats] session_id 없는 Visits:', visitsWithoutSessionId, '개')
    }
    
    // Conversions 집계를 위한 캠페인별 client_id 조회
    const conversionCampaignIds = [...new Set(conversions?.map(c => c.campaign_id).filter(Boolean) || [])]
    const conversionCampaignClientMap = new Map<string, string>()
    
    if (conversionCampaignIds.length > 0) {
      const { data: conversionCampaigns, error: conversionCampaignsError } = await admin
        .from('event_survey_campaigns')
        .select('id, client_id')
        .in('id', conversionCampaignIds)
      
      if (conversionCampaignsError) {
        console.error('[AggregateMarketingStats] Conversion 캠페인 조회 오류:', conversionCampaignsError)
      } else {
        conversionCampaigns?.forEach(c => {
          conversionCampaignClientMap.set(c.id, c.client_id)
        })
      }
    }
    
    // client_id 필터링 (필요한 경우)
    let filteredConversions = conversions
    if (clientId) {
      filteredConversions = conversions?.filter(c => {
        const cid = conversionCampaignClientMap.get(c.campaign_id || '')
        return cid === clientId
      })
    }
    
    // Conversions 집계
    let skippedConversions = 0
    
    filteredConversions?.forEach(conversion => {
      const bucketDate = normalizeDate(new Date(conversion.created_at))
      const conversionClientId = conversionCampaignClientMap.get(conversion.campaign_id || '')
      
      // client_id를 찾지 못하거나 campaign_id가 없으면 스킵 (로그만 남김)
      if (!conversionClientId || !conversion.campaign_id) {
        skippedConversions++
        if (skippedConversions <= 5) {
          console.warn('[AggregateMarketingStats] Conversion 스킵 (client_id 또는 campaign_id 없음):', {
            campaign_id: conversion.campaign_id,
            created_at: conversion.created_at
          })
        }
        return
      }
      
      const key = [
        conversionClientId,
        bucketDate,
        conversion.campaign_id || '',
        conversion.marketing_campaign_link_id || '',
        conversion.utm_source || '__null__',
        conversion.utm_medium || '__null__',
        conversion.utm_campaign || '__null__'
      ].join('|')
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          client_id: conversionClientId,
          bucket_date: bucketDate,
          campaign_id: conversion.campaign_id,
          marketing_campaign_link_id: conversion.marketing_campaign_link_id || null,
          utm_source: conversion.utm_source || null,
          utm_medium: conversion.utm_medium || null,
          utm_campaign: conversion.utm_campaign || null,
          visits: new Set(),
          conversions: 0
        })
      }
      
      const stat = statsMap.get(key)!
      stat.conversions += 1
    })
    
    if (skippedConversions > 0) {
      console.warn('[AggregateMarketingStats] 스킵된 Conversions:', skippedConversions, '개')
    }
    
    // 4. Upsert to marketing_stats_daily
    const statsToUpsert = Array.from(statsMap.values()).map(stat => ({
      client_id: stat.client_id,
      bucket_date: stat.bucket_date,
      campaign_id: stat.campaign_id,
      marketing_campaign_link_id: stat.marketing_campaign_link_id,
      utm_source: stat.utm_source,
      utm_medium: stat.utm_medium,
      utm_campaign: stat.utm_campaign,
      visits: stat.visits.size,
      conversions: stat.conversions
    }))
    
    if (statsToUpsert.length === 0) {
      console.log('[AggregateMarketingStats] 집계할 데이터 없음')
      return { success: true, upserted: 0 }
    }
    
    // Upsert: 각 행을 개별적으로 처리 (함수 기반 인덱스는 자동 감지 안 됨)
    // RPC 함수를 사용하거나, 개별 upsert 처리
    let upsertedCount = 0
    for (const stat of statsToUpsert) {
      // 먼저 존재하는지 확인
      const { data: existing } = await admin
        .from('marketing_stats_daily')
        .select('id')
        .eq('client_id', stat.client_id)
        .eq('bucket_date', stat.bucket_date)
        .eq('campaign_id', stat.campaign_id)
        .eq('marketing_campaign_link_id', stat.marketing_campaign_link_id || null)
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
            // cvr는 자동 계산됨
          })
          .eq('id', existing.id)
        
        if (updateError) {
          console.error('[AggregateMarketingStats] Update 오류:', updateError, stat)
        } else {
          upsertedCount++
        }
      } else {
        // Insert
        const { error: insertError } = await admin
          .from('marketing_stats_daily')
          .insert(stat)
        
        if (insertError) {
          console.error('[AggregateMarketingStats] Insert 오류:', insertError, stat)
          // 중복 키 오류는 무시 (다른 프로세스가 이미 삽입한 경우)
          if (insertError.code !== '23505') {
            throw insertError
          }
        } else {
          upsertedCount++
        }
      }
    }
    
    const totalVisits = statsToUpsert.reduce((sum, s) => sum + s.visits, 0)
    const totalConversions = statsToUpsert.reduce((sum, s) => sum + s.conversions, 0)
    
    console.log('[AggregateMarketingStats] 집계 완료:', {
      upserted: statsToUpsert.length,
      totalVisits,
      totalConversions,
      skippedVisits,
      skippedConversions,
      visitsWithoutSessionId,
      sample: statsToUpsert.slice(0, 3)
    })
    
    return {
      success: true,
      upserted: statsToUpsert.length,
      totalVisits,
      totalConversions,
      skippedVisits,
      skippedConversions,
      visitsWithoutSessionId,
      fromDate: fromBucketDate,
      toDate: toBucketDate
    }
  } catch (error: any) {
    console.error('[AggregateMarketingStats] 집계 실패:', error)
    throw error
  }
}

/**
 * GET /api/cron/aggregate-marketing-stats
 * Vercel Cron에서 호출
 */
export async function GET(request: Request) {
  // Vercel Cron 보안 확인
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    const { searchParams } = new URL(request.url)
    
    // 백필 모드: 날짜 범위 지정
    const fromDateParam = searchParams.get('from')
    const toDateParam = searchParams.get('to')
    const clientIdParam = searchParams.get('client_id')
    
    const fromDate = fromDateParam ? new Date(fromDateParam) : undefined
    const toDate = toDateParam ? new Date(toDateParam) : undefined
    const clientId = clientIdParam || undefined
    
    const result = await aggregateMarketingStats(fromDate, toDate, clientId)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[AggregateMarketingStats] API 오류:', error)
    return NextResponse.json(
      { 
        error: 'Aggregation failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/aggregate-marketing-stats
 * 수동 실행용 (개발/테스트)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { from, to, client_id } = body
    
    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined
    const clientId = client_id || undefined
    
    const result = await aggregateMarketingStats(fromDate, toDate, clientId)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[AggregateMarketingStats] API 오류:', error)
    return NextResponse.json(
      { 
        error: 'Aggregation failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
