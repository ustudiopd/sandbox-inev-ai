-- 종료된 세션용 partial index 추가 (통계 쿼리 최적화)

begin;

-- 종료된 세션용 partial index (exited_at IS NOT NULL)
create index if not exists idx_wus_webinar_user_closed
  on public.webinar_user_sessions(webinar_id, user_id, exited_at)
  where exited_at is not null;

comment on index idx_wus_webinar_user_closed is '종료된 세션용 partial index. 통계 집계 쿼리 최적화';

-- 활성 세션용 partial index 확인 및 확정 (이미 있지만 명시적으로 확인)
-- idx_wus_active: (webinar_id, exited_at) WHERE exited_at IS NULL ✅
-- idx_wus_webinar_session_active: (webinar_id, session_id, exited_at) WHERE exited_at IS NULL ✅

commit;
