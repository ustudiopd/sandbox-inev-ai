# Phase 10: 통계 계약서 (Statistics Contract)

**문서 버전**: v1.0  
**최종 업데이트**: 2026-02-09  
**상태**: 확정

---

## 목적

이 문서는 **inev.ai 대시보드/통계 시스템의 운영 지표 헌법**입니다.  
모든 통계 화면, API, 집계 로직은 이 계약서의 정의를 따라야 합니다.

**핵심 원칙**: Phase 10은 "대시보드 UI 작업"이 아니라 **"운영 지표의 헌법을 고정하는 단계"**입니다.

---

## 1. 핵심 결정사항 (4개)

### D10-1. 대시보드의 최상위 단위는 무조건 Event

**원칙**: inev.ai 리빌딩의 "Event 컨테이너 최상위 강제" 원칙을 대시보드에도 적용합니다.

**규칙**:
- Client 대시보드는 "웨비나 목록/캠페인 목록"이 아니라 **이벤트 목록 + 이벤트 요약 KPI**가 기본입니다.
- Webinar는 **Event의 모듈**이지만, "콘솔/통계는 별도 화면"으로 분리합니다.

**적용 범위**:
- Client Dashboard: 이벤트 목록이 기본 뷰
- Event Dashboard: 개별 이벤트 상세 뷰
- Webinar 통계: Event Dashboard 내 "Webinar 탭"에서 요약만 표시, 상세는 별도 페이지

---

### D10-2. 통계는 "이벤트 통계"와 "웨비나 통계"를 분리한다

**원칙**: EventFlow 문서에서 통계가 섞여 있던 문제를 구조적으로 해결합니다.

**2레인 구조**:

#### A. Event 통계 (비실시간)
- **등록**: `leads`, `event_participations` 집계
- **설문**: `event_survey_responses` 집계
- **Email**: `event_emails` 발송/오픈 로그
- **Visit**: `event_visits` 집계 (페이지 방문)
- **UTM**: `event_visits` 또는 `event_access_logs`에서 UTM 파라미터 집계
- **ShortLink 클릭**: `event_access_logs`에서 `source='shortlink_click'` 집계

**집계 방식**: 온디맨드 집계 (쿼리 시점 계산)

#### B. Webinar 통계 (실시간/준실시간)
- **Presence**: `webinar_live_presence` 집계
- **세션**: `webinar_access_logs` 집계
- **동시접속**: 버킷 기반 집계 (`webinar_stats_buckets`)
- **시청시간**: 세션 기반 계산
- **채팅/Q&A**: `webinar_chats`, `webinar_questions` 집계

**집계 방식**: 
- 라이브 화면 핫패스에 영향을 주지 않음
- ping + 크론/버킷 기반 (기존 원칙 유지)
- 별도 페이지에서 조회

---

### D10-3. "UTM/Visit/ShortLink 클릭"의 소스 정의를 통일한다

**문제**: `event_visits`와 `event_access_logs`의 역할이 분리되지 않으면 대시보드에서 "Visit 수"가 어디서 나왔는지 헷갈립니다.

**정의 (문서로 고정)**:

#### `event_visits`
- **의미**: 페이지 방문 (랜딩/등록/완료 등 page view 성격)
- **소스 테이블**: `public.event_visits`
- **집계 기준**: `event_id` 기준
- **용도**: 
  - 이벤트 랜딩 페이지 방문 수
  - 등록 완료 페이지 방문 수
  - UTM 파라미터별 유입 분석

**집계 예시**:
```sql
-- 총 Visit 수
SELECT COUNT(*) FROM event_visits WHERE event_id = $1

-- UTM Source별 Visit
SELECT utm_source, COUNT(*) 
FROM event_visits 
WHERE event_id = $1 
GROUP BY utm_source
```

#### `event_access_logs`
- **의미**: 게이트(/s) 클릭, entry 진입 등 "접근 로그"
- **소스 테이블**: `public.event_access_logs` (기존 EventFlow 스키마)
- **집계 기준**: `campaign_id` 또는 `webinar_id` 기준 (Event와의 연결은 간접적)
- **용도**:
  - ShortLink(`/s/[code]`) 클릭 로그
  - Entry 게이트 진입 로그
  - 전환(conversion) 추적

