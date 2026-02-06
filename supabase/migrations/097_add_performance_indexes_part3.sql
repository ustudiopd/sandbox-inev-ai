-- 성능 개선 인덱스 추가 (3부)
-- 2부까지 성공적으로 완료된 후 실행하세요.

-- 2. agency_members.user_id 인덱스
-- 대시보드 API에서 병렬 쿼리 성능 향상
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agency_members_user_id 
ON public.agency_members(user_id);

-- 3. client_members.user_id 인덱스
-- 대시보드 API에서 병렬 쿼리 성능 향상
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_members_user_id 
ON public.client_members(user_id);

-- 테이블 통계 업데이트 (쿼리 플래너가 최적의 계획을 선택하도록)
-- 인덱스 생성 완료 후 실행
ANALYZE public.profiles;
ANALYZE public.agency_members;
ANALYZE public.client_members;
