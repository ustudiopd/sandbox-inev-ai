-- inev Phase 4: 이벤트 단위 이메일 (1개 초안, 미리보기/테스트 발송)
create table if not exists public.event_emails (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  subject text not null default '',
  body_html text not null default '',
  from_name text default 'Inev.ai',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id)
);

create index if not exists idx_event_emails_event on public.event_emails(event_id);

alter table public.event_emails enable row level security;

create policy "event_emails_select_own" on public.event_emails for select
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "event_emails_insert_own" on public.event_emails for insert
  with check (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "event_emails_update_own" on public.event_emails for update
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));

comment on table public.event_emails is 'inev: 이벤트별 이메일 초안 (Phase 4)';
