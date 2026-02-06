# Supabase CLI로 성능 개선 사항 확인 가이드

## 1. Supabase CLI 설치 및 로그인

```bash
# Supabase CLI 설치 (이미 설치되어 있다면 생략)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref yqsayphssjznthrxpgfb
```

---

## 2. 성능 개선 사항 확인

### 2.1 인덱스 확인 (중요!)

**profiles 테이블의 email 인덱스 확인**:
```bash
# SQL 쿼리로 인덱스 확인
supabase db execute "
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
ORDER BY indexname;
"
```

**또는 직접 SQL Editor에서 실행**:
```sql
-- profiles 테이블의 모든 인덱스 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
ORDER BY indexname;

-- email 컬럼에 인덱스가 있는지 확인
SELECT 
  i.indexname,
  i.indexdef
FROM pg_indexes i
WHERE i.tablename = 'profiles'
  AND i.indexdef LIKE '%email%';
```

**필요한 인덱스가 없으면 생성**:
```sql
-- profiles.email에 인덱스 생성 (성능 개선에 중요!)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 소문자 이메일 검색을 위한 인덱스 (선택적)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(LOWER(email));
```

---

### 2.2 배치 조회 API 테스트

**배치 프로필 조회 쿼리 성능 확인**:
```sql
-- IN 쿼리 성능 테스트 (배치 조회)
EXPLAIN ANALYZE
SELECT id, display_name, email, nickname
FROM public.profiles
WHERE id IN (
  'user-id-1',
  'user-id-2',
  'user-id-3'
  -- 실제 userId들로 교체
);
```

**실제 사용자 ID로 테스트**:
```sql
-- 최근 등록된 사용자 100명의 ID 가져오기
WITH recent_users AS (
  SELECT id
  FROM public.profiles
  ORDER BY created_at DESC
  LIMIT 100
)
SELECT id, display_name, email, nickname
FROM public.profiles
WHERE id IN (SELECT id FROM recent_users);
```

---

### 2.3 병렬 쿼리 성능 확인

**대시보드 API의 병렬 쿼리 테스트**:
```sql
-- 프로필, 에이전시 멤버십, 클라이언트 멤버십을 동시에 조회하는 쿼리
-- (실제 userId로 교체)
EXPLAIN ANALYZE
SELECT 
  (SELECT id, is_super_admin FROM public.profiles WHERE id = 'user-id') as profile,
  (SELECT agency_id FROM public.agency_members WHERE user_id = 'user-id' LIMIT 1) as agency,
  (SELECT client_id FROM public.client_members WHERE user_id = 'user-id' LIMIT 1) as client;
```

---

### 2.4 쿼리 실행 계획 확인

**EXPLAIN ANALYZE로 쿼리 성능 분석**:
```sql
-- 배치 프로필 조회 쿼리 분석
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, display_name, email, nickname
FROM public.profiles
WHERE id = ANY(ARRAY['user-id-1', 'user-id-2', 'user-id-3']);

-- 인덱스 사용 여부 확인
-- "Index Scan" 또는 "Bitmap Index Scan"이 보이면 인덱스 사용 중
```

---

## 3. Supabase 대시보드에서 확인

### 3.1 Database → Logs

1. **Supabase 대시보드 접속**: https://supabase.com/dashboard
2. **프로젝트 선택**: EventLive 프로젝트
3. **Database → Logs** 메뉴로 이동
4. **Slow Queries** 탭에서 느린 쿼리 확인

**확인할 쿼리들**:
- `SELECT * FROM profiles WHERE id = ...` (개별 조회)
- `SELECT * FROM profiles WHERE id IN (...)` (배치 조회) - 이게 더 빨라야 함

---

### 3.2 Database → Query Performance

1. **Database → Query Performance** 메뉴로 이동
2. **가장 느린 쿼리** 확인
3. **인덱스 사용 여부** 확인
4. **실행 빈도** 확인

---

## 4. 성능 개선 확인 체크리스트

### ✅ 배치 조회 API 개선 확인

```bash
# 1. 배치 API 엔드포인트 테스트
curl -X POST http://localhost:3000/api/profiles/batch \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user-id-1", "user-id-2", "user-id-3"]
  }'

# 응답 시간 확인 (200ms 이내여야 함)
```

