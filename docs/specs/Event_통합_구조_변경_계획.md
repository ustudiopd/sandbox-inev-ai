# Event 통합 구조 변경 계획

**작성일**: 2026년 2월 5일  
**목적**: 등록/설문/웨비나/온디맨드를 Event 단위로 통합

---

## 현재 구조

### 현재 상태

```
설문DB (event_survey_campaigns)
  ├─ type: 'survey' (설문조사)
  └─ type: 'registration' (등록 페이지)

웨비나DB (webinars)
  ├─ type: null 또는 'live' (라이브 웨비나)
  └─ type: 'ondemand' (온디맨드 웨비나)
```

**문제점**:
- 등록/설문과 웨비나/온디맨드가 분리된 테이블
- UTM 추적이 각각 다른 테이블에 저장
- 연결이 어려워 유입 경로 구분 불가

---

## 목표 구조

### 통합 원칙

**Event가 최상위 단위**:
- `event_survey_campaigns`를 Event의 최상위 단위로 사용
- UTM 정보는 Event 레벨에서 관리
- 모듈별 기능은 Event의 하위 모듈로 구현

### 새로운 구조

```
Event (event_survey_campaigns) - 최상위 단위
  ├─ UTM 정보 (utm_source, utm_medium, utm_campaign, cid 등)
  ├─ 마케팅 링크 정보 (marketing_campaign_link_id)
  ├─ 등록 정보 (event_survey_entries)
  │
  └─ 모듈별 기능:
     1. event(등록) - 등록만 진행
     2. event(등록) - 설문
     3. event(등록) - 웨비나
     4. event(등록) - 온디맨드
```

---

## 구조 설계

### 1. Event 테이블 확장 (`event_survey_campaigns`)

#### 현재 컬럼
```sql
event_survey_campaigns
  - id
  - agency_id
  - client_id
  - title
  - public_path
  - status
  - type: 'survey' | 'registration'
  - form_id
  - welcome_schema
  - completion_schema
  - display_schema
  - next_survey_no
  - created_by
  - created_at
  - updated_at
```

#### 확장 계획

**1.1 type 컬럼 확장**
```sql
-- 기존: type IN ('survey', 'registration')
-- 변경: type IN ('registration', 'survey', 'webinar', 'ondemand')

ALTER TABLE event_survey_campaigns
  DROP CONSTRAINT IF EXISTS event_survey_campaigns_type_check;

ALTER TABLE event_survey_campaigns
  ADD CONSTRAINT event_survey_campaigns_type_check 
  CHECK (type IN ('registration', 'survey', 'webinar', 'ondemand'));
```

**1.2 모듈별 설정을 위한 JSONB 컬럼 추가**
```sql
ALTER TABLE event_survey_campaigns
  ADD COLUMN IF NOT EXISTS module_config JSONB DEFAULT '{}'::jsonb;

-- 예시:
-- type='webinar'인 경우: module_config = { "webinar_id": "uuid", "youtube_url": "...", ... }
-- type='ondemand'인 경우: module_config = { "ondemand_id": "uuid", "sessions": [...], ... }
-- type='survey'인 경우: module_config = { "form_id": "uuid", ... }
-- type='registration'인 경우: module_config = {}
```

**1.3 UTM 정보를 Event 레벨로 이동 (선택적)**
```sql
-- 현재는 event_survey_entries에만 있음
-- Event 레벨로도 추가하여 기본 UTM 정보 관리

ALTER TABLE event_survey_campaigns
  ADD COLUMN IF NOT EXISTS default_utm_source TEXT,
  ADD COLUMN IF NOT EXISTS default_utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS default_utm_campaign TEXT;
```

---

### 2. 웨비나 테이블과의 연결

#### 현재 연결 방식
```sql
webinars
  - registration_campaign_id → event_survey_campaigns.id
```

#### 변경 계획

**옵션 A: 웨비나를 Event의 모듈로 통합**
```sql
-- webinars 테이블에 event_id 추가
ALTER TABLE webinars
  ADD COLUMN event_id UUID REFERENCES event_survey_campaigns(id) ON DELETE CASCADE;

-- 기존 registration_campaign_id는 유지 (하위 호환성)
-- event_id가 있으면 event_survey_campaigns.type = 'webinar' 또는 'ondemand'
```

**옵션 B: 웨비나 정보를 Event의 module_config에 저장**
```sql
-- webinars 테이블은 유지하되, event_survey_campaigns.module_config에 참조 저장
-- event_survey_campaigns.module_config = { "webinar_id": "uuid", ... }
```

**권장**: 옵션 A (명시적 FK 관계)

---

### 3. 모듈별 타입 정의

#### 3.1 Event Type 정의

| Type | 설명 | 모듈 설정 |
|------|------|----------|
| `registration` | 등록만 진행 | `module_config: {}` |
| `survey` | 설문조사 | `module_config: { "form_id": "uuid" }` |
| `webinar` | 라이브 웨비나 | `module_config: { "webinar_id": "uuid" }` 또는 `webinars.event_id` |
| `ondemand` | 온디맨드 웨비나 | `module_config: { "ondemand_id": "uuid" }` 또는 `webinars.event_id` |

