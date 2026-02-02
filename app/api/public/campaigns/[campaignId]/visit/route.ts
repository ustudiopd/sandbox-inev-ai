import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
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
 * 
 * Visit Dedup 규칙:
 * - 하나의 session_id는 하나의 캠페인에 대해 최대 1회 Visit으로 집계됩니다.
 * - API 레벨의 중복 방지 로직은 DB write 폭주 방지용이며,
 *   집계 기준은 session_id 기준입니다.
 * - 즉, 같은 session_id로 여러 번 호출되어도 집계 시에는 1회로 계산됩니다.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params
  try {
    // Request를 NextRequest로 변환 (cookie 읽기용)
    const nextReq = req as unknown as NextRequest
    
    // 강제 실패 모드 (회귀 테스트용)
    // 쿼리스트링 또는 헤더로 활성화: ?__debug_visit_fail=1 또는 x-debug-visit-fail: 1
    // 보안: 개발 환경 또는 특정 환경 변수에서만 활성화
    const url = new URL(req.url)
    const debugFailQuery = url.searchParams.get('__debug_visit_fail')
    const debugFailHeader = req.headers.get('x-debug-visit-fail')
    const debugFailEnabled = process.env.DEBUG_VISIT_FAIL_ENABLED === 'true' || process.env.NODE_ENV === 'development'
    
    if (debugFailEnabled && (debugFailQuery === '1' || debugFailHeader === '1')) {
      // 구조화 로그: 강제 실패 모드
      console.error('[VisitTrackFail]', JSON.stringify({
        campaignId,
        sessionId: 'N/A',
        reason: 'FORCED_FAILURE_MODE',
        status: 500,
        timestamp: new Date().toISOString(),
        mode: 'debug'
      }))
      return NextResponse.json(
        { success: false, error: 'Forced failure mode (debug)' },
        { status: 500 }
      )
    }
    
    const {
      session_id: clientSessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      cid,
      referrer,
      user_agent,
    } = await req.json()
    
    // Phase 0: 서버 중심 session_id 보완
    // 헌법 원칙: 클라이언트가 보내는 session_id를 신뢰하되, 없으면 서버 쿠키에서 보완
    let session_id = clientSessionId
    if (!session_id || typeof session_id !== 'string' || session_id.trim() === '') {
      // 쿠키에서 session_id 읽기
      const cookieSessionId = nextReq.cookies.get('ef_session_id')?.value
      if (cookieSessionId && cookieSessionId.trim() !== '') {
        session_id = cookieSessionId
      } else {
        // 쿠키도 없으면 에러 (하지만 graceful failure)
        console.warn('[VisitTrackFail]', JSON.stringify({
          campaignId,
          sessionId: 'N/A',
          reason: 'NO_SESSION_ID',
          status: 400,
          timestamp: new Date().toISOString()
        }))
        return NextResponse.json(
          { success: false, error: 'session_id is required' },
          { status: 400 }
        )
      }
    }
    
    const admin = createAdminSupabase()
    
    // 캠페인 또는 웨비나 존재 확인
    let campaign = null
    let clientId: string | null = null
    let actualCampaignId = campaignId // 실제로 저장할 campaign_id
    
    // 먼저 캠페인으로 조회 시도
    const { data: campaignData, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, client_id')
      .eq('id', campaignId)
      .maybeSingle()
    
    if (campaignData) {
      campaign = campaignData
      clientId = campaignData.client_id
    } else {
      // 캠페인이 없으면 웨비나 ID인지 확인
      const { data: webinar } = await admin
        .from('webinars')
        .select('id, slug, client_id, registration_campaign_id')
        .eq('id', campaignId)
        .maybeSingle()
      
      if (webinar) {
        // 웨비나인 경우: registration_campaign_id가 있으면 사용, 없으면 웨비나 ID 사용
        clientId = webinar.client_id
        if (webinar.registration_campaign_id) {
          // registration_campaign_id로 캠페인 조회
          const { data: linkedCampaign } = await admin
            .from('event_survey_campaigns')
            .select('id, client_id')
            .eq('id', webinar.registration_campaign_id)
            .maybeSingle()
          
          if (linkedCampaign) {
            campaign = linkedCampaign
            actualCampaignId = linkedCampaign.id
            console.log('[visit] 웨비나의 registration_campaign_id 사용:', linkedCampaign.id)
          } else {
            // registration_campaign_id가 있지만 캠페인을 찾지 못한 경우
            console.warn('[visit] 웨비나의 registration_campaign_id 캠페인을 찾을 수 없음:', webinar.registration_campaign_id)
            // 웨비나 ID를 그대로 사용 (FK 제약 때문에 저장 실패할 수 있음)
            actualCampaignId = campaignId
          }
        } else {
          // registration_campaign_id가 없는 경우 웨비나 ID 사용
          console.log('[visit] 웨비나 ID 사용 (registration_campaign_id 없음):', webinar.id)
          actualCampaignId = campaignId
        }
      }
    }
    
    if (!campaign && !clientId) {
      // 캠페인도 웨비나도 없으면 에러
      console.warn('[visit] 캠페인/웨비나 조회 실패:', campaignError)
      return NextResponse.json({ success: false, error: 'Campaign or Webinar not found' }, { status: 404 })
    }
    
    // client_id가 없으면 에러
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID not found' }, { status: 404 })
    }
    
    // cid로 링크 lookup (Phase 0: dimension 부재 방어)
    // 헌법 원칙: 메타가 없어도 Fact 저장은 성공해야 함
    let marketingCampaignLinkId: string | null = null
    let cidLookupFailed = false
    if (cid && clientId) {
      try {
        const normalizedCid = normalizeCID(cid)
        if (normalizedCid) {
          const { data: link } = await admin
            .from('campaign_link_meta')
            .select('id')
            .eq('client_id', clientId)
            .eq('cid', normalizedCid)
            .eq('status', 'active')
            .maybeSingle()
          
          if (link) {
            marketingCampaignLinkId = link.id
          } else {
            // cid는 있지만 링크를 찾지 못함 (unknown/unresolved)
            cidLookupFailed = true
          }
        }
      } catch (cidError) {
        // cid lookup 실패는 무시 (Fact 저장은 계속 진행)
        cidLookupFailed = true
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
      
      // 캠페인이 있으면 campaign_id 사용, 없으면 webinar_id 사용
      if (campaign) {
        insertData.campaign_id = actualCampaignId
      } else {
        // 웨비나만 있는 경우 webinar_id 사용
        insertData.webinar_id = campaignId
        console.log('[visit] 웨비나 ID로 Visit 기록:', campaignId)
      }
      
      // marketing_campaign_link_id가 있을 때만 추가 (컬럼이 없을 수 있음)
      if (marketingCampaignLinkId) {
        insertData.marketing_campaign_link_id = marketingCampaignLinkId
      }
      
      const { error: insertError } = await admin
        .from('event_access_logs')
        .insert(insertData)
      
      if (insertError) {
        // 구조화 로그: Visit 저장 실패
        const errorDetails = {
          campaignId: actualCampaignId,
          sessionId: session_id,
          reason: 'DB_INSERT_FAILED',
          status: 500,
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          insertData: insertData, // 디버깅용
          dimensionIssues: {
            cidLookupFailed: cidLookupFailed,
            hasCid: !!cid,
            hasMarketingLinkId: !!marketingCampaignLinkId,
            utmNormalized: Object.keys(normalizedUTM).length > 0
          },
          timestamp: new Date().toISOString()
        }
        console.error('[VisitTrackFail]', JSON.stringify(errorDetails, null, 2))
        // Visit 저장 실패해도 200 반환 (graceful failure)
        // 개발 환경에서는 상세 에러 메시지 반환
        const errorMessage = process.env.NODE_ENV === 'development' 
          ? `Failed to save visit: ${insertError.message} (${insertError.code})`
          : 'Failed to save visit'
        // Cursor 직렬화 문제 방지: 숫자 코드를 문자열로 변환
        const responseData: any = { 
          success: false, 
          error: errorMessage
        }
        if (process.env.NODE_ENV === 'development') {
          if (insertError.details) responseData.details = String(insertError.details)
          if (insertError.hint) responseData.hint = String(insertError.hint)
          if (insertError.code) responseData.code = String(insertError.code)
        }
        return NextResponse.json(responseData)
      }
      
      // 성공 시에도 dimension 부재 정보 로깅 (품질 모니터링용)
      if (cidLookupFailed || !marketingCampaignLinkId) {
        console.log('[VisitTrackDimension]', JSON.stringify({
          campaignId: actualCampaignId,
          sessionId: session_id,
          hasCid: !!cid,
          cidLookupFailed: cidLookupFailed,
          hasMarketingLinkId: !!marketingCampaignLinkId,
          dimensionStatus: cidLookupFailed ? 'unresolved' : 'ok',
          timestamp: new Date().toISOString()
        }))
      }
      
      return NextResponse.json({ success: true })
    } catch (insertException: any) {
      // 구조화 로그: Visit 저장 예외
      console.error('[VisitTrackFail]', JSON.stringify({
        campaignId: actualCampaignId,
        sessionId: session_id,
        reason: 'EXCEPTION',
        status: 500,
        error: insertException.message,
        stack: insertException.stack?.substring(0, 200),
        timestamp: new Date().toISOString()
      }))
      // 예외 발생해도 200 반환 (graceful failure)
      return NextResponse.json({ success: false, error: insertException.message || 'Failed to save visit' })
    }
  } catch (error: any) {
    // 구조화 로그: Visit API 전체 오류
    console.error('[VisitTrackFail]', JSON.stringify({
      campaignId,
      sessionId: 'N/A',
      reason: 'API_ERROR',
      status: 500,
      error: error.message,
      stack: error.stack?.substring(0, 200),
      timestamp: new Date().toISOString()
    }))
    // 에러 발생해도 200 반환 (Visit 실패해도 페이지는 정상 동작)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' })
  }
}
