# 광고/캠페인 모듈 Phase 1 실행 체크리스트

**작성일**: 2026-01-27  
**기반 명세서**: v1.1 (패치 반영)  
**목표**: UTM 저장 + Conversions 중심 대시보드 구현

---

## Phase 1 목표

- ✅ 숏링크 없이(UTM querystring만)
- ✅ 전환(`event_survey_entries`)에 UTM 저장
- ✅ 광고/캠페인 페이지에서 **Conversions 중심** 집계 대시보드 제공
- ❌ Visits/CVR은 Phase 3로 이동

---

## Step A. 공통 유틸 추가 (가장 먼저)

### A-1. 파일 생성
- [ ] `lib/utils/utm.ts` 파일 생성

### A-2. 함수 구현
- [ ] `extractUTMParams(searchParams)` 구현
  - 입력: `URLSearchParams` 또는 `Record<string, string | string[] | undefined>`
  - 출력: `Record<string, string>` (utm_source, utm_medium, utm_campaign, utm_term, utm_content만)
  - 동작: UTM 파라미터만 추출하여 객체로 반환

- [ ] `appendUTMToURL(url, utmParams)` 구현
  - 입력: `url: string`, `utmParams: Record<string, string>`
  - 출력: `string` (UTM이 추가된 URL)
  - 동작: URL에 UTM querystring 추가 (기존 querystring 있으면 &로 연결)

- [ ] `normalizeUTM(utmParams)` 구현
  - 입력: `Record<string, string>`
  - 출력: `Record<string, string>`
  - 동작:
    - trim 적용
    - lowercase 변환
    - 길이 제한 (200자)
    - 빈 문자열은 null로 변환

### A-3. 테스트
- [ ] 각 함수 단위 테스트 작성 (선택사항)
- [ ] 수동 테스트: 다양한 UTM 조합으로 테스트

**예상 작업 시간**: 1-2시간

---

## Step B. 워트 리다이렉트 UTM pass-through 적용

### B-1. 클라이언트 리다이렉트 수정

**파일**: `app/(webinar)/webinar/[id]/components/WebinarEntry.tsx`

- [ ] `handleNameEmailAuth` 함수 수정
  - 등록 정보 없을 때 리다이렉트 시 UTM 파라미터 전달
  - `appendUTMToURL('/event/149403', extractUTMParams(window.location.search))` 사용

**구현 예시**:
```typescript
const handleNameEmailAuth = async (e: React.FormEvent) => {
  e.preventDefault()
  // ... 기존 로직 ...
  
  // 등록 정보 없을 때 리다이렉트
  if (!registration) {
    const searchParams = new URLSearchParams(window.location.search)
    const utmParams = extractUTMParams(searchParams)
    const redirectUrl = appendUTMToURL('/event/149403', utmParams)
    window.location.href = redirectUrl
    return
  }
  
  // ... 기존 로직 ...
}
```

### B-2. 서버 사이드 redirect 수정 (있는 경우)

**파일**: `app/(webinar)/webinar/[id]/page.tsx` 등

- [ ] 서버 사이드 `redirect()` 호출 전 UTM 파라미터 확인
- [ ] `searchParams`에서 UTM 추출 후 리다이렉트 URL에 포함

**구현 예시**:
```typescript
export default async function WebinarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParamsData = await searchParams
  
  // 리다이렉트가 필요한 경우
  if (needRedirect) {
    const utmParams = extractUTMParams(searchParamsData)
    const redirectUrl = appendUTMToURL('/event/149403', utmParams)
    redirect(redirectUrl)
  }
}
```

### B-3. 테스트
- [ ] `/webinar/149402?utm_source=test&utm_medium=email` 접속
- [ ] 등록 정보 없어서 `/event/149403`로 리다이렉트되는지 확인
- [ ] 리다이렉트 후 URL에 UTM 파라미터가 유지되는지 확인

**DoD**:
- ✅ `/webinar/149402?utm_source=...` 로 들어온 뒤 등록정보 없어서 `/event/149403`로 가도 utm이 유지된다.

**예상 작업 시간**: 2-3시간

---

## Step C. DB 마이그레이션 (UTM 컬럼 + marketing_campaign_link_id)

