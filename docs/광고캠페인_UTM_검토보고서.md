# 광고캠페인 UTM 명세서 검토 보고서

**검토일**: 2026-01-28  
**명세서**: `docs/광고캠페인_UTM` (v1.0)  
**현재 구현 상태**: Phase 2 부분 구현 완료

---

## 1. 전체 평가

### 1.1 명세서 완성도: ⭐⭐⭐⭐⭐ (5/5)

명세서는 매우 상세하고 구현 가능한 수준으로 작성되어 있습니다:
- ✅ 템플릿 자동 채움 UX가 구체적
- ✅ cid 생성 규칙이 명확함
- ✅ URL 생성 규칙이 상세함
- ✅ 저장/집계 방식이 구체적
- ✅ DoD가 명확함

### 1.2 현재 구현 상태: ⭐⭐⭐ (3/5)

**구현 완료된 부분:**
- ✅ `campaign_link_meta` 테이블 생성 (명세서의 `marketing_campaign_links`와 유사)
- ✅ 템플릿 기반 UTM 자동 채움 (채널 템플릿 선택)
- ✅ `utm_campaign` 자동 생성 (slug 규칙)
- ✅ 링크 생성/수정/삭제 API
- ✅ 링크 목록 조회 및 URL 생성
- ✅ UTM 파라미터 정규화 (`normalizeUTM`)
- ✅ UTM querystring pass-through (리다이렉트 시 유지)

**미구현/불일치 부분:**
- ❌ **`cid` 필드 누락** (가장 중요)
- ❌ **`cid` 기반 링크 lookup 미구현**
- ❌ URL에 `cid` 포함 안 함 (현재는 `_link_id` 사용)
- ⚠️ 테이블 이름 차이 (`marketing_campaign_links` vs `campaign_link_meta`)

---

## 2. 주요 불일치 사항 및 수정 필요 사항

### 2.1 ❌ **cid 필드 누락 (최우선 수정 필요)**

**명세서 요구사항:**
- `marketing_campaign_links` 테이블에 `cid` 필드 필수
- `cid`는 `(client_id, cid)` unique 제약
- 8자리 Base32/Alnum 권장 (6자리/8자리/slug 옵션)

**현재 상태:**
```sql
-- 현재 campaign_link_meta 테이블에는 cid 필드가 없음
create table public.campaign_link_meta (
  id uuid primary key,
  -- cid 필드 없음 ❌
  ...
)
```

**수정 필요:**
```sql
-- 마이그레이션 필요
alter table public.campaign_link_meta
  add column cid text;

-- unique 제약 추가
create unique index uniq_campaign_link_meta_client_cid 
  on public.campaign_link_meta(client_id, cid)
  where cid is not null;
```

**cid 생성 로직 구현 필요:**
- 링크 생성 시 자동으로 8자리 cid 생성
- Base32/Alnum 문자 사용 (`[A-Z0-9]`)
- 중복 체크 후 저장

---

### 2.2 ❌ **URL 생성 규칙 불일치**

**명세서 요구사항:**
```
공유용: ?cid=AB12CD34
광고용: ?cid=AB12CD34&utm_source=...&utm_medium=...&utm_campaign=...
```

**현재 구현:**
```typescript
// app/api/clients/[clientId]/campaigns/links/route.ts
utmParams.set('_link_id', link.id) // ❌ cid 대신 _link_id 사용
const url = `${baseUrl}/event${landingPath}?${utmParams.toString()}`
```

**수정 필요:**
```typescript
// cid를 querystring에 포함
const utmParams = new URLSearchParams()
utmParams.set('cid', link.cid) // ✅ cid 사용
if (link.utm_source) utmParams.set('utm_source', link.utm_source)
// ...
```

---

### 2.3 ❌ **전환 저장 시 cid 기반 lookup 미구현**

**명세서 요구사항:**
```
submit/register API에서:
1. querystring에서 cid 수신
2. marketing_campaign_links를 (client_id, cid)로 lookup
3. 성공 시 marketing_campaign_link_id를 event_survey_entries에 저장
```

**현재 구현:**
- `app/api/public/event-survey/[campaignId]/submit/route.ts`
- `app/api/public/event-survey/[campaignId]/register/route.ts`
- 두 API 모두 `cid` 파라미터를 추출하거나 lookup하는 로직이 없음

**수정 필요:**
```typescript
// submit/register API에 추가 필요
const cid = searchParams.get('cid')
if (cid) {
  // campaign_id로 client_id 조회
  const { data: campaign } = await admin
    .from('event_survey_campaigns')
    .select('client_id')
    .eq('id', campaignId)
    .single()
  
  // cid로 링크 lookup
  const { data: link } = await admin
    .from('campaign_link_meta')
    .select('id')
    .eq('client_id', campaign.client_id)
    .eq('cid', cid)
    .single()
  
  if (link) {
    // entry에 marketing_campaign_link_id 저장
    marketing_campaign_link_id: link.id
  }
}
```

---

### 2.4 ⚠️ **테이블 이름 차이 (의미상 문제 없음)**

**명세서:** `marketing_campaign_links`  
**현재 구현:** `campaign_link_meta`

**평가:** 
- 기능적으로는 동일하지만, 명세서와의 일관성을 위해 고려 필요
- 하지만 `campaign_link_meta`도 충분히 명확하므로 변경은 선택사항

---

### 2.5 ✅ **템플릿 자동 채움 (구현 완료)**

**명세서 요구사항:**
- 템플릿 선택 시 `utm_source`, `utm_medium` 자동 채움
- `utm_campaign` 자동 생성 (slug 규칙)

**현재 구현:**
- ✅ `lib/utils/utmTemplate.ts`에 템플릿 정의
- ✅ `CampaignLinksTab.tsx`에서 템플릿 선택 시 자동 채움
- ✅ `generateUTMCampaign()` 함수로 slug 생성

