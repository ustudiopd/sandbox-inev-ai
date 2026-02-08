# Phase 10: 대시보드 및 통계 시스템 구현 계획

**문서 버전**: v2.0  
**최종 업데이트**: 2026-02-09  
**상태**: 설계 단계 (StatsContract 기준)

---

## 개요

inev.ai 리빌딩(Phase 0-8)이 완료되었지만, **대시보드와 통계 기능**이 아직 구현되지 않았습니다.

**Phase 10의 목적**: "대시보드 UI 작업"이 아니라 **"운영 지표의 헌법을 고정하는 단계"**입니다.

이 계획은 [Phase 10 통계 계약서](./Phase10_통계_계약서.md)를 기준으로 작성되었습니다.

---

## 핵심 결정사항 (4개)

### D10-1. 대시보드의 최상위 단위는 무조건 Event

**원칙**: inev.ai 리빌딩의 "Event 컨테이너 최상위 강제" 원칙을 대시보드에도 적용합니다.

**규칙**:
- Client 대시보드는 "웨비나 목록/캠페인 목록"이 아니라 **이벤트 목록 + 이벤트 요약 KPI**가 기본입니다.
- Webinar는 **Event의 모듈**이지만, "콘솔/통계는 별도 화면"으로 분리합니다.

---

### D10-2. 통계는 "이벤트 통계"와 "웨비나 통계"를 분리한다

**2레인 구조**:

#### Event 통계 (비실시간)
- 등록/설문/Email/Visit/UTM/ShortLink 클릭 등
- 온디맨드 집계 (쿼리 시점 계산)

#### Webinar 통계 (실시간/준실시간)
- presence/세션/동시접속/시청시간/채팅/Q&A 등
- 라이브 화면 핫패스에 영향을 주지 않음
- ping + 크론/버킷 기반 (기존 원칙 유지)
- 별도 페이지에서 조회

---

### D10-3. "UTM/Visit/ShortLink 클릭"의 소스 정의를 통일한다

**정의** (자세한 내용은 [통계 계약서](./Phase10_통계_계약서.md) 참조):

- `event_visits` = **페이지 방문** (랜딩/등록/완료 등 page view 성격)
- `event_access_logs` = **게이트(/s) 클릭, entry 진입** 등 "접근 로그"
  - `source`/`action` 의미(예: `shortlink_click`, `entry_open`) 문서로 고정

---

### D10-4. 통계 화면은 "탭 클릭 시 로드 + 자동 갱신 최소화"

- Client Dashboard: 기본 KPI는 캐시/지연 로드
- Event Dashboard: 탭 클릭 시에만 API 호출
- Webinar Stats: 별도 페이지, 새로고침/수동 갱신 중심

---

## 정보구조(IA) 설계

### A. Client Dashboard (`/client/[clientId]/dashboard`)

**목표**: "지금 이 클라이언트에서 어떤 이벤트가 있고, 각각 상태가 어떤가"

**구성 요소**:

#### 1. KPI 카드 (기간 필터 기본 제공 권장)
- 총 이벤트 수
- 총 등록자 수 (`leads` 기준, 중복 이메일 처리 규칙 명시 필요)
- 총 Visits (`event_visits` 기준)
- 총 ShortLink 클릭 (`event_access_logs` 중 `shortlink_click`)

**기간 필터**:
- 기본: 최근 30일
- 선택 가능: 전체, 최근 7일, 최근 30일, 최근 90일, 사용자 지정
- 시간대: KST(한국 표준시) 기준 표시, DB 저장은 UTC

#### 2. 이벤트 테이블
- 이벤트명 / 상태(Live/Closed) / 등록자 / Visits / UTM top source / Webinar 유무 / 최근 활동

**구현 위치**:
- `app/(client)/client/[clientId]/dashboard/page.tsx` (기존 파일 수정)

**변경 사항**:
- 기존: `webinars`, `event_survey_campaigns` 조회
- 변경: `events` 조회 (모듈별로 필터링 가능)

---

### B. Event Dashboard (`/inev-admin/clients/[clientId]/events/[eventId]`)

**목표**: 개별 이벤트의 상세 통계 및 관리

**탭 구조** (모듈별 탭):

#### 1. Overview
- 이벤트 KPI + 최근 추이(있으면)
- 가벼운 집계만 (응답 시간 1초 이내 목표)

