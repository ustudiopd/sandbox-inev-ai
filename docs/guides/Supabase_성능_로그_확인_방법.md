# Supabase 성능 로그 확인 방법

## 1. 웹 대시보드에서 확인

### 방법 1: Supabase 대시보드
1. **Supabase 대시보드 접속**: https://supabase.com/dashboard
2. **프로젝트 선택**: EventLive 프로젝트 선택
3. **로그 메뉴**: 왼쪽 사이드바에서 **"Logs"** 또는 **"Logs Explorer"** 클릭
4. **서비스 선택**:
   - **Postgres**: 데이터베이스 쿼리 로그
   - **API**: REST API 요청 로그
   - **Auth**: 인증 관련 로그
   - **Realtime**: 실시간 구독 로그
   - **Storage**: 파일 저장소 로그

### 방법 2: Database 메뉴
1. **Database** → **Logs** 또는 **Query Performance**
2. **Slow Queries**: 느린 쿼리 확인
3. **Query Performance**: 쿼리 성능 분석

---

## 2. MCP 도구로 확인 (프로그래밍 방식)

### Postgres 로그 확인
```typescript
// 최근 24시간 내 Postgres 로그
mcp_supabase_get_logs(project_id, 'postgres')
```

### API 로그 확인
```typescript
// 최근 24시간 내 API 로그
mcp_supabase_get_logs(project_id, 'api')
```

### Auth 로그 확인
```typescript
// 최근 24시간 내 Auth 로그
mcp_supabase_get_logs(project_id, 'auth')
```

---

## 3. 확인해야 할 주요 로그

### 3.1 느린 쿼리 확인
- **위치**: Database → Logs → Slow Queries
- **확인 사항**:
  - 실행 시간이 1초 이상인 쿼리
  - 자주 실행되는 쿼리
  - 인덱스를 사용하지 않는 쿼리

### 3.2 에러 로그 확인
- **위치**: Logs → 각 서비스별 에러
- **확인 사항**:
  - 500 에러
  - 타임아웃 에러
  - 연결 실패

### 3.3 성능 메트릭
- **위치**: Database → Performance 또는 Metrics
- **확인 사항**:
  - CPU 사용률
  - 메모리 사용률
  - 연결 수
  - 쿼리 실행 시간

---

## 4. 현재 프로젝트 정보

**프로젝트 ID**: `yqsayphssjznthrxpgfb`  
**프로젝트 이름**: EventLive  
**리전**: ap-southeast-1 (싱가포르)

---

## 5. 로그 확인 팁

### 5.1 특정 시간대 필터링
- 최근 1시간, 24시간, 7일 등으로 필터링
- 특정 시간대의 로그만 확인

### 5.2 특정 쿼리 검색
- 테이블명으로 검색 (예: `webinar_user_sessions`)
- 함수명으로 검색 (예: `update_session_heartbeat`)

### 5.3 에러 패턴 확인
- 반복되는 에러 패턴 확인
- 특정 사용자/세션에서만 발생하는 에러 확인

---

## 6. 성능 문제 진단 체크리스트

- [ ] Postgres 로그에서 느린 쿼리 확인
- [ ] API 로그에서 타임아웃 확인
- [ ] 연결 풀 사용률 확인
- [ ] 인덱스 사용 여부 확인
- [ ] 동시 연결 수 확인
- [ ] CPU/메모리 사용률 확인