**`source`/`action` 의미 (문서로 고정)**:
- `shortlink_click`: `/s/[code]` 클릭
- `entry_open`: Entry 게이트 진입
- (향후 확장 가능)

**집계 예시**:
```sql
-- ShortLink 클릭 수 (Event와 연결된 campaign을 통해)
SELECT COUNT(DISTINCT session_id) 
FROM event_access_logs eal
JOIN event_survey_campaigns esc ON eal.campaign_id = esc.id
WHERE esc.client_id = $1
  AND eal.accessed_at BETWEEN $2 AND $3
```

**주의사항**:
- `event_access_logs`는 `campaign_id` 또는 `webinar_id` 기준이므로, Event와의 연결은 `event_survey_campaigns` 또는 `webinars` 테이블을 통해 간접적으로 이루어집니다.
- Phase 10에서는 이 간접 연결을 명확히 문서화하고, API에서 올바르게 처리해야 합니다.

---

### D10-4. 통계 화면은 "탭 클릭 시 로드 + 자동 갱신 최소화"

**원칙**: EventFlow의 웨비나 콘솔 5초 폴링 같은 핫패스 경험이 리빌드 원칙에 반영되어 있습니다.

**로딩 전략**:

#### Client Dashboard
- **기본 KPI**: 캐시/지연 로드
- **이벤트 목록**: 초기 로드 시 표시
- **자동 갱신**: 없음 (수동 새로고침)

#### Event Dashboard
- **Overview 탭**: 초기 로드 시 가벼운 KPI만
- **모듈별 탭** (Registration/Marketing/Survey/Email/Webinar): **탭 클릭 시에만 API 호출**
- **자동 갱신**: 없음

#### Webinar Stats (별도 페이지)
- **새로고침/수동 갱신 중심**
- 라이브 화면 핫패스에 영향을 주지 않음

---

## 2. 지표 정의 (Metrics Definition)

### 2.1 등록자 수 (Leads Count)

**정의**:
- **소스 테이블**: `public.leads`
- **집계 기준**: `event_id` 또는 `client_id` (이벤트별 또는 클라이언트 전체)
- **중복 처리**: 
  - 이벤트별: `unique(event_id, email)` 제약으로 중복 없음
  - 클라이언트 전체: `COUNT(DISTINCT email)` 또는 `COUNT(DISTINCT id)`

**집계 방식**:
```sql
-- 이벤트별 등록자 수
SELECT COUNT(*) FROM leads WHERE event_id = $1

-- 클라이언트 전체 등록자 수 (중복 이메일 제거)
SELECT COUNT(DISTINCT email) 
FROM leads l
JOIN events e ON l.event_id = e.id
WHERE e.client_id = $1
```

**주의사항**:
- `leads`와 `event_participations`의 차이:
  - `leads`: 등록 완료 (이메일 입력)
  - `event_participations`: 실제 참여 (버튼 클릭 등)
- 대시보드에서 표시할 때는 "등록자"와 "참여자"를 구분해야 합니다.

---

### 2.2 Visit 수 (Visits Count)

**정의**:
- **소스 테이블**: `public.event_visits`
- **집계 기준**: `event_id` 또는 `client_id` (이벤트별 또는 클라이언트 전체)
- **중복 처리**: 
  - 총 Visit: `COUNT(*)`
  - 고유 세션: `COUNT(DISTINCT session_id)` (세션 ID가 있는 경우)

**집계 방식**:
```sql
-- 이벤트별 총 Visit 수
SELECT COUNT(*) FROM event_visits WHERE event_id = $1

-- 클라이언트 전체 Visit 수
SELECT COUNT(*) 
FROM event_visits ev
JOIN events e ON ev.event_id = e.id
WHERE e.client_id = $1
```

**주의사항**:
- `event_visits`는 페이지 방문 기록이므로, 같은 사용자가 여러 페이지를 방문하면 여러 건이 기록됩니다.
- "고유 방문자"를 계산하려면 세션 ID 또는 쿠키 기반 추적이 필요합니다.

