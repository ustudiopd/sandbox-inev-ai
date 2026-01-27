# UTM 파라미터 추적 기능 적용 방안 보고서

## 1. 개요

### 1.1 요구사항
- 접속 페이지 링크에 UTM 파라미터를 설정하여 유입/전환 추적
- 광고 캠페인별 성과 분석 및 ROI 측정

### 1.2 UTM 파라미터란?
UTM(Urchin Tracking Module) 파라미터는 마케팅 캠페인의 성과를 추적하기 위한 표준 URL 파라미터입니다.

**주요 파라미터:**
- `utm_source`: 트래픽 소스 (예: google, facebook, email, newsletter)
- `utm_medium`: 마케팅 매체 (예: cpc, banner, email, social, organic)
- `utm_campaign`: 캠페인 이름 (예: spring_sale, webinar_2026)
- `utm_term`: 키워드 (검색 광고용, 예: ai_webinar)
- `utm_content`: 콘텐츠 구분 (A/B 테스트용, 예: button_a, banner_b)

**예시 URL:**
```
https://eventflow.kr/event/426307?utm_source=google&utm_medium=cpc&utm_campaign=spring_webinar&utm_term=ai&utm_content=banner_a
```

---

## 2. 현재 시스템 분석

### 2.1 이벤트 페이지 구조
- **경로**: `/event/{public_path}` (catch-all 라우트)
- **주요 페이지**:
  - 시작 페이지: `/event/{public_path}`
  - 설문 페이지: `/event/{public_path}/survey`
  - 등록 페이지: `/event/{public_path}/register`
  - 완료 페이지: `/event/{public_path}/done`

### 2.2 데이터베이스 구조
**현재 테이블:**
- `event_survey_campaigns`: 캠페인 정보
- `event_survey_entries`: 참여자 정보 (설문/등록 완료자)

**현재 `event_survey_entries` 테이블 구조:**
```sql
- id (uuid)
- campaign_id (uuid)
- name (text)
- company (text)
- phone_norm (text)
- survey_no (int)
- code6 (text)
- completed_at (timestamptz)
- registration_data (jsonb) -- 등록 상세 정보
- consent_data (jsonb) -- 동의 정보
- created_at (timestamptz)
```

### 2.3 현재 링크 생성 기능
- `ShareLinkButton` 컴포넌트: 웨비나 링크 공유
- 짧은 링크 생성: `/api/webinars/{webinarId}/short-link`
- 이벤트 페이지는 `public_path` 기반 직접 접근

### 2.4 현재 추적 기능
- 참여자 수 추적 (`event_survey_entries`)
- 완료 번호 발급 및 추적
- 통계 대시보드 (`/client/{clientId}/surveys/{campaignId}`)

---

## 3. 구현 방안

### 3.1 데이터베이스 스키마 변경

#### 3.1.1 `event_survey_entries` 테이블에 UTM 필드 추가

**방안 A: 별도 컬럼 추가 (권장)**
```sql
-- UTM 파라미터를 별도 컬럼으로 저장
ALTER TABLE public.event_survey_entries
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN utm_term text,
  ADD COLUMN utm_content text,
  ADD COLUMN utm_first_visit_at timestamptz, -- 첫 방문 시각
  ADD COLUMN utm_referrer text; -- HTTP Referer 헤더

-- 인덱스 추가 (통계 쿼리 성능 향상)
CREATE INDEX idx_entries_utm_source ON public.event_survey_entries(campaign_id, utm_source);
CREATE INDEX idx_entries_utm_campaign ON public.event_survey_entries(campaign_id, utm_campaign);
CREATE INDEX idx_entries_utm_medium ON public.event_survey_entries(campaign_id, utm_medium);
CREATE INDEX idx_entries_utm_first_visit ON public.event_survey_entries(campaign_id, utm_first_visit_at);
```

**방안 B: JSONB 필드로 저장**
```sql
-- UTM 파라미터를 JSONB로 저장 (유연성 높음)
ALTER TABLE public.event_survey_entries
  ADD COLUMN utm_params jsonb;

-- GIN 인덱스 추가
CREATE INDEX idx_entries_utm_params ON public.event_survey_entries USING gin(utm_params);

-- utm_params 구조:
-- {
--   "source": "google",
--   "medium": "cpc",
--   "campaign": "spring_webinar",
--   "term": "ai",
--   "content": "banner_a",
--   "first_visit_at": "2026-01-27T10:00:00Z",
--   "referrer": "https://www.google.com"
-- }
```

