# /149400 페이지 부하 테스트 가이드

## 개요

`/149400` 페이지에서 100명, 200명의 동시 접속 환경을 구축하고 경품추첨 및 설문집계를 테스트하는 방법을 안내합니다.

## 테스트 항목

1. **설문 제출 테스트**: 여러 사용자가 동시에 설문을 제출
2. **경품 추첨 테스트**: 여러 사용자가 경품에 참여하고 추첨 실행
3. **웨비나 접속 테스트**: 실시간 접속자 수 확인 (Presence)

## 방법 1: 스크립트 기반 부하 테스트 (권장)

### 1.1 기본 스크립트 실행

```bash
# 100명 테스트
npx tsx scripts/load-test-149400.ts --users 100

# 200명 테스트
npx tsx scripts/load-test-149400.ts --users 200
```

### 1.2 스크립트 기능

- ✅ 설문 제출 시뮬레이션 (100/200명)
- ✅ 경품 참여 시뮬레이션 (경품이 있는 경우)
- ✅ 통계 조회 및 결과 출력

### 1.3 제한사항

- 실제 사용자 인증이 필요한 기능(경품 참여 등)은 제한적
- Presence(실시간 접속자)는 실제 브라우저 연결 필요

## 방법 2: 브라우저 기반 부하 테스트

### 2.1 k6 사용 (권장)

k6는 브라우저 기반 부하 테스트 도구입니다.

#### 설치

```bash
# Windows (Chocolatey)
choco install k6

# 또는 직접 다운로드
# https://k6.io/docs/getting-started/installation/
```

#### 테스트 스크립트 작성

`scripts/k6-load-test.js` 파일 생성:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // 30초 동안 50명까지 증가
    { duration: '1m', target: 100 },   // 1분 동안 100명 유지
    { duration: '30s', target: 0 },   // 30초 동안 0명으로 감소
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% 요청이 2초 이내
    http_req_failed: ['rate<0.1'],     // 오류율 10% 미만
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || '';

