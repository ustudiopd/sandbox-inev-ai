-- webinar_user_sessions 테이블 생성
-- 웨비나 사용자의 모든 접속 기록을 저장하여 접속 횟수와 체류 시간을 추적

begin;

-- 테이블 생성
create table if not exists public.webinar_user_sessions (
  id uuid primary key default gen_random_uuid(),
  
  -- 기본 정보
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null, -- 클라이언트 세션 ID (익명 사용자용)
  
  -- 입장/퇴장 시간
  entered_at timestamptz not null default now(),
  exited_at timestamptz, -- null이면 아직 시청 중
  
  -- 시청 시간 (초 단위, exited_at이 있을 때 자동 계산)
  duration_seconds integer,
  
  -- 메타데이터
  user_agent text,
  referrer text,
  ip_address text,
  
  -- org fields
  agency_id uuid,
  client_id uuid,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스 생성
create index if not exists idx_wus_webinar_user 
  on public.webinar_user_sessions(webinar_id, user_id);

create index if not exists idx_wus_webinar_entered 
  on public.webinar_user_sessions(webinar_id, entered_at desc);

create index if not exists idx_wus_user_entered 
  on public.webinar_user_sessions(user_id, entered_at desc);

create index if not exists idx_wus_session 
  on public.webinar_user_sessions(session_id);

create index if not exists idx_wus_active 
  on public.webinar_user_sessions(webinar_id, exited_at) 
  where exited_at is null;

-- duration_seconds 자동 계산 함수
create or replace function public.calculate_session_duration()
returns trigger as $$
begin
  if new.exited_at is not null and new.entered_at is not null then
    new.duration_seconds := extract(epoch from (new.exited_at - new.entered_at))::integer;
  else
    new.duration_seconds := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- 트리거 생성
create trigger calculate_duration_trigger
  before insert or update on public.webinar_user_sessions
  for each row
  execute function public.calculate_session_duration();

-- RLS 정책 (공개 읽기, 서버만 쓰기)
alter table public.webinar_user_sessions enable row level security;

-- 공개 읽기 정책 (통계 조회용)
create policy "webinar_user_sessions_select_public" 
  on public.webinar_user_sessions
  for select
  using (true);

-- 서버만 쓰기 (서비스 롤만)
create policy "webinar_user_sessions_insert_service_role" 
  on public.webinar_user_sessions
  for insert
  with check (true);

create policy "webinar_user_sessions_update_service_role" 
  on public.webinar_user_sessions
  for update
  using (true);

-- 주석 추가
comment on table public.webinar_user_sessions is '웨비나 사용자 접속 세션 기록. 모든 접속 이력을 저장하여 접속 횟수와 체류 시간을 추적';
comment on column public.webinar_user_sessions.session_id is '클라이언트 세션 ID (익명 사용자 추적용)';
comment on column public.webinar_user_sessions.entered_at is '웨비나 입장 시간';
comment on column public.webinar_user_sessions.exited_at is '웨비나 퇴장 시간 (null이면 아직 시청 중)';
comment on column public.webinar_user_sessions.duration_seconds is '체류 시간 (초 단위, exited_at - entered_at)';

commit;