**권장: 방안 A (별도 컬럼)**
- 이유:
  - 쿼리 성능이 우수함 (인덱스 활용 용이)
  - 통계 집계가 간단함
  - 데이터 타입 검증 가능
  - NULL 처리 명확

#### 3.1.2 접속 로그 테이블 생성 (선택사항)

**방안: 별도 접속 로그 테이블 생성**
```sql
-- UTM 파라미터를 포함한 접속 로그 테이블
CREATE TABLE public.event_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.event_survey_campaigns(id) ON DELETE CASCADE,
  agency_id uuid,
  client_id uuid NOT NULL,
  
  -- UTM 파라미터
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  
  -- 접속 정보
  ip_address inet,
  user_agent text,
  referrer text,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  
  -- 세션 정보 (선택사항)
  session_id text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_access_logs_campaign ON public.event_access_logs(campaign_id, accessed_at);
CREATE INDEX idx_access_logs_utm_source ON public.event_access_logs(campaign_id, utm_source);
CREATE INDEX idx_access_logs_utm_campaign ON public.event_access_logs(campaign_id, utm_campaign);

-- RLS 정책
ALTER TABLE public.event_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read access logs in scope" ON public.event_access_logs FOR SELECT
  USING (
    (SELECT is_super_admin FROM public.me) IS TRUE
    OR EXISTS (SELECT 1 FROM public.my_agencies a WHERE a.agency_id = event_access_logs.agency_id)
    OR EXISTS (SELECT 1 FROM public.my_clients c WHERE c.client_id = event_access_logs.client_id)
  );

CREATE POLICY "insert access logs via service role" ON public.event_access_logs FOR INSERT
  WITH CHECK (TRUE);
```

**장점:**
- 유입 추적 (참여 전 단계)
- 전환율 계산 가능 (유입 → 참여)
- 시간대별 유입 패턴 분석

**단점:**
- 추가 스토리지 필요
- 개인정보 보호 고려 필요 (IP 주소)

---

### 3.2 프론트엔드 구현

#### 3.2.1 UTM 파라미터 추출 및 저장

**위치**: `app/event/[...path]/page.tsx` 및 각 컴포넌트

**구현 방법:**

1. **서버 사이드에서 UTM 파라미터 추출**
```typescript
// app/event/[...path]/page.tsx
export default async function SurveyPublicPage({
  params,
  searchParams, // Next.js 15에서 searchParams는 Promise
}: {
  params: Promise<{ path: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { path } = await params
  const searchParamsData = await searchParams
  
  // UTM 파라미터 추출
  const utmParams = {
    source: searchParamsData?.utm_source as string | undefined,
    medium: searchParamsData?.utm_medium as string | undefined,
    campaign: searchParamsData?.utm_campaign as string | undefined,
    term: searchParamsData?.utm_term as string | undefined,
    content: searchParamsData?.utm_content as string | undefined,
  }
  
  // UTM 파라미터가 있으면 쿠키 또는 세션에 저장
  // (참여 완료 시까지 유지)
  
  // ... 기존 로직
}
```

2. **클라이언트 사이드에서 UTM 파라미터 저장**
```typescript
// app/event/[...path]/components/UTMTracker.tsx (신규 컴포넌트)
'use client'

import { useEffect } from 'react'

export default function UTMTracker({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    // URL에서 UTM 파라미터 추출
    const urlParams = new URLSearchParams(window.location.search)
    const utmSource = urlParams.get('utm_source')
    const utmMedium = urlParams.get('utm_medium')
    const utmCampaign = urlParams.get('utm_campaign')
    const utmTerm = urlParams.get('utm_term')
    const utmContent = urlParams.get('utm_content')
    
    // UTM 파라미터가 하나라도 있으면
    if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
      const utmData = {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        term: utmTerm,
        content: utmContent,
        referrer: document.referrer,
        firstVisitAt: new Date().toISOString(),
      }
      
      // 로컬 스토리지에 저장 (참여 완료 시까지 유지)
      localStorage.setItem(`utm_${campaignId}`, JSON.stringify(utmData))
      
      // 서버에 접속 로그 전송 (선택사항)
      fetch('/api/public/event-survey/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          ...utmData,
        }),
      }).catch(console.error)
    }
  }, [campaignId])
  
  return null // UI 렌더링 없음
}
```

