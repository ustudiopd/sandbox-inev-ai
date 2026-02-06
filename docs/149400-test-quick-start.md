# /149400 페이지 테스트 빠른 시작 가이드

## 🚀 빠른 시작 (5분)

### 1단계: 정보 확인

```bash
npx tsx scripts/get-149400-info.ts
```

이 명령어로 필요한 ID들을 확인할 수 있습니다:
- 웨비나 ID
- 캠페인 ID
- 경품 ID (있는 경우)

### 2단계: 테스트 실행

#### 방법 A: Node.js 스크립트 (가장 간단)

```bash
# 100명 테스트
npx tsx scripts/load-test-149400.ts --users 100

# 200명 테스트
npx tsx scripts/load-test-149400.ts --users 200
```

#### 방법 B: k6 사용 (더 정확한 부하 테스트)

1. k6 설치: https://k6.io/docs/getting-started/installation/

2. 캠페인 ID 확인:
   ```bash
   npx tsx scripts/get-149400-info.ts
   ```

3. 테스트 실행:
   ```bash
   CAMPAIGN_ID=<캠페인ID> k6 run scripts/k6-load-test-149400.js
   ```

## 📋 테스트 시나리오

### 시나리오 1: 설문 제출 테스트

**목표**: 100명/200명이 동시에 설문을 제출

**단계**:
1. 위의 테스트 스크립트 실행
2. 결과 확인:
   ```bash
   # 데이터베이스에서 확인
   npx tsx scripts/get-149400-info.ts
   ```

**확인 사항**:
- 설문 제출 수가 예상과 일치하는지
- 오류율이 5% 미만인지
- 응답 시간이 3초 이내인지

### 시나리오 2: 경품 추첨 테스트

**사전 준비**:
1. 웨비나 콘솔 접속: `/webinar/149400/console`
2. 경품 관리 → 새 경품 생성
3. 경품 상태를 'open'으로 설정

**테스트 단계**:
1. 여러 브라우저 창에서 `/webinar/149400/live` 접속
2. 각 창에서 경품 위젯의 "참여하기" 클릭
3. 콘솔에서 경품 추첨 실행
4. 당첨자 확인

**확인 사항**:
- 참여자 수가 정확한지
- 추첨이 정상적으로 실행되는지
- 당첨자가 올바르게 선정되는지

### 시나리오 3: 설문집계 테스트

**테스트 단계**:
1. 위의 설문 제출 테스트 실행
2. 통계 확인:
   ```bash
   # API로 확인
   curl http://localhost:3000/api/event-survey/<캠페인ID>/stats
   ```

**확인 사항**:
- 총 제출 수
- 시간대별 제출 분포
- 응답률

## 🔧 문제 해결

### "캠페인을 찾을 수 없습니다"

**해결책**:
```bash
# 149400 웨비나 생성
npx tsx scripts/create-149400-test-webinar.ts
```

### "경품이 없습니다"

**해결책**:
1. 웨비나 콘솔 접속: `/webinar/149400/console`
2. 경품 관리 → 새 경품 생성
3. 상태를 'open'으로 설정

### "설문 제출이 실패합니다"

**확인 사항**:
1. 캠페인 ID가 올바른지 확인
2. 서버가 실행 중인지 확인 (`npm run dev`)
3. 데이터베이스 연결 확인

## 📊 결과 확인

### 실시간 모니터링

테스트 중에 다음을 모니터링하세요:
- 서버 로그 (`npm run dev` 터미널)
- 데이터베이스 성능 (Supabase 대시보드)
- 네트워크 트래픽

### 테스트 후 확인

```bash
# 통계 확인
npx tsx scripts/get-149400-info.ts

# 또는 직접 SQL 쿼리
# Supabase SQL Editor에서 실행
SELECT COUNT(*) FROM event_survey_entries WHERE campaign_id = '<캠페인ID>';
```

## 💡 팁

1. **작은 규모부터 시작**: 먼저 10명으로 테스트한 후 점진적으로 증가
2. **프로덕션 환경 주의**: 테스트는 로컬 또는 스테이징 환경에서만 실행
3. **데이터 정리**: 테스트 후 필요시 데이터 정리
4. **백업**: 중요한 데이터가 있다면 테스트 전 백업

## 📚 더 자세한 정보

- [전체 부하 테스트 가이드](./149400-load-test-guide.md)
- [웨비나 시스템 구조 문서](./wert-webinar-system-structure.md)
