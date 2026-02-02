# UTM 추적 시스템 구현 완료 보고서

**작성일**: 2026-01-28  
**버전**: v1.0  
**구현 범위**: Phase 1, Phase 2, Phase 3 완료

---

## 📋 목차

1. [개요](#개요)
2. [구현 완료 현황](#구현-완료-현황)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [데이터 모델](#데이터-모델)
5. [API 명세](#api-명세)
6. [클라이언트 구현](#클라이언트-구현)
7. [대시보드 기능](#대시보드-기능)
8. [사용 가이드](#사용-가이드)
9. [기술 스택](#기술-스택)

---

## 개요

### 목적

이벤트/웨비나 캠페인의 마케팅 성과를 추적하기 위한 UTM 파라미터 기반 추적 시스템을 구현했습니다. 유입(Visit)부터 전환(Conversion)까지의 전체 여정을 추적하고, 전환율(CVR)을 계산하여 마케팅 채널별 성과를 분석할 수 있습니다.

### 주요 기능

- ✅ **UTM 파라미터 추적**: utm_source, utm_medium, utm_campaign, utm_term, utm_content 추적
- ✅ **캠페인 링크 관리**: 템플릿 기반 UTM 링크 자동 생성 및 관리
- ✅ **CID 기반 추적**: 8자리 고유 식별자로 링크 추적
- ✅ **Visit 추적**: 세션 기반 유입 로그 수집
- ✅ **전환 추적**: 등록/제출 시 UTM 파라미터 자동 저장
- ✅ **성과 분석**: Visits, Conversions, CVR 집계 및 대시보드 제공

---

## 구현 완료 현황

### ✅ Phase 1: UTM 저장 + Conversions 중심 대시보드

**상태**: 완료 (100%)

**구현 내용**:
- UTM 파라미터 추출/정규화 유틸리티 (`lib/utils/utm.ts`)
- 워트 리다이렉트 UTM pass-through
- DB 마이그레이션: `event_survey_entries`에 UTM 컬럼 추가
- 공개 페이지에서 UTM 캡처 (서버→클라이언트 props + localStorage)
- submit/register API에 UTM 저장
- 광고/캠페인 대시보드 구현 (`/client/[clientId]/campaigns`)
- RPC 함수: `get_marketing_summary`

**결과물**:
- 전환 데이터에 UTM 파라미터 저장 완료
- UTM별 전환 집계 대시보드 제공

---

### ✅ Phase 2: 캠페인 링크 관리 기능

**상태**: 완료 (100%)

**구현 내용**:
- DB 마이그레이션: `campaign_link_meta` 테이블 생성
- `cid` 필드 추가 (8자리 Base32/Alnum)
- `start_date` 필드 추가
- 링크 생성/수정/삭제 API
- 템플릿 기반 UTM 자동 생성 UI (`CampaignLinksTab.tsx`)
- `cid` 자동 발급 및 중복 체크
- 공유용/광고용 URL 동시 출력 (share_url, campaign_url)
- `cid` 기반 전환 추적 (submit/register API)
- 링크별 전환 집계

**결과물**:
- 운영자가 쉽게 UTM 링크 생성 및 관리 가능
- 생성된 링크와 전환 데이터 자동 연결

---

### ✅ Phase 3: Visits/CVR 추적 및 유입 로그

**상태**: 완료 (100%)

**구현 내용**:
- DB 마이그레이션: `event_access_logs` 테이블 생성
- 공개 Visit 수집 API (`/api/public/campaigns/[campaignId]/visit`)
- 클라이언트 Visit 수집 로직 (RegistrationPage, SurveyPage)
- 전환 시 Visit과 연결 (converted_at, entry_id 업데이트)
- Visits/CVR 집계 RPC 함수 (`get_marketing_visits_summary`, `get_marketing_cvr_summary`)
- 대시보드에 Visits/CVR 추가

**결과물**:
- 유입부터 전환까지 전체 여정 추적
- 전환율(CVR) 계산 및 표시
- 세션별 첫 방문만 집계 (dedup)

---

## 시스템 아키텍처

### 전체 흐름도

```
[마케팅 채널]
    ↓
[UTM 링크 생성] (Phase 2)
    ↓
[사용자 클릭]
    ↓
[공개 페이지 접속] → [Visit 로그 수집] (Phase 3)
    ↓
[UTM 파라미터 캡처] (Phase 1)
    ↓
[localStorage 저장]
    ↓
[등록/제출] → [전환 저장] (Phase 1)
    ↓
[Visit과 연결] (Phase 3)
    ↓
[대시보드 집계] (Phase 1, 2, 3)
```

### 컴포넌트 구조

```
lib/utils/
├── utm.ts          # UTM 파라미터 추출/정규화
├── cid.ts          # CID 생성/검증
└── session.ts      # 세션 관리 (Phase 3)

app/api/
├── public/
│   ├── campaigns/[campaignId]/visit/          # Visit 수집 (Phase 3)
│   └── event-survey/[campaignId]/
│       ├── register/                          # 등록 API (UTM 저장)
│       └── submit/                            # 제출 API (UTM 저장)
└── clients/[clientId]/campaigns/
    ├── summary/                               # 집계 API
    └── links/                                 # 링크 관리 API (Phase 2)

app/(client)/client/[clientId]/campaigns/
├── page.tsx                                   # 대시보드 페이지
└── components/
    ├── CampaignsPageClient.tsx                # 메인 컴포넌트
    └── CampaignLinksTab.tsx                   # 링크 관리 UI (Phase 2)

app/event/[...path]/components/
├── RegistrationPage.tsx                       # 등록 페이지 (Visit 수집)
└── SurveyPage.tsx                             # 설문 페이지 (Visit 수집)
```

---

## 데이터 모델

### 1. event_survey_entries (전환 데이터)

**Phase 1에서 추가된 컬럼**:
```sql
utm_source text
utm_medium text
utm_campaign text
utm_term text
utm_content text
utm_first_visit_at timestamptz
utm_referrer text
marketing_campaign_link_id uuid  -- Phase 2: 링크 연결
```

**용도**: 등록/제출 시 UTM 파라미터와 링크 정보 저장

---

### 2. campaign_link_meta (캠페인 링크 메타데이터)

**Phase 2에서 생성된 테이블**:
```sql
id uuid PRIMARY KEY                    -- marketing_campaign_link_id로 사용
client_id uuid NOT NULL
name text NOT NULL                     -- 운영자 이름
target_campaign_id uuid NOT NULL       -- 전환 타겟 캠페인
landing_variant text                   -- welcome/register/survey
cid text                               -- 8자리 고유 식별자
utm_source text
utm_medium text
utm_campaign text
utm_term text
utm_content text
start_date date                        -- 광고 시작일
status text DEFAULT 'active'           -- active/paused/archived
created_at timestamptz
updated_at timestamptz
```

**용도**: 운영자가 생성한 UTM 링크 관리

---

### 3. event_access_logs (유입 로그)

**Phase 3에서 생성된 테이블**:
```sql
id uuid PRIMARY KEY
campaign_id uuid NOT NULL
session_id text NOT NULL               -- 익명 세션 ID (cookie 기반)
utm_source text
utm_medium text
utm_campaign text
utm_term text
utm_content text
marketing_campaign_link_id uuid        -- 링크 연결
referrer text
user_agent text                        -- 옵션
ip_address text                        -- 옵션
accessed_at timestamptz                -- 접속 시각
converted_at timestamptz               -- 전환 시각 (nullable)
entry_id uuid                          -- 전환된 entry ID (nullable)
```

**용도**: Visit 추적 및 CVR 계산

---

## API 명세

### 1. Visit 수집 API (Phase 3)

**엔드포인트**: `POST /api/public/campaigns/[campaignId]/visit`

**요청 본문**:
```json
{
  "session_id": "uuid-string",
  "utm_source": "newsletter",
  "utm_medium": "email",
  "utm_campaign": "january_2026",
  "cid": "X5L2G9KV",
  "referrer": "https://example.com",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1"
}
```

**응답**:
```json
{
  "success": true,
  "message": "Visit logged successfully"
}
```

**특징**:
- session_id 기반 중복 방지 (5분 내 중복 스킵)
- graceful 실패 (실패해도 페이지 정상 동작)

---

### 2. 링크 생성 API (Phase 2)

**엔드포인트**: `POST /api/clients/[clientId]/campaigns/links`

**요청 본문**:
```json
{
  "name": "26년 1월 뉴스레터",
  "target_campaign_id": "uuid",
  "landing_variant": "register",
  "utm_source": "newsletter",
  "utm_medium": "email",
  "utm_campaign": "auto-generated-slug",
  "utm_term": null,
  "utm_content": null,
  "start_date": "2026-01-16"
}
```

**응답**:
```json
{
  "id": "uuid",
  "name": "26년 1월 뉴스레터",
  "cid": "X5L2G9KV",
  "share_url": "https://eventflow.kr/event/149403?cid=X5L2G9KV",
  "campaign_url": "https://eventflow.kr/event/149403?cid=X5L2G9KV&utm_source=newsletter&utm_medium=email&utm_campaign=...",
  "created_at": "2026-01-28T..."
}
```

---

### 3. 집계 API

**엔드포인트**: `GET /api/clients/[clientId]/campaigns/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

**응답**:
```json
{
  "total_conversions": 150,
  "total_visits": 500,
  "cvr": 30.0,
  "conversions_by_source": [
    { "source": "newsletter", "count": 50 },
    { "source": "google", "count": 30 }
  ],
  "visits_by_source": [
    { "source": "newsletter", "count": 200 },
    { "source": "google", "count": 150 }
  ],
  "cvr_by_source": [
    {
      "source": "newsletter",
      "visits": 200,
      "conversions": 50,
      "cvr": 25.0
    }
  ],
  "date_range": {
    "from": "2026-01-01",
    "to": "2026-01-28"
  }
}
```

---

## 클라이언트 구현

### 1. UTM 파라미터 캡처

**서버 컴포넌트** (`app/event/[...path]/page.tsx`):
```typescript
const searchParamsData = await searchParams
const utmParams = extractUTMParams(searchParamsData)
return <RegistrationPage campaign={campaign} utmParams={utmParams} />
```

**클라이언트 컴포넌트** (`RegistrationPage.tsx`):
```typescript
useEffect(() => {
  if (Object.keys(utmParams).length > 0) {
    const utmData = {
      ...utmParams,
      captured_at: new Date().toISOString(),
      first_visit_at: existingData?.first_visit_at || new Date().toISOString(),
    }
    localStorage.setItem(`utm:${campaign.id}`, JSON.stringify(utmData))
  }
}, [campaign.id, utmParams])
```

---

### 2. Visit 수집 (Phase 3)

**구현 위치**: `RegistrationPage.tsx`, `SurveyPage.tsx`

```typescript
useEffect(() => {
  const sessionId = getOrCreateSessionId('ef_session_id', 30)
  const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
  const utmData = storedUTM ? JSON.parse(storedUTM) : {}
  
  fetch(`/api/public/campaigns/${campaign.id}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      ...utmData,
      referrer: document.referrer,
    }),
  }).catch(() => {}) // graceful failure
}, [campaign.id])
```

---

### 3. 전환 시 UTM 전달

**등록/제출 시**:
```typescript
const storedUTM = localStorage.getItem(`utm:${campaign.id}`)
const utmData = storedUTM ? JSON.parse(storedUTM) : {}
const sessionId = getOrCreateSessionId('ef_session_id', 30)

fetch(`/api/public/event-survey/${campaign.id}/register`, {
  method: 'POST',
  body: JSON.stringify({
    name, phone, ...,
    ...utmData,
    cid: searchParams.get('cid'),
    session_id: sessionId, // Visit 연결용
  }),
})
```

---

## 대시보드 기능

### KPI 카드

1. **전체 Visits**: 세션별 첫 방문만 집계
2. **전체 전환 수**: 등록/제출 완료 수
3. **전환율 (CVR)**: Visits 대비 Conversions 비율

### 집계 테이블

1. **Source별 집계**: utm_source별 Visits, Conversions, CVR
2. **Medium별 집계**: utm_medium별 Visits, Conversions, CVR
3. **Campaign별 집계**: utm_campaign별 Visits, Conversions, CVR
4. **링크별 집계**: 생성된 링크별 Visits, Conversions, CVR

### 링크 관리 탭

- 링크 생성: 템플릿 선택 → 자동 UTM 생성 → CID 발급
- 링크 목록: 생성된 링크, 전환 수, 상태 관리
- 링크 수정/삭제: UTM 파라미터 수정, 일시정지/재개

---

## 사용 가이드

### 1. 캠페인 링크 생성

1. `/client/[clientId]/campaigns` 페이지 접속
2. "캠페인 링크" 탭 선택
3. "새 링크 생성" 클릭
4. 템플릿 선택 (뉴스레터, 문자/카카오, 구글 광고 등)
5. 링크 이름 입력 (utm_campaign 자동 생성)
6. 전환 타겟 선택
7. 랜딩 위치 선택 (welcome/register/survey)
8. 생성 버튼 클릭

**결과**:
- 공유용 URL: `https://eventflow.kr/event/149403?cid=X5L2G9KV` (짧음)
- 광고용 URL: `https://eventflow.kr/event/149403?cid=X5L2G9KV&utm_source=...&utm_medium=...&utm_campaign=...` (UTM 포함)

---

### 2. 링크 배포

**뉴스레터/이메일**:
- 광고용 URL 사용 (UTM 포함)
- 이메일 본문에 링크 삽입

**문자/카카오톡**:
- 공유용 URL 사용 (CID만, 짧음)
- 문자 메시지에 링크 삽입

**구글/메타 광고**:
- 광고용 URL 사용 (UTM 포함)
- 광고 플랫폼에 최종 URL 입력

---

### 3. 성과 확인

1. `/client/[clientId]/campaigns` 페이지 접속
2. 날짜 범위 선택
3. "조회" 버튼 클릭

**확인 가능한 데이터**:
- 전체 Visits, Conversions, CVR
- Source별/Medium별/Campaign별 집계
- 링크별 집계
- CVR 비교 분석

---

## 기술 스택

### 백엔드

- **데이터베이스**: PostgreSQL (Supabase)
- **API**: Next.js API Routes
- **인증**: Supabase Auth (RLS)
- **집계**: PostgreSQL RPC 함수

### 프론트엔드

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **상태 관리**: React Hooks (useState, useEffect)

### 주요 라이브러리

- `@supabase/supabase-js`: Supabase 클라이언트
- `@supabase/ssr`: Supabase SSR 지원

---

## 보안 고려사항

### 1. RLS (Row Level Security)

- `event_access_logs`: 공개 INSERT 허용, 클라이언트 스코프 SELECT
- `campaign_link_meta`: 클라이언트 멤버만 조회/수정 가능
- `event_survey_entries`: 클라이언트 스코프 강제

### 2. 데이터 수집

- IP 주소, User Agent는 옵션 (기본 미수집)
- session_id는 익명 UUID (개인정보 미포함)
- 쿠키 TTL: 30분 (세션 만료)

### 3. Graceful Failure

- Visit 수집 실패해도 페이지 정상 동작
- UTM 저장 실패해도 등록/제출 성공 처리
- 모든 오류는 로그만 남기고 사용자 경험에 영향 없음

---

## 성능 최적화

### 1. 인덱스

- `event_access_logs`: campaign_id, session_id, accessed_at 복합 인덱스
- `campaign_link_meta`: client_id, cid 유니크 인덱스
- `event_survey_entries`: campaign_id, utm_source, utm_medium, utm_campaign 복합 인덱스

### 2. 집계 최적화

- RPC 함수로 DB 레벨 집계
- 세션별 첫 방문만 집계 (dedup)
- JSONB로 집계 결과 반환

### 3. 클라이언트 최적화

- Visit 수집은 비동기 처리 (페이지 로딩 블로킹 없음)
- localStorage로 UTM 캐싱
- 쿠키 기반 세션 관리

---

## 향후 개선 사항

### Phase 4 (예정)

- 타임시리즈 차트 (Visits/Conversions 추이)
- 실시간 대시보드 업데이트
- CSV 내보내기 기능
- 고급 필터링 (UTM 조합별 필터)

### 기타

- A/B 테스트 지원 (utm_content 활용)
- 멀티 터치 어트리뷰션
- 채널별 ROI 계산

---

## 참고 문서

- [광고캠페인 모듈 명세서 v1.1 패치](./광고캠페인_모듈_명세서_v1.1_패치.md)
- [광고캠페인 UTM 명세서](./광고캠페인_UTM)
- [Phase 1 실행 체크리스트](./광고캠페인_모듈_Phase1_실행체크리스트.md)
- [Phase 2 구현 상태 체크리스트](./Phase2_구현_상태_체크리스트.md)

---

**작성자**: AI Assistant  
**최종 수정일**: 2026-01-28  
**버전**: v1.0
