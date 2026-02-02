# Visit API 동작 불가 원인 분석

**작성일**: 2026-02-02  
**문제**: 오늘 등록 20개, Visit 로그 0개  
**상태**: 🔴 Visit API가 동작하지 않음

---

## 📊 확인 결과

### 데이터 현황
- **오늘 등록 수**: 20개
- **오늘 Visit 수**: 0개
- **Visit 추적률**: 0%

### 종합 판정
🔴 **문제: 등록은 있지만 Visit 로그가 없음**

---

## 🔍 가능한 원인

### 1. Visit API가 호출되지 않음 (클라이언트 코드 문제)

**확인 사항**:
- `campaign?.id`가 존재하는지
- `useEffect`가 실행되는지
- 브라우저 네트워크 탭에서 Visit API 호출 확인

**코드 위치**:
- `app/event/[...path]/components/RegistrationPage.tsx` (line 77-121)
- `app/event/[...path]/components/OnePredictRegistrationPage.tsx` (line 84-128)

**확인 방법**:
```typescript
// 브라우저 콘솔에서 확인
// 1. 등록 페이지 접속
// 2. 네트워크 탭에서 `/api/public/campaigns/[campaignId]/visit` 호출 확인
// 3. 콘솔에서 `[RegistrationPage] Visit 수집 실패` 로그 확인
```

---

### 2. Visit API가 호출되지만 실패함 (서버 로그 확인 필요)

**확인 사항**:
- 서버 로그에서 `[VisitTrackFail]` 로그 확인
- Visit API 응답 상태 코드 확인
- 에러 메시지 확인

**로그 형식**:
```json
{
  "campaignId": "uuid",
  "sessionId": "session-id",
  "reason": "FORCED_FAILURE_MODE|DB_INSERT_FAILED|EXCEPTION|API_ERROR",
  "status": 500,
  "error": "error message",
  "code": "error code",
  "timestamp": "2026-02-02T..."
}
```

**확인 방법**:
- Vercel Logs에서 `[VisitTrackFail]` 검색
- 브라우저 네트워크 탭에서 Visit API 응답 확인

---

### 3. Visit API가 호출되고 성공하지만 DB 저장 실패

**확인 사항**:
- `event_access_logs` 테이블 접근 권한 확인
- DB 제약 조건 확인 (FK, NOT NULL 등)
- Visit API 응답이 `{ success: true }`인지 확인

**가능한 문제**:
- `campaign_id` 또는 `webinar_id`가 유효하지 않음
- `session_id`가 필수인데 없음
- DB 연결 문제

---

## 🛠️ 디버깅 방법

### 방법 1: 브라우저 네트워크 탭 확인

1. 등록 페이지 접속
2. 개발자 도구 → 네트워크 탭 열기
3. `/api/public/campaigns/[campaignId]/visit` 요청 확인
4. 요청이 있는지, 응답 상태 코드 확인

### 방법 2: 브라우저 콘솔 확인

```javascript
// 등록 페이지에서 콘솔 확인
// Visit API 호출 시 로그가 남는지 확인
```

### 방법 3: 서버 로그 확인

```bash
# Vercel Logs에서 확인
grep "[VisitTrackFail]" vercel-logs.txt
grep "[visit]" vercel-logs.txt
```

### 방법 4: Visit API 직접 테스트

```bash
# Visit API 직접 호출 테스트
curl -X POST https://eventflow.kr/api/public/campaigns/[campaignId]/visit \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-id",
    "utm_source": "test",
    "utm_medium": "test"
  }'
```

---

## 🔧 즉시 확인할 사항

### 1. Visit API 호출 여부 확인

**코드**: `app/event/[...path]/components/RegistrationPage.tsx`

```typescript
// Visit 수집 (비동기, 실패해도 계속 진행)
fetch(`/api/public/campaigns/${campaign.id}/visit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
}).catch((error) => {
  // Visit 수집 실패는 무시 (graceful failure)
  console.warn('[RegistrationPage] Visit 수집 실패 (무시):', error)
})
```

**확인**:
- `campaign?.id`가 존재하는지
- `useEffect`가 실행되는지
- 네트워크 탭에서 요청이 보이는지

---

### 2. Visit API 응답 확인

**확인**:
- 응답 상태 코드 (200, 400, 500 등)
- 응답 본문 (`{ success: true }` 또는 에러 메시지)

---

### 3. 서버 로그 확인

**확인**:
- `[VisitTrackFail]` 로그 존재 여부
- `[visit]` 로그 존재 여부
- 에러 메시지 내용

---

## 🎯 다음 단계

1. **브라우저 네트워크 탭 확인**: Visit API가 실제로 호출되는지 확인
2. **서버 로그 확인**: Visit API가 실패하는지 확인
3. **Visit API 직접 테스트**: API가 정상 작동하는지 확인
4. **코드 수정**: 문제가 발견되면 수정

---

## 📝 체크리스트

- [ ] 브라우저 네트워크 탭에서 Visit API 호출 확인
- [ ] 브라우저 콘솔에서 Visit API 에러 확인
- [ ] 서버 로그에서 `[VisitTrackFail]` 로그 확인
- [ ] Visit API 직접 테스트
- [ ] `campaign?.id` 존재 확인
- [ ] `useEffect` 실행 확인
- [ ] DB 접근 권한 확인

---

**마지막 업데이트**: 2026-02-02  
**상태**: 원인 분석 중