### C-1. 마이그레이션 파일 생성
- [ ] `supabase/migrations/063_add_utm_tracking_to_entries.sql` 생성

### C-2. 컬럼 추가
- [ ] `utm_source text` 추가
- [ ] `utm_medium text` 추가
- [ ] `utm_campaign text` 추가
- [ ] `utm_term text` 추가
- [ ] `utm_content text` 추가
- [ ] `utm_first_visit_at timestamptz` 추가
- [ ] `utm_referrer text` 추가
- [ ] `marketing_campaign_link_id uuid` 추가 (nullable)

### C-3. 인덱스 추가 (최소 세트)
- [ ] `(campaign_id, created_at)` 인덱스 (기존에 없으면)
- [ ] `(campaign_id, utm_source, utm_medium, utm_campaign)` 인덱스 (조합 집계용)

### C-4. 마이그레이션 적용
- [ ] Supabase에 마이그레이션 적용
- [ ] 롤백 계획 확인 (필요 시)

**마이그레이션 SQL 예시**:
```sql
BEGIN;

ALTER TABLE public.event_survey_entries
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_first_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS utm_referrer text,
  ADD COLUMN IF NOT EXISTS marketing_campaign_link_id uuid;

-- 인덱스 (최소 세트)
CREATE INDEX IF NOT EXISTS idx_entries_campaign_created 
  ON public.event_survey_entries(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_entries_utm_combo 
  ON public.event_survey_entries(campaign_id, utm_source, utm_medium, utm_campaign)
  WHERE utm_source IS NOT NULL;

COMMIT;
```

**예상 작업 시간**: 1시간

---

## Step D. 공개 페이지에서 UTM 캡처(서버→클라 props) + localStorage 저장

### D-1. 서버 컴포넌트 수정

**파일**: `app/event/[...path]/page.tsx`

- [ ] `searchParams`에서 UTM 추출
- [ ] `extractUTMParams()` 사용
- [ ] 클라이언트 컴포넌트에 `utmParams` props 전달

**구현 예시**:
```typescript
export default async function SurveyPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParamsData = await searchParams
  const utmParams = extractUTMParams(searchParamsData)
  
  // ... 기존 로직 ...
  
  return <RegistrationPage campaign={campaign} utmParams={utmParams} />
}
```

### D-2. 클라이언트 컴포넌트 수정

**파일**: `app/event/[...path]/components/RegistrationPage.tsx`

- [ ] `utmParams` props 받기
- [ ] `useEffect`에서 localStorage 저장
- [ ] 캠페인별 네임스페이스 사용 (`utm:{campaignId}`)
- [ ] last-touch 정책: 기존 값이 있으면 overwrite

**구현 예시**:
```typescript
'use client'
export default function RegistrationPage({ campaign, utmParams }: Props) {
  useEffect(() => {
    if (Object.keys(utmParams).length > 0) {
      const utmData = {
        ...utmParams,
        captured_at: new Date().toISOString(),
        first_visit_at: localStorage.getItem(`utm:${campaign.id}`) 
          ? JSON.parse(localStorage.getItem(`utm:${campaign.id}`)!).first_visit_at
          : new Date().toISOString(),
        referrer_domain: document.referrer ? new URL(document.referrer).hostname : null,
      }
      
      localStorage.setItem(`utm:${campaign.id}`, JSON.stringify(utmData))
    }
  }, [campaign.id, utmParams])
  
  // ... 기존 로직 ...
}
```

### D-3. 테스트
- [ ] `/event/149403?utm_source=test&utm_medium=email` 접속
- [ ] localStorage에 UTM 저장되는지 확인
- [ ] 페이지 이동 후에도 UTM 유지되는지 확인

**예상 작업 시간**: 2-3시간

---

## Step E. submit/register API에 UTM payload 포함해서 저장

### E-1. submit API 수정

**파일**: `app/api/public/event-survey/[campaignId]/submit/route.ts`

- [ ] body에서 UTM 파라미터 받기
- [ ] `normalizeUTM()` 적용
- [ ] `event_survey_entries` 저장 시 UTM 포함
- [ ] graceful 실패: UTM 저장 실패해도 제출 성공

