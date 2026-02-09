/**
 * Phase 10-5: Event 통계 일별 집계 크론 잡
 * 
 * 목적: event_visits, leads, event_survey_responses 등을 일별로 집계하여
 *       event_stats_daily 테이블에 저장 (사전 집계)
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

export async function aggregateEventStats(
  fromDate?: Date,
  toDate?: Date,
  eventId?: string
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
  
  console.log('[AggregateEventStats] 집계 시작:', {
    fromDate: fromBucketDate,
    toDate: toBucketDate,
    eventId: eventId || 'all',
    mode: fromDate ? 'backfill' : 'incremental'
  })
  
  try {
    // 날짜 범위 계산: toBucketDate의 다음 날 00:00:00까지 포함
    const fromDateISO = `${fromBucketDate}T00:00:00Z`
    const toDateISO = `${toBucketDate}T23:59:59Z`
    
    // 집계할 이벤트 목록 조회
    let eventsQuery = admin
      .from('events')
      .select('id, client_id')
    
    if (eventId) {
      eventsQuery = eventsQuery.eq('id', eventId)
    }
    
    const { data: events, error: eventsError } = await eventsQuery
    
    if (eventsError) {
      throw new Error(`Events 조회 실패: ${eventsError.message}`)
    }
    
    if (!events || events.length === 0) {
      console.log('[AggregateEventStats] 집계할 이벤트가 없습니다')
      return {
        success: true,
        events_processed: 0,
        stats_upserted: 0,
        from_date: fromBucketDate,
        to_date: toBucketDate,
      }
    }
    
    console.log(`[AggregateEventStats] ${events.length}개 이벤트 집계 시작`)
    
    let upsertedCount = 0
    
    // 각 이벤트별로 일별 집계 수행
    for (const event of events) {
      const eventId = event.id
      
      // 날짜 범위 내의 모든 날짜에 대해 집계
      const currentDate = new Date(fromBucketDate)
      const endDate = new Date(toBucketDate)
      
      while (currentDate <= endDate) {
        const bucketDate = normalizeDate(currentDate)
        const bucketFromISO = `${bucketDate}T00:00:00Z`
        const bucketToISO = `${bucketDate}T23:59:59Z`
        
        // 병렬로 각 지표 집계
        const [
          visitsResult,
          leadsResult,
          surveyResponsesResult,
          participationsResult,
          shortlinkClicksResult,
        ] = await Promise.allSettled([
          // Visits 집계
          (async () => {
            const { data: visitsData } = await admin
              .from('event_visits')
              .select('id, session_id, created_at')
              .eq('event_id', eventId)
              .gte('created_at', bucketFromISO)
              .lte('created_at', bucketToISO)
            
            const visits = visitsData || []
            const uniqueSessions = new Set(visits.map((v: any) => v.session_id).filter(Boolean)).size
            
            return {
              visits: visits.length,
              unique_sessions: uniqueSessions,
            }
          })(),
          
          // Leads 집계
          (async () => {
            const { data: leadsData } = await admin
              .from('leads')
              .select('email, created_at')
              .eq('event_id', eventId)
              .gte('created_at', bucketFromISO)
              .lte('created_at', bucketToISO)
            
            const leads = leadsData || []
            const uniqueEmails = new Set(leads.map((l: any) => l.email)).size
            
            return {
              leads: leads.length,
              unique_emails: uniqueEmails,
            }
          })(),
          
          // Survey Responses 집계
          (async () => {
            const { count } = await admin
              .from('event_survey_responses')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .gte('created_at', bucketFromISO)
              .lte('created_at', bucketToISO)
            
            return { survey_responses: count || 0 }
          })(),
          
          // Participations 집계
          (async () => {
            const { count } = await admin
              .from('event_participations')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .gte('created_at', bucketFromISO)
              .lte('created_at', bucketToISO)
            
            return { participations: count || 0 }
          })(),
          
          // ShortLink Clicks 집계 (event_access_logs 기준, 간접 연결)
          (async () => {
            // event_survey_campaigns를 통해 연결
            const { data: campaignsData } = await admin
              .from('event_survey_campaigns')
              .select('id')
              .eq('client_id', event.client_id)
            
            const campaignIds = (campaignsData || []).map((c: any) => c.id)
            
            if (campaignIds.length === 0) {
              return { shortlink_clicks: 0 }
            }
            
            const { data: logsData } = await admin
              .from('event_access_logs')
              .select('id, accessed_at')
              .in('campaign_id', campaignIds)
              .gte('accessed_at', bucketFromISO)
              .lte('accessed_at', bucketToISO)
            
            return { shortlink_clicks: (logsData || []).length }
          })(),
        ])
        
        // 결과 추출
        const visits = visitsResult.status === 'fulfilled' ? visitsResult.value : { visits: 0, unique_sessions: 0 }
        const leads = leadsResult.status === 'fulfilled' ? leadsResult.value : { leads: 0, unique_emails: 0 }
        const surveyResponses = surveyResponsesResult.status === 'fulfilled' ? surveyResponsesResult.value : { survey_responses: 0 }
        const participations = participationsResult.status === 'fulfilled' ? participationsResult.value : { participations: 0 }
        const shortlinkClicks = shortlinkClicksResult.status === 'fulfilled' ? shortlinkClicksResult.value : { shortlink_clicks: 0 }
        
        // Upsert 수행
        const { error: upsertError } = await admin
          .from('event_stats_daily')
          .upsert({
            event_id: eventId,
            bucket_date: bucketDate,
            visits: visits.visits,
            unique_sessions: visits.unique_sessions,
            leads: leads.leads,
            unique_emails: leads.unique_emails,
            survey_responses: surveyResponses.survey_responses,
            participations: participations.participations,
            shortlink_clicks: shortlinkClicks.shortlink_clicks,
            last_aggregated_at: new Date().toISOString(),
          }, {
            onConflict: 'event_id,bucket_date',
          })
        
        if (upsertError) {
          console.error(`[AggregateEventStats] Upsert 오류 (${eventId}, ${bucketDate}):`, upsertError)
        } else {
          upsertedCount++
        }
        
        // 다음 날로 이동
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      }
    }
    
    console.log('[AggregateEventStats] 집계 완료:', {
      events_processed: events.length,
      stats_upserted: upsertedCount,
      from_date: fromBucketDate,
      to_date: toBucketDate,
    })
    
    return {
      success: true,
      events_processed: events.length,
      stats_upserted: upsertedCount,
      from_date: fromBucketDate,
      to_date: toBucketDate,
    }
  } catch (error: any) {
    console.error('[AggregateEventStats] 집계 오류:', error)
    throw error
  }
}

/**
 * GET /api/cron/aggregate-event-stats
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
    const eventIdParam = searchParams.get('event_id')
    
    const fromDate = fromDateParam ? new Date(fromDateParam) : undefined
    const toDate = toDateParam ? new Date(toDateParam) : undefined
    const eventId = eventIdParam || undefined
    
    const result = await aggregateEventStats(fromDate, toDate, eventId)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[AggregateEventStats] API 오류:', error)
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
 * POST /api/cron/aggregate-event-stats
 * 수동 실행용 (개발/테스트)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { from, to, event_id } = body
    
    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined
    const eventId = event_id || undefined
    
    const result = await aggregateEventStats(fromDate, toDate, eventId)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[AggregateEventStats] API 오류:', error)
    return NextResponse.json(
      { 
        error: 'Aggregation failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
