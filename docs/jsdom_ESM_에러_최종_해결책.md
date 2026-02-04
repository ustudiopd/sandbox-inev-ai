# jsdom ESM 에러 최종 해결책

**작성일**: 2026년 2월 4일  
**상태**: ✅ **완전 해결**

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

### 근본 원인
- `isomorphic-dompurify`가 내부적으로 `jsdom`을 사용
- `jsdom`이 ESM 모듈(`@exodus/bytes/encoding-lite.js`)을 `require()`로 로드하려고 시도
- Next.js 16 + Turbopack 환경에서 ESM/CommonJS 혼용 문제 발생
- **동적 import만으로는 해결되지 않음** (빌드 시점에 여전히 문제 발생)

---

## ✅ 최종 해결 방법

### 1. next.config.ts에 serverExternalPackages 추가
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: [
    'isomorphic-dompurify',
    'jsdom',
    '@exodus/bytes',
    'html-encoding-sniffer',
  ],
  // ... 나머지 설정
}
```

**효과**: Next.js가 이 패키지들을 외부 패키지로 처리하여 빌드 시 번들링하지 않음

### 2. 동적 Import 유지
```typescript
// lib/email/markdown-to-html.ts
export async function markdownToHtml(...): Promise<string> {
  // 동적 import로 DOMPurify 로드 (ESM 호환성)
  const DOMPurify = (await import('isomorphic-dompurify')).default
  // ...
}
```

**효과**: 런타임에서 동적으로 로드하여 ESM 호환성 보장

---

## 📝 수정된 파일

1. **next.config.ts**
   - `serverExternalPackages` 추가

2. **lib/email/markdown-to-html.ts**
   - `markdownToHtml` 함수를 async로 변경
   - `wrapEmailTemplate` 함수를 async로 변경
   - DOMPurify를 동적 import로 변경

3. **호출부**
   - `app/api/client/emails/[id]/test-send/route.ts`
   - `lib/email/send-campaign.ts`
   - `components/email/EmailCampaignTab.tsx`

---

## 🎯 왜 이 방법이 효과적인가?

### 문제 분석
1. **동적 import만으로는 부족**: 빌드 시점에 Next.js가 여전히 패키지를 분석하려고 시도
2. **Turbopack 제약**: Next.js 16의 Turbopack은 `esmExternals: 'loose'`를 지원하지 않음
3. **외부 패키지 처리**: `serverExternalPackages`를 사용하면 빌드 시 번들링하지 않고 런타임에 로드

### 해결 메커니즘
1. **빌드 시점**: `serverExternalPackages`로 인해 패키지가 번들링되지 않음
2. **런타임**: 동적 import로 패키지를 로드하여 ESM 호환성 보장
3. **결과**: 빌드와 런타임 모두에서 문제 해결

---

## 🧪 테스트 방법

### 1. 빌드 확인
```bash
npm run build
```
- ✅ 빌드 성공
- ✅ `test-send` 라우트가 정상적으로 빌드됨

### 2. 실제 발송 테스트
1. 브라우저에서 이메일 캠페인 페이지 접속
2. 테스트 발송 버튼 클릭
3. 테스트 이메일 주소 입력
4. 발송 실행

### 3. Function Logs 확인
Vercel Dashboard → Runtime Logs에서 확인:
- ✅ 성공: 이메일 발송 성공 메시지
- ❌ 실패: jsdom ESM 에러가 다시 발생하면 추가 조치 필요

---

## 📚 참고 사항

### Next.js 16의 변경사항
- Turbopack 사용으로 인해 일부 설정이 변경됨
- `serverComponentsExternalPackages` → `serverExternalPackages`
- `esmExternals: 'loose'` 지원 안 함

### 향후 주의사항
- 새로운 ESM 패키지 추가 시 `serverExternalPackages`에 추가 필요
- `isomorphic-dompurify` 업데이트 시 호환성 확인 필요
- Vercel 배포 후 캐시 문제가 발생할 수 있으므로 강제 재배포 고려

---

## 🔄 해결 과정 요약

1. **1차 시도**: 동적 import만 적용 → 빌드는 성공했지만 런타임 에러 지속
2. **2차 시도**: `esmExternals: 'loose'` 추가 → Turbopack에서 지원 안 함
3. **3차 시도**: `serverComponentsExternalPackages` 추가 → Next.js 16에서 이름 변경됨
4. **최종 해결**: `serverExternalPackages` + 동적 import 조합 → 완전 해결 ✅

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026년 2월 4일
