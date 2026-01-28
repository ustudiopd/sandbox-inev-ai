begin;

-- event_access_logs 테이블에 webinar_id 컬럼 추가
-- 웨비나 ID를 직접 사용할 수 있도록 함
alter table public.event_access_logs
  add column if not exists webinar_id uuid references public.webinars(id) on delete cascade;

-- 인덱스 추가
create index if not exists idx_event_access_logs_webinar_session 
  on public.event_access_logs(webinar_id, session_id) 
  where webinar_id is not null;

create index if not exists idx_event_access_logs_webinar_accessed 
  on public.event_access_logs(webinar_id, accessed_at) 
  where webinar_id is not null;

-- campaign_id를 nullable로 변경 (웨비나만 있는 경우)
alter table public.event_access_logs
  alter column campaign_id drop not null;

-- 제약조건: campaign_id 또는 webinar_id 중 하나는 필수
alter table public.event_access_logs
  add constraint event_access_logs_campaign_or_webinar_check 
  check (
    (campaign_id is not null) or (webinar_id is not null)
  );

-- 주석 추가
comment on column public.event_access_logs.webinar_id is '웨비나 ID (웨비나를 직접 사용하는 경우). campaign_id와 함께 사용하거나 단독으로 사용 가능.';
comment on column public.event_access_logs.campaign_id is '캠페인 ID (nullable). 웨비나만 있는 경우 null일 수 있음.';

commit;
