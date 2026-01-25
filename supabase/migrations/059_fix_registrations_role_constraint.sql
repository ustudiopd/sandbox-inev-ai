begin;

-- 기존 role 제약조건 확인 및 수정
-- registrations 테이블의 role 제약조건을 확장된 역할을 포함하도록 수정

-- 기존 제약조건 삭제 (존재하는 경우)
do $$
begin
  -- registrations_role_check 제약조건이 있으면 삭제
  if exists (
    select 1 from information_schema.table_constraints 
    where constraint_schema = 'public' 
    and table_name = 'registrations' 
    and constraint_name = 'registrations_role_check'
  ) then
    alter table public.registrations drop constraint registrations_role_check;
  end if;
end $$;

-- 새로운 제약조건 추가 (확장된 역할 포함)
alter table public.registrations
  add constraint registrations_role_check 
  check (role in ('attendee', 'host', 'moderator', '관리자', '운영자', '분석가'));

commit;
