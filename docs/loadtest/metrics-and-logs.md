# 부하 테스트 지표 및 로그 수집 가이드

## 개요

Realtime 채팅/Q&A 부하 테스트에서 수집해야 할 지표와 로그, 그리고 각 지표의 목표값(DoD)을 정의합니다.

---

## 1. API 계층 지표

### 1.1 HTTP API 성공률

**측정 위치**: k6/Artillery 결과 리포트

**지표**:
- `(200/201/204 응답 수) / (전체 요청 수) * 100`

**DoD**:
- ✅ 99.9%+ (시나리오 A~D)
- ✅ 99%+ (시나리오 E - 장애 상황)

**로그 위치**:
- k6 결과: `summary.http_req_duration` + `summary.http_req_failed`
- Artillery 결과: `latencies` + `errors`

---

### 1.2 HTTP 에러 분류

**측정 위치**: k6/Artillery 결과 리포트

**지표**:
- 400 (Bad Request) 횟수
- 401 (Unauthorized) 횟수
- 409 (Conflict) 횟수
- 500 (Server Error) 횟수
- 기타 (네트워크 오류 등) 횟수

**DoD**:
- ✅ 400/401/409/500 모두 0 (허용 오차: 전체의 0.1% 이하)

**로그 위치**:
- k6: `summary.http_req_failed` (상태 코드별 분류)
- Artillery: `errors` (상태 코드별 분류)

---

### 1.3 API 응답 시간

**측정 위치**: k6/Artillery 결과 리포트

**지표**:
- p50 (중앙값)
- p95 (95 백분위수)
- p99 (99 백분위수)
- max (최대값)

**DoD** (엔드포인트별):
- ✅ `/api/webinars/{id}/enter`: p95 < 1초
- ✅ `/api/messages`: p95 < 500ms
- ✅ `/api/questions`: p95 < 500ms
- ✅ `/api/questions/{id}` (PATCH): p95 < 1초
- ✅ `/api/webinars/{id}/presence/ping`: p95 < 500ms
- ✅ `/api/webinars/{id}/stats/access`: p95 < 1초

**로그 위치**:
- k6: `summary.http_req_duration`
- Artillery: `latencies`

---

## 2. Realtime 계층 지표

### 2.1 채널 구독 성공률

**측정 위치**: Playwright 브라우저 콘솔 로그

**지표**:
- `(SUBSCRIBED 이벤트 수) / (전체 구독 시도 수) * 100`

**DoD**:
- ✅ 99%+ (시나리오 A)

**로그 수집 방법**:
```javascript
// Playwright 테스트 코드에서
page.on('console', msg => {
  if (msg.text().includes('✅ 실시간 구독 성공')) {
    subscribedCount++
  }
  if (msg.text().includes('❌ 실시간 구독 오류')) {
    errorCount++
  }
})
```

**검색 키워드**:
- `✅ 실시간 구독 성공`
- `❌ 실시간 구독 오류`
- `CHANNEL_ERROR`
- `TIMED_OUT`
- `CLOSED`

---

### 2.2 구독까지 걸린 시간

**측정 위치**: Playwright 브라우저 콘솔 로그 또는 성능 타이밍

**지표**:
- p50, p95, p99 (밀리초)

**DoD**:
- ✅ p95 < 5초 (시나리오 A)

**로그 수집 방법**:
```javascript
const subscribeStart = Date.now()
// 채널 구독 시작
await page.evaluate(() => {
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve(Date.now() - subscribeStart)
      }
    })
  })
})
```

---

### 2.3 메시지 수신 누락률

**측정 위치**: Playwright 브라우저 콘솔 로그 또는 메시지 카운트

**지표**:
- `(전송된 메시지 수 - 수신된 메시지 수) / 전송된 메시지 수 * 100`

**DoD**:
- ✅ < 0.1% (시나리오 B)

**로그 수집 방법**:
```javascript
// 각 페이지에서 수신한 메시지 수 카운트
const receivedMessages = []
page.on('console', msg => {
  if (msg.text().includes('실시간 Broadcast 이벤트:')) {
    const mid = extractMid(msg.text())
    if (!receivedMessages.includes(mid)) {
      receivedMessages.push(mid)
    }
  }
})
```

**검색 키워드**:
- `실시간 Broadcast 이벤트:`
- `중복 envelope(mid) 무시:`

---

### 2.4 메시지 전송→수신 지연

**측정 위치**: Playwright 브라우저 콘솔 로그 또는 타임스탬프 비교

**지표**:
- p50, p95, p99 (밀리초)

**DoD**:
- ✅ p95 < 2초 (시나리오 B)

