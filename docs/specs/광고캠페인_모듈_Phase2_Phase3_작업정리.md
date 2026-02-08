# 광고/캠페인 모듈 Phase 2 & Phase 3 작업 정리

**작성일**: 2026-01-27  
**Phase 1 상태**: ✅ 완료  
**다음 단계**: Phase 2 착수 준비

---

## Phase 1 완료 현황 ✅

### 완료된 작업
- ✅ Step A: 공통 유틸 추가 (`lib/utils/utm.ts`)
- ✅ Step B: 워트 리다이렉트 UTM pass-through 적용
- ✅ Step C: DB 마이그레이션 (UTM 컬럼 + marketing_campaign_link_id)
- ✅ Step D: 공개 페이지에서 UTM 캡처 (서버→클라 props + localStorage)
- ✅ Step E: submit/register API에 UTM 저장
- ✅ Step F: 광고/캠페인 페이지 구현 (Conversions 중심 대시보드)

### Phase 1 결과물
- UTM 파라미터 추적 및 저장 시스템 구축 완료
- 광고/캠페인 대시보드에서 전환 데이터 집계 가능
- `/client/[clientId]/campaigns` 페이지 운영 중

---

## Phase 2: 캠페인 링크 관리 기능

### 목표
- 운영자가 UTM 링크를 쉽게 생성하고 관리할 수 있는 기능 제공
- 생성된 링크와 전환 데이터를 연결하여 성과 추적

### Phase 2 작업 목록

#### 2-1. DB 마이그레이션: `campaign_link_meta` 테이블 생성

**파일**: `supabase/migrations/065_create_campaign_link_meta.sql`

```sql
BEGIN;

-- 캠페인 링크 메타데이터 테이블 생성
CREATE TABLE public.campaign_link_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- marketing_campaign_link_id로 사용
  agency_id uuid,
  client_id uuid NOT NULL,
  name text NOT NULL, -- 운영자 이름: "26년 1월 뉴스레터", "문자_리마인드"
  target_campaign_id uuid NOT NULL REFERENCES event_survey_campaigns(id),
  landing_variant text, -- welcome/register/survey
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  status text DEFAULT 'active', -- active/paused/archived
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_campaign_link_meta_client_target 
  ON public.campaign_link_meta(client_id, target_campaign_id, status);

CREATE UNIQUE INDEX uniq_campaign_link_meta_name_client 
  ON public.campaign_link_meta(client_id, name); -- 동일 클라이언트 내 이름 유니크

-- RLS 정책 (필요 시)
-- 클라이언트 멤버는 자신의 클라이언트 링크만 조회 가능

COMMIT;
```

**작업 시간**: 1-2시간

---

#### 2-2. 캠페인 링크 생성 API

**파일**: `app/api/clients/[clientId]/campaigns/links/route.ts`

**기능**:
- POST: 새 캠페인 링크 생성
- GET: 클라이언트의 캠페인 링크 목록 조회
- PUT: 캠페인 링크 수정
- DELETE: 캠페인 링크 삭제 (soft delete: status = 'archived')

**요청 예시**:
```typescript
POST /api/clients/[clientId]/campaigns/links
{
  name: "26년 1월 뉴스레터",
  target_campaign_id: "uuid",
  landing_variant: "register", // welcome/register/survey
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "january_2026",
  utm_term: null,
  utm_content: null
}
```

**응답 예시**:
```typescript
{
  id: "uuid", // marketing_campaign_link_id
  name: "26년 1월 뉴스레터",
  url: "https://eventflow.kr/event/149403?utm_source=newsletter&utm_medium=email&utm_campaign=january_2026",
  created_at: "2026-01-27T..."
}
```

**작업 시간**: 4-6시간

---

#### 2-3. 탭 B: 캠페인 링크 생성기 UI

**파일**: `app/(client)/client/[clientId]/campaigns/components/CampaignLinksTab.tsx`

**기능**:
1. **링크 생성 폼**
   - 링크 이름 입력 (필수)
   - 전환 타겟 선택 (캠페인 선택)
   - 랜딩 위치 선택 (welcome/register/survey)
   - UTM 파라미터 입력 (source, medium, campaign, term, content)
   - 생성 버튼

2. **생성된 링크 목록**
   - 링크 이름, 전환 타겟, UTM 정보 표시
   - 생성된 URL 표시 및 복사 버튼
   - 상태 관리 (active/paused/archived)
   - 전환 수 표시 (해당 링크로 유입된 전환 수)

3. **링크 관리**
   - 링크 수정 (UTM 파라미터 변경)
   - 링크 일시정지/재개
   - 링크 삭제 (archived)

