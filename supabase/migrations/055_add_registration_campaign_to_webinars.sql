begin;

-- 웨비나 테이블에 등록 페이지 캠페인 참조 필드 추가
alter table public.webinars 
  add column if not exists registration_campaign_id uuid references public.event_survey_campaigns(id) on delete set null;

-- 인덱스 추가
create index if not exists idx_webinars_registration_campaign_id 
  on public.webinars(registration_campaign_id) 
  where registration_campaign_id is not null;

-- 주석 추가
comment on column public.webinars.registration_campaign_id is '웨비나와 연동된 등록 페이지 캠페인 ID. 설정되면 웨비나 입장 시 해당 캠페인의 등록 정보를 확인합니다.';

commit;
