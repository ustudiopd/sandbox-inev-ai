import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireClientMember } from '@/lib/auth/guards'

export const runtime = 'nodejs'

/**
 * 마케팅 캠페인 요약 API
 * GET /api/clients/[clientId]/campaigns/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
    
    // 권한 확인 (다른 클라이언트 API와 동일한 가드 사용)
    await requireClientMember(clientId, ['owner', 'admin', 'operator', 'analyst', 'viewer', 'member'])
    
    const admin = createAdminSupabase()
    
    // 날짜 범위 설정
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    
    // 해당 클라이언트의 캠페인 ID 목록 가져오기
    const { data: campaigns, error: campaignsError } = await admin
      .from('event_survey_campaigns')
      .select('id')
      .eq('client_id', clientId)
    
    if (campaignsError) {
      console.error('캠페인 조회 오류:', campaignsError)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: campaignsError.message },
        { status: 500 }
      )
    }
    
    if (!campaigns || campaigns.length === 0) {
      // 캠페인이 없으면 빈 결과 반환
      return NextResponse.json({
        total_conversions: 0,
        conversions_by_source: [],
        conversions_by_medium: [],
        conversions_by_campaign: [],
        conversions_by_combo: [],
        date_range: { from, to },
      })
    }
    
    const campaignIds = campaigns.map(c => c.id)
    
    console.log('[Marketing Summary] 집계 시작:', {
      clientId,
      campaignCount: campaignIds.length,
      campaignIds: campaignIds.slice(0, 5), // 처음 5개만 로그
      dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
    })
    
    // 전체 전환 수
    const { count: totalConversions, error: countError } = await admin
      .from('event_survey_entries')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
    
    if (countError) {
      console.error('[Marketing Summary] 전환 수 조회 오류:', countError)
    }
    
    console.log('[Marketing Summary] 전환 수:', totalConversions)
    
    // 모든 엔트리 가져오기 (집계용)
    const { data: entries, error: entriesError } = await admin
      .from('event_survey_entries')
      .select('utm_source, utm_medium, utm_campaign, campaign_id, created_at')
      .in('campaign_id', campaignIds)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
    
    if (entriesError) {
      console.error('[Marketing Summary] 엔트리 조회 오류:', entriesError)
      return NextResponse.json(
        { error: 'Failed to fetch entries', details: entriesError.message },
        { status: 500 }
      )
    }
    
    console.log('[Marketing Summary] 엔트리 조회 결과:', {
      entryCount: entries?.length || 0,
      sampleEntries: entries?.slice(0, 3), // 처음 3개만 로그
    })
    
    // 집계 처리
    // Source별 집계
    const sourceMap = new Map<string | null, number>()
    entries?.forEach(item => {
      const key = item.utm_source || null
      sourceMap.set(key, (sourceMap.get(key) || 0) + 1)
    })
    const conversions_by_source = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
    
    // Medium별 집계
    const mediumMap = new Map<string | null, number>()
    entries?.forEach(item => {
      const key = item.utm_medium || null
      mediumMap.set(key, (mediumMap.get(key) || 0) + 1)
    })
    const conversions_by_medium = Array.from(mediumMap.entries())
      .map(([medium, count]) => ({ medium, count }))
      .sort((a, b) => b.count - a.count)
    
    // Campaign별 집계
    const campaignMap = new Map<string | null, number>()
    entries?.forEach(item => {
      const key = item.utm_campaign || null
      campaignMap.set(key, (campaignMap.get(key) || 0) + 1)
    })
    const conversions_by_campaign = Array.from(campaignMap.entries())
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count)
    
    // 조합별 집계
    const comboMap = new Map<string, number>()
    entries?.forEach(item => {
      const source = item.utm_source || null
      const medium = item.utm_medium || null
      const campaign = item.utm_campaign || null
      const key = `${source}|${medium}|${campaign}`
      comboMap.set(key, (comboMap.get(key) || 0) + 1)
    })
    const conversions_by_combo = Array.from(comboMap.entries())
      .map(([key, count]) => {
        const [source, medium, campaign] = key.split('|')
        return {
          source: source === 'null' ? null : source,
          medium: medium === 'null' ? null : medium,
          campaign: campaign === 'null' ? null : campaign,
          count,
        }
      })
      .sort((a, b) => b.count - a.count)
    
    // 링크별 전환 집계 (Phase 2)
    const { data: linkEntries } = await admin
      .from('event_survey_entries')
      .select('marketing_campaign_link_id')
      .in('campaign_id', campaignIds)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .not('marketing_campaign_link_id', 'is', null)
    
    const linkMap = new Map<string, number>()
    linkEntries?.forEach(item => {
      if (item.marketing_campaign_link_id) {
        linkMap.set(item.marketing_campaign_link_id, (linkMap.get(item.marketing_campaign_link_id) || 0) + 1)
      }
    })
    
    // 링크 메타데이터 조회
    const linkIds = Array.from(linkMap.keys())
    const { data: linkMetas } = linkIds.length > 0 ? await admin
      .from('campaign_link_meta')
      .select('id, name')
      .in('id', linkIds)
      .eq('client_id', clientId) : { data: [] }
    
    const conversions_by_link = Array.from(linkMap.entries())
      .map(([linkId, count]) => {
        const linkMeta = linkMetas?.find((m: any) => m.id === linkId)
        return {
          link_id: linkId,
          link_name: linkMeta?.name || linkId,
          count,
        }
      })
      .sort((a, b) => b.count - a.count)
    
    const result = {
      total_conversions: totalConversions || 0,
      conversions_by_source,
      conversions_by_medium,
      conversions_by_campaign,
      conversions_by_combo,
      conversions_by_link, // Phase 2: 링크별 전환
      date_range: {
        from,
        to,
      },
    }
    
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('API 오류:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}
