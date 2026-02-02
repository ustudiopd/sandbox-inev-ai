# DB 구조 및 통합 가능성 분석 보고서

**작성일**: 2026-01-28  
**목적**: 현재 DB 구조 정리 및 "등록-설문 형태로 통합" 제안의 타당성 분석

---

## 📋 요약

**사용자 제안**: "그냥 모든 DB를 등록-설문 형태의 DB로 받으면 해결되는 문제 아닐까?"

**결론**: ✅ **매우 합리적인 제안입니다.** 현재 `event_survey_entries`와 `registrations` 테이블의 구조가 매우 유사하며, 통합하면 마케팅 전환 추적의 일관성을 확보할 수 있습니다.

---

## 🗄️ 현재 데이터베이스 구조

### 1. 전환(Conversion) 저장 테이블 비교

#### 1.1 `event_survey_entries` (캠페인 전환)

**용도**: 캠페인(설문/등록) 참여자 정보 저장

```sql
CREATE TABLE public.event_survey_entries (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES event_survey_campaigns(id),
  agency_id UUID,
  client_id UUID NOT NULL,
  
  -- 기본 정보
  name TEXT,
  company TEXT,
  phone_norm TEXT NOT NULL,  -- 필수: 전화번호 (정규화)
  
  -- 순번 관리
  survey_no INT NOT NULL,  -- 완료 순번 (1부터)
  code6 TEXT NOT NULL,     -- 확인코드 (6자리: 000001)
  
  -- 타임스탬프
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 검증/경품 정보
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  prize_label TEXT,
  prize_recorded_at TIMESTAMPTZ,
  prize_recorded_by UUID,
  
  -- 연결 정보
  form_submission_id UUID REFERENCES form_submissions(id),
  
  -- 상세 등록 정보 (JSONB)
  registration_data JSONB,  -- 이메일, 주소, 동의 정보 등
  
  -- UTM 추적
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  utm_first_visit_at TIMESTAMPTZ,
  utm_referrer TEXT,
  
  -- 마케팅 링크 추적
  marketing_campaign_link_id UUID REFERENCES campaign_link_meta(id),
  
  -- 제약 조건
  UNIQUE(campaign_id, phone_norm),  -- 캠페인별 전화번호 유니크
  UNIQUE(campaign_id, survey_no),   -- 캠페인별 순번 유니크
  UNIQUE(campaign_id, code6)        -- 캠페인별 코드 유니크
);
```

**특징**:
- ✅ `campaign_id`로 캠페인에 연결
- ✅ `phone_norm` 필수 (전화번호 기반 중복 방지)
- ✅ `survey_no`, `code6` 자동 생성
- ✅ UTM 추적 완비
- ✅ `marketing_campaign_link_id` 추적 가능

#### 1.2 `registrations` (웨비나 전환)

**용도**: 웨비나 참여자 등록 정보 저장

```sql
CREATE TABLE public.registrations (
  webinar_id UUID NOT NULL REFERENCES webinars(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- 기본 정보
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'attendee',
  
  -- 순번 관리 (추가됨)
  survey_no INT,   -- 웨비나별 완료 순번
  code6 TEXT,      -- 확인코드 (6자리)
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 등록 출처
  registered_via TEXT DEFAULT 'manual',
  
  -- 상세 등록 정보 (JSONB)
  registration_data JSONB,  -- 이메일, 주소, 동의 정보 등
  
  -- 마케팅 링크 추적 (추가됨)
  marketing_campaign_link_id UUID REFERENCES campaign_link_meta(id),
  
  -- 제약 조건
  PRIMARY KEY (webinar_id, user_id),  -- 웨비나+사용자 유니크
  UNIQUE(webinar_id, survey_no),      -- 웨비나별 순번 유니크
  UNIQUE(webinar_id, code6)           -- 웨비나별 코드 유니크
);
```

