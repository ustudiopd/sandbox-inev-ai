# test-send DoD (Definition of Done) 확인 가이드

**작성일**: 2026년 2월 4일

---

## ✅ DoD 체크리스트

### 1. POST /api/client/emails/{id}/test-send 응답 확인

**성공 기준**:
- ✅ HTTP 200 또는 의미있는 4xx (JSON 응답)
- ✅ `Content-Type: application/json`
- ✅ `X-Matched-Path: /api/client/emails/[id]/test-send` (❌ `/500` 아님)
- ❌ HTTP 405/500 HTML 응답이 아님

**확인 방법**:
```bash
# 브라우저 개발자 도구 → Network 탭
# 또는 curl (PowerShell에서는 JSON 이스케이프 주의)
curl.exe -i -X POST https://eventflow.kr/api/client/emails/{id}/test-send \
  -H "Content-Type: application/json" \
  -d '{\"testEmails\":[\"test@example.com\"]}'
```

**현재 상태**:
- ✅ 라우트 매칭: `X-Matched-Path: /api/client/emails/[id]/test-send`
- ✅ JSON 응답: `Content-Type: application/json`
- ⚠️ curl 테스트에서 JSON 파싱 에러 (PowerShell 이스케이프 문제일 수 있음)
- ✅ 실제 브라우저에서 메일 발송 정상 작동 (사용자 확인)

---

### 2. Function Logs에서 jsdom 에러 확인

**성공 기준**:
- ❌ `Failed to load external module jsdom` 에러 없음
- ❌ `ERR_REQUIRE_ESM` 에러 없음
- ✅ 정상적인 이메일 발송 로그만 존재

**확인 방법**:
1. Vercel Dashboard 접속
2. 프로젝트 선택 → Runtime Logs
3. 최근 로그 확인
4. `jsdom` 또는 `ERR_REQUIRE_ESM` 검색

**확인해야 할 키워드**:
- `Failed to load external module jsdom`
- `ERR_REQUIRE_ESM`
- `isomorphic-dompurify`
- `html-encoding-sniffer`

---

## 🔍 현재 해결 상태

### 적용된 해결책
1. ✅ `isomorphic-dompurify` → `sanitize-html` 교체
   - jsdom 의존성 완전 제거
   - 서버 사이드에서 안정적으로 작동

2. ✅ `markdownToHtml` 함수 동기화
   - async/await 제거
   - 코드 단순화

3. ✅ 빌드 성공 확인
   - 모든 라우트 정상 빌드

4. ✅ 실제 메일 발송 정상 작동 (사용자 확인)

---

## 📋 최종 확인 체크리스트

### 사용자가 확인해야 할 사항

- [ ] **Function Logs 확인**
  - Vercel Dashboard → Runtime Logs
  - 최근 test-send 호출 로그 확인
  - `jsdom` 또는 `ERR_REQUIRE_ESM` 에러가 없는지 확인

- [ ] **브라우저에서 테스트 발송**
  - 이메일 캠페인 페이지에서 테스트 발송 실행
  - 성공 메시지 확인
  - 실제 이메일 수신 확인

- [ ] **응답 형식 확인**
  - 브라우저 개발자 도구 → Network 탭
  - test-send 요청 확인
  - 응답이 JSON 형식인지 확인 (HTML이 아님)

---

## 🎯 DoD 달성 판정

### 완전히 해결된 경우
- ✅ Function Logs에 jsdom 에러 없음
- ✅ test-send가 200 또는 의미있는 4xx JSON 응답
- ✅ 실제 이메일 발송 정상 작동

### 추가 확인이 필요한 경우
- ⚠️ Function Logs에 여전히 jsdom 에러가 있다면
  - 로그의 전체 에러 메시지 공유 필요
  - 추가 조치 필요할 수 있음

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026년 2월 4일
