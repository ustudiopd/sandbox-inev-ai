-- ondemand_survey_responses 테이블에 email 컬럼 추가
begin;

-- email 컬럼 추가
alter table public.ondemand_survey_responses
  add column email text;

-- 이메일 기반 중복 체크를 위한 인덱스 추가
create unique index uniq_ondemand_survey_email
  on public.ondemand_survey_responses(webinar_id, email)
  where email is not null;

-- 이메일 조회를 위한 인덱스 추가
create index idx_ondemand_survey_email
  on public.ondemand_survey_responses(webinar_id, email);

commit;