#### 2. Registration
- `leads`/`event_participations` 리스트/요약
- 등록자 수 vs 참여자 수 구분 표시

#### 3. Marketing (UTM/Visits/ShortLinks)
- Visits (`event_visits` 기준)
- ShortLink 클릭 (`event_access_logs` 기준)
- UTM breakdown (`utm_source`, `utm_medium`, `utm_campaign` 등)
- CID breakdown
- **탭 클릭 시에만 API 호출** (무거운 집계)

#### 4. Survey
- 응답 수 (`event_survey_responses`)
- 캠페인/폼(있으면)

#### 5. Email
- 발송/오픈(있으면)
- 최소는 "캠페인/로그"

#### 6. Webinar (모듈 ON일 때만 노출)
- "콘솔 열기" 버튼
- "웨비나 통계 보기" 버튼
- (선택) 요약 KPI만 3~4개 (동시접속 peak, 고유참석 등)
- **상세 통계는 별도 페이지에서 조회**

> **주의**: Webinar 탭 안에서 실시간 상세를 다 해결하려고 하면, 결국 콘솔과 통계가 섞이면서 예전 구조로 회귀함. "요약 + 링크"로 제한하는 게 안정적입니다.

**구현 위치**:
- `app/inev-admin/clients/[clientId]/events/[eventId]/page.tsx` (기존 파일 확장)

---

## 통계 API 설계

### 1. Client Dashboard 통계 API

**엔드포인트**: `GET /api/inev/clients/[clientId]/statistics/overview`

**쿼리 파라미터**:
- `from` (optional): 시작일 (YYYY-MM-DD, KST)
- `to` (optional): 종료일 (YYYY-MM-DD, KST)

**응답 구조**:
```typescript
{
  client_id: string,
  date_range: {
    from: string, // YYYY-MM-DD
    to: string    // YYYY-MM-DD
  },
  events: {
    total: number,
    active: number,      // 현재 진행 중
    completed: number    // 종료됨
  },
  leads: {
    total: number,
    unique_emails: number  // 중복 이메일 제거
  },
  visits: {
    total: number,
    unique_sessions: number  // 가능한 경우
  },
  shortlink_clicks: {
    total: number,
    unique_sessions: number
  },
  survey_responses: {
    total: number
  },
  participations: {
    total: number
  }
}
```

**성능 요구사항**:
- 가벼운 쿼리만 (카운트/간단 집계)
- 응답 시간: 1초 이내 목표

**구현 위치**: `app/api/inev/clients/[clientId]/statistics/overview/route.ts` (신규)

---

### 2. Event Dashboard 통계 API

#### 2.1 Overview API (가벼운 KPI)

**엔드포인트**: `GET /api/inev/events/[eventId]/statistics/overview`

**쿼리 파라미터**:
- `from` (optional): 시작일
- `to` (optional): 종료일

**응답 구조**:
```typescript
{
  event_id: string,
  leads: {
    total: number,
    unique_emails: number
  },
  visits: {
    total: number,
    unique_sessions: number
  },
  survey_responses: {
    total: number
  },
  participations: {
    total: number
  },
  shortlink_clicks: {
    total: number
  }
}
```

**성능 요구사항**:
- 가벼운 쿼리만
- 응답 시간: 1초 이내 목표

**구현 위치**: `app/api/inev/events/[eventId]/statistics/overview/route.ts` (신규)

---

#### 2.2 Marketing 통계 API (무거운 집계)

**엔드포인트**: `GET /api/inev/events/[eventId]/statistics/marketing`

**쿼리 파라미터**:
- `from` (optional): 시작일
- `to` (optional): 종료일
- `groupBy` (required): `utm_source` | `utm_medium` | `utm_campaign` | `cid`

**응답 구조**:
```typescript
{
  event_id: string,
  date_range: {
    from: string,
    to: string
  },
  breakdown: Array<{
    key: string,        // utm_source 값 등
    visits: number,
    unique_sessions: number,
    leads: number,
    conversions: number  // leads / visits 비율
  }>
}
```

**성능 요구사항**:
- 탭 클릭 시에만 호출
- 응답 시간: 2초 이내 목표

**구현 위치**: `app/api/inev/events/[eventId]/statistics/marketing/route.ts` (신규)

---

#### 2.3 Registration 통계 API

**엔드포인트**: `GET /api/inev/events/[eventId]/statistics/registration`

**쿼리 파라미터**:
- `from` (optional): 시작일
- `to` (optional): 종료일

