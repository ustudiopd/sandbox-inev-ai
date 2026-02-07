begin;

-- webinars 테이블의 max_participants 컬럼을 integer에서 bigint로 변경
-- 이유: 32-bit integer의 최대값(2,147,483,647)을 초과하는 값이 입력될 수 있음
alter table public.webinars
  alter column max_participants type bigint using max_participants::bigint;

-- 주석 업데이트
comment on column public.webinars.max_participants is '최대 참여자 수 (bigint). null이면 제한 없음.';

commit;
