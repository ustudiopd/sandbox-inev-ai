begin;

-- registrations 테이블에 marketing_campaign_link_id 필드 추가
-- 웨비나 등록 시 마케팅 캠페인 링크 추적을 위해 필요

alter table public.registrations
  add column if not exists marketing_campaign_link_id uuid references public.campaign_link_meta(id) on delete set null;

-- 인덱스 추가 (전환 집계 성능 향상)
create index if not exists idx_registrations_marketing_campaign_link_id 
  on public.registrations(marketing_campaign_link_id)
  where marketing_campaign_link_id is not null;

-- 컬럼 코멘트 추가
comment on column public.registrations.marketing_campaign_link_id is '마케팅 캠페인 링크 ID (전환 추적용, nullable)';

commit;
