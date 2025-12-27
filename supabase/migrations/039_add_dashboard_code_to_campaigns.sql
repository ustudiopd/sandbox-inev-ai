begin;

-- event_survey_campaigns에 dashboard_code 필드 추가
alter table public.event_survey_campaigns
  add column if not exists dashboard_code text;

-- dashboard_code 인덱스 추가
create index if not exists idx_campaigns_dashboard_code 
  on public.event_survey_campaigns(dashboard_code);

-- dashboard_code는 유니크해야 함 (전역적으로)
create unique index if not exists uniq_campaign_dashboard_code 
  on public.event_survey_campaigns(dashboard_code)
  where dashboard_code is not null;

commit;

