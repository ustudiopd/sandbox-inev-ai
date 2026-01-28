begin;

-- registrations 테이블에 survey_no와 code6 컬럼 추가
-- 웨비나별로 등록 순서를 관리하기 위함
alter table public.registrations
  add column if not exists survey_no int,
  add column if not exists code6 text;

-- 웨비나별 survey_no 유니크 인덱스 (웨비나 내에서 중복 방지)
create unique index if not exists uniq_registration_webinar_survey_no 
  on public.registrations(webinar_id, survey_no) 
  where survey_no is not null;

-- 웨비나별 code6 유니크 인덱스 (웨비나 내에서 중복 방지)
create unique index if not exists uniq_registration_webinar_code6 
  on public.registrations(webinar_id, code6) 
  where code6 is not null;

-- 주석 추가
comment on column public.registrations.survey_no is '완료 순번 (웨비나별 1부터 시작)';
comment on column public.registrations.code6 is '확인코드 (6자리 문자열, 예: 000001)';

commit;
