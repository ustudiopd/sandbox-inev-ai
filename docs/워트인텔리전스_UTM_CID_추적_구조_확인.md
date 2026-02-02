# 워트인텔리전스 UTM/CID 추적 구조 확인 보고서

**작성일**: 2026-02-02  
**대상 서비스**: 워트인텔리전스 웨비나 (라이브 서비스)  
**확인 목적**: UTM과 CID 파라미터가 등록 과정에서 제대로 추적되는지 구조 확인

---

## 📋 요약

✅ **워트인텔리전스의 UTM/CID 추적 구조는 정상적으로 구현되어 있습니다.**

- **랜딩 페이지** (`/webinarform/wert`)에서 UTM과 CID를 추출하고 등록 페이지로 전달
- **등록 페이지** (`/event/149403/register`)에서 UTM과 CID를 받아서 등록 API로 전달
- **등록 API**에서 UTM은 `event_survey_entries` 테이블의 컬럼에, CID는 `registration_data` JSONB 필드에 저장

---

## 🔍 추적 흐름 분석

### 1. 랜딩 페이지 (`/webinarform/wert`)

**파일**: `app/webinarform/wert/WebinarFormWertPageContent.tsx`

#### UTM 파라미터 추출
```typescript
const searchParams = useSearchParams()
const utmParams = extractUTMParams(searchParams)
```

#### CID 추출
```typescript
const cid = searchParams.get("cid")
```

#### Visit 수집
```typescript
fetch(`/api/public/campaigns/${WERT_CAMPAIGN_ID}/visit`, {
  method: "POST",
  body: JSON.stringify({
    session_id: sessionId,
    utm_source: utmParams.utm_source ?? null,
    utm_medium: utmParams.utm_medium ?? null,
    utm_campaign: utmParams.utm_campaign ?? null,
    utm_term: utmParams.utm_term ?? null,
    utm_content: utmParams.utm_content ?? null,
    cid: searchParams.get("cid") ?? null,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
  }),
})
```

**✅ 확인**: 랜딩 페이지에서 UTM과 CID를 모두 추출하여 Visit API에 전달

#### 등록 페이지 링크 생성
```typescript
const getRegisterLink = () => {
  const baseUrl = "/event/149403/register"
  const params = new URLSearchParams()
  
  // cid가 있으면 포함
  const cid = searchParams.get('cid')
  if (cid) {
    params.set('cid', cid)
  }
  
  // UTM 파라미터 추가
  Object.entries(utmParams).forEach(([key, value]) => {
    params.set(key, value)
  })
  
  return `${baseUrl}?${params.toString()}`
}
```

**✅ 확인**: 등록 페이지 링크에 UTM과 CID를 모두 포함하여 전달

---

### 2. 등록 페이지 (`/event/149403/register`)

**파일**: `app/event/[...path]/components/RegistrationPage.tsx`

#### URL에서 UTM 파라미터 추출
```typescript
const urlUTMParams: Record<string, string> = {}
const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
utmKeys.forEach(key => {
  const value = searchParams.get(key)
  if (value) {
    urlUTMParams[key] = value
  }
})
```

#### URL에서 CID 추출
```typescript
const cid = searchParams.get('cid')
```

**✅ 확인**: 등록 페이지에서 URL의 UTM과 CID를 모두 추출

#### localStorage에 UTM 저장
```typescript
useEffect(() => {
  if (Object.keys(mergedUTMParams).length > 0 && campaign?.id) {
    const utmData = {
      ...mergedUTMParams,
      captured_at: new Date().toISOString(),
      first_visit_at: existingData?.first_visit_at || new Date().toISOString(),
      referrer_domain: extractDomain(document.referrer),
    }
    localStorage.setItem(`utm:${campaign.id}`, JSON.stringify(utmData))
  }
}, [campaign?.id, mergedUTMParams])
```

**✅ 확인**: UTM 파라미터를 localStorage에 저장하여 페이지 이동 시에도 유지

#### 등록 API 호출 시 UTM과 CID 전달
```typescript
const requestBody = {
  ...baseRequestBody,
  // UTM 파라미터 추가 (localStorage > URL > 서버 prop 우선순위)
  utm_source: utmData.utm_source || mergedUTMParams.utm_source || null,
  utm_medium: utmData.utm_medium || mergedUTMParams.utm_medium || null,
  utm_campaign: utmData.utm_campaign || mergedUTMParams.utm_campaign || null,
  utm_term: utmData.utm_term || mergedUTMParams.utm_term || null,
  utm_content: utmData.utm_content || mergedUTMParams.utm_content || null,
  utm_first_visit_at: utmData.first_visit_at || null,
  utm_referrer: utmData.referrer_domain || null,
  cid: cid || null, // cid 파라미터 전달
  session_id: currentSessionId || null,
}
```

**✅ 확인**: 등록 API 호출 시 UTM과 CID를 모두 전달

---

### 3. 등록 API (`/api/public/event-survey/[campaignId]/register`)

**파일**: `app/api/public/event-survey/[campaignId]/register/route.ts`

#### 추적 정보 복원 (URL > Cookie > Link 순서)
```typescript
const restoredTracking = await restoreTrackingInfo(
  nextReq,
  campaignId,
  campaign.client_id,
  isWebinarId,
  {
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    utm_term: utm_term || null,
    utm_content: utm_content || null,
  },
  cid || null
)
```

**✅ 확인**: `restoreTrackingInfo` 함수가 URL, Cookie, Link 순서로 추적 정보를 복원

#### UTM 파라미터 정규화
```typescript
const normalizedUTM = normalizeUTM(finalUTMParams)
```

