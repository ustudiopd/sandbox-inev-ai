begin;

-- webinars 테이블의 access_policy 체크 제약 조건 업데이트
-- 이름+이메일 인증 정책 추가
alter table public.webinars 
  drop constraint if exists webinars_access_policy_check;

alter table public.webinars 
  add constraint webinars_access_policy_check 
  check (access_policy in ('auth', 'guest_allowed', 'invite_only', 'email_auth', 'name_email_auth'));

commit;
