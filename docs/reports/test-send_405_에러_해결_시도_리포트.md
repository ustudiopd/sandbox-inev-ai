# test-send 라우트 405 에러 해결 시도 리포트

**작성일**: 2026년 2월 4일  
**문제**: `/api/client/emails/[id]/test-send` 라우트에서 405 에러 발생  
**상태**: 진행 중 (미해결)

---

## 📋 문제 상황 요약

### 증상
- **GET 요청**: 500 에러 + `X-Matched-Path: /500`
- **POST 요청**: 405 에러 + `X-Matched-Path: /500`
- **핵심 문제**: 라우트 핸들러가 실행되지 않음 (라우트 매칭 실패)

### 환경
- **프로덕션**: Vercel (eventflow.kr)
- **프레임워크**: Next.js 16.0.10
- **런타임**: Node.js 24.x (Vercel 자동 선택)

---

## 🔍 원인 분석 및 시도한 해결 방법

### 1. Route Handler params 시그니처 문제 (가설 1)

#### 문제 가설
- Next.js 16에서 `params: Promise<{ id: string }>` 형태가 Vercel 프로덕션에서 작동하지 않을 수 있음
- `params: { id: string }` 형태로 변경 필요

#### 시도한 방법
1. `params: Promise<{ id: string }>` → `params: { id: string }` 변경
2. `await params` 제거

#### 결과
- ❌ **실패**: Vercel 빌드 타입 에러 발생
- **에러 메시지**: `Type 'typeof import(...)' does not satisfy the constraint 'RouteHandlerConfig'`
- **결론**: Next.js 16 타입 정의가 `Promise`를 요구함

#### 커밋
- `c404187`: test-send route params 시그니처 수정 (Vercel 프로덕션 호환)

---

### 2. 타입 우회 시도 (가설 2)

#### 문제 가설
- 타입 체크를 우회하여 런타임에서 작동하도록 시도

#### 시도한 방법
1. `context: any` 사용
2. 런타임에서 Promise/일반 객체 둘 다 처리

#### 결과
- ✅ **빌드 성공**: 로컬 빌드 통과
- ❌ **프로덕션 실패**: 여전히 `X-Matched-Path: /500` 발생
- **결론**: 타입 문제가 아니라 다른 원인

#### 커밋
- `a7d7c66`: test-send route 타입 우회 (Vercel 빌드 호환)

---

### 3. 라우트 재생성 (가설 3)

#### 문제 가설
- 라우트 인덱싱 문제로 인해 Vercel이 라우트를 인식하지 못함
- 파일 삭제 후 재생성으로 라우트 인덱싱 리셋

#### 시도한 방법
1. `app/api/client/emails/[id]/test-send/route.ts` 삭제
2. 동일한 내용으로 재생성

#### 결과
- ✅ **빌드 성공**: 로컬 빌드 통과
- ❌ **프로덕션 실패**: 여전히 `X-Matched-Path: /500` 발생
- **결론**: 라우트 인덱싱 문제가 아님

#### 커밋
- `78e73ae`: test-send route 재생성 (라우트 인덱싱 리셋)

---

### 4. export const dynamic 제거 (가설 4)

#### 문제 가설
- `export const dynamic = 'force-dynamic'`이 문제를 일으킬 수 있음
- 정상 작동하는 `register-request` 라우트에는 이 선언이 없음

#### 시도한 방법
1. `export const dynamic = 'force-dynamic'` 제거
2. GET 핸들러 제거 (register-request와 동일한 구조)

#### 결과
- ✅ **빌드 성공**: 로컬 빌드 통과
- ❌ **프로덕션 실패**: 여전히 `X-Matched-Path: /500` 발생
- **결론**: `dynamic` 선언이 직접적인 원인은 아님

#### 커밋
- `f466814`: test-send route 구조 정리 (register-request 참고)

---

### 5. USLab 방식 적용 (가설 5)

#### 문제 가설
- USLab 프로젝트의 정상 작동하는 라우트 구조를 참고
- `NextRequest`, `NextResponse` 사용
- `export const runtime` 제거

#### 시도한 방법
1. `Request` → `NextRequest` 변경
2. `export const runtime = 'nodejs'` 제거
3. 에러 처리 및 로깅 개선

