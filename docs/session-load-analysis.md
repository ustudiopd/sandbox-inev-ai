# 웨비나 세션 추적 부하 분석 및 최적화 방안

## 현재 구조 분석

### 500명 동시 접속 시 부하

#### 1. 초기 접속 (한 번만)
- **INSERT**: 500건
- **부하**: 낮음 (한 번만 발생)

#### 2. Heartbeat (120초마다 반복)
- **요청 수**: 500명 / 120초 = **약 4.17 RPS** (초당 요청 수)
- **DB 작업**: 각 heartbeat마다
  - SELECT 1건 (활성 세션 조회)
  - UPDATE 1건 (heartbeat 업데이트)
- **총 DB 작업**: 약 **8.34 ops/sec** (SELECT + UPDATE)
- **부하 평가**: ✅ **양호** (Supabase는 초당 수백 건 처리 가능)

#### 3. 세션 스위퍼 (10분마다 실행)
- **현재 구조**: 각 세션마다 개별 UPDATE (for loop)
- **500명 중 10%가 stale (50명) 가정**:
  - SELECT 1건 (stale 세션 조회)
  - UPDATE 50건 (개별 처리)
- **부하**: 낮음 (10분에 1회)

---

## 최적화 방안

### 1. 세션 스위퍼 배치 업데이트 (권장)

**현재 문제점**:
```typescript
// 현재: 각 세션마다 개별 UPDATE
for (const session of staleSessions) {
  await admin.from('webinar_user_sessions')
    .update({ exited_at: ... })
    .eq('id', session.id)
}
// 50개 세션이면 50번의 UPDATE 쿼리
```

**최적화 후**:
```typescript
// 배치 업데이트: 한 번의 쿼리로 여러 세션 처리
const sessionIds = staleSessions.map(s => s.id)
const exitedAtMap = new Map(staleSessions.map(s => [s.id, s.last_heartbeat_at || s.entered_at]))

// PostgreSQL의 ANY() 또는 IN() 사용
await admin.from('webinar_user_sessions')
  .update({ 
    exited_at: admin.rpc('get_exited_at_for_session', { session_id: ... }),
    updated_at: new Date().toISOString()
  })
  .in('id', sessionIds)
```

**또는 더 간단하게** (Supabase 제약 고려):
```sql
-- RPC 함수로 배치 업데이트
UPDATE webinar_user_sessions
SET 
  exited_at = COALESCE(last_heartbeat_at, entered_at),
  updated_at = now()
WHERE id = ANY($1::uuid[])
```

**효과**: 
- 50개 세션 종료 시: 50번 UPDATE → **1번 UPDATE**
- 쿼리 수 **98% 감소** (50 → 1)

---

### 2. Heartbeat 배치 업데이트 (선택적, 고부하 시)

**현재**: 각 사용자가 개별적으로 heartbeat 전송
- 500명 = 500번의 개별 UPDATE

**최적화 방안** (클라이언트 측):
- 클라이언트에서 heartbeat를 **배치로 모아서 전송** (예: 5초마다 한 번에)
- 하지만 이는 **복잡도 증가**와 **실시간성 저하**를 야기할 수 있음

**결론**: 현재 구조 유지 권장 (4.17 RPS는 충분히 낮음)

---

### 3. 인덱스 최적화 확인

**현재 인덱스** (이미 최적화됨):
```sql
-- ✅ 활성 세션 조회용 (heartbeat에서 사용)
idx_wus_webinar_session_active (webinar_id, session_id, exited_at) WHERE exited_at IS NULL

-- ✅ stale 세션 조회용 (sweeper에서 사용)
idx_wus_active (webinar_id, exited_at) WHERE exited_at IS NULL
```

**추가 권장 인덱스** (통계 쿼리 최적화):
```sql
-- 개인별 시청시간 집계용
CREATE INDEX idx_wus_webinar_user_watched 
  ON webinar_user_sessions(webinar_id, user_id, exited_at)
  WHERE exited_at IS NOT NULL;
```

---

## 부하 시나리오별 평가

### 시나리오 1: 500명 동시 접속 (현재)
- **Heartbeat**: 4.17 RPS ✅ **양호**
- **초기 INSERT**: 500건 ✅ **양호**
- **Sweeper**: 10분마다 1회 ✅ **양호**

### 시나리오 2: 1,000명 동시 접속
- **Heartbeat**: 8.34 RPS ✅ **양호**
- **초기 INSERT**: 1,000건 ✅ **양호**
- **Sweeper**: 10분마다 1회 ✅ **양호**

### 시나리오 3: 5,000명 동시 접속
- **Heartbeat**: 41.7 RPS ⚠️ **주의 필요**
- **초기 INSERT**: 5,000건 ⚠️ **주의 필요**
- **Sweeper**: 10분마다 1회 ✅ **양호**

**권장 조치**:
- 5,000명 이상 시 heartbeat 주기를 180초로 증가 고려
- 또는 heartbeat 배치 업데이트 구현

---

## 최종 권장 사항

### 즉시 적용 (필수)
1. ✅ **세션 스위퍼 배치 업데이트** 구현
   - 50개 세션 종료 시: 50번 → 1번 쿼리
   - 구현 난이도: 낮음
   - 효과: 높음

### 향후 고려 (선택적)
2. ⏳ **Heartbeat 배치 업데이트** (5,000명 이상 시)
   - 구현 난이도: 중간
   - 효과: 중간

3. ⏳ **통계 쿼리 인덱스 추가**
   - 구현 난이도: 낮음
   - 효과: 중간 (통계 조회 성능 향상)

---

## 결론

**현재 구조는 500명 동시 접속에 충분히 견딜 수 있습니다.**

- Heartbeat: 4.17 RPS는 매우 낮은 수준
- 초기 INSERT: 500건은 한 번만 발생
- 인덱스: 이미 최적화되어 있음

**단, 세션 스위퍼만 배치 업데이트로 최적화하면 더욱 효율적입니다.**
