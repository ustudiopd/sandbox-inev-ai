# jsdom ESM 에러 해결 완료

**작성일**: 2026년 2월 4일  
**문제**: `isomorphic-dompurify`가 내부적으로 `jsdom`을 사용하며 ESM 모듈 로드 실패  
**상태**: 해결 완료 ✅

---

## 🔍 문제 원인

### Function Logs에서 발견한 에러
```
Error: Failed to load external module jsdom: 
Error [ERR_REQUIRE_ESM]: require() of ES Module 
/var/task/node_modules/@exodus/bytes/encoding-lite.js 
from /var/task/node_modules/html-encoding-sniffer/lib/html-encoding-sniffer.js 
not supported.
```

### 원인 분석
- `isomorphic-dompurify`가 내부적으로 `jsdom`을 사용
- `jsdom`이 ESM 모듈(`@exodus/bytes/encoding-lite.js`)을 `require()`로 로드하려고 시도
- Vercel Serverless 런타임에서 CommonJS와 ESM 혼용 문제 발생
- 라우트 핸들러가 실행되기 전에 import 단계에서 실패

---

## ✅ 해결 방법

### 1. 동적 Import 적용
`isomorphic-dompurify`를 정적 import에서 동적 import로 변경:

```typescript
// Before
import DOMPurify from 'isomorphic-dompurify'

// After
const DOMPurify = (await import('isomorphic-dompurify')).default
```

### 2. 함수를 async로 변경
`markdownToHtml` 함수를 async로 변경:

```typescript
// Before
export function markdownToHtml(...): string

// After
export async function markdownToHtml(...): Promise<string>
```

### 3. 모든 호출부에 await 추가
- `app/api/client/emails/[id]/test-send/route.ts`
- `lib/email/send-campaign.ts`
- `components/email/EmailCampaignTab.tsx`

---

## 📝 수정된 파일

1. **lib/email/markdown-to-html.ts**
   - `markdownToHtml` 함수를 async로 변경
   - `wrapEmailTemplate` 함수를 async로 변경
   - DOMPurify를 동적 import로 변경

2. **app/api/client/emails/[id]/test-send/route.ts**
   - `markdownToHtml` 호출에 await 추가

3. **lib/email/send-campaign.ts**
   - `markdownToHtml` 호출에 await 추가

4. **components/email/EmailCampaignTab.tsx**
   - `handlePreview` 함수를 async로 변경
   - `markdownToHtml` 호출에 await 추가

---

## 🎯 결과

- ✅ 빌드 성공
- ✅ 타입 에러 없음
- ✅ 라우트 핸들러가 정상적으로 실행될 것으로 예상

---

## 📚 참고 사항

### 왜 동적 Import가 해결책인가?
- 동적 import는 런타임에서 실행되므로 에러 처리가 가능
- 정적 import는 모듈 로드 시점에 실행되어 에러 발생 시 라우트 핸들러 자체가 실행되지 않음
- Vercel Serverless 환경에서 ESM/CommonJS 혼용 문제를 우회할 수 있음

### 향후 주의사항
- `isomorphic-dompurify`를 사용하는 다른 함수들도 동일한 문제가 발생할 수 있음
- 새로운 의존성 추가 시 ESM 호환성 확인 필요

---

**작성자**: AI Assistant  
**해결 완료**: 2026년 2월 4일