---

### 4. 데이터 마이그레이션 계획

#### 4.1 기존 웨비나를 Event로 변환

```sql
-- 1. 기존 웨비나별로 Event 생성
INSERT INTO event_survey_campaigns (
  agency_id,
  client_id,
  title,
  public_path,
  status,
  type,
  module_config,
  created_by,
  created_at,
  updated_at
)
SELECT 
  w.agency_id,
  w.client_id,
  w.title,
  '/webinar/' || w.slug, -- 또는 기존 public_path
  'published',
  CASE 
    WHEN w.type = 'ondemand' THEN 'ondemand'
    ELSE 'webinar'
  END,
  jsonb_build_object('webinar_id', w.id),
  w.created_by,
  w.created_at,
  w.updated_at
FROM webinars w;

-- 2. webinars 테이블에 event_id 추가
ALTER TABLE webinars
  ADD COLUMN event_id UUID REFERENCES event_survey_campaigns(id) ON DELETE CASCADE;

-- 3. event_id 업데이트 (public_path로 매칭)
UPDATE webinars w
SET event_id = (
  SELECT e.id 
  FROM event_survey_campaigns e 
  WHERE e.public_path = '/webinar/' || w.slug
  LIMIT 1
);
```

---

## API 구조 변경

### 1. Event 기반 API

#### 현재
```
POST /api/public/event-survey/[campaignId]/register
POST /api/public/campaigns/[campaignId]/visit
GET /api/webinars/[webinarId]/access/track
```

#### 변경 후
```
POST /api/public/events/[eventId]/register  (통합)
POST /api/public/events/[eventId]/visit    (통합)
POST /api/public/events/[eventId]/modules/webinar/enter  (모듈별)
POST /api/public/events/[eventId]/modules/ondemand/watch  (모듈별)
```

---

### 2. 모듈별 라우팅

#### 웨비나 모듈
```typescript
// Event가 webinar 타입인 경우
if (event.type === 'webinar') {
  const webinarId = event.module_config?.webinar_id
  // 웨비나 로직 실행
}
```

#### 온디맨드 모듈
```typescript
// Event가 ondemand 타입인 경우
if (event.type === 'ondemand') {
  const ondemandId = event.module_config?.ondemand_id
  // 온디맨드 로직 실행
}
```

---

## UTM 추적 통합

### 현재 문제
- 등록: `event_survey_entries`에 UTM 저장
- 웨비나 입장: UTM 저장 안 됨
- 방문 로그: `event_access_logs`에 있지만 연결 어려움

### 통합 후
- **Event 레벨에서 UTM 관리**
- 모든 모듈(등록/설문/웨비나/온디맨드)이 같은 Event의 UTM 정보 사용
- `event_access_logs`에서 `event_id`로 통합 추적

---

## 마이그레이션 단계

### Phase 1: Event 테이블 확장
1. `event_survey_campaigns.type` 확장 ('webinar', 'ondemand' 추가)
2. `module_config` JSONB 컬럼 추가
3. `webinars.event_id` 컬럼 추가

### Phase 2: 기존 웨비나 마이그레이션
1. 기존 웨비나별로 Event 생성
2. `webinars.event_id` 업데이트
3. 기존 `registration_campaign_id`와 병행 운영

### Phase 3: API 통합
1. Event 기반 API로 통합
2. 모듈별 라우팅 로직 추가
3. 기존 API는 deprecated로 표시

### Phase 4: UTM 추적 통합
1. Event 레벨 UTM 정보 저장
2. 모든 모듈이 Event의 UTM 사용
3. `event_access_logs`에서 `event_id`로 통합

### Phase 5: 정리
1. `registration_campaign_id` 제거 (선택적)
2. 기존 API 제거
3. 문서 업데이트

---

## 장점

### 1. UTM 추적 통합
- Event 레벨에서 UTM 관리
- 모든 모듈이 같은 UTM 정보 사용
- 유입 경로 추적 일관성

### 2. 구조 단순화
- 단일 Event 단위로 모든 기능 관리
- 모듈별 분기만으로 처리 가능
- 코드 중복 감소

### 3. 확장성
- 새로운 모듈 추가 용이
- Event 기반 통계 집계 가능
- 마케팅 캠페인 관리 용이

---

## 주의사항

### 1. 하위 호환성
- 기존 `registration_campaign_id` 유지 필요
- 기존 API는 deprecated로 표시 후 단계적 제거
- 기존 데이터 마이그레이션 필수

### 2. 성능
- `module_config` JSONB 쿼리 최적화 필요
- 인덱스 추가 고려
- 쿼리 패턴 분석 필요

### 3. 복잡도
- 모듈별 분기 로직 증가
- 테스트 범위 확대 필요
- 문서화 중요

---

## 다음 단계

1. **현재 구조 분석 완료** ✅
2. **마이그레이션 스크립트 작성**
3. **API 통합 설계**
4. **테스트 계획 수립**
5. **단계적 배포 계획**
