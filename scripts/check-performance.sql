-- 배치 조회 쿼리 성능 테스트
-- 실제 userId들로 교체하여 실행

-- 1. 배치 조회 쿼리 실행 계획 확인
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, display_name, email, nickname
FROM public.profiles
WHERE id IN (
  SELECT id FROM profiles LIMIT 10
);

-- 2. 개별 조회와 비교 (시뮬레이션)
-- 배치 조회: IN 쿼리 사용
EXPLAIN ANALYZE
SELECT id, display_name, email, nickname
FROM public.profiles
WHERE id = ANY(ARRAY(
  SELECT id FROM profiles ORDER BY created_at DESC LIMIT 100
));

-- 3. 인덱스 사용 여부 확인
-- "Index Scan" 또는 "Bitmap Index Scan"이 보이면 인덱스 사용 중
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, display_name, email, nickname
FROM public.profiles
WHERE email = 'test@example.com';

-- 4. 테이블 통계 확인
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('profiles', 'agency_members', 'client_members')
ORDER BY tablename;
