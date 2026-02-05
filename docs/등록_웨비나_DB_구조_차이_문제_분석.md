# 등록 DB와 웨비나 DB 구조 차이로 인한 문제 분석

**작성일**: 2026년 2월 5일

---

## 문제 상황

jubileo@naver.com 사용자가:
1. **이메일 안내 링크**를 타고 와서 등록한 경우
2. **직접 입력**해서 웨비나에 입장한 경우

이 두 가지를 구분할 수 없는 문제가 발생했습니다.

---

## 현재 DB 구조

### 1. 등록 시스템 (캠페인 기반)

```
event_survey_campaigns (캠페인)
  ↓
event_survey_entries (등록 기록)
  - campaign_id: 캠페인 ID
  - utm_source, utm_medium, utm_campaign: UTM 파라미터 저장
  - marketing_campaign_link_id: 마케팅 링크 ID
  - registration_data: { email, name, ... }
```

**특징**:
- 캠페인(`event_survey_campaigns`) 중심
- 등록 시점에 UTM 정보 저장
- 이메일 기반 추적

---

### 2. 웨비나 시스템 (웨비나 기반)

```
webinars (웨비나)
  ↓
registrations (웨비나 등록) 또는
webinar_live_presence (입장 추적)
  - webinar_id: 웨비나 ID
  - user_id: 사용자 ID
  - joined_at, last_seen_at: 입장 시간
```

**특징**:
- 웨비나(`webinars`) 중심
- UTM 정보 저장 안 함
- 사용자 ID 기반 추적

---

### 3. 방문 로그 시스템 (하이브리드)

```
event_access_logs (방문 로그)
  - campaign_id: 캠페인 ID (nullable)
  - webinar_id: 웨비나 ID (nullable)
  - session_id: 세션 ID
  - utm_source, utm_medium, utm_campaign: UTM 파라미터
  - converted_at: 전환 시간 (등록 완료 시)
  - entry_id: 등록 기록 ID (nullable)
```

**특징**:
- 캠페인 또는 웨비나 모두 지원
- 세션 기반 추적
- UTM 정보 저장

---

## 연결 구조

### `registration_campaign_id` 연결

```sql
webinars
  ├─ registration_campaign_id → event_survey_campaigns.id
  └─ (웨비나와 등록 캠페인 연결)
```

**예시**:
- 149402 웨비나 → `registration_campaign_id` = 149403 캠페인

---

## 문제점 분석

### 1. UTM 추적이 분리되어 있음

**등록 시점**:
- UTM 정보가 `event_survey_entries`에 저장됨
- 캠페인 기반으로 저장

**웨비나 입장 시점**:
- UTM 정보가 `event_access_logs`에 저장됨 (webinar_id로)
- 웨비나 기반으로 저장

**문제**:
- 등록과 웨비나 입장이 다른 테이블에 저장됨
- 같은 사용자라도 두 시스템이 분리되어 있어 연결 어려움

---

### 2. 세션 연결이 불완전함

**현재 구현**:
```typescript
// 등록 API에서 session_id로 Visit 연결 시도
if (session_id && entry?.id) {
  await admin
    .from('event_access_logs')
    .update({
      converted_at: new Date().toISOString(),
      entry_id: entry.id,
    })
    .eq('campaign_id', campaignId)
    .eq('session_id', session_id)
}
```

**문제**:
- `campaign_id`로만 연결 시도
- 웨비나 입장 시 `webinar_id`로 저장된 방문 기록은 연결 안 됨
- `session_id`가 없으면 연결 불가

---

### 3. jubileo@naver.com 사례

**등록 기록** (`event_survey_entries`):
- 등록 시점: 2026-01-25 14:51:44
- `utm_source`: null
- `utm_medium`: null
- `utm_campaign`: null
- `marketing_campaign_link_id`: null

**웨비나 입장 기록** (`webinar_live_presence`):
- 마지막 입장: 2026-02-04 05:26:16
- UTM 정보 없음 (테이블에 컬럼 없음)

**방문 기록** (`event_access_logs`):
- UTM 파라미터가 있는 방문 기록 다수 존재
- 하지만 등록 시점의 방문 기록과 연결 안 됨

**결론**: 등록 시점에 UTM 정보가 저장되지 않아 유입 경로 구분 불가

---

## 근본 원인

### 1. 이중 구조

**등록 시스템**:
- 캠페인(`event_survey_campaigns`) 중심
- 등록 기록: `event_survey_entries`
- UTM 추적: 등록 시점에만 저장

**웨비나 시스템**:
- 웨비나(`webinars`) 중심
- 입장 추적: `webinar_live_presence`
- UTM 추적: 없음 (방문 로그에만 있음)

**연결점**:
- `registration_campaign_id`로 연결되지만, UTM 추적은 분리됨

---

### 2. 세션 기반 추적의 한계

**현재 방식**:
- `session_id`로 방문 기록과 등록 기록 연결
- 하지만 `session_id`가 없으면 연결 불가
- 웨비나 직접 입장 시 `session_id`가 다를 수 있음

---

### 3. UTM 정보 전달 경로

**등록 페이지**:
1. URL에서 UTM 파라미터 추출
2. localStorage에 저장
3. 등록 API 호출 시 전달
4. `event_survey_entries`에 저장

**웨비나 입장 페이지**:
1. URL에서 UTM 파라미터 추출
2. Visit API 호출 시 `event_access_logs`에 저장 (webinar_id로)
3. 하지만 `webinar_live_presence`에는 저장 안 됨

**문제**:
- 등록과 웨비나 입장이 다른 경로로 UTM을 저장
- 연결이 어려움

