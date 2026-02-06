-- 외래 키 컬럼 인덱스 추가 (조인 성능 최적화)
-- 명세서에서 지적된 34건의 외래 키에 인덱스가 없어 조인 성능 저하 발생
-- CONCURRENTLY 옵션으로 테이블 락 없이 생성 (단독 실행 필요)

-- ============================================================
-- webinar_live_presence 테이블 인덱스 (명세서 우선순위)
-- ============================================================

-- 복합 인덱스: webinar_id + last_seen_at (활성 접속자 조회 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wlp_webinar_last_seen 
ON public.webinar_live_presence(webinar_id, last_seen_at DESC);

-- last_seen_at 단독 인덱스 (전체 활성 접속자 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wlp_last_seen 
ON public.webinar_live_presence(last_seen_at DESC);

-- ============================================================
-- webinar_user_sessions 테이블 인덱스
-- ============================================================

-- 웨비나별 사용자 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wus_webinar_user 
ON public.webinar_user_sessions(webinar_id, user_id);

-- 웨비나별 입장 시간 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wus_webinar_entered 
ON public.webinar_user_sessions(webinar_id, entered_at DESC);

-- 사용자별 입장 시간 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wus_user_entered 
ON public.webinar_user_sessions(user_id, entered_at DESC);

-- 세션 ID 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wus_session 
ON public.webinar_user_sessions(session_id);

-- 활성 세션 조회 (partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wus_active 
ON public.webinar_user_sessions(webinar_id, exited_at) 
WHERE exited_at IS NULL;

-- 종료된 세션 조회 (partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wus_webinar_user_closed 
ON public.webinar_user_sessions(webinar_id, user_id, exited_at) 
WHERE exited_at IS NOT NULL;

-- ============================================================
-- email_campaigns 테이블 외래 키 인덱스
-- ============================================================

-- client_id 인덱스 (클라이언트별 캠페인 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_client_id 
ON public.email_campaigns(client_id);

-- agency_id 인덱스 (에이전시별 캠페인 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_agency_id 
ON public.email_campaigns(agency_id);

-- webinar_id 인덱스 (웨비나별 캠페인 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_webinar_id 
ON public.email_campaigns(webinar_id) 
WHERE webinar_id IS NOT NULL;

-- ============================================================
-- event_survey_entries 테이블 외래 키 인덱스
-- ============================================================

-- campaign_id 인덱스 (캠페인별 응답 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_survey_entries_campaign_id 
ON public.event_survey_entries(campaign_id);

-- user_id 인덱스 (사용자별 응답 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_survey_entries_user_id 
ON public.event_survey_entries(user_id);

-- ============================================================
-- registrations 테이블 추가 인덱스 (이미 일부 있지만 보완)
-- ============================================================

-- user_id 인덱스 (사용자별 등록 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registrations_user_id 
ON public.registrations(user_id);

-- ============================================================
-- messages 테이블 외래 키 인덱스
-- ============================================================

-- user_id 인덱스 (사용자별 메시지 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_id 
ON public.messages(user_id);

-- ============================================================
-- questions 테이블 외래 키 인덱스
-- ============================================================

-- user_id 인덱스 (사용자별 질문 조회)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_user_id 
ON public.questions(user_id);

-- ============================================================
-- 테이블 통계 업데이트 (쿼리 플래너 최적화)
-- ============================================================

-- 인덱스 생성 완료 후 실행 (선택적, 성능 향상)
-- ANALYZE public.webinar_live_presence;
-- ANALYZE public.webinar_user_sessions;
-- ANALYZE public.email_campaigns;
-- ANALYZE public.event_survey_entries;
-- ANALYZE public.registrations;
-- ANALYZE public.messages;
-- ANALYZE public.questions;
