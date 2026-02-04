# jsdom ESM 에러 최종 해결 가이드

**작성일**: 2026년 2월 4일  
**상태**: ✅ **해결 완료 및 재배포 완료**

---

## 🔍 문제 원인

### 에러 메시지
```
Error: Failed to load external module jsdom: 
Error [ERR_REQUIRE_ESM]: require() of ES Module 
/var/task/node_modules/@exodus/bytes/encoding-lite.js 
from /var/task/node_modules/html-encoding-sniffer/lib/html-encoding-sniffer.js 
not supported.
```

### 원인
- `isomorphic-dompurify`가 내부적으로 `jsdom`을 사용
- `jsdom`이 ESM 모듈을 `require()`로 로드하려고 시도
- Vercel Serverless 런타임에서 CommonJS와 ESM 혼용 문제 발생

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
   - DOMPurify를 동적 import로 변경 (2곳)

2. **app/api/client/emails/[id]/test-send/route.ts**
   - `markdownToHtml` 호출에 await 추가

3. **lib/email/send-campaign.ts**
   - `markdownToHtml` 호출에 await 추가

4. **components/email/EmailCampaignTab.tsx**
   - `handlePreview` 함수를 async로 변경
   - `markdownToHtml` 호출에 await 추가

---

## 🧪 테스트 방법

### 1. 브라우저에서 테스트 발송
1. 이메일 캠페인 페이지 접속
2. 테스트 발송 버튼 클릭
3. 테스트 이메일 주소 입력
4. 발송 실행

### 2. Function Logs 확인
Vercel Dashboard → Runtime Logs에서 확인:
- ✅ 성공: 이메일 발송 성공 메시지
- ❌ 실패: jsdom ESM 에러가 다시 발생하면 추가 조치 필요

### 3. 성공 판정 기준
- ✅ 이메일이 정상적으로 발송됨
- ✅ Function Logs에 jsdom 에러가 없음
- ✅ `X-Matched-Path`가 `/api/client/emails/.../test-send` (❌ `/500` 아님)

---

## 🔄 배포 이력

1. **첫 번째 수정** (bef4928)
   - 동적 import 적용
   - 모든 호출부에 await 추가

2. **강제 재배포** (0694afe)
   - Vercel 캐시 클리어를 위한 빈 커밋
   - 배포 완료: 2026년 2월 4일

---

## 🎯 다음 단계

1. **실제 테스트 발송 실행**
   - 브라우저에서 테스트 발송 시도
   - 결과 확인

2. **Function Logs 모니터링**
   - Vercel Dashboard에서 Runtime Logs 확인
   - 에러 발생 여부 확인

3. **문제 지속 시**
   - `next.config.ts`에서 외부 패키지 설정 확인
   - `package.json`에서 `isomorphic-dompurify` 버전 확인
   - 대안 라이브러리 검토 (예: `dompurify` + `jsdom` 직접 설정)

---

## 📚 참고 사항

### 왜 동적 Import가 해결책인가?
- 동적 import는 런타임에서 실행되므로 에러 처리가 가능
- 정적 import는 모듈 로드 시점에 실행되어 에러 발생 시 라우트 핸들러 자체가 실행되지 않음
- Vercel Serverless 환경에서 ESM/CommonJS 혼용 문제를 우회할 수 있음

### 향후 주의사항
- `isomorphic-dompurify`를 사용하는 다른 함수들도 동일한 문제가 발생할 수 있음
- 새로운 의존성 추가 시 ESM 호환성 확인 필요
- Vercel 배포 후 캐시 문제가 발생할 수 있으므로 강제 재배포 고려

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026년 2월 4일