**✅ 확인**: UTM 파라미터를 정규화 (trim + lowercase + 길이 제한)

#### DB 저장 구조

**UTM 파라미터**: `event_survey_entries` 테이블의 컬럼에 저장
```typescript
const { data: entry, error: entryError } = await admin
  .from('event_survey_entries')
  .insert({
    campaign_id: campaignId,
    name: name.trim(),
    company: company?.trim() || null,
    phone_norm: phoneNorm,
    survey_no: surveyNo,
    code6: code6,
    completed_at: new Date().toISOString(),
    registration_data: normalizedRegistrationData,
    // UTM 파라미터 저장
    utm_source: normalizedUTM.utm_source || null,
    utm_medium: normalizedUTM.utm_medium || null,
    utm_campaign: normalizedUTM.utm_campaign || null,
    utm_term: normalizedUTM.utm_term || null,
    utm_content: normalizedUTM.utm_content || null,
    utm_first_visit_at: utm_first_visit_at || null,
    utm_referrer: utm_referrer || null,
    marketing_campaign_link_id: resolvedMarketingCampaignLinkId,
  })
```

**CID**: `registration_data` JSONB 필드에 저장
```typescript
// CID를 registration_data에 추가 (복원된 CID가 있을 때만)
if (finalCid && normalizedRegistrationData) {
  normalizedRegistrationData.cid = finalCid
} else if (finalCid && !normalizedRegistrationData) {
  normalizedRegistrationData = { cid: finalCid }
}
```

**✅ 확인**: 
- UTM 파라미터는 `event_survey_entries` 테이블의 컬럼에 저장
- CID는 `registration_data` JSONB 필드에 저장
- `marketing_campaign_link_id`도 함께 저장되어 링크 추적 가능

---

## ✅ 구조 검증 결과

### 1. 랜딩 페이지 → 등록 페이지 전달
- ✅ UTM 파라미터가 URL 쿼리스트링으로 전달됨
- ✅ CID가 URL 쿼리스트링으로 전달됨
- ✅ `getRegisterLink()` 함수가 UTM과 CID를 모두 포함하여 링크 생성

### 2. 등록 페이지 → 등록 API 전달
- ✅ URL에서 UTM 파라미터 추출
- ✅ URL에서 CID 추출
- ✅ localStorage에 UTM 저장 (페이지 이동 시 유지)
- ✅ 등록 API 호출 시 UTM과 CID 모두 전달

### 3. 등록 API → DB 저장
- ✅ `restoreTrackingInfo` 함수로 추적 정보 복원 (URL > Cookie > Link 순서)
- ✅ UTM 파라미터 정규화 수행
- ✅ UTM 파라미터를 `event_survey_entries` 테이블의 컬럼에 저장
- ✅ CID를 `registration_data` JSONB 필드에 저장
- ✅ `marketing_campaign_link_id` 저장 (cid로 링크를 찾은 경우)

---

## 📊 데이터 저장 위치

### UTM 파라미터
- **테이블**: `event_survey_entries`
- **컬럼**: 
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_term`
  - `utm_content`
  - `utm_first_visit_at`
  - `utm_referrer`

### CID
- **테이블**: `event_survey_entries`
- **필드**: `registration_data` JSONB 필드 내부
- **경로**: `registration_data->>'cid'`

### 마케팅 캠페인 링크 ID
- **테이블**: `event_survey_entries`
- **컬럼**: `marketing_campaign_link_id`
- **용도**: CID로 `campaign_link_meta` 테이블에서 링크를 찾은 경우 저장

---

## 🔄 추적 정보 복원 우선순위

`restoreTrackingInfo` 함수의 우선순위:

1. **URL 쿼리 파라미터** (최우선)
   - URL에 직접 포함된 UTM과 CID 사용

2. **Cookie** (2순위)
   - URL에 없을 때만 Cookie에서 읽기
   - Cookie 검증 수행 (캠페인 매칭 확인)

3. **링크 메타데이터** (3순위)
   - CID로 `campaign_link_meta` 테이블에서 링크 조회
   - 링크의 UTM 파라미터 사용 (URL에 UTM이 없을 때만)

---

## ✅ 결론

**워트인텔리전스의 UTM/CID 추적 구조는 정상적으로 구현되어 있습니다.**

1. ✅ 랜딩 페이지에서 UTM과 CID를 추출하고 등록 페이지로 전달
2. ✅ 등록 페이지에서 UTM과 CID를 받아서 등록 API로 전달
3. ✅ 등록 API에서 UTM은 테이블 컬럼에, CID는 JSONB 필드에 저장
4. ✅ 추적 정보 복원 우선순위 (URL > Cookie > Link) 정상 작동
5. ✅ UTM 파라미터 정규화 수행
6. ✅ `marketing_campaign_link_id` 저장으로 링크 추적 가능

**추가 확인 사항**:
- 실제 등록 데이터에서 UTM과 CID가 제대로 저장되는지는 DB 쿼리로 확인 필요
- 하지만 코드 구조상으로는 문제없이 작동할 것으로 판단됨

---

## 📝 참고 파일

- `app/webinarform/wert/WebinarFormWertPageContent.tsx` - 랜딩 페이지
- `app/event/[...path]/components/RegistrationPage.tsx` - 등록 페이지
- `app/api/public/event-survey/[campaignId]/register/route.ts` - 등록 API
- `lib/tracking/restore-tracking.ts` - 추적 정보 복원 로직
- `lib/utils/utm.ts` - UTM 파라미터 유틸리티
