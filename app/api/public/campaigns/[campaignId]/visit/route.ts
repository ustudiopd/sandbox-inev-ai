import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeUTM } from '@/lib/utils/utm'
import { normalizeCID } from '@/lib/utils/cid'

export const runtime = 'nodejs'

/**
 * Visit 추적 API (Phase 3)
 * POST /api/public/campaigns/[campaignId]/visit
 * 
 * 페이지 방문 시 호출되어 Visit을 기록합니다.
 * 등록/전환 시 이 Visit과 연결됩니다.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const {
      session_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      cid,
      referrer,
      user_agent,
    } = await req.json()
    
    // 필수 파라미터 검증
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 캠페인 존재 확인
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id')
      .eq('id', campaignId)
      .maybeSingle()
    
    if (campaignError || !campaign) {
      // 캠페인이 없어도 Visit 기록은 실패하지만 에러는 반환하지 않음 (graceful)
      console.warn('[visit] 캠페인 조회 실패:', campaignError)
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }
    
    // cid로 링크 lookup
    let marketingCampaignLinkId: string | null = null
    if (cid) {
      try {
        const normalizedCid = normalizeCID(cid)
        if (normalizedCid) {
          const { data: link } = await admin
            .from('campaign_link_meta')
            .select('id')
            .eq('client_id', campaign.client_id)
            .eq('cid', normalizedCid)
            .eq('status', 'active')
            .maybeSingle()
          
          if (link) {
            marketingCampaignLinkId = link.id
          }
        }
      } catch (cidError) {
        // cid lookup 실패는 무시
        console.warn('[visit] cid lookup 실패:', cidError)
      }
    }
    
    // UTM 파라미터 정규화
    let normalizedUTM: Record<string, string | null> = {}
    try {
      normalizedUTM = normalizeUTM({
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
      })
    } catch (utmError) {
      // UTM 정규화 실패는 무시
      console.warn('[visit] UTM 정규화 실패:', utmError)
    }
    
    // Visit 기록 저장
    try {
      const insertData: any = {
        campaign_id: campaignId,
        session_id: session_id,
        utm_source: normalizedUTM.utm_source || null,
        utm_medium: normalizedUTM.utm_medium || null,
        utm_campaign: normalizedUTM.utm_campaign || null,
        utm_term: normalizedUTM.utm_term || null,
        utm_content: normalizedUTM.utm_content || null,
        cid: cid || null,
        referrer: referrer || null,
        user_agent: user_agent || null,
        accessed_at: new Date().toISOString(),
      }
      
      // marketing_campaign_link_id가 있을 때만 추가 (컬럼이 없을 수 있음)
      if (marketingCampaignLinkId) {
        insertData.marketing_campaign_link_id = marketingCampaignLinkId
      }
      
      const { error: insertError } = await admin
        .from('event_access_logs')
        .insert(insertData)
      
      if (insertError) {
        console.error('[visit] Visit 저장 실패:', insertError)
        // Visit 저장 실패해도 200 반환 (graceful failure)
        return NextResponse.json({ success: false, error: 'Failed to save visit' })
      }
      
      return NextResponse.json({ success: true })
    } catch (insertException: any) {
      console.error('[visit] Visit 저장 예외:', insertException)
      // 예외 발생해도 200 반환 (graceful failure)
      return NextResponse.json({ success: false, error: insertException.message || 'Failed to save visit' })
    }
  } catch (error: any) {
    console.error('[visit] Visit API 오류:', error)
    // 에러 발생해도 200 반환 (Visit 실패해도 페이지는 정상 동작)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' })
  }
}