**특징**:
- ✅ `webinar_id`로 웨비나에 연결
- ✅ `user_id` 필수 (인증된 사용자)
- ✅ `survey_no`, `code6` 추가됨 (최근)
- ✅ `marketing_campaign_link_id` 추가됨 (최근)
- ❌ UTM 추적 없음 (추가 필요)

---

## 📊 테이블 비교 분석

### 공통점 ✅

| 항목 | event_survey_entries | registrations | 통합 가능성 |
|------|---------------------|---------------|------------|
| **순번 관리** | `survey_no`, `code6` | `survey_no`, `code6` | ✅ 동일 |
| **상세 정보** | `registration_data` (JSONB) | `registration_data` (JSONB) | ✅ 동일 |
| **마케팅 추적** | `marketing_campaign_link_id` | `marketing_campaign_link_id` | ✅ 동일 |
| **기본 정보** | `name`, `company` | `nickname` | ⚠️ 유사 (통합 가능) |
| **타임스탬프** | `completed_at`, `created_at` | `created_at` | ✅ 유사 |

### 차이점 ⚠️

| 항목 | event_survey_entries | registrations | 통합 방안 |
|------|---------------------|---------------|----------|
| **타겟 연결** | `campaign_id` (FK) | `webinar_id` (FK) | ⚠️ 다형성 필요 |
| **사용자 식별** | `phone_norm` (필수) | `user_id` (필수) | ⚠️ 둘 다 nullable로 |
| **UTM 추적** | ✅ 완비 | ❌ 없음 | ✅ 추가 필요 |
| **검증/경품** | ✅ 있음 | ❌ 없음 | ✅ 선택적 필드 |
| **제약 조건** | `(campaign_id, phone_norm)` | `(webinar_id, user_id)` | ⚠️ 다형성 필요 |

---

## 🏗️ 프로젝트 계층 구조

### 1. 데이터 계층 (Database Layer)

```
┌─────────────────────────────────────────────────┐
│           데이터베이스 테이블 구조                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────┐    ┌──────────────────┐ │
│  │ event_survey_    │    │   registrations  │ │
│  │ campaigns        │    │                  │ │
│  │                  │    │  webinar_id (FK) │ │
│  │ id (PK)          │    │  user_id (FK)    │ │
│  │ title            │    │  survey_no       │ │
│  │ public_path      │    │  code6           │ │
│  │ type             │    │  marketing_...   │ │
│  │                  │    │                  │ │
│  └────────┬─────────┘    └────────┬─────────┘ │
│           │                        │           │
│           │                        │           │
│  ┌────────▼─────────┐    ┌────────▼─────────┐ │
│  │ event_survey_    │    │    webinars      │ │
│  │ entries          │    │                  │ │
│  │                  │    │  id (PK)         │ │
│  │ campaign_id (FK) │    │  title           │ │
│  │ phone_norm       │    │  slug            │ │
│  │ survey_no        │    │  registration_   │ │
│  │ code6            │    │    campaign_id   │ │
│  │ marketing_...    │    │                  │ │
│  │                  │    └──────────────────┘ │
│  └──────────────────┘                          │
│                                                 │
│  ┌──────────────────┐                          │
│  │ campaign_link_   │                          │
│  │ meta             │                          │
│  │                  │                          │
│  │ id (PK)          │                          │
│  │ target_type      │  ⚠️ 'campaign'/'webinar'│
│  │ target_campaign_ │                          │
│  │   id (FK)        │                          │
│  │ target_webinar_  │                          │
│  │   id (FK)        │                          │
│  │ cid              │                          │
│  │ utm_*            │                          │
│  └──────────────────┘                          │
└─────────────────────────────────────────────────┘
```

### 2. API 계층 (Application Layer)