3. **참여 완료 시 UTM 파라미터 저장**
```typescript
// app/api/public/event-survey/[campaignId]/submit/route.ts
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params
  const { name, company, phone, answers, consentData } = await req.json()
  
  // 요청 헤더에서 UTM 파라미터 추출 또는 body에서 받기
  const utmSource = req.headers.get('x-utm-source') || body.utm_source
  const utmMedium = req.headers.get('x-utm-medium') || body.utm_medium
  // ... 기타 UTM 파라미터
  
  // entry 생성 시 UTM 파라미터 포함
  const { data: entry } = await admin
    .from('event_survey_entries')
    .insert({
      campaign_id: campaignId,
      name,
      company,
      phone_norm: phoneNorm,
      survey_no: surveyNo,
      code6,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      utm_first_visit_at: utmFirstVisitAt,
      // ... 기타 필드
    })
    .select()
    .single()
}
```

#### 3.2.2 링크 생성 시 UTM 파라미터 추가 기능

**위치**: `app/(client)/client/[clientId]/surveys/[campaignId]/components/tabs/OverviewTab.tsx`

**구현:**
```typescript
// UTM 링크 생성 컴포넌트 추가
const [utmLink, setUtmLink] = useState('')
const [utmSource, setUtmSource] = useState('')
const [utmMedium, setUtmMedium] = useState('')
const [utmCampaign, setUtmCampaign] = useState('')
const [utmTerm, setUtmTerm] = useState('')
const [utmContent, setUtmContent] = useState('')

const generateUTMLink = () => {
  const baseUrl = `${window.location.origin}/event${campaign.public_path}`
  const params = new URLSearchParams()
  
  if (utmSource) params.set('utm_source', utmSource)
  if (utmMedium) params.set('utm_medium', utmMedium)
  if (utmCampaign) params.set('utm_campaign', utmCampaign)
  if (utmTerm) params.set('utm_term', utmTerm)
  if (utmContent) params.set('utm_content', utmContent)
  
  const queryString = params.toString()
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl
  
  setUtmLink(finalUrl)
}

// UI에 UTM 링크 생성 폼 추가
<div className="mt-6 p-4 bg-gray-50 rounded-lg">
  <h4 className="text-sm font-semibold text-gray-900 mb-3">UTM 링크 생성</h4>
  <div className="space-y-2">
    <input
      type="text"
      placeholder="utm_source (예: google)"
      value={utmSource}
      onChange={(e) => setUtmSource(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
    />
    <input
      type="text"
      placeholder="utm_medium (예: cpc)"
      value={utmMedium}
      onChange={(e) => setUtmMedium(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
    />
    <input
      type="text"
      placeholder="utm_campaign (예: spring_webinar)"
      value={utmCampaign}
      onChange={(e) => setUtmCampaign(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
    />
    <input
      type="text"
      placeholder="utm_term (선택사항)"
      value={utmTerm}
      onChange={(e) => setUtmTerm(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
    />
    <input
      type="text"
      placeholder="utm_content (선택사항)"
      value={utmContent}
      onChange={(e) => setUtmContent(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
    />
    <button
      onClick={generateUTMLink}
      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      UTM 링크 생성
    </button>
    {utmLink && (
      <div className="mt-2">
        <input
          type="text"
          readOnly
          value={utmLink}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(utmLink)
            alert('링크가 복사되었습니다.')
          }}
          className="mt-2 w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          링크 복사
        </button>
      </div>
    )}
  </div>
</div>
```

---

### 3.3 백엔드 API 구현

#### 3.3.1 접속 로그 API (선택사항)

**엔드포인트**: `POST /api/public/event-survey/access-log`

