-- inev.ai Phase 7: short_links 테이블에 event_id 추가
-- Event 기반 ShortLink 지원

-- event_id 컬럼 추가 (nullable, webinar_id와 둘 중 하나는 필수)
alter table public.short_links
  add column if not exists event_id uuid references public.events(id) on delete cascade;

-- webinar_id를 nullable로 변경 (event_id와 둘 중 하나는 필수)
alter table public.short_links
  alter column webinar_id drop not null;

-- 제약조건: event_id 또는 webinar_id 중 하나는 필수
alter table public.short_links
  add constraint short_links_event_or_webinar_check
  check (
    (event_id is not null and webinar_id is null) or
    (event_id is null and webinar_id is not null)
  );

-- 인덱스 추가
create index if not exists idx_short_links_event_id on public.short_links(event_id);

-- 코멘트 추가
comment on column public.short_links.event_id is 'inev: 이벤트 ID (Event 기반 ShortLink). event_id 또는 webinar_id 중 하나는 필수';
comment on column public.short_links.webinar_id is 'inev: 웨비나 ID (웨비나 기반 ShortLink, 호환성 유지). event_id 또는 webinar_id 중 하나는 필수';

-- RLS 정책 업데이트: Event 소유자도 생성 가능하도록
drop policy if exists "webinar owners can create short links" on public.short_links;

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
    -- Webinar 기반인 경우 (기존 로직 유지)
    (webinar_id is not null and exists (
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
    ))
  );