**UI 구성**:
```
┌─────────────────────────────────────────┐
│  캠페인 링크 관리                        │
├─────────────────────────────────────────┤
│  [+ 새 링크 생성]                        │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ 링크 이름: [26년 1월 뉴스레터    ]│  │
│  │ 전환 타겟: [캠페인 선택 ▼]        │  │
│  │ 랜딩 위치: [register ▼]            │  │
│  │ UTM Source: [newsletter]           │  │
│  │ UTM Medium: [email]                │  │
│  │ UTM Campaign: [january_2026]       │  │
│  │ [생성]                             │  │
│  └───────────────────────────────────┘  │
│                                          │
│  생성된 링크 목록:                        │
│  ┌───────────────────────────────────┐  │
│  │ 26년 1월 뉴스레터                  │  │
│  │ eventflow.kr/event/149403?...      │  │
│  │ 전환: 15개                          │  │
│  │ [복사] [수정] [일시정지] [삭제]    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**작업 시간**: 8-12시간

---

#### 2-4. 링크와 전환 데이터 연결

**목표**: 생성된 링크(`campaign_link_meta.id`)를 전환 시 `marketing_campaign_link_id`에 저장

**수정 필요 파일**:
1. `app/event/[...path]/components/RegistrationPage.tsx`
   - 링크 생성 시 생성된 URL에 `marketing_campaign_link_id` 파라미터 포함
   - 예: `?utm_source=...&_link_id=uuid`

2. `app/api/public/event-survey/[campaignId]/register/route.ts`
   - `_link_id` 파라미터를 받아서 `marketing_campaign_link_id`에 저장
   - UTM 파라미터와 `_link_id`가 모두 있으면 `_link_id` 우선

3. `app/api/public/event-survey/[campaignId]/submit/route.ts`
   - 동일하게 `_link_id` 파라미터 처리

**링크 URL 형식**:
```
https://eventflow.kr/event/149403?utm_source=newsletter&utm_medium=email&utm_campaign=january_2026&_link_id=uuid
```

**작업 시간**: 3-4시간

---

#### 2-5. 링크별 전환 집계 기능

**목표**: 생성된 링크별로 전환 수 집계

**수정 필요 파일**:
- `app/api/clients/[clientId]/campaigns/summary/route.ts`
- 링크별 집계 추가:
  ```typescript
  conversions_by_link: Array<{
    link_id: string
    link_name: string
    count: number
  }>
  ```

**작업 시간**: 2-3시간

---

### Phase 2 전체 작업 시간 예상
- **최소**: 18시간
- **최대**: 27시간

---

## Phase 3: Visits/CVR 추적 및 유입 로그

### 목표
- 유입 로그 수집 (Visit 추적)
- 전환율(CVR) 계산 및 표시
- 유입부터 전환까지 전체 추적

### Phase 3 작업 목록

#### 3-1. DB 마이그레이션: `event_access_logs` 테이블 생성

**파일**: `supabase/migrations/066_create_event_access_logs.sql`

```sql
BEGIN;

-- 유입 로그 테이블 생성
CREATE TABLE public.event_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES event_survey_campaigns(id),
  session_id text NOT NULL, -- 익명 세션 ID (cookie 기반)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  marketing_campaign_link_id uuid REFERENCES public.campaign_link_meta(id),
  referrer text,
  user_agent text, -- 옵션 (기본 미수집)
  ip_address text, -- 옵션 (기본 미수집)
  accessed_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz, -- 전환 시각 (nullable)
  entry_id uuid REFERENCES event_survey_entries(id) -- 전환된 entry (nullable)
);

-- 인덱스
CREATE INDEX idx_access_logs_campaign_session 
  ON public.event_access_logs(campaign_id, session_id, accessed_at);

CREATE INDEX idx_access_logs_campaign_accessed 
  ON public.event_access_logs(campaign_id, accessed_at DESC);

CREATE INDEX idx_access_logs_link_id 
  ON public.event_access_logs(marketing_campaign_link_id)
  WHERE marketing_campaign_link_id IS NOT NULL;

-- 세션별 첫 방문만 집계하기 위한 인덱스
CREATE INDEX idx_access_logs_campaign_session_first 
  ON public.event_access_logs(campaign_id, session_id, accessed_at)
  WHERE converted_at IS NULL;

COMMIT;
```

**작업 시간**: 1-2시간

---

#### 3-2. 공개 Visit 수집 API

**파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`

**기능**:
- POST: 공개 페이지 접속 시 Visit 로그 기록
- session_id 기반 dedup (같은 세션에서 중복 방지)
- 최소 방어: campaignId 유효성 검증, session 기반 dedup, 필드 길이 제한

**요청 예시**:
```typescript
POST /api/public/campaigns/[campaignId]/visit
{
  session_id: "cookie_value",
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "january_2026",
  _link_id: "uuid", // 선택사항
  referrer: "https://example.com"
}
```