---

### 2.3 ShortLink 클릭 수 (ShortLink Clicks Count)

**정의**:
- **소스 테이블**: `public.event_access_logs`
- **집계 기준**: `short_links.code` 또는 `event_id` (간접 연결)
- **필터**: `source='shortlink_click'` 또는 `/s/[code]` 경로로 진입한 로그

**집계 방식**:
```sql
-- Event별 ShortLink 클릭 수 (campaign을 통해 연결)
SELECT COUNT(DISTINCT eal.session_id)
FROM event_access_logs eal
JOIN event_survey_campaigns esc ON eal.campaign_id = esc.id
JOIN events e ON esc.client_id = e.client_id
WHERE e.id = $1
  AND eal.accessed_at BETWEEN $2 AND $3
```

**주의사항**:
- `event_access_logs`는 `campaign_id` 또는 `webinar_id` 기준이므로, Event와의 연결이 간접적입니다.
- Phase 7에서 `/s/[code]` 클릭 시 `event_access_logs`에 기록하므로, 이 로그를 통해 ShortLink 클릭을 집계합니다.

---

### 2.4 UTM 파라미터 집계 (UTM Breakdown)

**정의**:
- **소스 테이블**: `public.event_visits` (주), `public.event_access_logs` (보조)
- **집계 기준**: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- **집계 방식**: `GROUP BY` 각 UTM 파라미터

**집계 방식**:
```sql
-- UTM Source별 Visit
SELECT 
  utm_source,
  COUNT(*) as visits,
  COUNT(DISTINCT session_id) as unique_visits
FROM event_visits
WHERE event_id = $1
  AND created_at BETWEEN $2 AND $3
GROUP BY utm_source
ORDER BY visits DESC
```

**주의사항**:
- UTM 파라미터는 `event_visits`에서 주로 집계하지만, `event_access_logs`에서도 UTM 정보를 수집합니다.
- 두 테이블의 UTM 정보를 통합할지, 분리할지는 대시보드 요구사항에 따라 결정합니다.

---

### 2.5 설문 응답 수 (Survey Responses Count)

**정의**:
- **소스 테이블**: `public.event_survey_responses`
- **집계 기준**: `event_id` 또는 `client_id`
- **중복 처리**: 설문 응답은 일반적으로 중복 없음 (1인 1응답)

**집계 방식**:
```sql
-- 이벤트별 설문 응답 수
SELECT COUNT(*) FROM event_survey_responses WHERE event_id = $1
```

---

### 2.6 참여자 수 (Participants Count)

**정의**:
- **소스 테이블**: `public.event_participations`
- **집계 기준**: `event_id` 또는 `client_id`
- **의미**: 등록(`leads`) 후 실제 참여한 사용자 수

**집계 방식**:
```sql
-- 이벤트별 참여자 수
SELECT COUNT(*) FROM event_participations WHERE event_id = $1
```

---

## 3. 기간 규칙 (Time Range Rules)

### 3.1 기본 기간 필터

**규칙**:
- 모든 통계 API는 **기간 필터(`from`, `to`)**를 지원해야 합니다.
- 기간이 지정되지 않으면 **전체 기간**을 의미합니다.
- 시간대: **KST(한국 표준시)** 기준으로 표시, DB 저장은 UTC

**파라미터 형식**:
```
?from=2026-01-01&to=2026-01-31
```

**시간대 변환**:
```typescript
// API에서 KST로 변환하여 표시
const fromKST = new Date(`${from}T00:00:00+09:00`)
const toKST = new Date(`${to}T23:59:59+09:00`)
```

---

### 3.2 기본 기간 제안

**Client Dashboard**:
- 기본: 최근 30일
- 선택 가능: 전체, 최근 7일, 최근 30일, 최근 90일, 사용자 지정

**Event Dashboard**:
- 기본: 이벤트 시작일 ~ 종료일 (또는 현재)
- 선택 가능: 전체, 최근 7일, 최근 30일, 사용자 지정

---

## 4. 집계 방식 (Aggregation Methods)