**로그 수집 방법**:
```javascript
// 전송 시 타임스탬프 기록
const sendTime = Date.now()
await page.evaluate(() => {
  // 메시지 전송
})

// 수신 시 타임스탬프 비교
page.on('console', msg => {
  if (msg.text().includes('실시간 Broadcast 이벤트:')) {
    const receiveTime = Date.now()
    const latency = receiveTime - sendTime
    latencies.push(latency)
  }
})
```

---

### 2.5 재연결 루프 발생 여부

**측정 위치**: Playwright 브라우저 콘솔 로그

**지표**:
- SUBSCRIBED → CLOSED → SUBSCRIBED 반복 횟수 (클라이언트당)

**DoD**:
- ✅ 0 (시나리오 A, E)

**로그 수집 방법**:
```javascript
let subscribeCount = 0
let closeCount = 0
page.on('console', msg => {
  if (msg.text().includes('✅ 실시간 구독 성공')) {
    subscribeCount++
  }
  if (msg.text().includes('🔒 실시간 구독 종료')) {
    closeCount++
  }
})
// subscribeCount가 closeCount보다 2배 이상이면 재연결 루프 의심
```

**검색 키워드**:
- `✅ 실시간 구독 성공`
- `🔒 실시간 구독 종료`
- `⚠️ 실시간 구독 실패`
- `재시도`

---

## 3. 데이터베이스 계층 지표

### 3.1 DB 연결 수

**측정 위치**: Supabase 대시보드 → Database → Connection Pooling

**지표**:
- 현재 활성 연결 수
- 최대 연결 수
- 연결 풀 사용률

**DoD**:
- ✅ 연결 풀 사용률 < 80% (시나리오 D)
- ✅ 연결 수 폭증 없음 (정상 대비 2배 이하)

**모니터링 방법**:
1. Supabase 대시보드 접속
2. Database → Connection Pooling 메뉴
3. 실시간 그래프 확인

---

### 3.2 DB CPU 사용률

**측정 위치**: Supabase 대시보드 → Database → Performance

**지표**:
- CPU 사용률 (%)
- 평균, 최대값

**DoD**:
- ✅ < 80% (장기간, 시나리오 D)
- ✅ < 90% (단기간 허용)

**모니터링 방법**:
1. Supabase 대시보드 접속
2. Database → Performance 메뉴
3. CPU 사용률 그래프 확인

---

### 3.3 DB 쿼리 수

**측정 위치**: Supabase 대시보드 → Database → Logs 또는 Query Performance

**지표**:
- 초당 쿼리 수 (QPS)
- 평균, 최대값

**DoD**:
- ✅ 정상 대비 1.5배 이하 (시나리오 D)
- ✅ 정상 대비 3배 이상이면 실패 (시나리오 E)

**모니터링 방법**:
1. Supabase 대시보드 접속
2. Database → Logs 메뉴
3. 쿼리 로그 필터링 (시간대별)

**검색 키워드**:
- `SELECT` (읽기 쿼리)
- `INSERT` (쓰기 쿼리)
- `UPDATE` (업데이트 쿼리)

---

## 4. 애플리케이션 로그

### 4.1 서버 로그 (Next.js)

**위치**: Vercel 대시보드 또는 로컬 실행 시 콘솔

**중요 로그 패턴**:
- `[Presence Ping API]`: Presence ping 관련
- `[Access Track]`: 접속 추적 관련
- `[Presence Ping]`: Presence ping 처리 관련
- `[Broadcast]`: 브로드캐스트 관련 (있다면)

**검색 키워드**:
- `오류`
- `실패`
- `에러`
- `ERROR`
- `FAILED`

---

### 4.2 클라이언트 로그 (브라우저 콘솔)

**위치**: Playwright 브라우저 콘솔 또는 실제 브라우저 개발자 도구

**중요 로그 패턴**:
- `✅ 실시간 구독 성공`: 구독 성공
- `❌ 실시간 구독 오류`: 구독 실패
- `⏱️ 실시간 구독 타임아웃`: 타임아웃
- `🔒 실시간 구독 종료`: 구독 종료
- `실시간 Broadcast 이벤트:`: 메시지 수신
- `중복 envelope(mid) 무시:`: 중복 제거 작동
- `[Presence Ping]`: Presence ping 전송

**검색 키워드**:
- `실시간`
- `Broadcast`
- `구독`
- `Presence Ping`
- `오류`
- `에러`

---

### 4.3 Supabase Realtime 로그

**위치**: Supabase 대시보드 → Realtime → Logs (있다면)

**중요 로그 패턴**:
- 채널 구독/해제 이벤트
- 브로드캐스트 전송 이벤트
- 연결 오류

**검색 키워드**:
- `channel`
- `subscribe`
- `broadcast`
- `error`

---

## 5. 크론 작업 지표