**작업 시간**: 3-4시간

---

#### 3-3. 클라이언트 Visit 수집 로직

**파일**: `app/event/[...path]/components/RegistrationPage.tsx` 등

**기능**:
- 페이지 로드 시 Visit API 호출
- session_id는 cookie 기반 (30분 TTL)
- graceful 실패: Visit 수집 실패해도 페이지 정상 동작

**구현 예시**:
```typescript
useEffect(() => {
  // session_id 생성/조회 (cookie 기반)
  let sessionId = getCookie('session_id')
  if (!sessionId) {
    sessionId = generateUUID()
    setCookie('session_id', sessionId, { maxAge: 30 * 60 }) // 30분
  }
  
  // Visit 수집 (비동기, 실패해도 계속 진행)
  fetch(`/api/public/campaigns/${campaign.id}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      ...utmParams,
      referrer: document.referrer,
    }),
  }).catch(() => {}) // 실패 무시
}, [campaign.id])
```

**작업 시간**: 2-3시간

---

#### 3-4. 전환 시 Visit과 연결

**목표**: 전환 발생 시 `event_access_logs`의 `converted_at`과 `entry_id` 업데이트

**수정 필요 파일**:
- `app/api/public/event-survey/[campaignId]/register/route.ts`
- `app/api/public/event-survey/[campaignId]/submit/route.ts`

**로직**:
```typescript
// 전환 저장 후
const { data: entry } = await admin.from('event_survey_entries').insert(...)

// 해당 세션의 Visit 로그 찾아서 전환 정보 업데이트
await admin
  .from('event_access_logs')
  .update({
    converted_at: new Date().toISOString(),
    entry_id: entry.id,
  })
  .eq('campaign_id', campaignId)
  .eq('session_id', sessionId)
  .is('converted_at', null) // 아직 전환되지 않은 것만
```

**작업 시간**: 2-3시간

---

#### 3-5. Visits/CVR 집계 RPC 함수

**파일**: `supabase/migrations/067_create_visits_cvr_rpc.sql`

**함수**:
1. `get_marketing_visits_summary`
   - Visits 수 집계
   - 세션별 첫 방문만 집계 (dedup)

2. `get_marketing_cvr_summary`
   - 전환율(CVR) 계산
   - Visits 대비 Conversions 비율

**작업 시간**: 4-6시간

---

#### 3-6. 대시보드에 Visits/CVR 추가

**파일**: `app/(client)/client/[clientId]/campaigns/components/CampaignsPageClient.tsx`

**추가 기능**:
- KPI 카드에 Visits 수 추가
- CVR(전환율) 표시
- Visits 타임시리즈 차트
- Visits 대비 Conversions 비교 차트

**작업 시간**: 6-8시간

---

### Phase 3 전체 작업 시간 예상
- **최소**: 18시간
- **최대**: 26시간

---

## 전체 로드맵 요약

### ✅ Phase 1: UTM 저장 + Conversions 중심 대시보드 (완료)
- **상태**: ✅ 완료
- **작업 시간**: 17-25시간 (완료)
- **결과물**: 
  - UTM 추적 시스템 구축
  - 전환 데이터 집계 대시보드

### ⏭️ Phase 2: 캠페인 링크 관리 기능
- **상태**: 대기 중
- **작업 시간**: 18-27시간
- **주요 작업**:
  1. `campaign_link_meta` 테이블 생성
  2. 링크 생성/수정/삭제 API
  3. 탭 B: 링크 생성기 UI
  4. 링크와 전환 데이터 연결
  5. 링크별 전환 집계

### ⏭️ Phase 3: Visits/CVR 추적
- **상태**: 대기 중
- **작업 시간**: 18-26시간
- **주요 작업**:
  1. `event_access_logs` 테이블 생성
  2. 공개 Visit 수집 API
  3. 클라이언트 Visit 수집 로직
  4. 전환 시 Visit과 연결
  5. Visits/CVR 집계 RPC 함수
  6. 대시보드에 Visits/CVR 추가

---

## 다음 단계 권장사항

### Phase 2 착수 전 준비사항
1. ✅ Phase 1 완료 확인
2. ⏭️ Phase 2 상세 설계 검토
3. ⏭️ UI/UX 디자인 확인 (링크 생성기)

### Phase 2 우선순위
1. **높음**: 링크 생성 기능 (운영자 요구사항)
2. **중간**: 링크 관리 기능 (수정/삭제)
3. **낮음**: 링크별 집계 (Phase 1에서도 UTM별 집계 가능)

---

**작성일**: 2026-01-27  
**다음 업데이트**: Phase 2 착수 시
