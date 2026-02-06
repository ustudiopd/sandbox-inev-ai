-- 성능 개선 인덱스 추가 (2부)
-- 1부에서 idx_profiles_email이 성공적으로 생성된 후 실행하세요.

-- 소문자 이메일 검색을 위한 인덱스 (선택적, 더 빠른 검색)
-- CONCURRENTLY 옵션으로 테이블 락 없이 생성
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_lower 
ON public.profiles(LOWER(email));
