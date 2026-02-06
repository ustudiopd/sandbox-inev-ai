-- profiles 테이블 인덱스 확인
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
  i.indexdef,
  CASE 
    WHEN i.indexdef LIKE '%email%' THEN '✓ Email 인덱스 있음'
    ELSE '✗ Email 인덱스 없음'
  END as email_index_status
FROM pg_indexes i
WHERE i.tablename = 'profiles'
ORDER BY i.indexname;

-- 필요한 인덱스 생성 (없는 경우)
-- CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- agency_members와 client_members 테이블의 인덱스도 확인
SELECT 
  'agency_members' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'agency_members'
ORDER BY indexname;

SELECT 
  'client_members' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'client_members'
ORDER BY indexname;
