-- 온디맨드 설문 응답 저장 (웨비나 설문 로직과 동일한 구조)
begin;

create table public.ondemand_survey_responses (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  name text,
  company text,
  phone_norm text not null,
  answers jsonb not null default '[]',
  survey_no int not null,
  code6 text not null,
  created_at timestamptz not null default now()
);

create unique index uniq_ondemand_survey_phone
  on public.ondemand_survey_responses(webinar_id, phone_norm);

create unique index uniq_ondemand_survey_code6
  on public.ondemand_survey_responses(webinar_id, code6);

create index idx_ondemand_survey_webinar on public.ondemand_survey_responses(webinar_id);
create index idx_ondemand_survey_created on public.ondemand_survey_responses(created_at);

-- RLS: API(서비스 롤)로만 insert/select
alter table public.ondemand_survey_responses enable row level security;

create policy "Allow service role all"
  on public.ondemand_survey_responses for all
  to service_role using (true) with check (true);

commit;