```
┌─────────────────────────────────────────────────┐
│              API 엔드포인트 구조                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  캠페인 등록/설문                                │
│  POST /api/public/event-survey/[campaignId]/   │
│    ├─ register  → event_survey_entries         │
│    └─ submit    → event_survey_entries         │
│                                                 │
│  웨비나 등록                                     │
│  POST /api/public/event-survey/[campaignId]/   │
│    └─ register  → registrations (OnePredict)   │
│                                                 │
│  마케팅 링크 관리                                │
│  GET/POST /api/clients/[clientId]/campaigns/   │
│    └─ links     → campaign_link_meta           │
│                                                 │
│  전환 집계                                       │
│  GET /api/clients/[clientId]/campaigns/links    │
│    ├─ 캠페인: event_survey_entries 조회         │
│    └─ 웨비나: registrations 조회 (현재 미지원)  │
└─────────────────────────────────────────────────┘
```

### 3. 비즈니스 로직 계층

**현재 문제점**:
- 캠페인 전환: `event_survey_entries` 테이블 사용
- 웨비나 전환: `registrations` 테이블 사용
- 마케팅 링크 집계: 두 테이블을 분기 처리 필요

**영향**:
- 전환 집계 로직이 복잡함
- UTM 추적이 일관되지 않음
- 마케팅 성과 분석이 어려움

---

## 💡 통합 방안 분석

### 방안 1: `event_survey_entries`로 통합 (권장) ⭐

**개념**: 웨비나 등록도 `event_survey_entries`에 저장

#### 1.1 스키마 수정

```sql
-- event_survey_entries 테이블 확장
ALTER TABLE public.event_survey_entries
  -- 웨비나 연결 추가
  ADD COLUMN webinar_id UUID REFERENCES webinars(id) ON DELETE CASCADE,
  
  -- 사용자 연결 추가 (웨비나는 user_id 필요)
  ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- 타겟 타입 명시
  ADD COLUMN target_type TEXT DEFAULT 'campaign' 
    CHECK (target_type IN ('campaign', 'webinar'));

-- 제약 조건 수정
ALTER TABLE public.event_survey_entries
  DROP CONSTRAINT IF EXISTS uniq_entry_campaign_phone;

-- 새로운 제약 조건: 타겟 타입별 유니크
CREATE UNIQUE INDEX uniq_entry_campaign_phone 
  ON event_survey_entries(campaign_id, phone_norm)
  WHERE campaign_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_entry_webinar_user 
  ON event_survey_entries(webinar_id, user_id)
  WHERE webinar_id IS NOT NULL;

-- 제약 조건: campaign_id 또는 webinar_id 중 하나는 필수
ALTER TABLE public.event_survey_entries
  ADD CONSTRAINT check_target_type_entry
    CHECK (
      (target_type = 'campaign' AND campaign_id IS NOT NULL AND webinar_id IS NULL) OR
      (target_type = 'webinar' AND webinar_id IS NOT NULL AND campaign_id IS NULL)
    );
```

#### 1.2 데이터 마이그레이션

```sql
-- registrations → event_survey_entries 마이그레이션
INSERT INTO public.event_survey_entries (
  webinar_id,
  user_id,
  name,
  company,
  phone_norm,
  survey_no,
  code6,
  completed_at,
  created_at,
  registration_data,
  marketing_campaign_link_id,
  target_type
)
SELECT 
  r.webinar_id,
  r.user_id,
  r.nickname AS name,
  r.registration_data->>'company' AS company,
  COALESCE(
    r.registration_data->>'phone',
    r.registration_data->>'phoneNorm',
    '01000000000'  -- 기본값
  ) AS phone_norm,
  r.survey_no,
  r.code6,
  r.created_at AS completed_at,
  r.created_at,
  r.registration_data,
  r.marketing_campaign_link_id,
  'webinar' AS target_type
FROM public.registrations r
WHERE r.survey_no IS NOT NULL  -- 순번이 있는 등록만 (최근 등록)
ON CONFLICT DO NOTHING;
```

#### 1.3 API 수정

