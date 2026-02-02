/**
 * 추적 정보 복원 모듈
 * 
 * URL > Cookie > Link 순서로 추적 정보를 복원하는 로직
 * Cookie 검증 로직 포함
 */

import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { normalizeCID } from '@/lib/utils/cid'
import { normalizeUTM } from '@/lib/utils/utm'
import { readTrackingFromCookie, TrackingData } from './middleware-tracking'

const COOKIE_TRUST_WINDOW_HOURS = parseInt(process.env.COOKIE_TRUST_WINDOW_HOURS || '24')

export interface RestoredTrackingInfo {
  cid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  marketing_campaign_link_id: string | null
  untracked_reason?: string
  source: 'url' | 'cookie' | 'link_meta' | 'none'
}

/**
 * Cookie 검증 (캠페인 매칭 + Trust Window)
 */
async function validateCookieTracking(
  cookieData: TrackingData,
  currentCampaignId: string,
  clientId: string,
  isWebinarId: boolean
): Promise<{ valid: boolean; reason?: string; linkId?: string | null }> {
  // 검증 1: Trust Window 확인
  const cookieAge = Date.now() - new Date(cookieData.captured_at).getTime()
  const maxAge = COOKIE_TRUST_WINDOW_HOURS * 60 * 60 * 1000
  
  if (cookieAge > maxAge) {
    return { valid: false, reason: 'cookie_trust_window_expired' }
  }
  
  // 검증 2: cid가 있으면 링크 조회하여 캠페인 매칭 확인
  if (cookieData.cid) {
    try {
      const admin = createAdminSupabase()
      const normalizedCid = normalizeCID(cookieData.cid)
      
      if (normalizedCid) {
        // target_type 컬럼이 없을 수 있으므로 target_campaign_id만 사용
        let linkQuery = admin
          .from('campaign_link_meta')
          .select('id, target_campaign_id')
          .eq('client_id', clientId)
          .eq('cid', normalizedCid)
          .eq('status', 'active')
        
        const { data: link, error: linkError } = await linkQuery.maybeSingle()
        
        if (linkError) {
          console.warn('[Restore Tracking] Cookie 검증 중 링크 조회 오류:', linkError)
          // 에러가 발생해도 검증은 통과 (cid만 있는 경우)
          return { valid: true }
        }
        
        if (link) {
          // 캠페인 매칭 확인
          if (!isWebinarId && link.target_campaign_id === currentCampaignId) {
            // 캠페인 매칭 성공
            return { valid: true, linkId: link.id }
          } else if (isWebinarId) {
            // 웨비나 ID인 경우는 별도 처리 (현재는 간단히 통과)
            return { valid: true, linkId: link.id }
          } else {
            // cid가 있지만 현재 캠페인과 매칭되지 않음
            return { valid: false, reason: 'cid_campaign_mismatch' }
          }
        } else {
          // 링크를 찾을 수 없음 (검증 실패)
          return { valid: false, reason: 'cid_link_not_found' }
        }
      }
    } catch (error) {
      console.warn('[Restore Tracking] Cookie 검증 오류:', error)
      return { valid: false, reason: 'cookie_validation_error' }
    }
  }
  
  // cid가 없으면 UTM만 있는 경우로 처리 (검증 통과)
  return { valid: true }
}

/**
 * 추적 정보 복원 (URL > Cookie > Link)
 */
