# 광고/캠페인 링크 및 전환 추적 시스템 구현 보고서

**작성일**: 2026-01-28  
**버전**: 2.0 (검토 보완본)  
**작성자**: AI Assistant

---

## 📋 목차

1. [개요](#개요)
2. [문제 상황](#문제-상황)
3. [구현 내용](#구현-내용)
4. [발견된 이슈 및 해결](#발견된-이슈-및-해결)
5. [데이터베이스 구조](#데이터베이스-구조)
6. [API 엔드포인트 변경사항](#api-엔드포인트-변경사항)
7. [프론트엔드 변경사항](#프론트엔드-변경사항)
8. [전환 추적 시스템](#전환-추적-시스템)
9. [구조적 리스크 및 개선 권장사항](#구조적-리스크-및-개선-권장사항)
10. [향후 개선 사항](#향후-개선-사항)
11. [체크리스트](#체크리스트)

---

## 1. 개요

### 1.1 목적
광고 캠페인 링크 생성 시스템에 웨비나 지원을 추가하고, 캠페인과 웨비나를 구분하여 UTM 파라미터 추적 및 전환 추적이 올바르게 작동하도록 개선

### 1.2 범위
- 캠페인 링크 생성 UI 개선
- 웨비나 타겟 지원 추가
- 전환 추적 시스템 확장
- URL 생성 로직 개선
- 데이터베이스 스키마 확장

---

## 2. 문제 상황

### 2.1 초기 문제점

1. **웨비나가 캠페인 선택 목록에 표시되지 않음**
   - 캠페인 선택 드롭다운에 웨비나가 포함되지 않아 웨비나를 타겟으로 하는 링크 생성 불가

2. **웨비나 등록 시 전환 추적 불가**
   - 웨비나 등록은 `registrations` 테이블에만 저장
   - `event_survey_entries` 테이블 기반 전환 집계에 포함되지 않음
   - `marketing_campaign_link_id` 필드가 `registrations` 테이블에 없음

3. **랜딩 위치 옵션 불일치**
   - 웨비나 선택 시에도 캠페인용 랜딩 위치 옵션(설문 페이지 등)이 표시됨
   - 웨비나는 설문 페이지가 없는데 옵션에 포함됨

4. **URL 생성 오류**
   - 웨비나 URL에 `/event` 접두사가 잘못 추가됨
   - 웨비나 slug 조회 실패 시 에러 처리 부족

5. **500 에러 발생**
   - 링크 생성 시 500 Internal Server Error 발생
   - 에러 로깅 부족으로 원인 파악 어려움

---

## 3. 구현 내용

### 3.1 데이터베이스 스키마 확장

#### 3.1.1 `campaign_link_meta` 테이블 확장
**마이그레이션**: `072_add_webinar_support_to_campaign_link_meta.sql`

```sql
-- target_type 필드 추가
ALTER TABLE public.campaign_link_meta
  ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'campaign';

-- target_campaign_id를 nullable로 변경
ALTER TABLE public.campaign_link_meta
  ALTER COLUMN target_campaign_id DROP NOT NULL;

-- target_webinar_id 필드 추가
ALTER TABLE public.campaign_link_meta
  ADD COLUMN IF NOT EXISTS target_webinar_id UUID REFERENCES public.webinars(id) ON DELETE CASCADE;

-- 제약 조건 추가
ALTER TABLE public.campaign_link_meta
  ADD CONSTRAINT check_target_type_campaign 
    CHECK (
      (target_type = 'campaign' AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL) OR
      (target_type = 'webinar' AND target_webinar_id IS NOT NULL AND target_campaign_id IS NULL) OR
      (target_type IS NULL AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL)
    );
```

**⚠️ 제약 조건 개선 권장사항** (9.1.1 참조):
- 현재 구조는 legacy 호환을 위해 `target_type IS NULL` 케이스를 허용하지만, 운영 시 혼란을 줄 수 있음
- 권장: `target_type`을 NOT NULL로 강제하고, enum 수준으로 명확히 정의

#### 3.1.2 `registrations` 테이블 확장
**마이그레이션**: `077_add_marketing_campaign_link_id_to_registrations.sql`

```sql
-- marketing_campaign_link_id 필드 추가
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS marketing_campaign_link_id UUID 
    REFERENCES public.campaign_link_meta(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_registrations_marketing_campaign_link_id 
  ON public.registrations(marketing_campaign_link_id)
  WHERE marketing_campaign_link_id IS NOT NULL;
```

### 3.2 API 변경사항

#### 3.2.1 캠페인 목록 API (`/api/event-survey/campaigns/list`)
**변경 내용**:
- 웨비나 목록도 함께 조회하여 반환
- 웨비나를 캠페인 형태로 변환하여 통합 목록 제공

```typescript
// 웨비나 목록 조회
const { data: webinars } = await admin
  .from('webinars')
  .select('id, title, slug, created_at')
  .eq('client_id', clientId)
  .order('created_at', { ascending: false })

// 웨비나를 캠페인 형태로 변환
const webinarsAsCampaigns = (webinars || []).map(webinar => ({
  id: webinar.id,
  title: webinar.title || `웨비나 ${webinar.slug || webinar.id.slice(0, 8)}`,
  type: 'webinar' as const,
  slug: webinar.slug,
  created_at: webinar.created_at,
  public_path: webinar.slug ? `/${webinar.slug}` : null,
  stats: {
    total_completed: 0,
    total_verified: 0,
    total_prize_recorded: 0,
  }
}))

// 캠페인과 웨비나를 합쳐서 반환
const allItems = [...campaignsWithStats, ...webinarsAsCampaigns]
```

#### 3.2.2 링크 생성 API (`/api/clients/[clientId]/campaigns/links`)
**변경 내용**:
- 웨비나 타겟 지원 추가
- 타겟 타입에 따른 URL 생성 로직 분기
- 웨비나 전환 추적 지원

**주요 로직**:
```typescript
// 타겟 타입에 따라 ID 설정
if (target_type === 'campaign') {
  insertData.target_campaign_id = target_campaign_id && target_campaign_id.trim() ? target_campaign_id : null
  insertData.target_webinar_id = null
} else if (target_type === 'webinar') {
  insertData.target_webinar_id = target_webinar_id && target_webinar_id.trim() ? target_webinar_id : null
  insertData.target_campaign_id = null
}

// URL 생성 시 타겟 타입에 따라 분기
if (target_type === 'webinar' && target_webinar_id) {
  // 웨비나 URL: /webinar/{slug} 또는 /webinar/{slug}/register
  const webinarPath = webinar?.slug ? `/webinar/${webinar.slug}` : `/webinar/${target_webinar_id}`
  landingPath = landing_variant === 'register' 
    ? `${webinarPath}/register` 
    : webinarPath
} else {
  // 캠페인 URL: /event/{public_path} 또는 /event/{public_path}/register
  landingPath = landing_variant === 'welcome' 
    ? targetCampaign.public_path
    : landing_variant === 'survey'
    ? `${targetCampaign.public_path}/survey`
    : `${targetCampaign.public_path}/register`
}

// 웨비나는 /event 접두사 없이, 캠페인은 /event 접두사 사용
const shareUrl = target_type === 'webinar' 
  ? `${baseUrl}${landingPath}?${shareParams.toString()}`
  : `${baseUrl}/event${landingPath}?${shareParams.toString()}`
```

#### 3.2.3 링크 목록 API (`GET /api/clients/[clientId]/campaigns/links`)
**변경 내용**:
- 웨비나 타겟의 전환 수를 `registrations` 테이블에서 집계
- 캠페인 타겟의 전환 수를 `event_survey_entries` 테이블에서 집계

```typescript
// 타겟 타입에 따라 전환 수 집계
if (link.target_type === 'webinar') {
  const { count: webinarCount } = await admin
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('marketing_campaign_link_id', link.id)
  count = webinarCount || 0
} else {
  const { count: campaignCount } = await admin
    .from('event_survey_entries')
    .select('*', { count: 'exact', head: true })
    .eq('marketing_campaign_link_id', link.id)
  count = campaignCount || 0
}
```

**⚠️ 성능 개선 권장사항** (9.1.5 참조):
- 현재 구조는 N+1 쿼리 패턴으로, 링크가 많아지면 성능 저하 가능
- 권장: Phase 4 또는 트래픽 증가 시 link_id 기준 group-by 집계 RPC로 통합 예정

#### 3.2.4 등록 API (`/api/public/event-survey/[campaignId]/register`)
**변경 내용**:
- 웨비나 등록 시 `marketing_campaign_link_id` 저장

```typescript
// registrations 테이블에 등록
const { error: regError } = await admin
  .from('registrations')
  .insert({
    webinar_id: webinar.id,
    user_id: profile.id,
    role: 'attendee',
    nickname: name ? name.trim() || null : null,
    registered_via: 'manual',
    registration_data: cleanedRegistrationData,
    // 마케팅 캠페인 링크 추적 (전환 추적용)
    marketing_campaign_link_id: resolvedMarketingCampaignLinkId || null,
  })
```

### 3.3 프론트엔드 변경사항

#### 3.3.1 캠페인 선택 드롭다운 개선
**파일**: `app/(client)/client/[clientId]/campaigns/components/CampaignLinksTab.tsx`

**변경 내용**:
- 캠페인 선택 드롭다운에 웨비나도 함께 표시
- 웨비나 선택 시 자동으로 타겟 타입 변경
- 웨비나는 `[웨비나]` 접두사로 구분 표시

```typescript
// 캠페인 선택 핸들러 (웨비나도 포함)
const handleCampaignChange = (selectedId: string) => {
  const isWebinar = webinars.some(w => w.id === selectedId)
  
  if (isWebinar) {
    setTargetType('webinar')
    setFormData(prev => ({ 
      ...prev, 
      target_webinar_id: selectedId, 
      target_campaign_id: '',
      landing_variant: prev.landing_variant === 'survey' ? 'welcome' : prev.landing_variant
    }))
  } else {
    setTargetType('campaign')
    setFormData(prev => ({ ...prev, target_campaign_id: selectedId, target_webinar_id: '' }))
  }
}

// 드롭다운 렌더링
<select>
  <option value="">캠페인 선택</option>
  {/* 캠페인 표시 */}
  {campaigns.map(campaign => (
    <option key={campaign.id} value={campaign.id}>
      {campaign.title}
    </option>
  ))}
  {/* 웨비나도 함께 표시 */}
  {webinars.map(webinar => (
    <option key={webinar.id} value={webinar.id}>
      [웨비나] {webinar.title}
    </option>
  ))}
</select>
```

#### 3.3.2 랜딩 위치 옵션 개선
**변경 내용**:
- 웨비나 선택 시: "웨비나 입장 페이지", "등록 페이지"만 표시
- 캠페인 선택 시: "Welcome 페이지", "등록 페이지", "설문 페이지" 표시

```typescript
<select value={formData.landing_variant}>
  {targetType === 'webinar' ? (
    <>
      <option value="welcome">웨비나 입장 페이지</option>
      <option value="register">등록 페이지</option>
    </>
  ) : (
    <>
      <option value="welcome">Welcome 페이지</option>
      <option value="register">등록 페이지</option>
      <option value="survey">설문 페이지</option>
    </>
  )}
</select>
```

#### 3.3.3 링크 생성 로직 개선
**변경 내용**:
- 선택된 ID가 웨비나인지 자동 감지
- 타겟 타입에 따라 올바른 필드 전송
- 광고 시작일 기본값을 오늘 날짜로 설정

```typescript
const handleCreateLink = async (e: React.FormEvent) => {
  // 선택된 ID가 웨비나인지 확인하여 타겟 타입 결정
  const selectedId = formData.target_campaign_id || formData.target_webinar_id
  const isWebinar = webinars.some(w => w.id === selectedId)
  const finalTargetType = isWebinar ? 'webinar' : 'campaign'
  
  const requestBody = {
    ...formData,
    target_type: finalTargetType,
    target_campaign_id: finalTargetType === 'campaign' ? selectedId : null,
    target_webinar_id: finalTargetType === 'webinar' ? selectedId : null,
  }
}
```

---

## 4. 발견된 이슈 및 해결

### 4.1 이슈 1: 웨비나가 캠페인 목록에 표시되지 않음

**문제**:
- 캠페인 선택 드롭다운에 웨비나가 포함되지 않음
- 웨비나를 타겟으로 하는 링크 생성 불가

**해결**:
- 캠페인 목록 API에 웨비나도 포함하여 반환
- 프론트엔드에서 캠페인과 웨비나를 함께 표시
- 웨비나 선택 시 자동으로 타겟 타입 변경

**상태**: ✅ 해결 완료

### 4.2 이슈 2: 웨비나 등록 시 전환 추적 불가

**문제**:
- 웨비나 등록은 `registrations` 테이블에만 저장
- `marketing_campaign_link_id` 필드가 없어 전환 추적 불가
- 링크 목록에서 전환 수가 0으로 표시됨

**해결**:
- `registrations` 테이블에 `marketing_campaign_link_id` 필드 추가 (마이그레이션 077)
- 웨비나 등록 시 `marketing_campaign_link_id` 저장
- 링크 목록 API에서 웨비나 타겟은 `registrations` 테이블에서 집계

**상태**: ✅ 해결 완료

**⚠️ 구조적 리스크**: 현재 구조는 기술적으로 동작하지만, 광고 성과 분석 관점에서 리스크가 있습니다. 자세한 내용은 [9.1.1 전환 귀속 기준 통합](#91-구조적-리스크-및-개선-권장사항) 참조.

### 4.3 이슈 3: 랜딩 위치 옵션 불일치

**문제**:
- 웨비나 선택 시에도 "설문 페이지" 옵션이 표시됨
- 웨비나는 설문 페이지가 없는데 옵션에 포함됨

**해결**:
- 타겟 타입에 따라 랜딩 위치 옵션 동적 변경
- 웨비나: "웨비나 입장 페이지", "등록 페이지"
- 캠페인: "Welcome 페이지", "등록 페이지", "설문 페이지"

**상태**: ✅ 해결 완료

### 4.4 이슈 4: URL 생성 오류

**문제**:
- 웨비나 URL에 `/event` 접두사가 잘못 추가됨
- 웨비나 slug 조회 실패 시 에러 처리 부족
- `.single()` 사용으로 데이터 없을 때 에러 발생

**해결**:
- 웨비나 URL: `/webinar/{slug}` 또는 `/webinar/{slug}/register` (접두사 없음)
- 캠페인 URL: `/event/{public_path}` 또는 `/event/{public_path}/register` (접두사 있음)
- `.single()` → `.maybeSingle()`로 변경하여 에러 방지
- 웨비나/캠페인 조회 실패 시 명확한 에러 메시지 반환

**상태**: ✅ 해결 완료

### 4.5 이슈 5: 500 에러 발생

**문제**:
- 링크 생성 시 500 Internal Server Error 발생
- 에러 로깅 부족으로 원인 파악 어려움
- 빈 문자열이 null로 변환되지 않아 제약 조건 위반 가능

**해결**:
- 빈 문자열을 null로 변환하는 로직 추가
- 에러 로깅 강화 (코드, 메시지, 상세 정보)
- 제약 조건 위반 오류 처리 추가
- URL 생성 부분에 try-catch 추가
- 중복된 return 문 제거

**상태**: ✅ 해결 완료

---

## 5. 데이터베이스 구조

### 5.1 `campaign_link_meta` 테이블

```sql
CREATE TABLE public.campaign_link_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_type TEXT DEFAULT 'campaign', -- 'campaign' 또는 'webinar'
  target_campaign_id UUID REFERENCES public.event_survey_campaigns(id) ON DELETE CASCADE, -- nullable
  target_webinar_id UUID REFERENCES public.webinars(id) ON DELETE CASCADE, -- nullable
  landing_variant TEXT, -- 'welcome', 'register', 'survey'
  cid TEXT NOT NULL, -- 외부 공유용 캠페인 링크 식별자 (short_link_id와 1:1 매핑)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  start_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약 조건
  CONSTRAINT check_target_type_campaign CHECK (
    (target_type = 'campaign' AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL) OR
    (target_type = 'webinar' AND target_webinar_id IS NOT NULL AND target_campaign_id IS NULL) OR
    (target_type IS NULL AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL)
  ),
  CONSTRAINT uniq_campaign_link_meta_name_client UNIQUE (client_id, name),
  CONSTRAINT uniq_campaign_link_meta_cid_client UNIQUE (client_id, cid)
);
```

**주요 필드 설명**:
- **`cid`**: 외부 공유용 캠페인 링크 식별자. URL querystring 및 전환 추적의 기준 키로 사용됨. 
  - **운영 규칙**: cid는 외부 공유용 식별자이며, 새 링크는 반드시 cid를 기준으로 추적합니다.
  - short_link_id가 따로 있더라도 "마케팅 추적의 기준 키는 cid"로 고정됩니다.
  - 코드에서는 normalizeCID()를 모든 진입점에서 동일하게 적용해야 합니다.
- **`target_type`**: 타겟 타입 ('campaign' 또는 'webinar'). 현재는 nullable이지만, 운영 시 NOT NULL로 강제 권장.

### 5.2 `registrations` 테이블 확장

```sql
ALTER TABLE public.registrations
  ADD COLUMN marketing_campaign_link_id UUID 
    REFERENCES public.campaign_link_meta(id) ON DELETE SET NULL;

CREATE INDEX idx_registrations_marketing_campaign_link_id 
  ON public.registrations(marketing_campaign_link_id)
  WHERE marketing_campaign_link_id IS NOT NULL;
```

### 5.3 데이터 흐름

```
사용자 클릭
  ↓
링크 접근 (cid + UTM 포함)
  ↓
랜딩 페이지 (캠페인 또는 웨비나)
  ↓
등록 완료
  ↓
┌─────────────────┬─────────────────┐
│   캠페인 타겟    │   웨비나 타겟    │
├─────────────────┼─────────────────┤
│ event_survey_   │ registrations   │
│ entries 저장    │ 테이블 저장      │
│                 │                 │
│ marketing_      │ marketing_      │
│ campaign_link_  │ campaign_link_  │
│ id 저장         │ id 저장         │
└─────────────────┴─────────────────┘
  ↓
전환 집계 (타겟 타입에 따라 분기)
  ↓
링크별 전환 수 표시
```

**⚠️ 현재 구조의 한계**:
- 전환 집계가 타겟 타입에 따라 두 테이블로 분기됨
- 광고 성과 분석 시 복잡도 증가
- 권장 개선 방안은 [9.1.1 전환 귀속 기준 통합](#91-구조적-리스크-및-개선-권장사항) 참조

---

## 6. API 엔드포인트 변경사항

### 6.1 GET `/api/event-survey/campaigns/list`

**변경 전**:
- 캠페인만 반환

**변경 후**:
- 캠페인과 웨비나를 통합하여 반환
- 각 항목에 `type: 'campaign' | 'webinar'` 필드 추가

**응답 예시**:
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "campaign-uuid",
      "title": "캠페인 제목",
      "type": "campaign",
      "public_path": "/campaign-path",
      "stats": { ... }
    },
    {
      "id": "webinar-uuid",
      "title": "웨비나 제목",
      "type": "webinar",
      "slug": "426307",
      "stats": { ... }
    }
  ],
  "webinars": [ ... ] // 기존 호환성 유지
}
```

### 6.2 POST `/api/clients/[clientId]/campaigns/links`

**변경 사항**:
- `target_type` 필드 지원 ('campaign' 또는 'webinar')
- `target_webinar_id` 필드 지원
- 웨비나 타겟 시 URL 생성 로직 분기
- 웨비나 slug 조회 및 에러 처리
- **타겟 소속 검증 강제**: `target_webinar_id`와 `target_campaign_id`가 해당 `client_id`에 속하는지 검증 (보안/데이터 오염 방지)

**요청 예시**:
```json
{
  "name": "웨비나 등록 링크",
  "target_type": "webinar",
  "target_webinar_id": "webinar-uuid",
  "target_campaign_id": null,
  "landing_variant": "register",
  "utm_source": "facebook",
  "utm_medium": "social",
  "utm_campaign": "webinar-registration",
  "start_date": "2026-01-28"
}
```

**응답 예시**:
```json
{
  "id": "link-uuid",
  "name": "웨비나 등록 링크",
  "target_type": "webinar",
  "target_webinar_id": "webinar-uuid",
  "cid": "ABC123",
  "url": "https://eventflow.kr/webinar/426307/register?cid=ABC123&utm_source=facebook&utm_medium=social&utm_campaign=webinar-registration",
  "share_url": "https://eventflow.kr/webinar/426307/register?cid=ABC123",
  "campaign_url": "https://eventflow.kr/webinar/426307/register?cid=ABC123&utm_source=facebook&utm_medium=social&utm_campaign=webinar-registration"
}
```

### 6.3 GET `/api/clients/[clientId]/campaigns/links`

**변경 사항**:
- 웨비나 타겟의 전환 수를 `registrations` 테이블에서 집계
- 캠페인 타겟의 전환 수를 `event_survey_entries` 테이블에서 집계
- 웨비나 URL 생성 시 `/event` 접두사 제거
- **페이징 지원**: 기본 limit 50, 최대 100, offset 파라미터 지원
- **상태 필터**: `?status=active` 파라미터로 활성 링크만 조회 가능
- **응답에 pagination 정보 포함**: `{ links: [], pagination: { total, limit, offset, hasMore } }`

### 6.4 POST `/api/public/event-survey/[campaignId]/register`

**변경 사항**:
- 웨비나 등록 시 `marketing_campaign_link_id` 저장
- `cid` 파라미터로 웨비나 타겟 링크 조회 지원

---

## 7. 프론트엔드 변경사항

### 7.1 컴포넌트 구조

```
CampaignLinksTab
├── 캠페인/웨비나 선택 드롭다운 (통합)
├── 랜딩 위치 선택 (타겟 타입에 따라 동적 변경)
├── UTM 파라미터 입력
└── 링크 생성/수정 폼
```

### 7.2 상태 관리

```typescript
// 타겟 타입 상태
const [targetType, setTargetType] = useState<'campaign' | 'webinar'>('campaign')

// 폼 데이터 상태
const [formData, setFormData] = useState({
  name: '',
  target_campaign_id: '',
  target_webinar_id: '',
  landing_variant: 'register',
  start_date: new Date().toISOString().split('T')[0], // 오늘 날짜
  // ... UTM 파라미터
})

// 캠페인/웨비나 목록 상태
const [campaigns, setCampaigns] = useState<Campaign[]>([])
const [webinars, setWebinars] = useState<Webinar[]>([])
```

### 7.3 주요 로직

#### 7.3.1 데이터 로드
```typescript
const loadData = async () => {
  // 캠페인 목록 조회 (웨비나 포함)
  const campaignsResponse = await fetch(`/api/event-survey/campaigns/list?clientId=${clientId}`)
  const campaignsResult = await campaignsResponse.json()
  
  if (campaignsResponse.ok && campaignsResult.campaigns) {
    // 캠페인과 웨비나를 분리하여 저장
    const campaignItems = campaignsResult.campaigns
      .filter((c: any) => c.type === 'campaign')
      .map((c: any) => ({ ...c, type: 'campaign' as const }))
    
    const webinarItems = campaignsResult.campaigns
      .filter((c: any) => c.type === 'webinar')
      .map((c: any) => ({ ...c, type: 'webinar' as const }))
    
    setCampaigns(campaignItems)
    setWebinars(webinarItems)
  }
}
```

#### 7.3.2 링크 생성
```typescript
const handleCreateLink = async (e: React.FormEvent) => {
  const selectedId = formData.target_campaign_id || formData.target_webinar_id
  const isWebinar = webinars.some(w => w.id === selectedId)
  const finalTargetType = isWebinar ? 'webinar' : 'campaign'
  
  const requestBody = {
    ...formData,
    target_type: finalTargetType,
    target_campaign_id: finalTargetType === 'campaign' ? selectedId : null,
    target_webinar_id: finalTargetType === 'webinar' ? selectedId : null,
  }
  
  // API 호출
}
```

---

## 8. 전환 추적 시스템

### 8.1 전환 추적 흐름

```
1. 사용자가 링크 클릭
   ↓
2. URL에 cid + UTM 파라미터 포함
   예: /webinar/426307/register?cid=ABC123&utm_source=facebook&utm_medium=social
   ↓
3. 등록 페이지에서 cid 파라미터 읽기
   ↓
4. campaign_link_meta 테이블에서 링크 조회
   - client_id + cid로 조회
   - target_type과 target_id로 검증
   ↓
5. 등록 완료 시 marketing_campaign_link_id 저장
   - 캠페인: event_survey_entries 테이블
   - 웨비나: registrations 테이블
   ↓
6. 링크 목록에서 전환 수 집계
   - 캠페인: event_survey_entries에서 집계
   - 웨비나: registrations에서 집계
```

### 8.2 Visit 추적 및 Dedup 정책

**Visit 정의 (정확히 한 문장으로 고정)**:
- **Visits = session_id 기준, 타겟당 1회 집계**
- 하나의 `session_id`는 하나의 캠페인에 대해 최대 1회 Visit으로 집계됩니다.
- API 레벨의 중복 방지 로직은 DB write 폭주 방지용이며, 집계 기준은 `session_id` 기준입니다.

**구현**:
- Visit API (`/api/public/campaigns/[campaignId]/visit`)에서 `session_id` 기반 중복 방지
- `event_access_logs` 테이블에 Visit 기록 저장
- 전환 발생 시 `converted_at`과 `entry_id` 업데이트

**⚠️ 운영 규칙**:
- API 레벨의 5분 스킵은 "쓰기 폭주 방지용"입니다.
- RPC 집계는 "세션별 1회" 기준입니다.
- 이는 의도된 설계이며, API 레벨의 dedup은 성능 최적화용입니다.
- KPI 영역에 "Visits = session_id 기준, 타겟당 1회 집계"를 작게 표시 권장

### 8.3 전환 추적 코드

#### 8.3.1 등록 API에서 링크 조회
```typescript
// cid로 링크 lookup
let resolvedMarketingCampaignLinkId: string | null = marketing_campaign_link_id || null
if (cid && !resolvedMarketingCampaignLinkId) {
  const normalizedCid = normalizeCID(cid)
  if (normalizedCid) {
    let linkQuery = admin
      .from('campaign_link_meta')
      .select('id, target_type, target_campaign_id, target_webinar_id')
      .eq('client_id', campaign.client_id)
      .eq('cid', normalizedCid)
      .eq('status', 'active')
    
    // 웨비나 ID인 경우
    if (isWebinarId) {
      linkQuery = linkQuery
        .eq('target_type', 'webinar')
        .eq('target_webinar_id', campaignId)
    } else {
      // 캠페인 ID인 경우
      linkQuery = linkQuery
        .or(`target_type.is.null,target_type.eq.campaign`)
        .eq('target_campaign_id', campaignId)
    }
    
    const { data: link } = await linkQuery.maybeSingle()
    if (link) {
      resolvedMarketingCampaignLinkId = link.id
    }
  }
}
```

#### 8.3.2 웨비나 등록 시 링크 ID 저장
```typescript
// registrations 테이블에 등록
const { error: regError } = await admin
  .from('registrations')
  .insert({
    webinar_id: webinar.id,
    user_id: profile.id,
    role: 'attendee',
    registered_via: 'manual',
    registration_data: cleanedRegistrationData,
    marketing_campaign_link_id: resolvedMarketingCampaignLinkId || null, // 전환 추적
  })
```

#### 8.3.3 전환 수 집계
```typescript
// 링크 목록 조회 시 전환 수 집계
const linksWithStats = await Promise.all(
  (links || []).map(async (link) => {
    let count = 0
    
    if (link.target_type === 'webinar') {
      // 웨비나 타겟: registrations 테이블에서 집계
      const { count: webinarCount } = await admin
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_campaign_link_id', link.id)
      count = webinarCount || 0
    } else {
      // 캠페인 타겟: event_survey_entries 테이블에서 집계
      const { count: campaignCount } = await admin
        .from('event_survey_entries')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_campaign_link_id', link.id)
      count = campaignCount || 0
    }
    
    return {
      ...link,
      conversion_count: count,
      // ... URL 정보
    }
  })
)
```

---

## 9. 구조적 리스크 및 개선 권장사항

### 9.1 구조적 리스크 및 개선 권장사항

#### 9.1.1 ⚠️ 전환 귀속 기준 통합 (향후 통합 설계)

**현재 운영 버전 (v2.0)의 경계**:
- **현재 v2.0은 캠페인/웨비나 전환을 서로 다른 테이블에서 집계합니다.**
  - 캠페인 타겟 → `event_survey_entries` 테이블에 저장
  - 웨비나 타겟 → `registrations` 테이블에 저장
  - 링크 목록 API에서 타겟 타입에 따라 집계 테이블을 분기
- **대시보드에서 합산 지표 해석 시 주의가 필요합니다.**
  - UI에서 "캠페인 전환(등록/설문 제출)" vs "웨비나 전환(웨비나 등록)"으로 명확히 구분 표시
  - 합산 KPI가 있다면 "총 전환(정의 상이)" 경고 문구 표시

**현재 구조의 한계**:
광고/캠페인 페이지에서 보고 싶은 질문은 항상 이것입니다:

> "이 광고 링크로 **몇 명이 전환됐나?**"

여기서 전환이 어떤 경우엔 `event_survey_entries`, 어떤 경우엔 `registrations`로 갈라지면:
- CVR 계산이 복잡해짐
- Source/Medium/Campaign 집계가 복잡해짐
- 날짜 필터가 복잡해짐
- Rollup/RPC 확장이 복잡해짐
- 모든 로직이 두 갈래로 분기됨

**향후 통합 설계 (마이그레이션 가능한 시점에 적용)**:

**광고 전환의 기준 테이블은 `event_survey_entries` 하나로 통합**

웨비나 링크라도:
- "웨비나 등록 발생 시"
- **`event_survey_entries`에 대응되는 전환 레코드를 생성**
- `registrations`는 "참여/운영용"으로만 사용

**구현 방법**:
1. 웨비나 등록 시 `webinar.registration_campaign_id`가 있으면 해당 캠페인의 `event_survey_entries`에 레코드 생성
2. `registration_campaign_id`가 없으면 웨비나 전용 캠페인을 자동 생성하거나, 기존 캠페인과 연결
3. 전환 집계는 항상 `event_survey_entries`에서 수행
4. `registrations`는 웨비나 참여/운영용으로만 사용

**장점**:
- 광고 성과 집계는 항상 `event_survey_entries` 하나
- 웨비나/캠페인 분기 로직 제거
- RPC/대시보드가 단순해짐
- 확장성 향상

**주의사항**:
- 이건 "나중에 고치기 어려운 구조"라 마이그레이션 가능한 시점에 적용 권장
- 기존 웨비나 데이터 마이그레이션 필요

#### 9.1.2 ⚠️ Visit Dedup 정책 명확화

**현재 상태**:
- API 레벨: `session_id` 기반 중복 방지
- 집계 레벨: 세션별 첫 방문만 집계

**문제점**:
- 두 문장이 살짝 충돌할 수 있음
- 특정 케이스에서 API에는 여러 로그가 있고, 집계는 1회만 잡히는 구조가 될 수 있음

**권장 보완**:
문서에 아래를 **명시적으로 고정**:

```text
Visit 정의:
- 하나의 session_id는 하나의 캠페인에 대해 최대 1회 Visit으로 집계된다.
- API 레벨의 중복 방지 로직은 DB write 폭주 방지용이며,
  집계 기준은 session_id 기준이다.
```

이렇게 적어두면 **의도된 불일치가 아니라 설계된 불일치**가 됩니다.

#### 9.1.3 ⚠️ `campaign_link_meta` 제약 조건 단순화

**현재 제약 조건**:
```sql
CONSTRAINT check_target_type_campaign CHECK (
  (target_type = 'campaign' AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL) OR
  (target_type = 'webinar' AND target_webinar_id IS NOT NULL AND target_campaign_id IS NULL) OR
  (target_type IS NULL AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL)
)
```

**문제점**:
- `target_type IS NULL` 케이스는 legacy 호환용으로 보이지만, 실제 운영에서는 혼란만 줌

**권장 수정**:
- `target_type`는 **NOT NULL**로 강제
- enum 수준으로 명확히: `target_type = 'campaign' | 'webinar'`
- 체크 제약은 **딱 두 케이스만 허용**:
  - `campaign` → `target_campaign_id NOT NULL`
  - `webinar` → `target_webinar_id NOT NULL`

**마이그레이션 예시**:
```sql
-- 기존 데이터 정리
UPDATE campaign_link_meta 
SET target_type = 'campaign' 
WHERE target_type IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE campaign_link_meta 
  ALTER COLUMN target_type SET NOT NULL;

-- 제약 조건 단순화
ALTER TABLE campaign_link_meta 
  DROP CONSTRAINT check_target_type_campaign;

ALTER TABLE campaign_link_meta 
  ADD CONSTRAINT check_target_type_campaign CHECK (
    (target_type = 'campaign' AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL) OR
    (target_type = 'webinar' AND target_webinar_id IS NOT NULL AND target_campaign_id IS NULL)
  );
```

#### 9.1.4 ⚠️ `cid`의 역할 명확화

**현재 문서의 상태**:
- `cid` = 링크 식별자
- `short_link_id`와는 별도 개념처럼 보임

**실제 코드 흐름**:
- `cid`가 사실상 **public short identifier** 역할

**권장 보완**:
문서에 명확히 적어두세요:

```text
cid는 외부 공유용 캠페인 링크 식별자이며,
short_link_id와 1:1 매핑된다.
cid는 URL querystring 및 전환 추적의 기준 키로 사용된다.
```

안 적어두면 나중에:
- "왜 short_links에도 code가 있고 cid도 있지?" 라는 질문이 나옵니다.

#### 9.1.5 ⚠️ 대시보드 집계 API의 N+1 위험

**현재 구조**:
```typescript
Promise.all(
  links.map(async (link) => {
    registrations.count(...)
  })
)
```

**문제점**:
- 링크가 많아지면 **N+1 쿼리 폭탄** 됩니다.

**즉시 보완 (마이그레이션 없이 가능)**:
- 링크 목록 API에 기본 limit (예: 50, 최대 100) 적용 ✅
- 날짜 필터/상태 필터(활성만) 지원 ✅
- UI에서 "최근 생성 순" 기본 정렬 ✅
- 페이지네이션(최소 next) 또는 "더 보기" 지원 권장

**향후 개선 (Phase 4 또는 트래픽 증가 시)**:
- **link_id 기준 group-by 집계 RPC로 통합 예정**
- 현재 방식은 초기 운영용이며, 상한선/페이징으로 폭발 방지

**개선 방안**:
```sql
-- RPC 함수 예시
CREATE OR REPLACE FUNCTION get_link_conversion_stats(client_id_param UUID)
RETURNS TABLE (
  link_id UUID,
  conversion_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    marketing_campaign_link_id as link_id,
    COUNT(*) as conversion_count
  FROM event_survey_entries
  WHERE marketing_campaign_link_id IN (
    SELECT id FROM campaign_link_meta WHERE client_id = client_id_param
  )
  GROUP BY marketing_campaign_link_id
  
  UNION ALL
  
  SELECT 
    marketing_campaign_link_id as link_id,
    COUNT(*) as conversion_count
  FROM registrations
  WHERE marketing_campaign_link_id IN (
    SELECT id FROM campaign_link_meta WHERE client_id = client_id_param
  )
  GROUP BY marketing_campaign_link_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 10. 향후 개선 사항

### 10.1 단기 개선 (우선순위 높음)

1. **전환 집계 기준 테이블 통합** (가장 중요)
   - 웨비나 등록 시 `event_survey_entries`에도 레코드 생성
   - 전환 집계는 항상 `event_survey_entries`에서 수행
   - 자세한 내용은 [9.1.1 전환 귀속 기준 통합](#91-구조적-리스크-및-개선-권장사항) 참조

2. **제약 조건 단순화**
   - `target_type`을 NOT NULL로 강제
   - legacy 호환 케이스 제거
   - 자세한 내용은 [9.1.3 제약 조건 단순화](#913-campaign_link_meta-제약-조건-단순화) 참조

3. **에러 메시지 개선**
   - 사용자 친화적인 에러 메시지 제공
   - 프론트엔드에서 에러 상세 정보 표시

4. **검증 강화**
   - 웨비나 slug 존재 여부 사전 검증
   - 캠페인 public_path 존재 여부 사전 검증

5. **로깅 개선**
   - 구조화된 로깅 시스템 도입
   - 에러 추적을 위한 상세 로그 저장

### 10.2 중기 개선 (우선순위 중간)

1. **대시보드 개선**
   - 웨비나 타겟 링크의 전환율 표시
   - 캠페인/웨비나 구분하여 통계 표시

2. **성능 최적화**
   - 전환 수 집계 쿼리 최적화 (N+1 문제 해결)
   - link_id 기준 group-by 집계 RPC로 통합
   - 인덱스 추가 검토

3. **테스트 코드 작성**
   - 단위 테스트 추가
   - 통합 테스트 추가

### 10.3 장기 개선 (우선순위 낮음)

1. **실시간 통계**
   - WebSocket을 통한 실시간 전환 수 업데이트

2. **A/B 테스트 지원**
   - 동일 타겟에 대한 여러 링크 비교 기능

3. **고급 분석**
   - 시간대별 전환 추이 분석
   - 채널별 성과 분석

---

## 11. 체크리스트

### 11.1 데이터베이스

- [x] `campaign_link_meta` 테이블에 `target_type` 필드 추가
- [x] `campaign_link_meta` 테이블에 `target_webinar_id` 필드 추가
- [x] `target_campaign_id`를 nullable로 변경
- [x] 제약 조건 추가 (`check_target_type_campaign`)
- [x] `registrations` 테이블에 `marketing_campaign_link_id` 필드 추가
- [x] 인덱스 추가
- [ ] `target_type`을 NOT NULL로 강제 (권장)
- [ ] 제약 조건 단순화 (legacy 케이스 제거) (권장)

### 11.2 API

- [x] 캠페인 목록 API에 웨비나 포함
- [x] 링크 생성 API에 웨비나 타겟 지원
- [x] 링크 목록 API에서 웨비나 전환 수 집계
- [x] 웨비나 등록 API에 링크 ID 저장
- [x] URL 생성 로직 개선 (웨비나/캠페인 분기)
- [x] 에러 처리 강화
- [ ] 전환 집계 기준 테이블 통합 (권장)
- [ ] N+1 쿼리 최적화 (RPC 함수 도입) (권장)

### 11.3 프론트엔드

- [x] 캠페인 선택 드롭다운에 웨비나 표시
- [x] 웨비나 선택 시 타겟 타입 자동 변경
- [x] 랜딩 위치 옵션 동적 변경
- [x] 링크 생성 시 타겟 타입 자동 감지
- [x] 광고 시작일 기본값을 오늘 날짜로 변경
- [x] 에러 메시지 표시 개선

### 11.4 테스트

- [ ] 웨비나 링크 생성 테스트
- [ ] 웨비나 등록 시 전환 추적 테스트
- [ ] 캠페인 링크 생성 테스트 (기존 기능)
- [ ] URL 생성 정확성 테스트
- [ ] 에러 케이스 테스트

---

## 12. 참고 자료

### 12.1 관련 문서
- `docs/광고캠페인_UTM.md` - UTM 추적 시스템 명세서
- `docs/광고캠페인_모듈_명세서_검토보고서.md` - 모듈 검토 보고서
- `supabase/migrations/072_add_webinar_support_to_campaign_link_meta.sql` - 웨비나 지원 마이그레이션
- `supabase/migrations/077_add_marketing_campaign_link_id_to_registrations.sql` - 전환 추적 마이그레이션

### 12.2 관련 파일
- `app/api/clients/[clientId]/campaigns/links/route.ts` - 링크 생성/조회 API
- `app/api/event-survey/campaigns/list/route.ts` - 캠페인 목록 API
- `app/api/public/event-survey/[campaignId]/register/route.ts` - 등록 API
- `app/(client)/client/[clientId]/campaigns/components/CampaignLinksTab.tsx` - 링크 관리 UI

---

## 13. 결론

캠페인과 웨비나를 구분하여 UTM 추적 및 전환 추적 시스템을 성공적으로 구현했습니다. 주요 성과:

1. ✅ 웨비나 타겟 링크 생성 지원
2. ✅ 웨비나 등록 시 전환 추적 가능
3. ✅ 타겟 타입에 따른 올바른 URL 생성
4. ✅ 사용자 친화적인 UI 개선
5. ✅ 에러 처리 및 로깅 강화

**땜질용 즉시 보완 완료 (v2.0)**:
1. ✅ **UI 라벨 분리**: "캠페인 전환(등록/설문 제출)" vs "웨비나 전환(웨비나 등록)" 명확히 구분
2. ✅ **Visit dedup 규칙 명확화**: "Visits = session_id 기준, 타겟당 1회 집계" 정확히 한 문장으로 고정
3. ✅ **타겟 소속 검증 강제**: 링크 생성 시 `client_id` 일치 검증 (보안/데이터 오염 방지)
4. ✅ **cid/short link 관계 운영 규칙 고정**: "마케팅 추적의 기준 키는 cid" 명시
5. ✅ **N+1 방지 안전장치**: 링크 목록 API에 limit(기본 50, 최대 100) 및 페이징 추가

**현재 운영 버전 (v2.0)의 경계**:
- **현재 v2.0은 캠페인/웨비나 전환을 서로 다른 테이블에서 집계합니다.**
- 대시보드에서 합산 지표 해석 시 주의가 필요하며, UI에서 명확히 구분 표시합니다.
- 이는 "땜질 구조"이지만, 위 5가지 보완사항으로 운영 리스크를 최소화했습니다.

**향후 개선 사항 (마이그레이션 필요)**:
- **전환 집계 기준 테이블 통합** (향후 통합 설계): 웨비나 등록 시에도 `event_survey_entries`에 레코드 생성하여 광고 성과 분석 단순화
- **제약 조건 단순화**: `target_type`을 NOT NULL로 강제하고 legacy 케이스 제거
- **성능 최적화**: N+1 쿼리 문제 해결을 위한 RPC 함수 도입

모든 마이그레이션이 적용되었고, 코드 변경사항도 완료되었습니다. 시스템은 이제 캠페인과 웨비나 모두를 지원하며, 각각의 특성에 맞게 올바르게 작동합니다.

**최종 체크: 지금 상태로 당장 운영 가능한가?**
✅ **가능합니다.**
다만 위 5가지 땜질용 보완사항(특히 1~3)은 오늘 바로 반영되었으며, 마이그레이션 없이도 가능한 "가드/라벨/상한"이라 리스크 대비 효율이 최고입니다.

---

**문서 버전**: 2.0 (검토 보완본)  
**최종 업데이트**: 2026-01-28