**평가:** 명세서 요구사항 충족 ✅

---

### 2.6 ✅ **UTM 정규화 (구현 완료)**

**명세서 요구사항:**
- trim, lowercase, 길이 제한

**현재 구현:**
- ✅ `lib/utils/utm.ts`의 `normalizeUTM()` 함수
- ✅ API에서 저장 전 정규화 적용

**평가:** 명세서 요구사항 충족 ✅

---

### 2.7 ✅ **UTM querystring pass-through (구현 완료)**

**명세서 요구사항:**
- 리다이렉트 시 UTM 파라미터 유지

**현재 구현:**
- ✅ `lib/utils/utm.ts`의 `extractUTMParams()`, `appendUTMToURL()`
- ✅ `WebinarEntry.tsx`에서 리다이렉트 시 UTM 유지
- ✅ `app/event/[...path]/page.tsx`에서 서버 사이드 UTM 추출

**평가:** 명세서 요구사항 충족 ✅

---

## 3. 우선순위별 수정 계획

### 🔴 **P0 (즉시 수정 필요)**

1. **cid 필드 추가 및 생성 로직 구현**
   - 마이그레이션: `campaign_link_meta`에 `cid` 컬럼 추가
   - API 수정: 링크 생성 시 8자리 cid 자동 생성
   - 중복 체크 로직 구현

2. **URL 생성 시 cid 포함**
   - `_link_id` 대신 `cid` 사용
   - 공유용/광고용 URL 모두 cid 포함

3. **전환 저장 시 cid 기반 lookup**
   - `submit` API에 cid 추출 및 lookup 추가
   - `register` API에 cid 추출 및 lookup 추가
   - `marketing_campaign_link_id` 저장

### 🟡 **P1 (단기 수정 권장)**

4. **대시보드 집계 개선**
   - cid별 전환 집계
   - 링크별 전환 집계 (이미 구현됨)

5. **중복 생성 방지 강화**
   - 동일 target + template + seq 조합 경고 (일부 구현됨)

### 🟢 **P2 (장기 개선 사항)**

6. **Visit 로깅 (Phase 3)**
   - session_id 기반 dedup
   - TTL 설정

7. **템플릿 사전 관리**
   - DB 테이블로 이동 (현재는 코드 상수)

---

## 4. 수정 작업 체크리스트

### Phase 1: cid 필드 추가
- [ ] 마이그레이션 생성: `campaign_link_meta`에 `cid` 컬럼 추가
- [ ] unique 인덱스 생성: `(client_id, cid)`
- [ ] cid 생성 함수 구현: 8자리 Base32/Alnum
- [ ] 링크 생성 API 수정: cid 자동 생성 및 저장
- [ ] 기존 링크에 대한 cid 마이그레이션 (선택사항)

### Phase 2: URL 생성 수정
- [ ] 링크 생성 API: URL에 `cid` 포함 (기존 `_link_id` 제거)
- [ ] 링크 목록 API: URL에 `cid` 포함
- [ ] 링크 수정 API: URL에 `cid` 포함

### Phase 3: 전환 저장 수정
- [ ] `submit` API: `cid` 파라미터 추출
- [ ] `submit` API: `cid`로 링크 lookup
- [ ] `submit` API: `marketing_campaign_link_id` 저장
- [ ] `register` API: `cid` 파라미터 추출
- [ ] `register` API: `cid`로 링크 lookup
- [ ] `register` API: `marketing_campaign_link_id` 저장

### Phase 4: 테스트 및 검증
- [ ] 링크 생성 시 cid 생성 확인
- [ ] URL에 cid 포함 확인
- [ ] 전환 저장 시 cid lookup 확인
- [ ] 대시보드 집계 정확도 확인

---

## 5. 명세서와의 추가 차이점

### 5.1 `landing_variant` enum 차이

**명세서:** `welcome | register | survey | done`  
**현재 구현:** `welcome | register | survey` (done 없음)

**평가:** `done`은 완료 페이지로, 현재는 사용하지 않으므로 문제 없음

### 5.2 `target_type` 필드 없음

**명세서:** `target_type` (enum: `event_campaign`)  
**현재 구현:** `target_campaign_id`만 사용 (직접 FK)

**평가:** 현재는 이벤트 캠페인만 지원하므로 문제 없음. 향후 확장 시 추가 고려

### 5.3 `start_date` 필드 추가됨

**명세서:** 명시되지 않음  
**현재 구현:** `start_date` 필드 추가됨 (최근 추가)

**평가:** 명세서에 없지만 유용한 기능이므로 유지 권장

---

## 6. 결론 및 권장사항

### 6.1 즉시 수정 필요 사항

**cid 필드 추가**가 가장 중요합니다. 명세서의 핵심 기능이며, 현재 구현에서 누락되어 있습니다.

1. 마이그레이션으로 `cid` 필드 추가
2. cid 생성 로직 구현
3. URL 생성 시 cid 사용
4. 전환 저장 시 cid 기반 lookup

### 6.2 명세서 준수도

**현재 준수도: 약 70%**

- ✅ 템플릿 자동 채움: 완료
- ✅ UTM 정규화: 완료
- ✅ UTM pass-through: 완료
- ❌ cid 기능: 미구현
- ❌ cid 기반 lookup: 미구현

### 6.3 다음 단계

1. **cid 필드 추가 마이그레이션 작성**
2. **cid 생성 유틸리티 함수 구현**
3. **API 수정 (생성/조회/전환 저장)**
4. **테스트 및 검증**

---

**작성일**: 2026-01-28  
**다음 검토 예정일**: cid 기능 구현 완료 후
