-- inev.ai 신규 스키마 (Phase 1)
-- Client = 서브도메인 앱 1개, Event = 컨테이너, client_id 1급 컬럼

-- 1) clients: 서브도메인 앱 소유 조직 (1:1)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_clients_slug on public.clients(slug);

-- 2) events: 이벤트 컨테이너 (코드 6자리 불변, 슬러그 가변, 모듈 ON/OFF)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  code text not null,
  slug text not null,
  module_registration boolean default true,
  module_survey boolean default false,
  module_webinar boolean default false,
  module_email boolean default false,
  module_utm boolean default false,
  module_ondemand boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(client_id, code),
  unique(client_id, slug)
);

create index if not exists idx_events_client on public.events(client_id);
create index if not exists idx_events_code on public.events(client_id, code);

-- 3) leads: 등록자 (이벤트별)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  name text,
  user_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, email)
);

create index if not exists idx_leads_event on public.leads(event_id);
create index if not exists idx_leads_email on public.leads(event_id, email);

-- 4) event_participations: 이벤트 참여 관계 (참가 시점 등)
create table if not exists public.event_participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz default now(),
  unique(event_id, lead_id)
);

create index if not exists idx_event_participations_event on public.event_participations(event_id);
create index if not exists idx_event_participations_lead on public.event_participations(lead_id);

-- 5) client_members: Admin 소속 (auth.users ↔ clients)
create table if not exists public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz default now(),
  unique(client_id, user_id)
);

create index if not exists idx_client_members_client on public.client_members(client_id);
create index if not exists idx_client_members_user on public.client_members(user_id);

-- RLS
alter table public.clients enable row level security;
alter table public.events enable row level security;
alter table public.leads enable row level security;
alter table public.event_participations enable row level security;
alter table public.client_members enable row level security;

-- Helper: 현재 사용자 소속 client_id (Admin용)
create or replace function public.my_client_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select client_id from public.client_members where user_id = auth.uid();
$$;

-- RLS 정책: clients
create policy "clients_select_own" on public.clients for select
  using (id in (select my_client_ids()));

-- RLS 정책: events
create policy "events_select_own" on public.events for select
  using (client_id in (select my_client_ids()));
create policy "events_insert_own" on public.events for insert
  with check (client_id in (select my_client_ids()));
create policy "events_update_own" on public.events for update
  using (client_id in (select my_client_ids()));
create policy "events_delete_own" on public.events for delete
  using (client_id in (select my_client_ids()));

-- RLS 정책: leads (event → client)
create policy "leads_select_own" on public.leads for select
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "leads_insert_own" on public.leads for insert
  with check (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "leads_update_own" on public.leads for update
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "leads_delete_own" on public.leads for delete
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));

-- RLS 정책: event_participations
create policy "event_participations_select_own" on public.event_participations for select
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "event_participations_insert_own" on public.event_participations for insert
  with check (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "event_participations_delete_own" on public.event_participations for delete
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));

-- RLS 정책: client_members
create policy "client_members_select_own" on public.client_members for select
  using (client_id in (select my_client_ids())) or (user_id = auth.uid());
create policy "client_members_insert_own" on public.client_members for insert
  with check (client_id in (select my_client_ids()));

-- Public(참가자)용: 이벤트/등록 조회는 anon도 특정 조건에서 허용 (나중에 라우트별로 제한)
-- 지금은 Admin만 사용하므로 anon 정책은 Phase 2에서 추가 가능.

comment on table public.clients is 'inev: 서브도메인 앱 소유 조직 (1:1)';
comment on table public.events is 'inev: 이벤트 컨테이너, 모듈 ON/OFF';
comment on table public.leads is 'inev: 등록자 (이벤트별, email unique per event)';
comment on table public.event_participations is 'inev: 이벤트 참여 관계';
comment on table public.client_members is 'inev: Admin 소속 (auth.users ↔ clients)';