export default function () {
  // 1. 메인 페이지 접속
  const mainPageRes = http.get(`${BASE_URL}/event/149400`);
  check(mainPageRes, {
    '메인 페이지 로드 성공': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // 2. 설문 제출 (랜덤 사용자 정보)
  const userNum = Math.floor(Math.random() * 1000);
  const surveyPayload = JSON.stringify({
    name: `테스트사용자${userNum}`,
    company: '테스트회사',
    phone: `010${String(10000000 + userNum).slice(-8)}`,
    answers: [],
    consentData: {
      marketing: true,
      privacy: true,
    },
  });
  
  const surveyRes = http.post(
    `${BASE_URL}/api/public/event-survey/${CAMPAIGN_ID}/submit`,
    surveyPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(surveyRes, {
    '설문 제출 성공': (r) => r.status === 200 || r.status === 409, // 409는 이미 제출됨
  });
  
  sleep(2);
}
```

#### 실행

```bash
# 환경 변수 설정 후 실행
BASE_URL=http://localhost:3000 CAMPAIGN_ID=<캠페인ID> k6 run scripts/k6-load-test.js
```

### 2.2 Artillery 사용

Artillery는 Node.js 기반 부하 테스트 도구입니다.

#### 설치

```bash
npm install -g artillery
```

#### 테스트 스크립트 작성

`scripts/artillery-load-test.yml` 파일 생성:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 2  # 초당 2명씩 증가
      name: "Warm up"
    - duration: 120
      arrivalRate: 5  # 초당 5명씩 증가
      name: "Ramp up"
    - duration: 300
      arrivalRate: 10 # 초당 10명 유지
      name: "Sustained load"
  variables:
    campaignId: "<캠페인ID>"

scenarios:
  - name: "설문 제출 테스트"
    flow:
      - get:
          url: "/event/149400"
      - think: 2
      - post:
          url: "/api/public/event-survey/{{ campaignId }}/submit"
          json:
            name: "테스트사용자{{ $randomInt(1, 1000) }}"
            company: "테스트회사"
            phone: "010{{ $randomInt(10000000, 99999999) }}"
            answers: []
            consentData:
              marketing: true
              privacy: true
```

#### 실행

```bash
artillery run scripts/artillery-load-test.yml
```

## 방법 3: 수동 테스트 (실제 브라우저)

### 3.1 여러 브라우저/시크릿 창 사용

1. **Chrome 시크릿 창 여러 개 열기**
   - `Ctrl+Shift+N` (Windows) 또는 `Cmd+Shift+N` (Mac)
   - 각 창마다 다른 사용자로 접속

2. **다른 브라우저 사용**
   - Chrome, Firefox, Edge, Safari 등 각각 다른 사용자로 접속

3. **다른 디바이스 사용**
   - PC, 모바일, 태블릿 등

### 3.2 브라우저 확장 프로그램 사용

- **User-Agent Switcher**: 다른 브라우저로 위장
- **Multi-Account Containers** (Firefox): 여러 계정으로 동시 접속

## 방법 4: 경품 추첨 테스트

### 4.1 사전 준비

1. **웨비나 콘솔에서 경품 생성**
   ```
   /webinar/149400/console → 경품 관리 → 새 경품 생성
   ```

2. **경품 상태를 'open'으로 설정**

### 4.2 테스트 시나리오

1. **100명/200명이 경품에 참여**
   - 각 사용자가 `/webinar/149400/live` 접속
   - 경품 위젯에서 "참여하기" 클릭

2. **추첨 실행**
   - 콘솔에서 경품 추첨 실행
   - 당첨자 확인

3. **결과 확인**
   ```sql
   -- 경품 참여 수 확인
   SELECT COUNT(*) FROM giveaway_entries 
   WHERE giveaway_id = '<경품ID>';
   
   -- 당첨자 확인
   SELECT * FROM giveaway_winners 
   WHERE giveaway_id = '<경품ID>';
   ```

## 방법 5: 설문집계 테스트

### 5.1 설문 제출 후 통계 확인

1. **API로 통계 조회**
   ```bash
   curl http://localhost:3000/api/event-survey/<캠페인ID>/stats
   ```

2. **데이터베이스 직접 조회**
   ```sql
   -- 설문 제출 수
   SELECT COUNT(*) FROM event_survey_entries 
   WHERE campaign_id = '<캠페인ID>';
   
   -- 시간대별 제출 수
   SELECT 
     DATE_TRUNC('hour', created_at) as hour,
     COUNT(*) as count
   FROM event_survey_entries
   WHERE campaign_id = '<캠페인ID>'
   GROUP BY hour
   ORDER BY hour;
   ```

3. **웨비나 콘솔에서 확인**
   ```
   /webinar/149400/console → 통계 탭
   ```

## 방법 6: 실시간 접속자 수 테스트 (Presence)

### 6.1 Supabase Realtime 사용

Presence는 실제 브라우저 연결이 필요하므로, 다음 방법을 사용:

1. **여러 브라우저 창에서 동시 접속**
   - 각 창마다 `/webinar/149400/live` 접속
   - Presence Bar에서 접속자 수 확인

2. **스크립트로 Presence 시뮬레이션** (고급)

`scripts/presence-load-test.ts` 파일을 별도로 만들어야 합니다.
Supabase Realtime 클라이언트를 사용하여 여러 연결을 생성합니다.

### 6.2 접속자 수 확인

```sql
-- 현재 접속자 수 (Presence 기반)
SELECT COUNT(DISTINCT user_id) 
FROM webinar_live_presence
WHERE webinar_id = '<웨비나ID>'
  AND last_seen_at > NOW() - INTERVAL '5 minutes';
```

## 체크리스트

### 테스트 전

- [ ] 149400 웨비나가 생성되어 있는지 확인
- [ ] 등록 캠페인이 설정되어 있는지 확인
- [ ] 경품이 생성되고 'open' 상태인지 확인
- [ ] 설문 폼이 설정되어 있는지 확인
- [ ] 데이터베이스 백업 (테스트 데이터 정리용)

### 테스트 중

- [ ] 서버 로그 모니터링
- [ ] 데이터베이스 성능 모니터링
- [ ] 메모리/CPU 사용량 확인
- [ ] 네트워크 트래픽 확인

### 테스트 후

- [ ] 결과 통계 확인
- [ ] 오류 로그 확인
- [ ] 성능 병목 지점 파악
- [ ] 테스트 데이터 정리 (필요시)

## 주의사항

1. **프로덕션 환경에서는 실행하지 마세요**
   - 테스트 데이터가 실제 데이터와 섞일 수 있습니다
   - 로컬 또는 스테이징 환경에서만 테스트하세요

2. **데이터베이스 부하**
   - 대량의 테스트 데이터가 생성됩니다
   - 테스트 후 필요시 데이터 정리가 필요합니다

3. **Rate Limiting**
   - API에 Rate Limiting이 설정되어 있다면 테스트가 실패할 수 있습니다
   - 필요시 Rate Limiting을 일시적으로 해제하세요

## 문제 해결

### 설문 제출이 실패하는 경우

1. 캠페인 ID가 올바른지 확인
2. 설문 폼이 설정되어 있는지 확인
3. 필수 필드가 모두 포함되어 있는지 확인

### 경품 참여가 실패하는 경우

1. 경품 상태가 'open'인지 확인
2. 사용자가 웨비나에 등록되어 있는지 확인
3. 인증 토큰이 유효한지 확인

### Presence가 작동하지 않는 경우

1. Supabase Realtime이 활성화되어 있는지 확인
2. 네트워크 연결 상태 확인
3. 브라우저 콘솔에서 오류 확인

## 추가 리소스

- [k6 문서](https://k6.io/docs/)
- [Artillery 문서](https://www.artillery.io/docs)
- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
