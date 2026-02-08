# Phase 10: 대시보드 및 통계 시스템 구현 계획

**문서 버전**: v1.0  
**최종 업데이트**: 2026-02-09  
**상태**: 설계 단계

---

## 개요

inev.ai 리빌딩(Phase 0-8)이 완료되었지만, **대시보드와 통계 기능**이 아직 구현되지 않았습니다. 기존 프로젝트의 대시보드/통계를 inev.ai 스키마에 맞게 재구현해야 합니다.

---

## 현재 상황 분석

### 기존 프로젝트 (EventFlow 스키마 기반)

**대시보드**:
- `/client/[clientId]/dashboard` - 클라이언트 대시보드
- `/super/dashboard` - 슈퍼어드민 대시보드
- `/webinar/[id]/console` - 웨비나 콘솔 대시보드
- `/event/dashboard/[code]` - 공개 이벤트 대시보드

**통계 API**:
- `/api/clients/[clientId]/statistics/overview` - 클라이언트 통계 개요
- `/api/webinars/[webinarId]/stats` - 웨비나 통계
- `/api/clients/[clientId]/campaigns/summary` - 캠페인 요약
- `/api/clients/[clientId]/campaigns/links/[linkId]/stats` - 링크별 통계

**통계 집계**:
- `marketing_stats_daily` 테이블 (일별 집계)
- 크론 작업: `aggregate-marketing-stats`

### inev.ai 스키마 (신규)

**테이블**:
- `events` - 이벤트 컨테이너
- `clients` - 클라이언트
- `leads` - 등록자 (event_id FK)
- `event_participations` - 참여 관계
- `event_survey_responses` - 설문 응답 (event_id FK)
- `event_visits` - Visit/UTM 로그 (event_id FK)
- `event_emails` - 이메일 초안
- `webinars` - 웨비나 (event_id FK, Phase 6)
- `short_links` - ShortLink (event_id FK, Phase 7)

**기존 통계 시스템과의 차이**:
- 기존: `event_survey_campaigns` 기반
- inev.ai: `events` 기반 (더 단순한 구조)

---

## 구현 계획

### 1. Client Dashboard (`/client/[clientId]/dashboard`)

**목적**: 클라이언트의 전체 이벤트 현황을 한눈에 볼 수 있는 대시보드

**필요한 정보**:
- 이벤트 목록 (최신순)
- 통계 카드:
  - 총 이벤트 수
  - 총 등록자 수 (leads)
  - 총 Visit 수 (event_visits)
  - 총 설문 응답 수 (event_survey_responses)
- 최근 이벤트 목록

**구현 위치**:
- `app/(client)/client/[clientId]/dashboard/page.tsx` (기존 파일 수정)
- inev.ai 스키마에 맞게 쿼리 변경

**변경 사항**:
- 기존: `webinars`, `event_survey_campaigns` 조회
- 변경: `events` 조회 (모듈별로 필터링 가능)

### 2. Event Dashboard (`/inev-admin/clients/[clientId]/events/[eventId]`)

**목적**: 개별 이벤트의 상세 통계 및 관리

**필요한 정보**:
- 이벤트 기본 정보
- 등록자 통계 (leads)
- Visit 통계 (event_visits)
- 설문 응답 통계 (event_survey_responses)
- 참여 관계 통계 (event_participations)
- UTM 파라미터 집계

**구현 위치**:
- `app/inev-admin/clients/[clientId]/events/[eventId]/page.tsx` (기존 파일 확장)
- 탭 구조: Overview, Leads, Visits, Survey Responses, Statistics

### 3. 통계 API 구현

#### 3.1 클라이언트 통계 개요 API

**엔드포인트**: `GET /api/inev/clients/[clientId]/statistics/overview`

