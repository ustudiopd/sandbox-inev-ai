# Visit 추적 회귀 방지 장치

**작성일**: 2026-01-28  
**버전**: 1.0  
**목적**: Visit API 실패 시 등록/제출이 막히지 않도록 보장하는 회귀 방지 시스템

---

## 목표

Visit 로깅이 실패해도 **등록/제출이 절대 막히지 않는다**는 것을:
1. 개발자가 즉시 재현/검증하고
2. 운영 중에도 조용히 탐지할 수 있게 만든다.

---

## 1. 강제 실패 모드 (가장 실용적, 필수)

### 설계

Visit API에 **테스트용 실패 트리거**를 넣습니다.
단, 보안상 **개발 환경 또는 특정 환경 변수에서만** 켜지도록 합니다.

### 사용 방법

#### 옵션 A: 쿼리스트링 플래그 (권장)

```
/api/public/campaigns/[campaignId]/visit?__debug_visit_fail=1
```

또는 링크에 추가:
```
/event/149403/register?cid=ABC123&__debug_visit_fail=1
```

#### 옵션 B: 헤더 플래그

```
x-debug-visit-fail: 1
```

### 보안 제한

- **개발 환경**: `NODE_ENV === 'development'`에서 자동 활성화
- **프로덕션**: `DEBUG_VISIT_FAIL_ENABLED=true` 환경 변수 필요

### 기대 효과

- 언제든 "visit API가 터져도 등록이 진행되는지"를 **현장/운영 환경에서조차** 검증 가능
- 등록 페이지/설문 페이지에서 이 플래그를 켠 테스트 링크를 만들어두면 됨

---

## 2. 회귀 테스트용 시나리오 링크 (UI)

### 위치

클라이언트 대시보드 → 광고/캠페인 페이지 → 링크 목록

### 표시 조건

- 개발 환경 (`NODE_ENV !== 'production'`)
- 또는 localhost에서만 표시

### 기능

각 링크마다 "🧪 회귀 테스트용 링크 (Visit 실패 시뮬레이션)" 버튼이 표시됩니다.

**예시**:
```
/event/149403/register?cid=ABC123&__debug_visit_fail=1
/event/149403/survey?cid=ABC123&__debug_visit_fail=1
```

이 링크로 접속하면:
1. Visit API가 의도적으로 500 에러 반환
2. 등록/제출 페이지는 정상 작동해야 함
3. 등록/제출이 성공적으로 완료되어야 함

---

## 3. 코드 규칙: 등록/제출과 Visit 완전 분리

### 원칙

**등록/제출 API는 visit와 완전히 분리되어야 합니다.**

### 현재 구현 상태

✅ **클라이언트 측**:
- Visit 호출은 `useEffect`에서 fire-and-forget 방식
- `.catch()`로 graceful failure 처리
- 등록/제출 submit과 완전히 분리

✅ **서버 측**:
- 등록/제출 API는 Visit를 호출하지 않음
- Visit 연결은 전환 시에만 수행 (실패해도 등록/제출 성공)

### 방지 규칙 (코드 레벨 원칙)

```typescript
// ❌ 잘못된 예: await로 visit 호출하고 throw 전파
const visitResult = await fetch('/api/public/campaigns/.../visit')
if (!visitResult.ok) {
  throw new Error('Visit failed') // 등록을 막으면 안 됨!
}

// ✅ 올바른 예: fire-and-forget
fetch('/api/public/campaigns/.../visit', {
  method: 'POST',
  body: JSON.stringify({ ... })
}).catch((error) => {
  // Visit 수집 실패는 무시 (graceful failure)
  console.warn('[RegistrationPage] Visit 수집 실패 (무시):', error)
})
```

**등록/제출 submit의 트랜잭션**(entry insert)은 visit 로직과 분리되어야 합니다.

---

## 4. 자동 탐지 (운영 안전망)

### 구조화 로그

#### Visit 실패 로그: `[VisitTrackFail]`

Visit API가 실패할 때 구조화된 로그로 남깁니다:

