-- RLS 정책 성능 최적화 (2부): messages, profiles, notes 테이블
-- auth.uid() 호출을 (select auth.uid())로 변경하여 각 행마다 재평가되는 것을 방지
-- 참고: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

begin;

-- ============================================================
-- messages 테이블 정책 수정
-- ============================================================

-- "scoped_read" 정책 수정
drop policy if exists "scoped_read" on public.messages;
create policy "scoped_read"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.registrations r
    where r.webinar_id = messages.webinar_id
      and r.user_id = (select auth.uid())
  )
);

-- "users_can_insert_own_messages" 정책 수정
drop policy if exists "users_can_insert_own_messages" on public.messages;
create policy "users_can_insert_own_messages"
on public.messages for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- "update_messages" 정책 수정
drop policy if exists "update_messages" on public.messages;
create policy "update_messages"
on public.messages for update
to authenticated
using (
  user_id = (select auth.uid())
  or public.jwt_is_super_admin()
)
with check (
  user_id = (select auth.uid())
  or public.jwt_is_super_admin()
);

-- "delete_messages" 정책 수정
drop policy if exists "delete_messages" on public.messages;
create policy "delete_messages"
on public.messages for delete
to authenticated
using (
  user_id = (select auth.uid())
  or public.jwt_is_super_admin()
);

-- ============================================================
-- profiles 테이블 정책 수정
-- ============================================================

-- "read own profile" 정책 수정
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select
  using (id = (select auth.uid()));

-- "update own profile" 정책 수정
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ============================================================
-- notes 테이블 정책 수정
-- ============================================================

-- "클라이언트 멤버는 노트 조회 가능" 정책 수정
drop policy if exists "클라이언트 멤버는 노트 조회 가능" on public.notes;
create policy "클라이언트 멤버는 노트 조회 가능"
  on public.notes for select
  using (
    exists (
      select 1 from public.client_members
      where client_members.client_id = notes.client_id
        and client_members.user_id = (select auth.uid())
    )
  );

-- "클라이언트 멤버는 노트 작성 가능" 정책 수정
drop policy if exists "클라이언트 멤버는 노트 작성 가능" on public.notes;
create policy "클라이언트 멤버는 노트 작성 가능"
  on public.notes for insert
  with check (
    exists (
      select 1 from public.client_members
      where client_members.client_id = notes.client_id
        and client_members.user_id = (select auth.uid())
    )
  );

-- "작성자는 노트 수정 가능" 정책 수정
drop policy if exists "작성자는 노트 수정 가능" on public.notes;
create policy "작성자는 노트 수정 가능"
  on public.notes for update
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- "작성자는 노트 삭제 가능" 정책 수정
drop policy if exists "작성자는 노트 삭제 가능" on public.notes;
create policy "작성자는 노트 삭제 가능"
  on public.notes for delete
  using (author_id = (select auth.uid()));

-- ============================================================
-- note_comments 테이블 정책 수정
-- ============================================================

-- "클라이언트 멤버는 댓글 조회 가능" 정책 수정
drop policy if exists "클라이언트 멤버는 댓글 조회 가능" on public.note_comments;
create policy "클라이언트 멤버는 댓글 조회 가능"
  on public.note_comments for select
  using (
    exists (
      select 1 from public.notes
      join public.client_members on client_members.client_id = notes.client_id
      where notes.id = note_comments.note_id
        and client_members.user_id = (select auth.uid())
    )
  );

-- "클라이언트 멤버는 댓글 작성 가능" 정책 수정
drop policy if exists "클라이언트 멤버는 댓글 작성 가능" on public.note_comments;
create policy "클라이언트 멤버는 댓글 작성 가능"
  on public.note_comments for insert
  with check (
    exists (
      select 1 from public.notes
      join public.client_members on client_members.client_id = notes.client_id
      where notes.id = note_comments.note_id
        and client_members.user_id = (select auth.uid())
    )
  );

-- "작성자는 댓글 수정 가능" 정책 수정
drop policy if exists "작성자는 댓글 수정 가능" on public.note_comments;
create policy "작성자는 댓글 수정 가능"
  on public.note_comments for update
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- "작성자는 댓글 삭제 가능" 정책 수정
drop policy if exists "작성자는 댓글 삭제 가능" on public.note_comments;
create policy "작성자는 댓글 삭제 가능"
  on public.note_comments for delete
  using (author_id = (select auth.uid()));

commit;