**확인 사항**:
- [ ] 배치 조회가 개별 조회보다 빠른지 확인
- [ ] 100명 이상 조회 시에도 200ms 이내인지 확인
- [ ] 에러 없이 정상 동작하는지 확인

---

### ✅ 병렬 쿼리 개선 확인

**대시보드 API 테스트**:
```bash
# 대시보드 API 응답 시간 확인
curl http://localhost:3000/api/auth/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# 응답 시간 확인 (200ms 이내여야 함)
```

**확인 사항**:
- [ ] 순차 쿼리(600ms)보다 병렬 쿼리(200ms)가 빠른지 확인
- [ ] 프로필, 에이전시, 클라이언트 멤버십이 모두 조회되는지 확인

---

### ✅ 인덱스 확인

```sql
-- profiles.email 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles' 
  AND indexdef LIKE '%email%';

-- 결과가 나와야 함:
-- idx_profiles_email 또는 유사한 인덱스
```

**확인 사항**:
- [ ] `profiles.email` 컬럼에 인덱스가 있는지 확인
- [ ] `agency_members.user_id` 컬럼에 인덱스가 있는지 확인
- [ ] `client_members.user_id` 컬럼에 인덱스가 있는지 확인

---

## 5. 실제 성능 측정

### 5.1 배치 조회 vs 개별 조회 비교

```sql
-- 개별 조회 시뮬레이션 (느림)
DO $$
DECLARE
  user_id uuid;
  start_time timestamp;
  end_time timestamp;
BEGIN
  start_time := clock_timestamp();
  
  FOR user_id IN SELECT id FROM profiles LIMIT 100 LOOP
    PERFORM * FROM profiles WHERE id = user_id;
  END LOOP;
  
  end_time := clock_timestamp();
  RAISE NOTICE '개별 조회 시간: %', end_time - start_time;
END $$;

-- 배치 조회 시뮬레이션 (빠름)
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
BEGIN
  start_time := clock_timestamp();
  
  PERFORM * FROM profiles 
  WHERE id IN (SELECT id FROM profiles LIMIT 100);
  
  end_time := clock_timestamp();
  RAISE NOTICE '배치 조회 시간: %', end_time - start_time;
END $$;
```

---

## 6. 추가 최적화 확인

### 6.1 테이블 통계 업데이트

```sql
-- 테이블 통계 업데이트 (쿼리 플래너가 최적의 계획을 선택하도록)
ANALYZE public.profiles;
ANALYZE public.agency_members;
ANALYZE public.client_members;
```

### 6.2 연결 풀 확인

```bash
# Supabase 대시보드에서 확인
# Database → Connection Pooling
# - 활성 연결 수
# - 최대 연결 수
# - 연결 풀 사용률
```

---

## 7. 예상 성능 개선 효과

### 7.1 대시보드 접속자 목록 조회
- **기존**: 265명 × 개별 API 호출 = **26.5초+**
- **개선 후**: 1번의 배치 호출 = **200ms 이내**
- **개선율**: **130배 이상** ⚡

### 7.2 대시보드 API
- **기존**: 순차 쿼리 = **600ms**
- **개선 후**: 병렬 쿼리 = **200ms**
- **개선율**: **3배** ⚡

### 7.3 클라이언트 대시보드
- **기존**: 순차 쿼리 = **900ms**
- **개선 후**: 병렬 쿼리 = **300ms**
- **개선율**: **3배** ⚡

---

## 8. 문제 발생 시 확인 사항

### 8.1 여전히 느린 경우

1. **인덱스 확인**:
   ```sql
   -- 인덱스가 없으면 생성
   CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
   ```

2. **쿼리 실행 계획 확인**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM profiles WHERE id IN (...);
   ```

3. **테이블 통계 업데이트**:
   ```sql
   ANALYZE public.profiles;
   ```

### 8.2 에러 발생 시

1. **로그 확인**:
   ```bash
   # Supabase 대시보드 → Logs → Postgres
   # 또는
   supabase logs --db
   ```

2. **API 로그 확인**:
   ```bash
   # Supabase 대시보드 → Logs → API
   ```

---

## 9. 참고 자료

- [Supabase CLI 문서](https://supabase.com/docs/reference/cli)
- [PostgreSQL EXPLAIN 문서](https://www.postgresql.org/docs/current/sql-explain.html)
- [성능 지연 원인 분석 보고서](./성능_지연_원인_분석_보고서.md)
