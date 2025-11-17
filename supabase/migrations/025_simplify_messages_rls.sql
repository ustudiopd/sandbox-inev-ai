begin;

-- ============================================================
-- messages 테이블 RLS 정책 단순화
-- Realtime 성능 향상 및 RLS 재귀 방지
-- ============================================================

-- 0) JWT 기반 슈퍼어드민 판정 함수
-- Supabase에서는 auth.jwt() 헬퍼 함수를 사용하는 것이 안전합니다.
-- current_setting은 일부 환경에서 지원되지 않을 수 있으므로 auth.jwt() 사용
create or replace function public.jwt_is_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
    false
  );
$$;

-- registrations 테이블 인덱스 확인 및 생성 (SELECT 정책 성능 향상)
-- 복합 인덱스로 webinar_id와 user_id 조회 성능 최적화
create index if not exists idx_registrations_webinar_user 
on public.registrations(webinar_id, user_id);

-- 1) 기존 정책 모두 삭제
drop policy if exists "read messages if in scope" on messages;
drop policy if exists "insert message if registered" on messages;
drop policy if exists "update own messages" on messages;
drop policy if exists "delete own messages" on messages;

-- 2) RLS 활성화 확인
alter table messages enable row level security;

-- 3) SELECT: registrations 기반 얇은 ACL (보안 + 성능 균형)
-- 웨비나에 등록된 사용자만 메시지를 읽을 수 있음
-- 인덱스 활용으로 빠른 조회 가능
create policy "scoped_read"
on messages for select
to authenticated
using (
  exists (
    select 1 from registrations r
    where r.webinar_id = messages.webinar_id
      and r.user_id = auth.uid()
  )
);

-- 4) INSERT: 자기 소유만 (Spoofing 방지)
-- 웨비나 등록 확인은 앞단(Server Component)에서 이미 처리됨
create policy "users_can_insert_own_messages"
on messages for insert
to authenticated
with check (auth.uid() = user_id);

-- 5) UPDATE: 자신의 메시지 또는 슈퍼어드민(JWT)
-- JWT에서 직접 읽으므로 RLS 재귀 없음
create policy "update_messages"
on messages for update
to authenticated
using (
  user_id = auth.uid()
  or public.jwt_is_super_admin()
)
with check (
  user_id = auth.uid()
  or public.jwt_is_super_admin()
);

-- 6) DELETE: 자신의 메시지 또는 슈퍼어드민(JWT)
-- JWT에서 직접 읽으므로 RLS 재귀 없음
create policy "delete_messages"
on messages for delete
to authenticated
using (
  user_id = auth.uid()
  or public.jwt_is_super_admin()
);

commit;

