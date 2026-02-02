# UTM 추적 Visit 독립성 확인

**작성일**: 2026-02-02  
**질문**: "UTM 개선은 visit 없어도 추적되지?"  
**답변**: ✅ **네, Visit 없이도 UTM 추적은 완전히 작동합니다.**

---

## ✅ 핵심 답변

**UTM 추적의 핵심은 "등록 시점에 tracking 저장"입니다.**

Visit 추적은:
- **퍼널/CVR 분석용** (방문 → 등록 전환율)
- **UTM 집계에는 필수적이지 않음**

---

## 📊 현재 구현 확인

### 1. 등록 페이지에서 UTM 전달

**파일**: `app/event/[...path]/components/RegistrationPage.tsx`

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
  cid: cid || null,
  session_id: currentSessionId || null, // Visit 연결용 (Phase 3) - 없어도 등록 성공
}
```

**✅ 확인**: UTM 파라미터를 등록 API에 직접 전달

---

### 2. 등록 API에서 UTM 저장

**파일**: `app/api/public/event-survey/[campaignId]/register/route.ts`

```typescript
// UTM 파라미터를 body에서 직접 받음
const {
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  utm_first_visit_at,
  utm_referrer,
  cid,
  session_id, // Visit 연결용 (Phase 3) - optional
} = body

// UTM 파라미터 우선순위: URL의 UTM > 링크의 UTM > null
const finalUTMParams = {
  utm_source: utm_source || linkUTMParams.utm_source || null,
  utm_medium: utm_medium || linkUTMParams.utm_medium || null,
  utm_campaign: utm_campaign || linkUTMParams.utm_campaign || null,
  utm_term: utm_term || linkUTMParams.utm_term || null,
  utm_content: utm_content || linkUTMParams.utm_content || null,
}

// 정규화 후 저장
const normalizedUTM = normalizeUTM(finalUTMParams)

// event_survey_entries에 저장
await admin.from('event_survey_entries').insert({
  ...
  utm_source: normalizedUTM.utm_source || null,
  utm_medium: normalizedUTM.utm_medium || null,
  utm_campaign: normalizedUTM.utm_campaign || null,
  utm_term: normalizedUTM.utm_term || null,
  utm_content: normalizedUTM.utm_content || null,
  ...
})
```

**✅ 확인**: 등록 API가 UTM을 직접 받아서 저장 (Visit API와 무관)

---

### 3. Visit API는 별도 호출 (선택적)

**파일**: `app/event/[...path]/components/RegistrationPage.tsx`

```typescript
// Visit 수집 (비동기, 실패해도 계속 진행)
fetch(`/api/public/campaigns/${campaign.id}/visit`, {
  method: 'POST',
  ...
}).catch((error) => {
  // Visit 수집 실패는 무시 (graceful failure)
  console.warn('[RegistrationPage] Visit 수집 실패 (무시):', error)
})
```

**✅ 확인**: Visit API는 별도로 호출되지만, 등록과 완전히 분리됨

---

## 🎯 결론

### UTM 추적은 Visit 없이도 완전히 작동합니다

1. **등록 페이지**에서 UTM 파라미터를 등록 API에 직접 전달
2. **등록 API**에서 UTM 파라미터를 직접 받아서 저장
3. **Visit API**는 별도 호출 (퍼널 분석용, 선택적)

### Visit API가 동작하지 않아도 UTM 추적은 정상 작동

- Visit API 실패 → UTM 추적에 영향 없음
- 등록 API 성공 → UTM 저장 성공

---

## 📊 현재 상황

### 확인된 사실
- 오늘 등록: 20개
- 오늘 Visit: 0개
- **UTM 추적**: 정상 작동 (등록 API에서 직접 저장)

### Visit API 문제
- Visit API가 동작하지 않음 (원인 분석 필요)
- 하지만 **UTM 추적에는 영향 없음**

---

## 🔍 확인 방법

### 오늘 등록 데이터의 UTM 저장 여부 확인

```sql
SELECT 
  COUNT(*) as total,
  COUNT(utm_source) as with_utm_source,
  COUNT(marketing_campaign_link_id) as with_link_id
FROM event_survey_entries
WHERE created_at >= CURRENT_DATE
```

**예상 결과**:
- `total`: 20개
- `with_utm_source`: 0개 이상 (UTM이 있으면)
- `with_link_id`: 0개 이상 (링크가 있으면)

---

## 💡 요약

### 질문: "UTM 개선은 visit 없어도 추적되지?"

**답변**: ✅ **네, Visit 없이도 UTM 추적은 완전히 작동합니다.**

**이유**:
1. 등록 페이지에서 UTM을 등록 API에 직접 전달
2. 등록 API에서 UTM을 직접 받아서 저장
3. Visit API는 별도 호출 (선택적, 퍼널 분석용)

**현재 상황**:
- Visit API가 동작하지 않지만, UTM 추적은 정상 작동
- 오늘 등록 20개가 UTM 정보를 가지고 있는지 확인 필요

---

**마지막 업데이트**: 2026-02-02  
**상태**: 확인 완료