#### 결과
- ✅ **빌드 성공**: 로컬 빌드 통과
- ❌ **프로덕션 실패**: 여전히 `X-Matched-Path: /500` 발생
- **결론**: USLab 방식도 해결하지 못함

#### 커밋
- `745cec6`: test-send route USLab 방식으로 수정

---

### 6. approve 라우트와 동일한 구조 (가설 6)

#### 문제 가설
- `approve` 라우트는 정상 작동함 (`X-Matched-Path: /api/client/emails/[id]/approve`)
- `test-send`를 `approve`와 완전히 동일한 구조로 변경

#### 시도한 방법
1. `NextRequest` → `Request` 복원
2. `export const runtime = 'nodejs'` 추가
3. 에러 처리 방식 통일

#### 결과
- ✅ **빌드 성공**: 로컬 빌드 통과
- ⏳ **프로덕션 테스트 대기**: 배포 완료 후 확인 필요

#### 커밋
- `56c77e5`: test-send route approve와 동일한 구조로 변경

---

## 📊 비교 분석

### 정상 작동하는 라우트들

| 라우트 | X-Matched-Path | 상태 |
|--------|----------------|------|
| `/api/client/emails/[id]/approve` | `/api/client/emails/[id]/approve` | ✅ 정상 |
| `/api/client/emails/[id]` | `/api/client/emails/[id]` | ✅ 정상 |
| `/api/webinars/[webinarId]/register-request` | 정상 | ✅ 정상 |

### 문제가 있는 라우트들

| 라우트 | X-Matched-Path | 상태 |
|--------|----------------|------|
| `/api/client/emails/[id]/test-send` | `/500` | ❌ 실패 |
| `/api/client/emails/[id]/send` | `/500` | ❌ 실패 |

### 공통점 분석

#### 정상 작동하는 라우트 (`approve`)
- `export const runtime = 'nodejs'` ✅
- `Request` 타입 사용 ✅
- `params: Promise<{ id: string }>` ✅
- `await params` 사용 ✅
- **간단한 로직**: 복잡한 import 없음

#### 실패하는 라우트 (`test-send`, `send`)
- `export const runtime = 'nodejs'` ✅
- `Request` 타입 사용 ✅
- `params: Promise<{ id: string }>` ✅
- `await params` 사용 ✅
- **복잡한 import**: `sendEmailViaResend`, `getCampaignEmailPolicy` 등

---

## 🎯 핵심 발견사항

### 1. 라우트 구조는 문제가 아님
- `approve`와 동일한 구조로 변경해도 여전히 실패
- 라우트 핸들러 시그니처는 정상

### 2. Import 의존성 문제 가능성
- `test-send`와 `send`는 모두 복잡한 import 사용
- `sendEmailViaResend`, `getCampaignEmailPolicy` 등
- 런타임에서 import 실패 시 라우트 실행 불가

### 3. 빌드 vs 런타임 불일치
- 로컬 빌드: 성공 ✅
- 프로덕션 빌드: 성공 ✅ (배포 로그 확인)
- 프로덕션 런타임: 실패 ❌

### 4. Vercel Function Logs 확인 필요
- 빌드 로그에는 에러 없음
- 런타임 에러는 Function Logs에서만 확인 가능
- **다음 단계**: Vercel Function Logs 확인 필수

---

## 📝 시도한 모든 커밋 내역

1. `c404187`: test-send route params 시그니처 수정 (Vercel 프로덕션 호환)
2. `78e73ae`: test-send route 재생성 (라우트 인덱싱 리셋)
3. `a7d7c66`: test-send route 타입 우회 (Vercel 빌드 호환)
4. `aeceb69`: test-send route 원래 패턴으로 복원
5. `f466814`: test-send route 구조 정리 (register-request 참고)
6. `745cec6`: test-send route USLab 방식으로 수정
7. `56c77e5`: test-send route approve와 동일한 구조로 변경

---

## 🔬 기술적 분석

### 빌드 상태
- ✅ **로컬 빌드**: 항상 성공
- ✅ **Vercel 빌드**: 성공 (배포 로그 확인)
- ✅ **라우트 포함**: 빌드 로그에 `/api/client/emails/[id]/test-send` 명시적으로 포함

