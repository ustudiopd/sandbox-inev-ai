/**
 * UTM 템플릿 관련 유틸리티 함수
 * Phase 2: UTM 자동 생성 템플릿 기능
 */

export interface ChannelTemplate {
  id: string
  name: string
  icon: string
  utm_source: string
  utm_medium: string
  description: string
  preferredLinkType: 'share' | 'campaign' // 'share': 공유용(cid만), 'campaign': 광고용(cid+UTM)
}

export const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    id: 'newsletter',
    name: '뉴스레터',
    icon: '📧',
    utm_source: 'newsletter',
    utm_medium: 'email',
    description: '이메일 뉴스레터 발송',
    preferredLinkType: 'campaign', // 이메일은 UTM 포함 링크 추천
  },
  {
    id: 'sms',
    name: '문자 / 카카오',
    icon: '📱',
    utm_source: 'sms',
    utm_medium: 'sms',
    description: '문자 메시지 또는 카카오톡 발송',
    preferredLinkType: 'share', // 문자/카톡은 짧은 링크(cid만) 추천
  },
  {
    id: 'google',
    name: '구글 광고',
    icon: '🔍',
    utm_source: 'google',
    utm_medium: 'cpc',
    description: '구글 검색 광고',
    preferredLinkType: 'campaign', // 광고는 UTM 포함 링크 추천
  },
  {
    id: 'meta',
    name: '메타 광고',
    icon: '📘',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    description: '페이스북/인스타그램 광고',
    preferredLinkType: 'campaign', // 광고는 UTM 포함 링크 추천
  },
  {
    id: 'partner',
    name: '파트너 / 제휴',
    icon: '🤝',
    utm_source: 'partner',
    utm_medium: 'referral',
    description: '파트너사 또는 제휴 링크',
    preferredLinkType: 'share', // 파트너는 짧은 링크 추천 (공유 편의성)
  },
  {
    id: 'custom',
    name: '기타(커스텀)',
    icon: '🧪',
    utm_source: '',
    utm_medium: '',
    description: '직접 입력',
    preferredLinkType: 'campaign', // 기본값: UTM 포함 링크
  },
]

export const CONTENT_OPTIONS = [
  { value: '', label: '없음 (기본)' },
  { value: 'hero_banner', label: '히어로 배너' },
  { value: 'footer_link', label: '푸터 링크' },
  { value: 'reminder', label: '리마인드 발송' },
  { value: 'cta_button_a', label: 'CTA 버튼 A' },
  { value: 'cta_button_b', label: 'CTA 버튼 B' },
  { value: 'sidebar_ad', label: '사이드바 광고' },
  { value: 'popup', label: '팝업' },
]

/**
 * 링크 이름과 캠페인 정보로부터 utm_campaign 자동 생성
 * 
 * 규칙: {client_slug}_{target_slug}_{yyyymm}_{channel}
 * 
 * @param linkName - 사용자가 입력한 링크 이름 (예: "26년 1월 뉴스레터")
 * @param clientName - 클라이언트 이름 (예: "WERT Intelligence")
 * @param campaignTitle - 타겟 캠페인 제목 (예: "AI 특허리서치 실무 활용 웨비나")
 * @param channelId - 선택된 채널 템플릿 ID (예: "newsletter")
 * @returns 생성된 utm_campaign 값
 */
export function generateUTMCampaign(
  linkName: string,
  clientName: string,
  campaignTitle: string,
  channelId: string
): string {
  // client_slug: 클라이언트 이름을 소문자로 변환하고 공백을 언더스코어로
  const clientSlug = clientName
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 20)

  // target_slug: 캠페인 제목을 소문자로 변환하고 공백을 언더스코어로
  const targetSlug = campaignTitle
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30)

  // yyyymm: 현재 날짜에서 년월 추출
  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

  // channel: 채널 ID 사용 (없으면 linkName에서 추출 시도)
  let channel = channelId
  if (!channel || channel === 'custom') {
    // linkName에서 채널 추출 시도
    const lowerName = linkName.toLowerCase()
    if (lowerName.includes('뉴스레터') || lowerName.includes('newsletter')) {
      channel = 'newsletter'
    } else if (lowerName.includes('문자') || lowerName.includes('sms')) {
      channel = 'sms'
    } else if (lowerName.includes('구글') || lowerName.includes('google')) {
      channel = 'google'
    } else if (lowerName.includes('메타') || lowerName.includes('facebook') || lowerName.includes('meta')) {
      channel = 'meta'
    } else if (lowerName.includes('파트너') || lowerName.includes('partner')) {
      channel = 'partner'
    } else {
      channel = 'custom'
    }
  }

  // 최종 조합
  const parts = [clientSlug, targetSlug, yyyymm, channel].filter(Boolean)
  return parts.join('_').substring(0, 200) // 최대 길이 제한
}

/**
 * 사람이 읽기 쉬운 설명 생성
 */
export function generateHumanReadableDescription(
  linkName: string,
  template: ChannelTemplate | null,
  campaignTitle: string
): string {
  if (!template || template.id === 'custom') {
    return `이 링크는 "${linkName}" → "${campaignTitle}" 성과로 집계됩니다.`
  }

  const channelName = template.name
  const mediumName = template.utm_medium === 'email' ? '이메일' :
                     template.utm_medium === 'sms' ? '문자' :
                     template.utm_medium === 'cpc' ? '광고' :
                     template.utm_medium === 'referral' ? '제휴' : template.utm_medium

  return `이 링크는 ${channelName}(${mediumName}) → ${campaignTitle} 성과로 집계됩니다.`
}
