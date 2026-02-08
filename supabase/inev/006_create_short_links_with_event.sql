-- inev.ai Phase 7: short_links 테이블 생성 (Event 기반)
-- Event 기반 ShortLink 지원

create table if not exists public.short_links (
  id bigserial primary key,
  code varchar(6) not null unique,
  event_id uuid references public.events(id) on delete cascade,
  webinar_id uuid references public.webinars(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz, -- 선택적 만료 시간
  created_by uuid references auth.users(id) on delete set null
);

-- 제약조건: event_id 또는 webinar_id 중 하나는 필수
alter table public.short_links
  add constraint short_links_event_or_webinar_check
  check (
    (event_id is not null and webinar_id is null) or
    (event_id is null and webinar_id is not null)
  );

-- 인덱스
create index if not exists idx_short_links_code on public.short_links(code);
create index if not exists idx_short_links_event_id on public.short_links(event_id);
create index if not exists idx_short_links_webinar_id on public.short_links(webinar_id);

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

-- Event 또는 Webinar 소유자만 생성 가능
create policy "event or webinar owners can create short links" on public.short_links
  for insert with check (
    -- Event 기반인 경우
    (event_id is not null and exists (
      select 1 from public.events e
      where e.id = event_id
      and (
        e.client_id in (select my_client_ids())
        or coalesce((auth.jwt()->'app_metadata'->>'is_super_admin')::boolean, false)
      )
    ))
    or
    -- Webinar 기반인 경우
    (webinar_id is not null and exists (
      select 1 from public.webinars w
      where w.id = webinar_id
      and (
        w.client_id in (select my_client_ids())
        or coalesce((auth.jwt()->'app_metadata'->>'is_super_admin')::boolean, false)
      )
    ))
  );

-- 코멘트 추가
comment on table public.short_links is 'inev: 짧은 링크 (Event 또는 Webinar 기반)';
comment on column public.short_links.event_id is 'inev: 이벤트 ID (Event 기반 ShortLink). event_id 또는 webinar_id 중 하나는 필수';
comment on column public.short_links.webinar_id is 'inev: 웨비나 ID (웨비나 기반 ShortLink, 호환성 유지). event_id 또는 webinar_id 중 하나는 필수';
comment on column public.short_links.code is 'inev: 6자리 숫자 코드 (예: 123456)';