### 런타임 상태
- ❌ **라우트 매칭**: 실패 (`X-Matched-Path: /500`)
- ❌ **핸들러 실행**: 실행되지 않음

### 가능한 원인 (우선순위 순)

#### 1. 런타임 Import 에러 (가장 가능성 높음)
- `sendEmailViaResend` 또는 `getCampaignEmailPolicy` import 실패
- 환경 변수 누락 (`RESEND_API_KEY` 등)
- 의존성 모듈 로드 실패

#### 2. Vercel Function 제한
- 함수 크기 제한 초과
- 메모리 제한 초과
- 타임아웃 발생

#### 3. 미들웨어/프록시 문제
- `middleware.ts`가 라우트를 가로챔
- `next.config.ts`의 rewrites 문제

#### 4. Vercel 배포 캐시 문제
- 이전 빌드 캐시가 남아있음
- 라우트 인덱싱 캐시 문제

---

## 🛠️ 다음 단계 권장사항

### 즉시 확인 필요 (P0)

1. **Vercel Function Logs 확인**
   ```
   Vercel 대시보드 → Deployments → 최신 배포
   → Function Logs 탭
   → test-send 호출 시 에러 확인
   ```
   - 런타임 에러 메시지 확인
   - 스택 트레이스 확인
   - Import 에러 여부 확인

2. **환경 변수 확인**
   - `RESEND_API_KEY` 설정 여부 확인
   - Vercel 대시보드 → Settings → Environment Variables

### 추가 확인 (P1)

3. **로컬 프로덕션 서버 테스트**
   ```bash
   npm run build
   npm run start
   curl -i http://localhost:3000/api/client/emails/ffcfb8bb-5906-49e7-89ff-ded295851a86/test-send
   ```
   - 로컬에서도 동일한 문제 발생하는지 확인

4. **Import 의존성 확인**
   - `lib/email/resend.ts` 파일 확인
   - `lib/email/send-campaign.ts` 파일 확인
   - 런타임에서 로드 가능한지 확인

5. **Vercel 빌드 캐시 정리**
   ```
   Vercel 대시보드 → Settings → General
   → "Clear Build Cache" 클릭
   → 재배포
   ```

### 대안 (P2)

6. **라우트 분리 테스트**
   - `test-send` 라우트를 최소한의 코드로 테스트
   - 복잡한 import 없이 기본 응답만 반환
   - 단계적으로 기능 추가

7. **다른 라우트와 비교**
   - `send` 라우트도 동일한 문제 발생
   - 두 라우트의 공통점 분석
   - Import 의존성 비교

---

## 📚 참고 문서

- `docs/테스트_발송_405_에러_명세서.md` - 초기 문제 분석
- `docs/curl_테스트_결과_분석.md` - 프로덕션 테스트 결과
- `docs/빌드_에러_분석_결과.md` - 빌드 상태 분석
- `docs/test-send_문제_분석.md` - 문제 분석
- `EventLive_vs_USLab_이메일발송라우터_비교분석.md` - USLab 비교 분석
- `docs/NextJS_App_Router_API_헌법.md` - Next.js 라우트 작성 가이드

---

## 🎯 결론

### 현재 상태
- **빌드**: 성공 ✅
- **라우트 구조**: 정상 ✅
- **프로덕션 런타임**: 실패 ❌

### 핵심 문제
라우트 핸들러가 런타임에서 실행되지 않음. 빌드는 성공하지만, 실제 요청 시 라우트 매칭이 실패하여 `/500` 에러 페이지로 리다이렉트됨.

### 가장 가능성 높은 원인
**런타임 Import 에러**: `sendEmailViaResend` 또는 관련 의존성 모듈이 런타임에서 로드되지 않아 라우트 핸들러 자체가 실행되지 않을 가능성이 높음.

### 다음 조치
**Vercel Function Logs 확인**이 가장 중요합니다. 런타임 에러 메시지를 확인하면 정확한 원인을 파악할 수 있습니다.

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026년 2월 4일  
**상태**: 진행 중 (Vercel Function Logs 확인 대기)
