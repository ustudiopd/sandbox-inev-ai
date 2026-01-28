begin;

-- webinars 테이블에 dashboard_code 필드 추가
alter table public.webinars
  add column if not exists dashboard_code text;

-- dashboard_code 인덱스 추가
create index if not exists idx_webinars_dashboard_code 
  on public.webinars(dashboard_code);

-- dashboard_code는 유니크해야 함 (전역적으로)
create unique index if not exists uniq_webinar_dashboard_code 
  on public.webinars(dashboard_code)
  where dashboard_code is not null;

-- 주석 추가
comment on column public.webinars.dashboard_code is '공개 대시보드 접근 코드 (6자리 영문숫자)';

commit;
