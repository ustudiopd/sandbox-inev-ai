# 모두의특강 UTM 테스트 결과

**작성일**: 2026-02-02  
**테스트 대상**: 설문조사 타입 캠페인 (`/test-survey-copy-modu`)

---

## ✅ 완료된 작업

### 1. 설문조사 Submit API에 Cookie 복원 로직 추가

**파일**: `app/api/public/event-survey/[campaignId]/submit/route.ts`

**변경 사항**:
- `restoreTrackingInfo` 함수 사용 추가
- URL > Cookie > Link 순서로 추적 정보 복원
- 등록 API(`register`)와 동일한 로직 적용

**코드 변경**:
```typescript
// Request를 NextRequest로 변환 (cookie 읽기용)
const nextReq = req as unknown as NextRequest

// 추적 정보 복원 (URL > Cookie > Link 순서)
const restoredTracking = await restoreTrackingInfo(
  nextReq,
  campaignId,
  campaign.client_id,
  false, // 설문조사는 웨비나 ID가 아님
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

---

## 🧪 테스트 방법

### 테스트 URL
```
https://eventflow.kr/event/test-survey-copy-modu?utm_source=test&utm_medium=email&utm_campaign=modu_test&utm_term=test_term&utm_content=test_content
```

### 테스트 단계

1. **위 URL로 접속**
   - UTM 파라미터가 포함된 URL로 설문조사 페이지 접속
   - Middleware에서 cookie에 UTM 저장 확인

2. **설문조사 완료**
   - 필수 항목 입력
   - 설문 제출

3. **UTM 저장 확인**
   ```bash
   npx tsx scripts/test-modu-survey-utm.ts
   ```

---

## 📊 확인 사항

### 1. Cookie 저장 확인
- 브라우저 개발자 도구 → Application → Cookies
- `ef_tracking` 쿠키 확인
- UTM 파라미터가 JSON으로 저장되어 있는지 확인

### 2. 서버 로그 확인
- `[submit] 복원된 추적 정보` 로그 확인
- `source: 'url' | 'cookie' | 'link_meta' | 'none'` 확인
- `utm_source`, `utm_medium` 등이 올바르게 복원되는지 확인

### 3. DB 저장 확인
- `event_survey_entries` 테이블에서 최신 항목 확인
- `utm_source`, `utm_medium`, `utm_campaign` 등이 NULL이 아닌지 확인
- `marketing_campaign_link_id`가 올바르게 저장되는지 확인

---

## 🔍 디버깅

### UTM 저장 상태 확인 스크립트
```bash
npx tsx scripts/test-modu-survey-utm.ts
```

### 서버 로그 확인
- Vercel Logs에서 `[submit]` 키워드로 검색
- `복원된 추적 정보` 로그 확인

---

## 📝 테스트 체크리스트

- [x] 설문조사 Submit API에 Cookie 복원 로직 추가
- [ ] UTM 파라미터가 포함된 URL로 접속
- [ ] Middleware에서 cookie 저장 확인
- [ ] 설문조사 완료
- [ ] 서버 로그에서 UTM 복원 확인
- [ ] DB에서 UTM 저장 확인
- [ ] 캠페인 링크 통계에서 UTM 집계 확인

---

## ⚠️ 주의사항

1. **전화번호 중복**: 같은 전화번호로는 중복 제출이 불가능합니다. 테스트 시 다른 전화번호를 사용하세요.

2. **Cookie Trust Window**: Cookie에서 복원된 UTM은 24시간 이내에만 유효합니다 (`COOKIE_TRUST_WINDOW_HOURS`).

3. **UTM 우선순위**: URL에 UTM이 있으면 Cookie보다 우선합니다.

---

## 🎯 예상 결과

테스트 완료 후:
- `utm_source = 'test'`
- `utm_medium = 'email'`
- `utm_campaign = 'modu_test'`
- `utm_term = 'test_term'`
- `utm_content = 'test_content'`

이 값들이 `event_survey_entries` 테이블에 저장되어야 합니다.