**응답 구조**:
```json
{
  "client_id": "uuid",
  "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "events": {
    "total": 10,
    "active": 5,
    "completed": 3
  },
  "leads": {
    "total": 1000,
    "unique_emails": 950
  },
  "visits": {
    "total": 5000,
    "unique_sessions": 3000
  },
  "survey_responses": {
    "total": 800
  },
  "participations": {
    "total": 750
  },
  "summary": {
    "total_events": 10,
    "total_leads": 1000,
    "total_visits": 5000,
    "total_responses": 800
  }
}
```

**구현 위치**: `app/api/inev/clients/[clientId]/statistics/overview/route.ts` (신규)

#### 3.2 이벤트 통계 API

**엔드포인트**: `GET /api/inev/events/[eventId]/statistics`

**응답 구조**:
```json
{
  "event_id": "uuid",
  "leads": {
    "total": 100,
    "unique_emails": 95
  },
  "visits": {
    "total": 500,
    "unique_sessions": 300,
    "by_utm_source": { "google": 200, "facebook": 100 },
    "by_utm_medium": { "cpc": 300, "social": 200 }
  },
  "survey_responses": {
    "total": 80
  },
  "participations": {
    "total": 75
  }
}
```

**구현 위치**: `app/api/inev/events/[eventId]/statistics/route.ts` (신규)

#### 3.3 Visit 통계 API (확장)

**엔드포인트**: `GET /api/inev/events/[eventId]/visits?aggregate=true`

**기존**: `app/api/inev/events/[eventId]/visits/route.ts` (이미 있음)
**확장**: 집계 기능 강화

### 4. 통계 집계 시스템 (선택적)

**목적**: 성능 최적화를 위한 사전 집계

**필요 여부 판단**:
- 초기에는 Raw 데이터 조회로 충분할 수 있음
- 데이터가 많아지면 (`event_visits` 10만 건 이상) 집계 테이블 고려

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

## 구현 우선순위

### Phase 10-1: 기본 대시보드 (필수)

1. **Client Dashboard 수정**
   - inev.ai 스키마에 맞게 쿼리 변경
   - 통계 카드 표시
   - 이벤트 목록 표시

2. **Event Dashboard 확장**
   - 통계 탭 추가
   - Visit/UTM 집계 표시

**DoD**: Client Dashboard에서 이벤트 목록과 기본 통계가 표시됨

### Phase 10-2: 통계 API 구현 (필수)

1. **클라이언트 통계 API**
   - `/api/inev/clients/[clientId]/statistics/overview` 구현

2. **이벤트 통계 API**
   - `/api/inev/events/[eventId]/statistics` 구현

**DoD**: 통계 API가 정상 동작하고 대시보드에서 사용 가능

### Phase 10-3: 통계 집계 시스템 (선택적)

1. **집계 테이블 생성** (필요 시)
2. **크론 작업 구현** (필요 시)

**DoD**: 대용량 데이터에서도 빠른 통계 조회 가능

---

## 구현 파일 목록

### 대시보드

- `app/(client)/client/[clientId]/dashboard/page.tsx` (수정)
- `app/(client)/client/[clientId]/dashboard/components/StatisticsOverview.tsx` (수정 또는 신규)
- `app/inev-admin/clients/[clientId]/events/[eventId]/page.tsx` (확장)

### 통계 API

- `app/api/inev/clients/[clientId]/statistics/overview/route.ts` (신규)
- `app/api/inev/events/[eventId]/statistics/route.ts` (신규)
- `app/api/inev/events/[eventId]/visits/route.ts` (확장)

### 통계 집계 (선택적)

- `supabase/inev/007_create_event_stats_daily.sql` (필요 시)
- `app/api/cron/aggregate-event-stats/route.ts` (필요 시)

---

## 참고 문서

- [inev 리빌딩 전체 구현 계획](./inev_리빌딩_전체구현계획.md)
- [웨비나 통계 집계 수집 명세서](../specs/웨비나_통계_집계_수집_명세서.md)
- [마케팅 통계 집계 시스템 분석 보고서](../reports/마케팅_통계_집계_시스템_분석_보고서.md)

---

**문서 작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-09
