begin;

-- campaign_link_meta 테이블에 시작일 필드 추가
alter table public.campaign_link_meta
  add column if not exists start_date date;

-- 인덱스 추가 (시작일 기준 조회 최적화)
create index if not exists idx_campaign_link_meta_start_date 
  on public.campaign_link_meta(start_date)
  where start_date is not null;

-- 컬럼 코멘트
comment on column public.campaign_link_meta.start_date is '광고 시작일 (해당 날짜부터 링크 활성화)';

commit;