---

## 해결 방안

### 방안 1: 웨비나 입장 시 등록 캠페인의 UTM 정보 사용

**개선점**:
- 웨비나 입장 시 `registration_campaign_id`가 있으면 해당 캠페인의 방문 기록에서 UTM 정보 가져오기
- 같은 세션의 최초 방문 기록에서 UTM 정보 복원

**구현**:
```typescript
// 웨비나 입장 시
if (webinar.registration_campaign_id) {
  // 같은 세션의 캠페인 방문 기록에서 UTM 정보 가져오기
  const { data: visitLog } = await admin
    .from('event_access_logs')
    .select('utm_source, utm_medium, utm_campaign, cid')
    .eq('campaign_id', webinar.registration_campaign_id)
    .eq('session_id', sessionId)
    .order('accessed_at', { ascending: true })
    .limit(1)
    .single()
  
  // UTM 정보를 webinar_live_presence에 저장 (테이블 확장 필요)
}
```

---

### 방안 2: `webinar_live_presence`에 UTM 정보 추가

**개선점**:
- `webinar_live_presence` 테이블에 UTM 컬럼 추가
- 웨비나 입장 시 UTM 정보 저장

**마이그레이션**:
```sql
ALTER TABLE webinar_live_presence
  ADD COLUMN utm_source TEXT,
  ADD COLUMN utm_medium TEXT,
  ADD COLUMN utm_campaign TEXT,
  ADD COLUMN cid TEXT,
  ADD COLUMN marketing_campaign_link_id UUID;
```

**장점**:
- 웨비나 입장 시점의 UTM 정보 직접 저장
- 등록과 웨비나 입장 모두 추적 가능

---

### 방안 3: 등록 시점에 방문 기록과 강제 연결

**개선점**:
- 등록 시점에 이메일로 방문 기록 찾기
- 같은 캠페인의 최근 방문 기록에서 UTM 정보 복원

**구현**:
```typescript
// 등록 API에서
if (!utm_source && normalizedRegistrationData?.email) {
  // 같은 캠페인의 최근 방문 기록에서 UTM 정보 찾기
  // (이메일 기반 매칭은 어려우므로, 세션 기반으로만 가능)
  
  // 또는 등록 시점의 방문 기록을 강제로 찾아서 연결
  const { data: recentVisit } = await admin
    .from('event_access_logs')
    .select('utm_source, utm_medium, utm_campaign, cid')
    .eq('campaign_id', campaignId)
    .eq('session_id', session_id)
    .order('accessed_at', { ascending: false })
    .limit(1)
    .single()
  
  if (recentVisit) {
    // UTM 정보 복원
    utm_source = recentVisit.utm_source
    utm_medium = recentVisit.utm_medium
    // ...
  }
}
```

---

### 방안 4: 통합 추적 테이블 생성 (장기)

**개선점**:
- 사용자별 통합 추적 테이블 생성
- 등록, 웨비나 입장 모두 추적

**테이블 설계**:
```sql
CREATE TABLE user_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  user_id UUID,
  session_id TEXT NOT NULL,
  
  -- 이벤트 타입
  event_type TEXT NOT NULL, -- 'visit', 'registration', 'webinar_entry', 'webinar_exit'
  
  -- 대상
  campaign_id UUID,
  webinar_id UUID,
  
  -- UTM 정보
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  cid TEXT,
  marketing_campaign_link_id UUID,
  
  -- 메타데이터
  referrer TEXT,
  user_agent TEXT,
  
  -- 타임스탬프
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 연결
  entry_id UUID REFERENCES event_survey_entries(id),
  registration_id UUID REFERENCES registrations(id)
);
```

**장점**:
- 모든 이벤트를 한 곳에서 추적
- 사용자별 전체 여정 추적 가능
- UTM 정보 일관성 보장

---

## 권장 해결 방안

### 단기 (즉시 적용 가능)

**방안 2: `webinar_live_presence`에 UTM 정보 추가**

1. 마이그레이션으로 UTM 컬럼 추가
2. 웨비나 입장 API에서 UTM 정보 저장
3. 기존 데이터는 `event_access_logs`에서 복원 (선택적)

**장점**:
- 빠른 구현 가능
- 웨비나 입장 시점의 UTM 정보 직접 저장
- 기존 구조 최소 변경

---

### 중기 (점진적 개선)

**방안 1 + 방안 3 조합**

1. 등록 시점에 방문 기록과 강제 연결
2. 웨비나 입장 시 등록 캠페인의 UTM 정보 사용
3. 세션 기반 추적 강화

**장점**:
- 기존 데이터 복원 가능
- 점진적 개선 가능

---

### 장기 (구조적 개선)

**방안 4: 통합 추적 테이블**

1. `user_tracking_events` 테이블 생성
2. 모든 이벤트를 통합 추적
3. 기존 테이블과 병행 운영 후 마이그레이션

**장점**:
- 근본적 해결
- 확장성 좋음
- 사용자 여정 전체 추적 가능

---

## 결론

**현재 문제**:
- 등록 DB(`event_survey_entries`)와 웨비나 DB(`webinar_live_presence`)가 분리되어 있음
- UTM 추적이 각각 다른 테이블에 저장됨
- 연결이 어려워 유입 경로 구분 불가

**해결 방향**:
1. **단기**: `webinar_live_presence`에 UTM 정보 추가
2. **중기**: 세션 기반 추적 강화 및 UTM 정보 복원
3. **장기**: 통합 추적 테이블로 구조 개선

**우선순위**:
- 방안 2 (웨비나 입장 시 UTM 저장)가 가장 빠르고 효과적
