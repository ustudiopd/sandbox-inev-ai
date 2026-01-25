begin;

-- registrations 테이블에 role 컬럼이 없으면 추가
-- 기본값은 'attendee', 제약조건: 'attendee', 'host', 'moderator', '관리자', '운영자', '분석가' 허용
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'registrations' 
    and column_name = 'role'
  ) then
    alter table public.registrations
      add column role text not null default 'attendee';
    
    -- 기존 데이터에 대해 role 설정 (기본값 'attendee'로 이미 설정됨)
    
    -- 제약조건 추가 (확장된 역할 포함)
    alter table public.registrations
      add constraint registrations_role_check 
      check (role in ('attendee', 'host', 'moderator', '관리자', '운영자', '분석가'));
  end if;
end $$;

-- registrations 테이블에 registered_via 컬럼이 없으면 추가
-- 등록 출처를 추적: 'webinar', 'registration_page', 'manual' 등
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'registrations' 
    and column_name = 'registered_via'
  ) then
    alter table public.registrations
      add column registered_via text default 'webinar';
    
    -- 기존 데이터는 'webinar'로 설정 (기본값으로 이미 설정됨)
    
    -- 인덱스 추가 (등록 출처별 조회 최적화)
    create index if not exists idx_registrations_registered_via 
      on public.registrations(registered_via);
  end if;
end $$;

-- 주석 추가
comment on column public.registrations.role is '참여자 역할: attendee(참가자), host(호스트), moderator(모더레이터), 관리자, 운영자, 분석가';
comment on column public.registrations.registered_via is '등록 출처: webinar(웨비나 직접), registration_page(등록 페이지), manual(수동 등록)';

commit;
