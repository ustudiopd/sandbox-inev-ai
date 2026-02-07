# S2(200명) Realtime 부하 테스트 실행 가이드

## 개요

S2 규모(200명)에서 Realtime 채팅/Q&A 부하 테스트를 실행하기 위한 단계별 가이드입니다.

## 사전 준비

### 1. 환경 변수 확인

`.env.local` 파일에 다음 변수가 설정되어 있어야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://eventflow.kr
# 또는
NEXT_PUBLIC_BASE_URL=https://eventflow.kr
```

### 2. Playwright 설치 확인

```bash
npm install -D @playwright/test playwright
npx playwright install chromium
```

### 3. 테스트 대상 웨비나 확인

- 웨비나 슬러그: `149400`
- 등록된 사용자 수: 최소 200명 이상

## 실행 방법

### 기본 실행 (10명 테스트)

```bash
npx playwright test tests/loadtest/realtime-s2.spec.ts --workers=2 --timeout=120000
```

### 특정 시나리오만 실행

```bash
# 시나리오 A만 실행
npx playwright test tests/loadtest/realtime-s2.spec.ts --grep "시나리오 A" --workers=2

# 시나리오 B만 실행
npx playwright test tests/loadtest/realtime-s2.spec.ts --grep "시나리오 B" --workers=2
```

### 헤드리스 모드 해제 (디버깅용)

```bash
npx playwright test tests/loadtest/realtime-s2.spec.ts --headed --workers=1
```

### 전체 200명 테스트 (리소스 많이 필요)

테스트 스크립트에서 `TEST_USER_COUNT`를 200으로 변경:

```typescript
const TEST_USER_COUNT = 200 // tests/loadtest/realtime-s2.spec.ts
```

그리고 실행:

```bash
npx playwright test tests/loadtest/realtime-s2.spec.ts --workers=10 --timeout=300000
```

## 테스트 시나리오

### 시나리오 A: Realtime 연결/구독 내구성

**목표**: 200명 모두 Realtime 채널 구독 성공

**측정 지표**:
- 구독 성공률 (%)
- 구독까지 걸린 시간 (p50, p95)
- CHANNEL_ERROR, CLOSED 이벤트 횟수

**DoD**:
- 구독 성공률 ≥ 99%
- 재연결 루프 없음

### 시나리오 B: 채팅 fan-out + 수신 확인

**목표**: 200명 중 100명은 2개, 100명은 1개 메시지 전송 (총 300msg), 모든 클라이언트가 수신 확인

**측정 지표**:
- 메시지 전송 성공률 (%)
- 메시지 수신 누락률 (%)
- 전송→수신 지연 (p95)
- 중복 수신률 (%)

**DoD**:
- 전송 성공률 ≥ 99.9%
- 수신 누락률 ≤ 0.5%
- 지연 p95 ≤ 2초

### 시나리오 C: Q&A 생성 + 관리자 반영

**목표**: 50명이 질문 1개씩 등록, 관리자 1명이 10개에 답변/고정/숨김 처리

**측정 지표**:
- 질문 생성 성공률 (%)
- 상태 변경 수신 지연 (p95)

**DoD**:
- 질문 생성 성공률 ≥ 99.9%
- 상태 반영 지연 p95 ≤ 3초

## 결과 확인

### 리포트 파일

테스트 실행 후 다음 위치에 리포트가 생성됩니다:

```
docs/loadtest/realtime-s2-report-{timestamp}.json
```

### 리포트 내용

- 테스트 실행 시간
- 웨비나 ID
- 각 시나리오별 지표:
  - 구독 성공률, 평균 시간, p95 시간
  - 메시지 전송 성공률, 수신 누락률, 지연
  - 질문 생성 성공률, 상태 변경 지연

## 문제 해결

### 1. 구독 실패

**증상**: 모든 사용자가 구독 실패

**원인**:
- Supabase 연결 제한 초과
- 네트워크 문제
- 웨비나 ID/Slug 오류

**해결**:
- Supabase 대시보드에서 연결 수 확인
- 네트워크 연결 확인
- 웨비나 ID/Slug 확인

### 2. 페이지 로드 실패

**증상**: `page.goto` 타임아웃

**원인**:
- 서버 응답 지연
- 리다이렉트 루프

**해결**:
- 타임아웃 시간 증가 (`--timeout=300000`)
- 워커 수 감소 (`--workers=1`)
- 헤드리스 모드 해제하여 실제 동작 확인

### 3. 메시지 수신 실패

**증상**: 메시지 전송은 성공하지만 수신 확인 실패

**원인**:
- Realtime Broadcast 전파 지연
- 클라이언트 측 구독 실패

**해결**:
- 수신 대기 시간 증가
- Supabase Realtime 로그 확인

## 주의사항

1. **리소스 사용량**: 200명 동시 테스트는 CPU/메모리/네트워크 대역폭을 많이 사용합니다.
2. **Supabase 제한**: Supabase 무료 플랜은 동시 연결 수 제한이 있을 수 있습니다.
3. **테스트 환경**: 프로덕션 환경에서 테스트할 경우 실제 사용자에게 영향을 줄 수 있습니다.

## 다음 단계

테스트 성공 후:
1. S3(500명) 테스트로 확장
2. S4(1000명) 테스트로 확장
3. 시나리오 E (장애 상황 테스트) 추가