**구현 예시**:
```typescript
export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  const body = await req.json()
  
  // UTM 파라미터 추출 및 정규화
  const utmParams = normalizeUTM({
    utm_source: body.utm_source,
    utm_medium: body.utm_medium,
    utm_campaign: body.utm_campaign,
    utm_term: body.utm_term,
    utm_content: body.utm_content,
  })
  
  // entry 저장
  const { data: entry, error } = await admin
    .from('event_survey_entries')
    .insert({
      campaign_id: campaignId,
      // ... 기존 필드 ...
      utm_source: utmParams.utm_source || null,
      utm_medium: utmParams.utm_medium || null,
      utm_campaign: utmParams.utm_campaign || null,
      utm_term: utmParams.utm_term || null,
      utm_content: utmParams.utm_content || null,
      utm_first_visit_at: body.utm_first_visit_at || null,
      utm_referrer: body.utm_referrer || null,
      marketing_campaign_link_id: body.marketing_campaign_link_id || null,
    })
    .select()
    .single()
  
  // UTM 저장 실패해도 제출은 성공 처리
  if (error && !error.message.includes('utm')) {
    throw error
  }
  
  return NextResponse.json({ success: true, entry })
}
```

### E-2. register API 수정

**파일**: `app/api/public/event-survey/[campaignId]/register/route.ts`

- [ ] body에서 UTM 파라미터 받기
- [ ] `normalizeUTM()` 적용
- [ ] `event_survey_entries` 저장 시 UTM 포함
- [ ] graceful 실패: UTM 저장 실패해도 등록 성공

### E-3. 클라이언트에서 UTM 전송

**파일**: `app/event/[...path]/components/RegistrationPage.tsx`

- [ ] 제출 시 localStorage에서 UTM 읽기
- [ ] API 호출 시 UTM 포함

