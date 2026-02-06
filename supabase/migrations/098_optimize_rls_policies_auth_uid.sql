-- RLS 정책 성능 최적화: auth.uid() 호출을 (select auth.uid())로 변경
-- 각 행마다 auth.uid()가 재평가되는 것을 방지하여 성능 향상
-- 참고: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

begin;

-- ============================================================
-- registrations 테이블 정책 수정
-- ============================================================

-- "register for webinar" 정책 수정
drop policy if exists "register for webinar" on public.registrations;
create policy "register for webinar" on public.registrations
  for insert
  with check (
    user_id = (select auth.uid())
  );

-- "delete registrations" 정책 수정
drop policy if exists "delete registrations" on public.registrations;
create policy "delete registrations" on public.registrations
  for delete
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.webinars w
      where w.id = registrations.webinar_id
        and (
          (select is_super_admin from public.me) is true
          or exists (
            select 1 from public.my_clients c
            where c.client_id = w.client_id and c.role in ('owner','admin','operator')
          )
        )
    )
  );

-- ============================================================
-- questions 테이블 정책 수정
-- ============================================================

-- "read questions if in scope" 정책 수정
drop policy if exists "read questions if in scope" on public.questions;
create policy "read questions if in scope" on public.questions
  for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = questions.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = questions.client_id)
    or exists (
      select 1 from public.registrations r
      where r.webinar_id = questions.webinar_id
        and r.user_id = (select auth.uid())
    )
  );

-- "insert question if registered" 정책 수정
drop policy if exists "insert question if registered" on public.questions;
create policy "insert question if registered" on public.questions
  for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registrations r
      where r.webinar_id = questions.webinar_id
        and r.user_id = (select auth.uid())
    )
  );

-- "update questions by operator" 정책 수정
drop policy if exists "update questions by operator" on public.questions;
create policy "update questions by operator" on public.questions
  for update
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.my_clients c
      where c.client_id = questions.client_id
        and c.role in ('owner','admin','operator')
    )
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.my_clients c
      where c.client_id = questions.client_id
        and c.role in ('owner','admin','operator')
    )
  );

-- "delete questions" 정책 수정
drop policy if exists "delete questions" on public.questions;
create policy "delete questions" on public.questions
  for delete
  using (
    user_id = (select auth.uid())
    or (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.my_clients c
      where c.client_id = questions.client_id
        and c.role in ('owner','admin','operator')
    )
  );

-- ============================================================
-- quizzes 테이블 정책 수정
-- ============================================================

-- "read quizzes if in scope" 정책 수정
drop policy if exists "read quizzes if in scope" on public.quizzes;
create policy "read quizzes if in scope" on public.quizzes
  for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = quizzes.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = quizzes.client_id)
    or exists (
      select 1 from public.registrations r
      where r.webinar_id = quizzes.webinar_id
        and r.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- quiz_responses 테이블 정책 수정
-- ============================================================

-- "read quiz responses" 정책 수정
drop policy if exists "read quiz responses" on public.quiz_responses;
create policy "read quiz responses" on public.quiz_responses
  for select
  using (
    user_id = (select auth.uid())
    or (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = quiz_responses.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = quiz_responses.client_id)
  );

-- "insert my quiz response" 정책 수정
drop policy if exists "insert my quiz response" on public.quiz_responses;
create policy "insert my quiz response" on public.quiz_responses
  for insert
  with check (
    user_id = (select auth.uid())
  );

-- ============================================================
-- draws 테이블 정책 수정
-- ============================================================

-- "read draws/winners in scope" 정책 수정
drop policy if exists "read draws/winners in scope" on public.draws;
create policy "read draws/winners in scope" on public.draws
  for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = draws.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = draws.client_id)
    or exists (
      select 1 from public.registrations r
      where r.webinar_id = draws.webinar_id
        and r.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- winners 테이블 정책 수정
-- ============================================================

-- "read winners via draw scope" 정책 수정
drop policy if exists "read winners via draw scope" on public.winners;
create policy "read winners via draw scope" on public.winners
  for select
  using (
    exists (
      select 1 from public.draws d
      where d.id = winners.draw_id
        and (
          (select is_super_admin from public.me) is true
          or exists (select 1 from public.my_agencies a where a.agency_id = d.agency_id)
          or exists (select 1 from public.my_clients c where c.client_id = d.client_id)
          or exists (
            select 1 from public.registrations r
            where r.webinar_id = d.webinar_id
              and r.user_id = (select auth.uid())
          )
        )
    )
  );

-- ============================================================
-- reactions 테이블 정책 수정
-- ============================================================

-- "read reactions if in scope" 정책 수정
drop policy if exists "read reactions if in scope" on public.reactions;
create policy "read reactions if in scope" on public.reactions
  for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = reactions.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = reactions.client_id)
    or exists (
      select 1 from public.registrations r
      where r.webinar_id = reactions.webinar_id
        and r.user_id = (select auth.uid())
    )
  );

-- "insert reaction if registered" 정책 수정
drop policy if exists "insert reaction if registered" on public.reactions;
create policy "insert reaction if registered" on public.reactions
  for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registrations r
      where r.webinar_id = reactions.webinar_id
        and r.user_id = (select auth.uid())
    )
  );

commit;
