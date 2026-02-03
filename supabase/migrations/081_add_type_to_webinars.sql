begin;

-- webinars 테이블에 type 컬럼 추가 (nullable, 기본값 null)
-- null = 라이브 웨비나 (기존 데이터 호환성)
-- 'live' = 라이브 웨비나
-- 'ondemand' = 온디맨드 웨비나
alter table public.webinars
  add column if not exists type text;

-- type 컬럼 인덱스 추가
create index if not exists idx_webinars_type 
  on public.webinars(type)
  where type is not null;

-- 주석 추가
comment on column public.webinars.type is '웨비나 타입: null 또는 live = 라이브 웨비나, ondemand = 온디맨드 웨비나';

commit;
