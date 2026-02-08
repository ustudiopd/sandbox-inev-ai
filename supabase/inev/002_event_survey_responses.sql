-- inev Phase 2: 설문 응답 (이벤트 단위)
-- event_survey_responses: lead 연결 선택, response는 JSON 자유 형식

create table if not exists public.event_survey_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  email text,
  response jsonb not null default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_event_survey_responses_event on public.event_survey_responses(event_id);
create index if not exists idx_event_survey_responses_lead on public.event_survey_responses(lead_id);

alter table public.event_survey_responses enable row level security;

create policy "event_survey_responses_select_own" on public.event_survey_responses for select
  using (event_id in (select id from public.events where client_id in (select my_client_ids())));
create policy "event_survey_responses_insert_own" on public.event_survey_responses for insert
  with check (event_id in (select id from public.events where client_id in (select my_client_ids())));

comment on table public.event_survey_responses is 'inev: 이벤트 설문 응답 (Phase 2)';
