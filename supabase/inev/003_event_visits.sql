-- inev Phase 3: Visit 수집, UTM 이벤트 단위 (여러 이벤트에서 섞이지 않음)
create table if not exists public.event_visits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer text,
  path text,
  created_at timestamptz default now()
);

create index if not exists idx_event_visits_event on public.event_visits(event_id);
create index if not exists idx_event_visits_created on public.event_visits(event_id, created_at desc);
create index if not exists idx_event_visits_lead on public.event_visits(lead_id);

alter table public.event_visits enable row level security;

create policy "event_visits_select_own" on public.event_visits for select
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "event_visits_insert_own" on public.event_visits for insert
  with check (event_id in (select id from public.events where client_id in (select my_client_ids())));

-- 공개 페이지에서 anon으로 insert하려면 service role 사용(API 경유). RLS는 Admin용 select만.

comment on table public.event_visits is 'inev: 이벤트별 Visit/UTM 수집 (Phase 3)';
