/**
 * Middleware 추적 모듈
 * 
 * UTM 파라미터와 cid를 추출하고 cookie에 저장하는 로직
 * 향후 proxy 마이그레이션을 위해 모듈로 분리
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractUTMParams } from '@/lib/utils/utm'
import { normalizeCID } from '@/lib/utils/cid'

export interface TrackingData {
  cid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  campaign_id: string | null // 현재 캠페인 ID (검증용)
  captured_at: string
}

const COOKIE_NAME = 'ef_tracking'
const COOKIE_TTL_DAYS = parseInt(process.env.COOKIE_TTL_DAYS || '30')

/**
 * 요청에서 추적 정보 추출
 */
export function extractTrackingFromRequest(
  request: NextRequest
): TrackingData | null {
  const url = request.nextUrl
  const searchParams = url.searchParams
  
  // UTM 파라미터 추출
  const utmParams = extractUTMParams(Object.fromEntries(searchParams))
  
  // cid 추출 및 정규화
  const cidRaw = searchParams.get('cid')
  const cid = cidRaw ? normalizeCID(cidRaw) : null
  
  // 현재 캠페인 ID 추출 (경로에서)
  // /event/{public_path} 또는 /webinar/{id} 또는 /s/{code}
  const path = url.pathname
  let campaignId: string | null = null
  
  // 경로에서 campaign ID 추출 시도 (필요 시)
  // 현재는 null로 두고, 등록 API에서 campaignId를 받아서 검증
  
  // 추적 정보가 하나라도 있으면 저장
  if (cid || utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign) {
    return {
      cid,
      utm_source: utmParams.utm_source || null,
      utm_medium: utmParams.utm_medium || null,
      utm_campaign: utmParams.utm_campaign || null,
      utm_term: utmParams.utm_term || null,
      utm_content: utmParams.utm_content || null,
      campaign_id: campaignId, // 등록 API에서 검증할 때 사용
      captured_at: new Date().toISOString(),
    }
  }
  
  return null
}

/**
 * 추적 정보를 cookie에 저장 (미신뢰 방식)
 * 
 * 주의: cookie 값은 신뢰하지 않고, 등록 API에서 DB 검증 후 사용
 */
export function saveTrackingToCookie(
  response: NextResponse,
  trackingData: TrackingData
): void {
  // cookie에 JSON 문자열로 저장 (서명 없음, DB 검증으로 신뢰)
  const cookieValue = JSON.stringify(trackingData)
  
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60, // TTL (보관기간)
    path: '/',
  })
  
  console.log('[Middleware Tracking] Cookie 저장:', {
    cid: trackingData.cid,
    utm_source: trackingData.utm_source,
    captured_at: trackingData.captured_at,
  })
}

/**
 * Cookie에서 추적 정보 읽기
 */
export function readTrackingFromCookie(
  request: NextRequest
): TrackingData | null {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value
  
  if (!cookieValue) {
    return null
  }
  
  try {
    const data = JSON.parse(cookieValue) as TrackingData
    return data
  } catch (error) {
    console.warn('[Middleware Tracking] Cookie 파싱 실패:', error)
    return null
  }
}
