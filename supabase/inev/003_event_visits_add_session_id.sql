-- D-OD-9: source_visit_id 자동 연결을 위해 session_id 추가
-- inev Phase 4: event_visits에 session_id 컬럼 추가

begin;

alter table public.event_visits add column if not exists session_id text;

create index if not exists idx_event_visits_session on public.event_visits(session_id);
create index if not exists idx_event_visits_event_session on public.event_visits(event_id, session_id, created_at desc);

comment on column public.event_visits.session_id is '브라우저 세션 UUID (ef_session_id). D-OD-9: playback_session의 source_visit_id 자동 연결용.';

commit;
