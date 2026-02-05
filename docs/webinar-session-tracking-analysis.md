# 웨비나 입장 기록 및 시청 시간 집계 분석

## 현재 시스템 분석

### 1. 부하 관점 분석

#### ✅ **입장 로그 기록은 부하가 거의 없음**

**이유:**
1. **사용자 액션 기반**: 웨비나 페이지 입장은 사용자가 직접 액션을 취할 때만 발생
   - 페이지 로드 시 1회만 호출
   - 자동 새로고침이나 폴링이 아님
   
2. **INSERT 작업은 가벼움**:
   - 단순 INSERT 작업 (복잡한 조인/집계 없음)
   - 인덱스만 잘 설정하면 O(log n) 수준
   
3. **이미 호출 중인 API**:
   - `/api/webinars/[webinarId]/access/track` 이미 존재
   - 현재는 `webinar_live_presence`에만 upsert
   - 추가 테이블에 INSERT만 하면 됨

4. **빈도가 낮음**:
   - 웨비나 입장은 사용자당 하루에 몇 번 안 됨
   - 동시 접속자 100명이어도 초당 INSERT는 1~2건 수준

#### 📊 **예상 부하**

```
시나리오: 웨비나 동시 접속자 100명
- 입장 빈도: 사용자당 평균 2회/일
- 시간당 INSERT: 약 8~10건
- 초당 INSERT: 0.002건 (거의 0)

→ 부하: 무시 가능한 수준
```

### 2. 현재 시스템의 한계

#### ❌ **입장 횟수 추적 불가**
- `webinar_live_presence`는 upsert 방식
- 마지막 입장 시간만 기록됨
- 총 입장 횟수는 알 수 없음

#### ❌ **시청 시간 집계 불가**
- 입장 시간만 있고 퇴장 시간이 없음
- 체류 시간 계산 불가능

#### ❌ **상세 입장 이력 없음**
- 각 입장마다의 시간 기록 없음
- 통계 분석 불가능

## 제안: webinar_user_sessions 테이블 추가

### 테이블 설계

```sql
CREATE TABLE webinar_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL, -- 클라이언트 세션 ID (익명 사용자용)
  
  -- 입장/퇴장 시간
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ, -- NULL이면 아직 시청 중
  
  -- 시청 시간 (초 단위)
  duration_seconds INTEGER, -- exited_at - entered_at (계산된 값)
  
  -- 메타데이터
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT,
  
  -- org fields
  agency_id UUID,
  client_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_wus_webinar_user ON webinar_user_sessions(webinar_id, user_id);
CREATE INDEX idx_wus_webinar_entered ON webinar_user_sessions(webinar_id, entered_at DESC);
CREATE INDEX idx_wus_user_entered ON webinar_user_sessions(user_id, entered_at DESC);
CREATE INDEX idx_wus_session ON webinar_user_sessions(session_id);
CREATE INDEX idx_wus_active ON webinar_user_sessions(webinar_id, exited_at) WHERE exited_at IS NULL;
```

### API 수정

#### 1. 입장 시 로그 기록 (`/api/webinars/[webinarId]/access/track`)

```typescript
// 입장 시 세션 시작
await admin
  .from('webinar_user_sessions')
  .insert({
    webinar_id: webinarId,
    user_id: user?.id || null,
    session_id: sessionId,
    entered_at: new Date().toISOString(),
    user_agent: request.headers.get('user-agent') || null,
    referrer: request.headers.get('referer') || null,
    agency_id: webinar.agency_id,
    client_id: webinar.client_id,
  })
```

#### 2. 퇴장 시 로그 업데이트 (페이지 언로드 또는 다른 페이지 이동)

```typescript
// beforeunload 이벤트 또는 라우터 변경 시
await fetch(`/api/webinars/${webinarId}/access/exit`, {
  method: 'POST',
  body: JSON.stringify({ sessionId }),
})
```

### 시청 시간 집계 쿼리 예시

```sql
-- 사용자별 총 시청 시간
SELECT 
  user_id,
  COUNT(*) as visit_count,
  SUM(duration_seconds) as total_seconds,
  AVG(duration_seconds) as avg_seconds
FROM webinar_user_sessions
WHERE webinar_id = '...'
  AND user_id IS NOT NULL
  AND exited_at IS NOT NULL
GROUP BY user_id;

-- 웨비나별 평균 시청 시간
SELECT 
  webinar_id,
  COUNT(*) as total_sessions,
  AVG(duration_seconds) as avg_duration_seconds,
  SUM(duration_seconds) as total_duration_seconds
FROM webinar_user_sessions
WHERE exited_at IS NOT NULL
GROUP BY webinar_id;
```

## 구현 단계

### Phase 1: 입장 로그 기록 (즉시 가능)
1. `webinar_user_sessions` 테이블 생성
2. `/api/webinars/[webinarId]/access/track`에 INSERT 추가
3. 입장 횟수 집계 가능

### Phase 2: 퇴장 로그 기록 (추가 작업 필요)
1. `/api/webinars/[webinarId]/access/exit` API 생성
2. 클라이언트에서 `beforeunload` 이벤트 처리
3. 시청 시간 집계 가능

## 결론

### ✅ **입장 로그 기록은 부하가 거의 없음**
- 사용자 액션 기반이라 빈도가 낮음
- 단순 INSERT 작업
- 이미 호출 중인 API 활용 가능

### ✅ **구현 권장**
- 입장 횟수 추적 가능
- 시청 시간 집계 가능
- 상세 통계 분석 가능
- 부하 영향 미미

### 📝 **다음 단계**
1. `webinar_user_sessions` 테이블 마이그레이션 생성
2. `/api/webinars/[webinarId]/access/track` 수정
3. 퇴장 로그 API 추가 (선택사항)