```typescript
// app/api/public/event-survey/access-log/route.ts
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { campaignId, source, medium, campaign, term, content, referrer } = await req.json()
    
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }
    
    const admin = createAdminSupabase()
    
    // 캠페인 정보 조회 (agency_id, client_id 가져오기)
    const { data: campaignData } = await admin
      .from('event_survey_campaigns')
      .select('id, agency_id, client_id')
      .eq('id', campaignId)
      .single()
    
    if (!campaignData) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    // 접속 로그 저장
    const { error } = await admin
      .from('event_access_logs')
      .insert({
        campaign_id: campaignId,
        agency_id: campaignData.agency_id,
        client_id: campaignData.client_id,
        utm_source: source || null,
        utm_medium: medium || null,
        utm_campaign: campaign || null,
        utm_term: term || null,
        utm_content: content || null,
        referrer: referrer || null,
        accessed_at: new Date().toISOString(),
      })
    
    if (error) {
      console.error('접속 로그 저장 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('접속 로그 API 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### 3.3.2 UTM 통계 API

**엔드포인트**: `GET /api/event-survey/campaigns/[campaignId]/utm-stats`

```typescript
// app/api/event-survey/campaigns/[campaignId]/utm-stats/route.ts
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const admin = createAdminSupabase()
    
    // UTM별 참여자 수 집계
    const { data: utmStats } = await admin
      .from('event_survey_entries')
      .select('utm_source, utm_medium, utm_campaign, utm_term, utm_content')
      .eq('campaign_id', campaignId)
      .not('utm_source', 'is', null) // UTM이 있는 항목만
    
    // 집계
    const stats = {
      bySource: {} as Record<string, number>,
      byMedium: {} as Record<string, number>,
      byCampaign: {} as Record<string, number>,
      byCombination: {} as Record<string, number>,
      total: utmStats?.length || 0,
    }
    
    utmStats?.forEach((entry) => {
      // Source별 집계
      if (entry.utm_source) {
        stats.bySource[entry.utm_source] = (stats.bySource[entry.utm_source] || 0) + 1
      }
      
      // Medium별 집계
      if (entry.utm_medium) {
        stats.byMedium[entry.utm_medium] = (stats.byMedium[entry.utm_medium] || 0) + 1
      }
      
      // Campaign별 집계
      if (entry.utm_campaign) {
        stats.byCampaign[entry.utm_campaign] = (stats.byCampaign[entry.utm_campaign] || 0) + 1
      }
      
      // 조합별 집계 (source + medium + campaign)
      const combination = [
        entry.utm_source,
        entry.utm_medium,
        entry.utm_campaign,
      ].filter(Boolean).join(' / ')
      
      if (combination) {
        stats.byCombination[combination] = (stats.byCombination[combination] || 0) + 1
      }
    })
    
    // 접속 로그가 있는 경우 전환율 계산
    const { data: accessLogs } = await admin
      .from('event_access_logs')
      .select('utm_source, utm_medium, utm_campaign')
      .eq('campaign_id', campaignId)
      .not('utm_source', 'is', null)
    
    const conversionRates: Record<string, { visits: number; conversions: number; rate: number }> = {}
    
    if (accessLogs) {
      // 접속 수 집계
      const visitCounts: Record<string, number> = {}
      accessLogs.forEach((log) => {
        const key = [log.utm_source, log.utm_medium, log.utm_campaign].filter(Boolean).join(' / ')
        visitCounts[key] = (visitCounts[key] || 0) + 1
      })
      
      // 전환율 계산
      Object.keys(stats.byCombination).forEach((key) => {
        const visits = visitCounts[key] || 0
        const conversions = stats.byCombination[key] || 0
        conversionRates[key] = {
          visits,
          conversions,
          rate: visits > 0 ? (conversions / visits) * 100 : 0,
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        conversionRates,
      },
    })
  } catch (error: any) {
    console.error('UTM 통계 조회 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

### 3.4 통계 대시보드 UI 구현

**위치**: `app/(client)/client/[clientId]/surveys/[campaignId]/components/tabs/StatsTab.tsx`

**구현:**
```typescript
// UTM 통계 탭 추가
const [utmStats, setUtmStats] = useState<any>(null)
const [loadingUtmStats, setLoadingUtmStats] = useState(false)

useEffect(() => {
  loadUTMStats()
}, [campaign.id])

const loadUTMStats = async () => {
  setLoadingUtmStats(true)
  try {
    const response = await fetch(`/api/event-survey/campaigns/${campaign.id}/utm-stats`)
    const result = await response.json()
    
    if (result.success) {
      setUtmStats(result.stats)
    }
  } catch (error) {
    console.error('UTM 통계 로드 오류:', error)
  } finally {
    setLoadingUtmStats(false)
  }
}

// UI 렌더링
{utmStats && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-4">UTM 파라미터별 통계</h3>
    
    {/* Source별 통계 */}
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Source별 참여자 수</h4>
      <div className="space-y-2">
        {Object.entries(utmStats.bySource).map(([source, count]) => (
          <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">{source}</span>
            <span className="text-blue-600 font-semibold">{count}명</span>
          </div>
        ))}
      </div>
    </div>
    
    {/* Medium별 통계 */}
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Medium별 참여자 수</h4>
      <div className="space-y-2">
        {Object.entries(utmStats.byMedium).map(([medium, count]) => (
          <div key={medium} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">{medium}</span>
            <span className="text-blue-600 font-semibold">{count}명</span>
          </div>
        ))}
      </div>
    </div>
    
    {/* Campaign별 통계 */}
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Campaign별 참여자 수</h4>
      <div className="space-y-2">
        {Object.entries(utmStats.byCampaign).map(([campaign, count]) => (
          <div key={campaign} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">{campaign}</span>
            <span className="text-blue-600 font-semibold">{count}명</span>
          </div>
        ))}
      </div>
    </div>
    
    {/* 전환율 통계 (접속 로그가 있는 경우) */}
    {utmStats.conversionRates && Object.keys(utmStats.conversionRates).length > 0 && (
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">UTM별 전환율</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM 조합</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">유입 수</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">전환 수</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">전환율</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(utmStats.conversionRates).map(([key, data]: [string, any]) => (
                <tr key={key}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{key}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{data.visits}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{data.conversions}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-semibold ${data.rate >= 10 ? 'text-green-600' : data.rate >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {data.rate.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
)}
```

---

## 4. 구현 단계 및 우선순위

### Phase 1: 기본 UTM 추적 (필수) ⭐⭐⭐
**목표**: 참여 완료 시 UTM 파라미터 저장

1. ✅ 데이터베이스 마이그레이션
   - `event_survey_entries` 테이블에 UTM 컬럼 추가
   - 인덱스 생성

2. ✅ 프론트엔드 UTM 추출 및 저장
   - `UTMTracker` 컴포넌트 생성
   - URL에서 UTM 파라미터 추출
   - 로컬 스토리지에 저장

3. ✅ API 수정
   - `/api/public/event-survey/[campaignId]/submit` 수정
   - `/api/public/event-survey/[campaignId]/register` 수정
   - UTM 파라미터를 entry에 저장

4. ✅ 통계 API 구현
   - `/api/event-survey/campaigns/[campaignId]/utm-stats` 생성
   - UTM별 참여자 수 집계

5. ✅ 통계 대시보드 UI
   - StatsTab에 UTM 통계 섹션 추가
   - Source/Medium/Campaign별 통계 표시

**예상 작업 시간**: 1-2일

---

### Phase 2: UTM 링크 생성 기능 (권장) ⭐⭐
**목표**: 관리자가 UTM 링크를 쉽게 생성할 수 있도록

1. ✅ OverviewTab에 UTM 링크 생성 폼 추가
2. ✅ UTM 파라미터 입력 폼
3. ✅ 생성된 링크 복사 기능

**예상 작업 시간**: 0.5일

---

### Phase 3: 접속 로그 및 전환율 추적 (선택사항) ⭐
**목표**: 유입부터 전환까지 전체 추적

1. ✅ `event_access_logs` 테이블 생성
2. ✅ 접속 로그 API 구현
3. ✅ 전환율 계산 로직 추가
4. ✅ 통계 대시보드에 전환율 표시

**예상 작업 시간**: 1-2일

---

## 5. 마이그레이션 스크립트

```sql
-- supabase/migrations/062_add_utm_tracking_to_entries.sql

BEGIN;

-- event_survey_entries 테이블에 UTM 컬럼 추가
ALTER TABLE public.event_survey_entries
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_first_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS utm_referrer text;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_entries_utm_source 
  ON public.event_survey_entries(campaign_id, utm_source);
CREATE INDEX IF NOT EXISTS idx_entries_utm_campaign 
  ON public.event_survey_entries(campaign_id, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_entries_utm_medium 
  ON public.event_survey_entries(campaign_id, utm_medium);
CREATE INDEX IF NOT EXISTS idx_entries_utm_first_visit 
  ON public.event_survey_entries(campaign_id, utm_first_visit_at);

-- 복합 인덱스 (자주 함께 조회되는 경우)
CREATE INDEX IF NOT EXISTS idx_entries_utm_combo 
  ON public.event_survey_entries(campaign_id, utm_source, utm_medium, utm_campaign);

COMMIT;
```

---

## 6. 사용 예시

### 6.1 UTM 링크 생성 예시

**기본 링크:**
```
https://eventflow.kr/event/426307
```

**UTM 링크:**
```
https://eventflow.kr/event/426307?utm_source=google&utm_medium=cpc&utm_campaign=spring_webinar_2026
```

**다양한 소스별 링크:**
```
# 구글 검색 광고
https://eventflow.kr/event/426307?utm_source=google&utm_medium=cpc&utm_campaign=spring_webinar&utm_term=ai

# 페이스북 광고
https://eventflow.kr/event/426307?utm_source=facebook&utm_medium=social&utm_campaign=spring_webinar&utm_content=banner_a

# 이메일 뉴스레터
https://eventflow.kr/event/426307?utm_source=newsletter&utm_medium=email&utm_campaign=january_newsletter

# 유기적 검색
https://eventflow.kr/event/426307?utm_source=google&utm_medium=organic&utm_campaign=natural_search
```

### 6.2 통계 대시보드 예시

**UTM별 참여자 수:**
- Source: google (50명), facebook (30명), newsletter (20명)
- Medium: cpc (50명), social (30명), email (20명)
- Campaign: spring_webinar (100명)

**전환율 (접속 로그가 있는 경우):**
- google / cpc / spring_webinar: 유입 200명 → 전환 50명 (전환율 25%)
- facebook / social / spring_webinar: 유입 150명 → 전환 30명 (전환율 20%)

---

## 7. 주의사항 및 고려사항

### 7.1 개인정보 보호
- UTM 파라미터는 마케팅 추적용이므로 개인정보가 아닙니다.
- 다만, 접속 로그에 IP 주소를 저장하는 경우 개인정보 보호법 고려 필요
- 접속 로그는 익명화하거나 일정 기간 후 삭제하는 정책 권장

### 7.2 쿠키/로컬 스토리지 사용
- UTM 파라미터는 참여 완료 시까지 유지되어야 함
- 로컬 스토리지 사용 시 브라우저별로 다를 수 있음
- 세션 스토리지 대신 로컬 스토리지 사용 권장 (페이지 이동 시에도 유지)

### 7.3 URL 길이 제한
- UTM 파라미터가 많으면 URL이 길어질 수 있음
- 브라우저/서버별 URL 길이 제한 확인 필요 (일반적으로 2048자)
- 짧은 링크 생성 시 UTM 파라미터 유지 필요

### 7.4 대소문자 처리
- UTM 파라미터는 대소문자를 구분함
- 일관성을 위해 소문자로 정규화하는 것을 권장

### 7.5 기존 데이터 마이그레이션
- 기존 `event_survey_entries`에는 UTM 파라미터가 없음
- 과거 데이터는 NULL로 처리
- 통계 집계 시 NULL 제외

---

## 8. 테스트 계획

### 8.1 기능 테스트
1. ✅ UTM 파라미터가 포함된 URL로 접속
2. ✅ UTM 파라미터가 로컬 스토리지에 저장되는지 확인
3. ✅ 설문/등록 제출 시 UTM 파라미터가 DB에 저장되는지 확인
4. ✅ 통계 API가 올바르게 집계하는지 확인
5. ✅ 통계 대시보드가 올바르게 표시하는지 확인

### 8.2 통합 테스트
1. ✅ 여러 UTM 파라미터 조합 테스트
2. ✅ UTM 파라미터 없이 접속하는 경우 테스트
3. ✅ 페이지 이동 시 UTM 파라미터 유지 테스트
4. ✅ 브라우저별 동작 확인

### 8.3 성능 테스트
1. ✅ 대량 데이터에서 통계 집계 성능 확인
2. ✅ 인덱스 효과 확인

---

## 9. 향후 개선 사항

### 9.1 고급 분석 기능
- 시간대별 UTM 성과 분석
- UTM별 평균 참여 시간
- UTM별 재방문율

### 9.2 자동화 기능
- UTM 링크 자동 생성 (템플릿 기반)
- UTM별 리포트 자동 발송
- UTM 성과 알림

### 9.3 통합 기능
- Google Analytics 연동
- Facebook Pixel 연동
- 기타 마케팅 도구 연동

---

## 10. 결론

UTM 파라미터 추적 기능을 통해 다음과 같은 이점을 얻을 수 있습니다:

1. **마케팅 성과 측정**: 어떤 채널이 가장 효과적인지 정량적으로 파악
2. **ROI 최적화**: 효과적인 채널에 집중하여 예산 효율성 향상
3. **데이터 기반 의사결정**: 통계 데이터를 바탕으로 마케팅 전략 수립
4. **고객 이해도 향상**: 어떤 경로로 고객이 유입되는지 파악

**권장 구현 순서:**
1. Phase 1 (기본 UTM 추적) - 필수
2. Phase 2 (UTM 링크 생성) - 권장
3. Phase 3 (접속 로그 및 전환율) - 선택사항

이 기능을 통해 광고 캠페인의 성과를 체계적으로 추적하고 분석할 수 있습니다.
