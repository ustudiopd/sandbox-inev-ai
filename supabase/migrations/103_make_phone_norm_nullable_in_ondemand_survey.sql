-- ondemand_survey_responses 테이블의 phone_norm 컬럼을 NULL 허용으로 변경
begin;

-- 기존 유니크 인덱스 삭제 (phone_norm이 NULL일 수 있으므로)
drop index if exists public.uniq_ondemand_survey_phone;

-- phone_norm 컬럼을 NULL 허용으로 변경
alter table public.ondemand_survey_responses
  alter column phone_norm drop not null;

-- NULL이 아닌 경우에만 유니크 제약을 적용하는 부분 유니크 인덱스 재생성
create unique index uniq_ondemand_survey_phone
  on public.ondemand_survey_responses(webinar_id, phone_norm)
  where phone_norm is not null;

commit;