### 4.1 온디맨드 집계 (Phase 10 기본)

**원칙**: Phase 10에서는 사전 집계 테이블 없이 **온디맨드 집계**를 기본으로 합니다.

**방식**:
- 쿼리 시점에 Raw 데이터에서 집계
- 인덱스 최적화로 성능 확보
- 데이터가 많아지면 (`event_access_logs` 100만 row 이상 / 응답 2초↑) Phase 10.1에서 사전 집계 도입 검토

**인덱스 요구사항**:
```sql
-- event_visits 인덱스
CREATE INDEX idx_event_visits_event_created ON event_visits(event_id, created_at DESC);
CREATE INDEX idx_event_visits_event_utm ON event_visits(event_id, utm_source, utm_medium);

-- event_access_logs 인덱스
CREATE INDEX idx_event_access_logs_campaign_accessed ON event_access_logs(campaign_id, accessed_at DESC);
CREATE INDEX idx_event_access_logs_webinar_accessed ON event_access_logs(webinar_id, accessed_at DESC) WHERE webinar_id IS NOT NULL;
```

---

### 4.2 사전 집계 (Phase 10.1 조건부)

**조건**:
- `event_access_logs` 100만 row 이상
- 통계 API 응답 시간 2초 이상
- 위 조건이 충족되면 `event_stats_daily` 테이블 도입 검토

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

---

## 5. API 시그니처 (API Signatures)

### 5.1 Client Dashboard 통계 API

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

---

### 5.2 Event Dashboard 통계 API

#### 5.2.1 Overview API (가벼운 KPI)

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

---

#### 5.2.2 Marketing 통계 API (무거운 집계)

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

---

### 5.3 Webinar 통계 API (별도)

**엔드포인트**: `GET /api/inev/webinars/[webinarId]/statistics`

**주의사항**:
- Webinar 통계는 별도 페이지에서 조회
- 라이브 화면 핫패스에 영향을 주지 않음
- 기존 웨비나 통계 시스템과 동일한 구조 유지

---

## 6. 보안 및 RLS (Security & RLS)

### 6.1 RLS 정책

**원칙**: 모든 통계 API는 RLS를 통해 `client_id` 범위 밖 데이터를 조회할 수 없어야 합니다.

**검증**:
- `event_id`를 바꿔 호출해도 다른 `client_id`의 이벤트 통계가 나오지 않음
- `client_id`를 바꿔 호출해도 다른 클라이언트의 통계가 나오지 않음

**RLS 정책 예시**:
```sql
-- event_visits RLS (이미 존재)
CREATE POLICY "event_visits_select_own" ON event_visits FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE client_id IN (SELECT my_client_ids())
  ));
```

---

## 7. 테스트 요구사항 (Test Requirements)

### 7.1 기능 테스트

- [ ] Client Dashboard에서 events 기준 KPI/리스트 노출
- [ ] Event Dashboard에서 모듈별 탭(Registration/Marketing/Survey/Email/Webinar) 노출
- [ ] Webinar 탭은 "요약 + 콘솔/통계 링크"만 제공(상세는 별도)
- [ ] UTM/Visit/ShortLink 클릭의 정의가 문서에 고정되고, 화면/API가 그 정의를 따름

### 7.2 보안/RLS 테스트

- [ ] `client_id` 범위 밖 데이터는 어떤 API에서도 조회 불가
- [ ] `event_id`를 바꿔 호출해도 다른 client의 이벤트 통계가 나오지 않음

### 7.3 성능 테스트

- [ ] Overview API는 가벼운 쿼리(카운트/간단 집계)로 제한
- [ ] UTM breakdown 등 무거운 집계는 탭 클릭 시에만 호출
- [ ] Webinar 통계는 라이브 화면 핫패스에 영향을 주지 않음

---

## 8. 참고 문서

- [Phase 10 대시보드 통계 구현 계획](./Phase10_대시보드_통계_구현_계획.md)
- [inev 리빌딩 전체 구현 계획](./inev_리빌딩_전체구현계획.md)
- [대시보드 통계 검토 문서](./대시보드_통계.md)

---

**문서 작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-09