**응답 구조**:
```typescript
{
  event_id: string,
  leads: {
    total: number,
    unique_emails: number,
    by_date: Array<{ date: string, count: number }>  // 일별 등록 추이
  },
  participations: {
    total: number,
    by_date: Array<{ date: string, count: number }>  // 일별 참여 추이
  },
  conversion_rate: number  // participations / leads
}
```

**구현 위치**: `app/api/inev/events/[eventId]/statistics/registration/route.ts` (신규)

---

#### 2.4 Survey 통계 API

**엔드포인트**: `GET /api/inev/events/[eventId]/statistics/survey`

**쿼리 파라미터**:
- `from` (optional): 시작일
- `to` (optional): 종료일

**응답 구조**:
```typescript
{
  event_id: string,
  responses: {
    total: number,
    by_date: Array<{ date: string, count: number }>
  }
}
```

**구현 위치**: `app/api/inev/events/[eventId]/statistics/survey/route.ts` (신규)

---

### 3. Webinar 통계 API (별도)

**엔드포인트**: `GET /api/inev/webinars/[webinarId]/statistics`

**주의사항**:
- Webinar 통계는 별도 페이지에서 조회
- 라이브 화면 핫패스에 영향을 주지 않음
- 기존 웨비나 통계 시스템과 동일한 구조 유지

**구현 위치**: 기존 웨비나 통계 API 유지

---

## 통계 집계 시스템 (선택적)

**원칙**: Phase 10에서는 **온디맨드 집계 + 인덱스**로 먼저 진행합니다.

**조건부 사전 집계**:
- 조건(예: `event_access_logs` 100만 row 이상 / 응답 2초↑)이 되면 Phase 10.1로 사전 집계 도입

**집계 테이블 설계** (필요 시):
```sql
CREATE TABLE event_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bucket_date DATE NOT NULL,
  
  -- 집계 지표
  visits BIGINT NOT NULL DEFAULT 0,
  unique_sessions BIGINT NOT NULL DEFAULT 0,
  leads BIGINT NOT NULL DEFAULT 0,
  survey_responses BIGINT NOT NULL DEFAULT 0,
  participations BIGINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(event_id, bucket_date)
);
```

**크론 작업**: `app/api/cron/aggregate-event-stats/route.ts` (필요 시)

---

## 구현 우선순위 (재작업 방지)

### Phase 10-1: 통계 정의/데이터 계약 (필수)

**목표**: "등록자/Visit/Click/UTM" 정의를 확정

**작업**:
1. [Phase 10 통계 계약서](./Phase10_통계_계약서.md) 작성 완료 ✅
2. 통계 계약서 검토 및 확정

**DoD**: 통계 계약서가 확정되고, 모든 지표 정의가 명확히 문서화됨

---

### Phase 10-2: Client Dashboard 수정 (필수)

**목표**: 가장 많이 쓰고, KPI가 명확하면 UI는 빠르게 나옴

**작업**:
1. Client Dashboard 수정
   - inev.ai 스키마에 맞게 쿼리 변경 (`events` 기준)
   - 통계 카드 표시 (기간 필터 포함)
   - 이벤트 목록 표시
2. Client Dashboard 통계 API 구현
   - `/api/inev/clients/[clientId]/statistics/overview` 구현

**DoD**: 
- Client Dashboard에서 이벤트 목록과 기본 통계가 표시됨
- 기간 필터가 정상 동작함
- 등록자 수 정의가 명확히 적용됨

---

### Phase 10-3: Event Dashboard 확장 (필수)

**목표**: 모듈 탭 구조로 확장

**작업**:
1. Event Dashboard 탭 구조 변경
   - Overview, Registration, Marketing, Survey, Email, Webinar 탭
2. Event Dashboard 통계 API 구현
   - `/api/inev/events/[eventId]/statistics/overview` (가벼운 KPI)
   - `/api/inev/events/[eventId]/statistics/marketing` (무거운 집계)
   - `/api/inev/events/[eventId]/statistics/registration`
   - `/api/inev/events/[eventId]/statistics/survey`
3. 탭 클릭 시에만 API 호출 구현

**DoD**:
- Event Dashboard에서 모듈별 탭(Registration/Marketing/Survey/Email/Webinar) 노출
- 각 탭 클릭 시에만 해당 통계 API 호출
- Webinar 탭은 "요약 + 콘솔/통계 링크"만 제공(상세는 별도)

