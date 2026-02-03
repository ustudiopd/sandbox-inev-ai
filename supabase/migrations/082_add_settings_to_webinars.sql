begin;

-- webinars 테이블에 settings JSONB 컬럼 추가
alter table public.webinars
  add column if not exists settings jsonb;

-- settings 인덱스 추가 (GIN 인덱스로 JSONB 검색 최적화)
create index if not exists idx_webinars_settings 
  on public.webinars using gin(settings)
  where settings is not null;

-- 주석 추가
comment on column public.webinars.settings is '웨비나 설정 (온디맨드 세션 정보, QnA 설정 등)';

commit;
