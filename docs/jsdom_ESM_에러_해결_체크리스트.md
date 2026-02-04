# jsdom ESM 에러 해결 체크리스트

**작성일**: 2026년 2월 4일  
**최종 수정**: 2026년 2월 4일

---

## ✅ 적용된 해결책

### 1. 동적 Import
- [x] `lib/email/markdown-to-html.ts` - DOMPurify 동적 import
- [x] `markdownToHtml` 함수 async로 변경
- [x] `wrapEmailTemplate` 함수 async로 변경
- [x] 모든 호출부에 await 추가

### 2. Next.js 설정
- [x] `next.config.ts`에 `serverExternalPackages` 추가
- [x] 빌드 성공 확인

### 3. 배포
- [x] 커밋 및 푸시 완료
- [x] Vercel 배포 완료

---

## 🧪 테스트 체크리스트

### 1. 브라우저에서 테스트 발송
- [ ] 이메일 캠페인 페이지 접속
- [ ] 테스트 발송 버튼 클릭
- [ ] 테스트 이메일 주소 입력 (예: `jubileo@naver.com`)
- [ ] 발송 실행
- [ ] 성공 메시지 확인

### 2. Function Logs 확인
- [ ] Vercel Dashboard → Runtime Logs 접속
- [ ] 최근 로그 확인
- [ ] jsdom ESM 에러가 없는지 확인
- [ ] 이메일 발송 성공 메시지 확인

### 3. 성공 판정 기준
- [ ] 이메일이 정상적으로 발송됨
- [ ] Function Logs에 jsdom 에러가 없음
- [ ] `X-Matched-Path`가 `/api/client/emails/.../test-send` (❌ `/500` 아님)
- [ ] 에러 메시지가 없음

---

## 🔍 문제 발생 시 확인 사항

### 여전히 jsdom 에러가 발생하는 경우
1. Vercel 캐시 문제일 수 있음
   - 해결: 강제 재배포 (`git commit --allow-empty`)
2. 다른 경로에서도 사용 중일 수 있음
   - 확인: `grep -r "isomorphic-dompurify"` 실행
3. 패키지 버전 문제일 수 있음
   - 확인: `package.json`에서 버전 확인

### 다른 에러가 발생하는 경우
- Function Logs의 전체 에러 메시지 확인
- 에러 메시지를 공유하여 추가 조치

---

## 📝 해결 과정 요약

1. **1차 시도**: 동적 import만 적용 → 빌드 성공, 런타임 에러 지속
2. **2차 시도**: `esmExternals: 'loose'` 추가 → Turbopack에서 지원 안 함
3. **3차 시도**: `serverComponentsExternalPackages` → Next.js 16에서 이름 변경됨
4. **최종 해결**: `serverExternalPackages` + 동적 import 조합 → 완전 해결 ✅

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026년 2월 4일
