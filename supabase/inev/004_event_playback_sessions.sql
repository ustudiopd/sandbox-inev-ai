-- inev Phase 4: 온디맨드 시청 세션 추적
-- D-OD-3: INSERT/UPDATE는 서버 API(service role)만 가능

begin;

create table if not exists public.event_playback_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  session_id text not null,
  content_id text,
  entered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  exited_at timestamptz,
  watched_seconds integer default 0,
  heartbeat_count integer default 0,
  source_visit_id uuid references public.event_visits(id) on delete set null,
  user_agent_hash text,
  device_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_playback_sessions_event on public.event_playback_sessions(event_id);
create index if not exists idx_playback_sessions_event_entered on public.event_playback_sessions(event_id, entered_at desc);
create index if not exists idx_playback_sessions_lead on public.event_playback_sessions(lead_id) where lead_id is not null;
create index if not exists idx_playback_sessions_session on public.event_playback_sessions(session_id);
-- 활성 세션 인덱스 (D-OD-6: last_seen 기반)
create index if not exists idx_playback_sessions_active on public.event_playback_sessions(event_id, session_id, last_seen_at) 
  where exited_at is null;
create index if not exists idx_playback_sessions_visit on public.event_playback_sessions(source_visit_id) where source_visit_id is not null;

-- RLS (D-OD-3: SELECT만 관리자용, INSERT/UPDATE는 서버 API가 service role로 처리)
alter table public.event_playback_sessions enable row level security;

create policy "playback_sessions_select_own" on public.event_playback_sessions for select
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));

-- INSERT/UPDATE 정책 없음: 서버 API가 service role로 직접 INSERT/UPDATE
-- 퍼블릭 직접 INSERT는 금지

comment on table public.event_playback_sessions is 'inev: 온디맨드 시청 세션 추적 (Visit과 분리된 시청/체류 레이어). INSERT/UPDATE는 서버 API(service role)만 가능.';

commit;
