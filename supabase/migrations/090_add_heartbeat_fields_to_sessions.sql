-- webinar_user_sessions 테이블에 heartbeat 기반 시청시간 추적 필드 추가
-- Phase 1 완료를 위한 필드 추가

begin;

-- watched_seconds_raw 필드 추가 (heartbeat Δt 누적)
alter table public.webinar_user_sessions
add column if not exists watched_seconds_raw integer default 0;

comment on column public.webinar_user_sessions.watched_seconds_raw is 'heartbeat 기반 누적 시청시간 (초 단위). 서버에서 heartbeat 간격을 누적하여 계산';

-- last_heartbeat_at 필드 추가 (마지막 heartbeat 시간)
alter table public.webinar_user_sessions
add column if not exists last_heartbeat_at timestamptz;

comment on column public.webinar_user_sessions.last_heartbeat_at is '마지막 heartbeat 시간. heartbeat 간격(Δt) 계산에 사용';

-- 인덱스 추가 (heartbeat 업데이트 쿼리 최적화)
create index if not exists idx_wus_webinar_session_active
  on public.webinar_user_sessions(webinar_id, session_id, exited_at)
  where exited_at is null;

-- 트리거 수정: duration_seconds 계산 시 watched_seconds_raw도 고려
-- (현재는 exited_at - entered_at만 사용하지만, 향후 watched_seconds_raw를 우선 사용할 수 있도록 준비)
-- 트리거는 그대로 유지 (duration_seconds는 exited_at - entered_at으로 계산)

commit;