**구현 예시**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // localStorage에서 UTM 읽기
  const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
  const utmData = storedUTM ? JSON.parse(storedUTM) : {}
  
  // API 호출
  const response = await fetch(`/api/public/event-survey/${campaign.id}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // ... 기존 필드 ...
      ...utmData,
    }),
  })
}
```

### E-4. 테스트
- [ ] UTM 포함하여 제출/등록
- [ ] DB에 UTM 저장되는지 확인
- [ ] UTM 없이 제출해도 성공하는지 확인 (graceful)

**예상 작업 시간**: 3-4시간

---

## Step F. 광고/캠페인 페이지(Phase 1: Conversion 중심)

### F-1. 라우트 생성

- [ ] `app/(client)/client/[clientId]/campaigns/page.tsx` 생성
- [ ] Guard로 client scope 확인
- [ ] 권한 체크 (analyst 이상)

### F-2. 메뉴 추가

**파일**: `components/layout/SidebarTree.tsx` 또는 해당 메뉴 컴포넌트

- [ ] 클라이언트 메뉴에 "📈 광고/캠페인" 항목 추가
- [ ] `/client/[clientId]/campaigns` 링크

### F-3. RPC 함수 구현

**파일**: `supabase/migrations/064_create_marketing_rpc_functions.sql`

- [ ] `get_marketing_summary` 함수 구현
  - 입력: `p_client_id uuid`, `p_campaign_id uuid DEFAULT NULL`, `p_date_from timestamptz DEFAULT NULL`, `p_date_to timestamptz DEFAULT NULL`
  - 출력: `total_conversions bigint`, `direct_conversions bigint`, `top_source text`, `top_medium text`, `top_campaign text`
  - 로직: client_id 스코프 강제, campaign_id 필터링, UTM별 집계

- [ ] `get_marketing_breakdown` 함수 구현
  - 입력: `p_client_id uuid`, `p_campaign_id uuid DEFAULT NULL`, `p_breakdown_type text`, `p_date_from timestamptz DEFAULT NULL`, `p_date_to timestamptz DEFAULT NULL`, `p_limit int DEFAULT 20`
  - 출력: `dimension_value text`, `conversions bigint`, `percentage numeric`
  - 로직: breakdown_type에 따라 source/medium/campaign/combo별 집계

**RPC 함수 예시**:
```sql
CREATE OR REPLACE FUNCTION get_marketing_summary(
  p_client_id uuid,
  p_campaign_id uuid DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_conversions bigint,
  direct_conversions bigint,
  top_source text,
  top_medium text,
  top_campaign text
) AS $$
BEGIN
  -- client_id 스코프 검증
  IF NOT EXISTS (
    SELECT 1 FROM event_survey_campaigns 
    WHERE client_id = p_client_id 
    AND (p_campaign_id IS NULL OR id = p_campaign_id)
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  
  -- 집계 로직
  RETURN QUERY
  WITH conversions AS (
    SELECT 
      utm_source,
      utm_medium,
      utm_campaign
    FROM event_survey_entries e
    JOIN event_survey_campaigns c ON e.campaign_id = c.id
    WHERE c.client_id = p_client_id
    AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
    AND (p_date_from IS NULL OR e.completed_at >= p_date_from)
    AND (p_date_to IS NULL OR e.completed_at <= p_date_to)
  )
  SELECT 
    COUNT(*)::bigint as total_conversions,
    COUNT(*) FILTER (WHERE utm_source IS NULL)::bigint as direct_conversions,
    (SELECT utm_source FROM conversions WHERE utm_source IS NOT NULL GROUP BY utm_source ORDER BY COUNT(*) DESC LIMIT 1) as top_source,
    (SELECT utm_medium FROM conversions WHERE utm_medium IS NOT NULL GROUP BY utm_medium ORDER BY COUNT(*) DESC LIMIT 1) as top_medium,
    (SELECT utm_campaign FROM conversions WHERE utm_campaign IS NOT NULL GROUP BY utm_campaign ORDER BY COUNT(*) DESC LIMIT 1) as top_campaign
  FROM conversions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### F-4. API 엔드포인트 생성

- [ ] `app/api/clients/[clientId]/campaigns/summary/route.ts` 생성
- [ ] `app/api/clients/[clientId]/campaigns/breakdown/route.ts` 생성
- [ ] RPC 함수 호출
- [ ] 권한 체크

### F-5. UI 구현

**파일**: `app/(client)/client/[clientId]/campaigns/page.tsx`

- [ ] 탭 A: 성과 요약 (기본)
  - [ ] 상단 필터 (기간, 전환 타겟)
  - [ ] KPI 카드 (Conversions, Direct 전환 수)
  - [ ] 차트 (conversions 타임시리즈)
  - [ ] 테이블 (전환 타겟별 요약)

- [ ] 탭 B: 캠페인 링크 (Phase 1에서는 비활성 또는 "Phase 2에서 제공 예정" 메시지)

- [ ] 탭 C: 분석 (드릴다운)
  - [ ] UTM 조합 breakdown
  - [ ] 기간별 추이
  - [ ] CSV export (선택사항)

### F-6. 테스트
- [ ] 클라이언트 대시보드에서 "📈 광고/캠페인" 메뉴 표시 확인
- [ ] 권한 체크 동작 확인
- [ ] 집계 데이터 정확성 확인
- [ ] "Direct (UTM 없음)" 표시 확인

**예상 작업 시간**: 8-12시간

---

## 전체 Phase 1 체크리스트 요약

### 필수 작업
- [ ] Step A: 공통 유틸 추가
- [ ] Step B: 워트 리다이렉트 UTM pass-through 적용
- [ ] Step C: DB 마이그레이션
- [ ] Step D: 공개 페이지에서 UTM 캡처
- [ ] Step E: submit/register API에 UTM 저장
- [ ] Step F: 광고/캠페인 페이지 구현

### 예상 총 작업 시간
- **최소**: 17시간
- **최대**: 25시간

### DoD (Definition of Done)

- [ ] UTM 링크로 유입된 사용자가 전환(등록/제출) 시, `event_survey_entries`에 UTM이 저장됨
- [ ] 워트 구조(149402 → 149403)에서 UTM 유실이 발생하지 않음
- [ ] 광고/캠페인 페이지에서 기간 필터 기반 UTM별 전환 성과가 조회됨
- [ ] 모든 조회/집계는 client 스코프가 강제되며 권한 검증이 일관됨
- [ ] 통계는 DB 집계 기반이며, 공개 UX에 영향을 주지 않음
- [ ] 빌드 성공
- [ ] 기본 기능 테스트 완료

---

**작성일**: 2026-01-27  
**다음 단계**: Step A부터 순차적으로 진행
