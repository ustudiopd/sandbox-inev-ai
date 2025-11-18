begin;

-- 짧은 링크 테이블
create table public.short_links (
  id bigserial primary key,
  code varchar(6) not null unique,
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz, -- 선택적 만료 시간
  created_by uuid references public.profiles(id)
);

-- 인덱스
create index idx_short_links_code on public.short_links(code);
create index idx_short_links_webinar_id on public.short_links(webinar_id);

-- 6자리 숫자 코드 생성 함수
create or replace function public.generate_short_code() returns varchar(6) as $$
declare
  new_code varchar(6);
  code_exists boolean;
  attempts int := 0;
begin
  loop
    -- 100000 ~ 999999 범위의 6자리 숫자 생성
    new_code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    
    -- 중복 체크
    select exists(select 1 from public.short_links where code = new_code) into code_exists;
    
    exit when not code_exists;
    
    -- 무한 루프 방지 (최대 100회 시도)
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Failed to generate unique short code after 100 attempts';
    end if;
  end loop;
  
  return new_code;
end;
$$ language plpgsql;

-- RLS 정책
alter table public.short_links enable row level security;

-- 모든 사용자가 짧은 링크를 읽을 수 있음 (리다이렉트용)
create policy "anyone can read short links" on public.short_links
  for select using (true);

-- 웨비나 소유자 또는 슈퍼어드민만 생성 가능
create policy "webinar owners can create short links" on public.short_links
  for insert with check (
    exists (
      select 1 from public.webinars w
      where w.id = webinar_id
      and (
        w.created_by = auth.uid()
        or exists (
          select 1 from public.agency_members am
          where am.agency_id = w.agency_id
          and am.user_id = auth.uid()
        )
        or exists (
          select 1 from public.client_members cm
          where cm.client_id = w.client_id
          and cm.user_id = auth.uid()
        )
        or coalesce((auth.jwt()->'app_metadata'->>'is_super_admin')::boolean, false)
      )
    )
  );

commit;