```typescript
// 웨비나 등록 API 수정
// POST /api/public/event-survey/[campaignId]/register

// OnePredict 웨비나 등록 시
const { data: entry, error } = await admin
  .from('event_survey_entries')
  .insert({
    webinar_id: onePredictWebinar.id,
    user_id: profile.id,
    target_type: 'webinar',
    name: name.trim(),
    company: company?.trim() || null,
    phone_norm: phoneNorm || '01000000000',  // 기본값
    survey_no: surveyNo,
    code6: code6,
    registration_data: cleanedRegistrationData,
    marketing_campaign_link_id: resolvedMarketingCampaignLinkId,
    // UTM 파라미터 추가
    utm_source: normalizedUTM.utm_source || null,
    utm_medium: normalizedUTM.utm_medium || null,
    // ...
  })
```

#### 1.4 전환 집계 단순화

```typescript
// GET /api/clients/[clientId]/campaigns/links
// 모든 전환을 event_survey_entries에서 조회

const { count } = await admin
  .from('event_survey_entries')
  .select('*', { count: 'exact', head: true })
  .eq('marketing_campaign_link_id', link.id)
```

**장점**:
- ✅ 단일 테이블로 전환 추적
- ✅ UTM 추적 일관성 확보
- ✅ 마케팅 성과 분석 단순화
- ✅ 코드 복잡도 감소

**단점**:
- ⚠️ 기존 `registrations` 테이블과의 호환성 문제
- ⚠️ 마이그레이션 필요
- ⚠️ 기존 웨비나 기능과의 통합 필요

### 방안 2: `registrations`에 UTM 추가 (임시)

**개념**: `registrations` 테이블에 UTM 필드 추가, 두 테이블 병행 사용

**장점**:
- ✅ 최소한의 변경
- ✅ 기존 구조 유지

**단점**:
- ❌ 여전히 두 테이블 분기 처리 필요
- ❌ 전환 집계 로직 복잡도 유지
- ❌ 근본적 해결책 아님

### 방안 3: 새로운 통합 테이블 생성 (장기)

**개념**: `conversions` 같은 새로운 통합 테이블 생성

**장점**:
- ✅ 깔끔한 구조
- ✅ 확장성 좋음

**단점**:
- ❌ 대규모 마이그레이션 필요
- ❌ 기존 코드 대량 수정 필요
- ❌ 리스크 높음

---

## 🎯 권장 사항

### 단기 (즉시 적용 가능)

1. **`event_survey_entries`에 `webinar_id`, `user_id` 추가**
   - 웨비나 등록도 `event_survey_entries`에 저장
   - `target_type`으로 구분

2. **`registrations`에 UTM 필드 추가**
   - 기존 웨비나 등록도 UTM 추적 가능하도록

3. **전환 집계 API 통합**
   - `event_survey_entries`에서만 조회하도록 수정

### 중기 (1-2주)

1. **데이터 마이그레이션**
   - 기존 `registrations` 데이터를 `event_survey_entries`로 이동
   - `registrations`는 읽기 전용으로 전환

2. **API 통합**
   - 모든 등록/설문 API가 `event_survey_entries` 사용하도록 수정

### 장기 (향후)

1. **`registrations` 테이블 폐기 검토**
   - 모든 전환이 `event_survey_entries`로 통합되면
   - `registrations`는 웨비나 참여자 관리용으로만 사용

---

## 📝 결론

**사용자 제안의 타당성**: ✅ **매우 합리적**

**핵심 포인트**:
1. `event_survey_entries`와 `registrations`의 구조가 매우 유사함
2. 통합하면 마케팅 전환 추적의 일관성 확보 가능
3. 코드 복잡도 감소 및 유지보수성 향상

**다음 단계**:
1. `event_survey_entries`에 `webinar_id`, `user_id` 컬럼 추가
2. 웨비나 등록 API를 `event_survey_entries` 사용하도록 수정
3. 전환 집계 API를 단일 테이블 조회로 통합
4. 기존 `registrations` 데이터 마이그레이션

**예상 효과**:
- ✅ 마케팅 링크 전환 추적 일관성 확보
- ✅ 코드 복잡도 감소
- ✅ 유지보수성 향상
- ✅ 향후 확장 용이

---

**작성자**: AI Assistant  
**검토 필요**: 데이터 마이그레이션 계획 수립