---

### Phase 10-4: Webinar 통계는 별도 페이지/콘솔 연결 (필수)

**목표**: 웨비나 통계는 기존 원칙(핑/크론/버킷) 그대로 가져오되 이벤트에서 연결만 깔끔히

**작업**:
1. Webinar 통계 별도 페이지 확인/유지
2. Event Dashboard의 Webinar 탭에서 링크 연결

**DoD**: Webinar 통계는 라이브 화면 핫패스에 영향을 주지 않음

---

### Phase 10-5: 통계 집계 시스템 (선택적)

**조건**: `event_access_logs` 100만 row 이상 / 응답 2초↑

**작업**:
1. 집계 테이블 생성 (`event_stats_daily`)
2. 크론 작업 구현

**DoD**: 대용량 데이터에서도 빠른 통계 조회 가능

---

## DoD (Definition of Done)

### 기능 DoD

- [x] Client Dashboard에서 events 기준 KPI/리스트 노출 ✅ (Phase 10-2 완료)
- [x] Event Dashboard에서 모듈별 탭(Registration/Marketing/Survey/Email/Webinar) 노출 ✅ (Phase 10-3 완료)
- [x] Webinar 탭은 "요약 + 콘솔/통계 링크"만 제공(상세는 별도) ✅ (Phase 10-3 완료)
- [x] UTM/Visit/ShortLink 클릭의 정의가 문서에 고정되고, 화면/API가 그 정의를 따름 ✅ (Phase10_통계_계약서.md)
- [x] 기간 필터가 모든 통계 화면에서 정상 동작함 (KST 기준) ✅ (모든 API에 from/to 파라미터 구현)
- [x] 등록자 수 정의가 명확히 적용됨 (`leads` vs `event_participations`) ✅ (StatsContract 기준)

### 보안/RLS DoD

- [x] `client_id` 범위 밖 데이터는 어떤 API에서도 조회 불가 ✅ (모든 API에 `requireClientMember` 적용)
- [x] `event_id`를 바꿔 호출해도 다른 client의 이벤트 통계가 나오지 않음 ✅ (event 조회 후 client_id 검증)

### 성능 DoD

- [x] Overview API는 가벼운 쿼리(카운트/간단 집계)로 제한 ✅ (Promise.allSettled로 병렬 처리)
- [x] UTM breakdown 등 무거운 집계는 탭 클릭 시에만 호출 ✅ (MarketingTab에 hasLoaded 상태로 제어)
- [x] Webinar 통계는 라이브 화면 핫패스에 영향을 주지 않음 ✅ (별도 페이지로 분리)
- [ ] Overview API 응답 시간: 1초 이내 (실제 테스트 필요)
- [ ] Marketing API 응답 시간: 2초 이내 (실제 테스트 필요)

---

## 구현 파일 목록

### 대시보드

- `app/(client)/client/[clientId]/dashboard/page.tsx` (수정)
- `app/(client)/client/[clientId]/dashboard/components/StatisticsOverview.tsx` (수정 또는 신규)
- `app/inev-admin/clients/[clientId]/events/[eventId]/page.tsx` (확장)
- `app/inev-admin/clients/[clientId]/events/[eventId]/components/EventTabs.tsx` (신규 또는 수정)

### 통계 API

- `app/api/inev/clients/[clientId]/statistics/overview/route.ts` (신규)
- `app/api/inev/events/[eventId]/statistics/overview/route.ts` (신규)
- `app/api/inev/events/[eventId]/statistics/marketing/route.ts` (신규)
- `app/api/inev/events/[eventId]/statistics/registration/route.ts` (신규)
- `app/api/inev/events/[eventId]/statistics/survey/route.ts` (신규)

### 통계 집계 (선택적)

- `supabase/inev/007_create_event_stats_daily.sql` (필요 시)
- `app/api/cron/aggregate-event-stats/route.ts` (필요 시)

---

## 참고 문서

- [Phase 10 통계 계약서](./Phase10_통계_계약서.md) ⭐ **필수 참조**
- [대시보드 통계 검토 문서](./대시보드_통계.md)
- [inev 리빌딩 전체 구현 계획](./inev_리빌딩_전체구현계획.md)
- [웨비나 통계 집계 수집 명세서](../specs/웨비나_통계_집계_수집_명세서.md)

---

**문서 작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-09