```json
{
  "campaignId": "uuid",
  "sessionId": "session-id",
  "reason": "FORCED_FAILURE_MODE|DB_INSERT_FAILED|EXCEPTION|API_ERROR",
  "status": 500,
  "error": "error message",
  "code": "error code",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

**로그 위치**: 서버 콘솔 (Vercel Logs / Sentry)

#### Visit 누락 로그: `[VisitMissingOnConvert]`

등록/제출 API가 성공했는데 visit가 없거나 연결이 안 된 경우:

```json
{
  "campaignId": "uuid",
  "sessionId": "session-id or null",
  "entryId": "uuid",
  "reason": "VISIT_NOT_FOUND|VISIT_UPDATE_FAILED|VISIT_CONNECTION_EXCEPTION|NO_SESSION_ID",
  "error": "error message or null",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

### 탐지 방법

**Vercel Logs**:
```bash
# Visit 실패 탐지
grep "[VisitTrackFail]" vercel-logs.txt

# Visit 누락 탐지
grep "[VisitMissingOnConvert]" vercel-logs.txt
```

**Sentry**:
- `[VisitTrackFail]` 태그로 필터링
- `[VisitMissingOnConvert]` 태그로 필터링

---

## 5. 스모크 테스트 API (선택, 하지만 강력)

### 엔드포인트

```
GET /api/health/visit-tracking?campaignId=...
```

### 기능

운영자가 버튼 한 번으로 확인할 수 있는 엔드포인트:

1. **(a) Visit RPC가 호출 가능한지** 확인
   - `event_access_logs` 테이블 접근 가능 여부

2. **(b) 최근 10분간 visit insert가 정상 발생했는지** 확인
   - 해당 캠페인에 대한 최근 visit 수

### 응답 예시

```json
{
  "campaignId": "uuid",
  "campaignExists": true,
  "visitTableAccessible": true,
  "recentVisits": {
    "count": 5,
    "period": "10 minutes",
    "error": null
  },
  "status": "healthy",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

### 사용 방법

**브라우저에서**:
```
https://eventflow.kr/api/health/visit-tracking?campaignId=YOUR_CAMPAIGN_ID
```

**cURL**:
```bash
curl "https://eventflow.kr/api/health/visit-tracking?campaignId=YOUR_CAMPAIGN_ID"
```

---

## 회귀 방지 DoD (Definition of Done)

### 필수 체크리스트

- [x] `__debug_visit_fail=1`로 visit API를 의도적으로 실패시켜도 등록/제출이 **항상 성공**한다.
- [x] 위 실패 시나리오를 재현할 수 있는 테스트 링크가 내부(관리자) UI에 존재한다.
- [x] visit 실패/누락은 사용자 UX를 막지 않되, 서버 로그에 반드시 남는다.
- [x] 등록/제출 API는 visit와 완전히 분리되어 있다 (서버에서 visit를 호출하지 않음).
- [x] 클라이언트에서 visit 호출은 fire-and-forget 방식으로 처리된다.

### 테스트 시나리오

1. **강제 실패 모드 테스트**:
   - 테스트 링크로 접속 (`__debug_visit_fail=1`)
   - Visit API가 500 에러 반환 확인
   - 등록/제출이 정상적으로 완료되는지 확인

2. **로그 확인**:
   - `[VisitTrackFail]` 로그가 남는지 확인
   - 등록 성공 후 `[VisitMissingOnConvert]` 로그가 남는지 확인

3. **스모크 테스트**:
   - `/api/health/visit-tracking?campaignId=...` 호출
   - `status: "healthy"` 응답 확인

---

## 구현 파일 목록

1. **Visit API**: `app/api/public/campaigns/[campaignId]/visit/route.ts`
   - 강제 실패 모드 추가
   - 구조화 로그 추가

2. **등록 API**: `app/api/public/event-survey/[campaignId]/register/route.ts`
   - Visit 누락 감지 로그 추가

3. **제출 API**: `app/api/public/event-survey/[campaignId]/submit/route.ts`
   - Visit 누락 감지 로그 추가

4. **스모크 테스트 API**: `app/api/health/visit-tracking/route.ts`
   - Visit 추적 시스템 헬스 체크

5. **UI**: `app/(client)/client/[clientId]/campaigns/components/CampaignLinksTab.tsx`
   - 테스트 링크 생성 기능 추가

---

## 환경 변수

### 개발 환경

```env
# .env.local
NODE_ENV=development
# 또는
DEBUG_VISIT_FAIL_ENABLED=true
```

### 프로덕션 환경

```env
# .env.production
DEBUG_VISIT_FAIL_ENABLED=false  # 기본값: false (보안)
```

---

## 주의사항

1. **보안**: 강제 실패 모드는 프로덕션에서 기본적으로 비활성화되어 있습니다.
2. **로그 볼륨**: 구조화 로그는 운영 중에도 계속 남으므로, 로그 볼륨을 모니터링하세요.
3. **사용자 경험**: Visit 실패는 사용자에게 보이지 않아야 합니다. 모든 에러는 서버 로그에만 남습니다.

---

**문서 버전**: 1.0  
**최종 업데이트**: 2026-01-28
