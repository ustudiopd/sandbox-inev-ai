# test-send 라우트 문제 분석

**작성일**: 2026년 2월 4일  
**상태**: 진행 중

---

## 문제 현상

### 프로덕션에서의 증상
- GET 요청 → 500 + `X-Matched-Path: /500`
- POST 요청 → 405 + `X-Matched-Path: /500`
- **라우트 핸들러가 실행되지 않음**

### 로컬 빌드
- ✅ 빌드 성공
- ✅ 라우트 파일 존재: `.next/server/app/api/client/emails/[id]/test-send/route.js`
- ✅ 빌드 로그에 라우트 포함됨

---

## 시도한 해결 방법

### 1. params 시그니처 변경 시도
- `params: Promise<{ id: string }>` → `params: { id: string }`
- 결과: Vercel 빌드 타입 에러 발생

### 2. 타입 우회 시도
- `context: any` 사용
- 결과: 빌드는 성공했지만 프로덕션에서 여전히 작동하지 않음

### 3. 라우트 재생성
- 파일 삭제 후 재생성
- 결과: 여전히 작동하지 않음

### 4. 원래 패턴으로 복원
- `params: Promise<{ id: string }>` 패턴으로 복원
- 다른 라우트들(send, approve 등)과 동일한 시그니처 사용
- 현재 상태: 배포 대기 중

---

## 다른 라우트들과의 비교

### 정상 작동하는 라우트들
- `app/api/client/emails/[id]/send/route.ts` - `params: Promise<{ id: string }>`
- `app/api/client/emails/[id]/approve/route.ts` - `params: Promise<{ id: string }>`
- `app/api/client/emails/[id]/route.ts` - `params: Promise<{ id: string }>`
- `app/api/client/emails/[id]/audience-list/route.ts` - `params: Promise<{ id: string }>`

### test-send 라우트
- 현재: `params: Promise<{ id: string }>` (다른 라우트들과 동일)

---

## 가능한 원인

### 1. Vercel 배포 캐시 문제
- 이전 빌드 캐시가 남아있을 수 있음
- 해결: Vercel 대시보드에서 빌드 캐시 정리

### 2. 라우트 인덱싱 문제
- Vercel이 라우트를 인식하지 못함
- 해결: 빈 커밋으로 강제 재배포

### 3. 미들웨어/프록시 문제
- `middleware.ts`가 라우트를 가로챌 수 있음
- 해결: 미들웨어 로직 확인

### 4. 파일 시스템 문제
- 파일 이름이나 경로에 특수 문자 문제
- 해결: 파일 재생성

---

## 다음 단계

### 1. 배포 완료 후 확인
현재 원래 패턴으로 복원한 버전이 배포 중입니다. 배포 완료 후 다시 테스트:

```bash
curl -i https://eventflow.kr/api/client/emails/ffcfb8bb-5906-49e7-89ff-ded295851a86/test-send
```

### 2. 여전히 실패하는 경우
1. **Vercel 빌드 캐시 정리**
   - Vercel 대시보드 → Settings → General
   - "Clear Build Cache" 클릭
   - 재배포

2. **Vercel 배포 로그 확인**
   - Vercel 대시보드 → Deployments → 최신 배포
   - Build Logs 확인
   - Function Logs 확인 (특히 런타임 에러)

3. **미들웨어 확인**
   - `middleware.ts` 파일 확인
   - 라우트를 가로채는 로직이 있는지 확인

4. **다른 라우트와의 차이점 확인**
   - `send/route.ts`와 `test-send/route.ts` 비교
   - 파일 구조, export 방식 등 차이점 확인

---

## 참고 사항

- 사용자가 제시한 해결책("params: Promise<> 제거")을 시도했지만, 실제로는 다른 라우트들이 모두 `Promise`를 사용하고 있어서 원래 패턴으로 복원했습니다.
- 문제는 타입 시그니처가 아니라 다른 곳에 있을 가능성이 높습니다.

---

**작성자**: AI Assistant  
**다음 확인 시점**: 배포 완료 후
