begin;

-- 웨비나 테이블에 웨비나 시작 시간 필드 추가
alter table public.webinars 
  add column if not exists webinar_start_time timestamptz;

-- 인덱스 추가 (웨비나 시작 시간 기반 조회 최적화)
create index if not exists idx_webinars_webinar_start_time 
  on public.webinars(webinar_start_time) 
  where webinar_start_time is not null;

-- 주석 추가
comment on column public.webinars.webinar_start_time is '웨비나 실제 시작 시간. 설정되면 입장 페이지에 날짜와 카운트다운이 표시됩니다. start_time/end_time은 캠페인 기간으로 사용됩니다.';

commit;