export async function restoreTrackingInfo(
  request: NextRequest,
  currentCampaignId: string,
  clientId: string,
  isWebinarId: boolean,
  urlUTMParams: {
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
    utm_term?: string | null
    utm_content?: string | null
  },
  urlCid: string | null
): Promise<RestoredTrackingInfo> {
  // 1순위: URL 쿼리 파라미터
  let finalCid = urlCid
  let finalUTM = { ...urlUTMParams }
  let finalLinkId: string | null = null
  let untrackedReason: string | undefined
  
  // cid로 링크 조회 (UTM이 있어도 cid로 link_id를 찾아야 함)
  if (finalCid && !finalLinkId) {
    try {
      const admin = createAdminSupabase()
      const normalizedCid = normalizeCID(finalCid)
      
      if (normalizedCid) {
        let linkQuery = admin
          .from('campaign_link_meta')
          .select('id, target_type, target_campaign_id, target_webinar_id')
          .eq('client_id', clientId)
          .eq('cid', normalizedCid)
          .eq('status', 'active')
        
        // 캠페인 매칭 없이 cid로만 조회 (먼저 시도)
        // target_type 컬럼이 없을 수 있으므로 안전하게 조회
        let linkQueryWithoutCampaign = admin
          .from('campaign_link_meta')
          .select('id, target_campaign_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content')
          .eq('client_id', clientId)
          .eq('cid', normalizedCid)
          .eq('status', 'active')
        
        const { data: linkWithoutCampaign, error: linkQueryError } = await linkQueryWithoutCampaign.maybeSingle()
        
        if (linkQueryError) {
          console.warn('[Restore Tracking] cid lookup 오류:', linkQueryError)
        } else if (linkWithoutCampaign) {
          // cid로 링크를 찾았으면, 캠페인 매칭 확인
          const campaignMatch = linkWithoutCampaign.target_campaign_id === currentCampaignId
          
          if (campaignMatch) {
            // 캠페인 매칭 성공 → link_id 저장 + 링크의 UTM 사용 (URL UTM이 없을 때만)
            finalLinkId = linkWithoutCampaign.id
            // URL에 UTM이 없으면 링크의 UTM 사용
            if (!finalUTM.utm_source) {
              finalUTM = {
                utm_source: linkWithoutCampaign.utm_source || null,
                utm_medium: linkWithoutCampaign.utm_medium || null,
                utm_campaign: linkWithoutCampaign.utm_campaign || null,
                utm_term: linkWithoutCampaign.utm_term || null,
                utm_content: linkWithoutCampaign.utm_content || null,
              }
            }
            console.log('[Restore Tracking] cid로 링크 찾음 (캠페인 매칭 성공):', {
              cid: normalizedCid,
              linkId: finalLinkId,
              currentCampaignId,
              hasURLUTM: !!urlUTMParams.utm_source,
              linkUTM: {
                source: linkWithoutCampaign.utm_source,
                medium: linkWithoutCampaign.utm_medium,
                campaign: linkWithoutCampaign.utm_campaign,
              },
            })
          } else {
            // cid가 다른 캠페인을 가리킴 → 링크의 UTM은 저장, link_id는 저장하지 않음
            untrackedReason = 'cid_campaign_mismatch'
            // URL에 UTM이 없으면 링크의 UTM 사용 (다른 캠페인이어도 UTM은 유용한 정보)
            if (!finalUTM.utm_source) {
              finalUTM = {
                utm_source: linkWithoutCampaign.utm_source || null,
                utm_medium: linkWithoutCampaign.utm_medium || null,
                utm_campaign: linkWithoutCampaign.utm_campaign || null,
                utm_term: linkWithoutCampaign.utm_term || null,
                utm_content: linkWithoutCampaign.utm_content || null,
              }
            }
            console.warn('[Restore Tracking] cid 캠페인 매칭 실패 (UTM은 저장):', {
              cid: normalizedCid,
              linkId: linkWithoutCampaign.id,
              linkCampaignId: linkWithoutCampaign.target_campaign_id,
              currentCampaignId,
              reason: 'cid가 다른 캠페인을 가리킴',
              savedUTM: finalUTM.utm_source ? '링크의 UTM 저장됨' : 'URL UTM 우선',
            })
          }
        } else {
          console.warn('[Restore Tracking] cid로 링크를 찾을 수 없음:', {
            cid: normalizedCid,
            clientId,
            currentCampaignId,
          })
        }
      }
    } catch (error) {
      console.warn('[Restore Tracking] cid lookup 오류:', error)
    }
  }
  
  // 2순위: Cookie에서 추적 정보 읽기 (URL에 없을 때만)
  let cookieData: TrackingData | null = null
  if (!finalCid && !finalUTM.utm_source) {
    cookieData = readTrackingFromCookie(request)
    
    if (cookieData) {
      // Cookie 검증
      const validation = await validateCookieTracking(
        cookieData,
        currentCampaignId,
        clientId,
        isWebinarId
      )
      
      if (validation.valid) {
        // 검증 성공 → Cookie 사용
        finalCid = cookieData.cid
        finalUTM = {
          utm_source: cookieData.utm_source || finalUTM.utm_source || null,
          utm_medium: cookieData.utm_medium || finalUTM.utm_medium || null,
          utm_campaign: cookieData.utm_campaign || finalUTM.utm_campaign || null,
          utm_term: cookieData.utm_term || finalUTM.utm_term || null,
          utm_content: cookieData.utm_content || finalUTM.utm_content || null,
        }
        finalLinkId = validation.linkId || finalLinkId
        
        console.log('[Restore Tracking] Cookie에서 복원:', {
          cid: finalCid,
          utm_source: finalUTM.utm_source,
          linkId: finalLinkId,
        })
      } else {
        // 검증 실패 → Cookie 무시
        untrackedReason = validation.reason || 'cookie_validation_failed'
        console.warn('[Restore Tracking] Cookie 검증 실패:', validation.reason)
      }
    }
  }
  
  // 3순위: 링크 메타데이터에서 추적 정보 읽기 (cid가 있고 link_id가 없고 UTM도 없을 때)
  // 위에서 cid lookup을 했지만 캠페인 매칭 실패로 link_id가 없을 수 있음
  // 이 경우는 이미 위에서 처리했으므로, 여기서는 cid가 없고 UTM도 없을 때만 처리
  if (!finalCid && !finalLinkId && !finalUTM.utm_source) {
    try {
      const admin = createAdminSupabase()
      const normalizedCid = normalizeCID(finalCid)
      
      if (normalizedCid) {
        let linkQuery = admin
          .from('campaign_link_meta')
          .select('id, utm_source, utm_medium, utm_campaign, utm_term, utm_content')
          .eq('client_id', clientId)
          .eq('cid', normalizedCid)
          .eq('status', 'active')
        
        // target_type 컬럼이 없을 수 있으므로 target_campaign_id만 사용
        if (!isWebinarId) {
          linkQuery = linkQuery.eq('target_campaign_id', currentCampaignId)
        }
        
        const { data: link } = await linkQuery.maybeSingle()
        
        if (link) {
          finalLinkId = link.id
          finalUTM = {
            utm_source: link.utm_source || finalUTM.utm_source || null,
            utm_medium: link.utm_medium || finalUTM.utm_medium || null,
            utm_campaign: link.utm_campaign || finalUTM.utm_campaign || null,
            utm_term: link.utm_term || finalUTM.utm_term || null,
            utm_content: link.utm_content || finalUTM.utm_content || null,
          }
          
          console.log('[Restore Tracking] 링크 메타데이터에서 복원:', {
            linkId: finalLinkId,
            utm_source: finalUTM.utm_source,
          })
        }
      }
    } catch (error) {
      console.warn('[Restore Tracking] 링크 메타데이터 조회 오류:', error)
    }
  }
  
  // 소스 결정 (cookieData는 이미 위에서 읽음)
  let source: 'url' | 'cookie' | 'link_meta' | 'none' = 'none'
  
  if (urlCid || urlUTMParams.utm_source) {
    source = 'url'
  } else if (cookieData && finalCid) {
    source = 'cookie'
  } else if (finalLinkId) {
    source = 'link_meta'
  }
  
  return {
    cid: finalCid,
    utm_source: finalUTM.utm_source || null,
    utm_medium: finalUTM.utm_medium || null,
    utm_campaign: finalUTM.utm_campaign || null,
    utm_term: finalUTM.utm_term || null,
    utm_content: finalUTM.utm_content || null,
    marketing_campaign_link_id: finalLinkId,
    untracked_reason: untrackedReason,
    source,
  }
}