### 5.1 크론 성공률

**측정 위치**: Supabase 대시보드 → Database → Cron Jobs 또는 애플리케이션 로그

**지표**:
- `(성공한 크론 실행) / (전체 크론 실행) * 100`

**DoD**:
- ✅ 100% (시나리오 D)

**모니터링 방법**:
1. Supabase 대시보드 → Database → Cron Jobs
2. 또는 애플리케이션 로그에서 크론 실행 로그 확인

**검색 키워드**:
- `cron`
- `집계`
- `통계`
- `access_log`

---

## 6. 폴백 폴링 지표

### 6.1 폴백 폴링 활성화 횟수

**측정 위치**: Playwright 브라우저 콘솔 로그

**지표**:
- 폴백 폴링이 활성화된 클라이언트 수
- 전체 대비 비율

**DoD**:
- ✅ < 전체의 10% (시나리오 E - 네트워크 끊김 시에만)

**로그 수집 방법**:
```javascript
let fallbackCount = 0
page.on('console', msg => {
  if (msg.text().includes('🔴 실시간 구독 3회 실패, 폴백 폴링 활성화')) {
    fallbackCount++
  }
})
```

**검색 키워드**:
- `폴백 폴링 활성화`
- `fallback`
- `폴링`

---

### 6.2 폴백 폴링 API 호출 수

**측정 위치**: k6/Artillery 결과 리포트 또는 서버 로그

**지표**:
- `/api/webinars/{id}/messages` 호출 횟수 (폴백 폴링용)
- 정상 폴링 대비 비율

**DoD**:
- ✅ < 정상 폴링의 2배 (시나리오 E)

**로그 위치**:
- k6/Artillery: 엔드포인트별 호출 수
- 서버 로그: `GET /api/webinars/{id}/messages` 로그

---

## 7. 종합 지표 요약표

| 지표 | 측정 위치 | DoD | 실패 기준 |
|------|----------|-----|----------|
| API 성공률 | k6/Artillery | 99.9%+ | < 99% |
| Realtime 구독 성공률 | Playwright 콘솔 | 99%+ | < 95% |
| 메시지 누락률 | Playwright 콘솔 | < 0.1% | > 1% |
| 메시지 지연 p95 | Playwright 콘솔 | < 2초 | > 5초 |
| 재연결 루프 | Playwright 콘솔 | 0 | 3회 이상 |
| DB 연결 수 | Supabase 대시보드 | 안정 | 2배 이상 폭증 |
| DB CPU 사용률 | Supabase 대시보드 | < 80% | > 90% |
| 크론 성공률 | Supabase/로그 | 100% | 누락 발생 |
| 폴백 활성화 | Playwright 콘솔 | < 10% | > 30% |

---

## 8. 로그 수집 체크리스트

### 테스트 전
- [ ] Supabase 대시보드 접속 가능 확인
- [ ] Vercel 대시보드 접속 가능 확인 (프로덕션인 경우)
- [ ] Playwright 브라우저 콘솔 로그 수집 설정
- [ ] k6/Artillery 결과 저장 경로 설정

### 테스트 중
- [ ] Supabase DB 연결 수 모니터링 (1분마다 스크린샷)
- [ ] Supabase DB CPU 사용률 모니터링 (1분마다 스크린샷)
- [ ] Playwright 브라우저 콘솔 로그 저장
- [ ] k6/Artillery 결과 저장

### 테스트 후
- [ ] 모든 로그 파일 수집
- [ ] Supabase 대시보드 스크린샷 저장
- [ ] 지표 요약표 작성
- [ ] 실패한 지표의 근거 로그 추출

---

## 9. 문제 발생 시 즉시 확인할 로그

### Realtime 구독 실패 시
1. 브라우저 콘솔: `CHANNEL_ERROR` 또는 `TIMED_OUT` 로그
2. Supabase 대시보드: Realtime 연결 수 확인
3. 서버 로그: 관련 에러 메시지

### 메시지 누락 시
1. 브라우저 콘솔: `실시간 Broadcast 이벤트:` 로그 확인
2. 서버 로그: 메시지 생성 API 호출 로그 확인
3. Supabase 대시보드: `messages` 테이블 INSERT 로그 확인

### DB 부하 발생 시
1. Supabase 대시보드: DB CPU/연결 수 그래프 확인
2. Supabase 대시보드: Query Performance 확인
3. 서버 로그: 느린 쿼리 로그 확인

### 폴백 폴링 폭증 시
1. 브라우저 콘솔: `폴백 폴링 활성화` 로그 카운트
2. k6/Artillery: `/api/webinars/{id}/messages` 호출 수 확인
3. 서버 로그: 해당 엔드포인트 호출 로그 확인
