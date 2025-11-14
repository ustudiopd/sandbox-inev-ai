begin;

create extension if not exists pgcrypto; -- gen_random_uuid(), digest()

-- 1) 공통: 폼(설문/퀴즈 구분)
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null,
  agency_id uuid,
  client_id uuid,
  title text not null,
  description text,
  kind text not null check (kind in ('survey','quiz')),
  status text not null default 'draft' check (status in ('draft','open','closed')),
  time_limit_sec int,             -- (quiz) 전체 제한시간(선택)
  max_attempts int default 1,     -- (quiz) 허용 시도수(선택)
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 2) 문항
create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  order_no int not null,
  type text not null check (type in ('single','multiple','text')),
  body text not null,
  options jsonb,                  -- 보기(선택): [{id,text}, ...]
  points int default 0,           -- (quiz) 배점
  answer_key jsonb,               -- (quiz) 정답(선택): {choiceIds:[], text:'...'}
  created_at timestamptz not null default now()
);

create index form_questions_form_id_order_idx on public.form_questions(form_id, order_no);

-- 3) 제출(설문은 질문별 1행, 퀴즈는 '시도 attempt' + '답변 answer'로 분해)
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  participant_id uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now()
);

-- 설문은 1회만 제출 가능 (트리거로 검증)
-- UNIQUE 인덱스는 서브쿼리를 지원하지 않으므로 트리거 사용
create or replace function public.check_survey_submission_once() returns trigger as $$
declare
  form_kind text;
begin
  select kind into form_kind from public.forms where id = new.form_id;
  if form_kind = 'survey' then
    if exists (
      select 1 from public.form_submissions
      where form_id = new.form_id and participant_id = new.participant_id
    ) then
      raise exception 'Survey can only be submitted once';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tg_check_survey_submission_once
  before insert on public.form_submissions
  for each row execute function public.check_survey_submission_once();

-- 질문별 응답(설문/퀴즈 공용)
create table public.form_answers (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  question_id uuid not null references public.form_questions(id) on delete cascade,
  participant_id uuid not null references public.profiles(id),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  choice_ids jsonb,               -- ["opt_a", "opt_b"] (single도 배열로 통일)
  text_answer text,               -- 주관식
  is_correct boolean,             -- (quiz) 채점 결과
  points_awarded int default 0,   -- (quiz) 득점
  answered_at timestamptz not null default now()
);

create unique index uniq_answer_once
  on public.form_answers(question_id, participant_id, submission_id);

-- (quiz) 시도 관리
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  participant_id uuid not null references public.profiles(id),
  attempt_no int not null,          -- 1..max_attempts
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_score int default 0,
  duration_ms int
);

create unique index uniq_attempt_once
  on public.quiz_attempts(form_id, participant_id, attempt_no);

-- 인덱스 추가
create index idx_forms_webinar_id on public.forms(webinar_id);
create index idx_forms_status on public.forms(status);
create index idx_form_submissions_form_id on public.form_submissions(form_id);
create index idx_form_answers_submission_id on public.form_answers(submission_id);
create index idx_quiz_attempts_form_id on public.quiz_attempts(form_id);

-- 트리거: agency_id, client_id 자동 채움
create trigger tg_fill_org_fields_forms
  before insert on public.forms
  for each row execute function public.fill_org_fields();

create trigger tg_fill_org_fields_form_submissions
  before insert on public.form_submissions
  for each row execute function public.fill_org_fields();

create trigger tg_fill_org_fields_form_answers
  before insert on public.form_answers
  for each row execute function public.fill_org_fields();

create trigger tg_fill_org_fields_quiz_attempts
  before insert on public.quiz_attempts
  for each row execute function public.fill_org_fields();

-- RLS 활성화
alter table public.forms enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_answers enable row level security;
alter table public.quiz_attempts enable row level security;

-- RLS 정책
-- 폼 읽기: 웨비나 참여자 또는 운영자
create policy "read forms in scope" on public.forms for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = forms.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = forms.client_id)
    or (status = 'open' and exists (select 1 from public.registrations r where r.webinar_id = forms.webinar_id and r.user_id = auth.uid()))
  );

-- 폼 생성/수정: 클라이언트 operator 이상
create policy "manage forms by operator" on public.forms for all
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = forms.client_id and c.role in ('owner','admin','operator'))
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = forms.client_id and c.role in ('owner','admin','operator'))
  );

-- 문항 읽기: 폼 접근 권한과 동일
create policy "read form questions in scope" on public.form_questions for select
  using (
    exists (select 1 from public.forms f where f.id = form_questions.form_id
            and (
              (select is_super_admin from public.me) is true
              or exists (select 1 from public.my_agencies a where a.agency_id = f.agency_id)
              or exists (select 1 from public.my_clients c where c.client_id = f.client_id)
              or (f.status = 'open' and exists (select 1 from public.registrations r where r.webinar_id = f.webinar_id and r.user_id = auth.uid()))
            ))
  );

-- 문항 생성/수정: 폼 관리 권한과 동일
create policy "manage form questions by operator" on public.form_questions for all
  using (
    exists (select 1 from public.forms f where f.id = form_questions.form_id
            and (
              (select is_super_admin from public.me) is true
              or exists (select 1 from public.my_clients c
                         where c.client_id = f.client_id and c.role in ('owner','admin','operator'))
            ))
  )
  with check (
    exists (select 1 from public.forms f where f.id = form_questions.form_id
            and (
              (select is_super_admin from public.me) is true
              or exists (select 1 from public.my_clients c
                         where c.client_id = f.client_id and c.role in ('owner','admin','operator'))
            ))
  );

-- 제출: 웨비나 참여자만, 본인 것만
create policy "insert my form submission" on public.form_submissions for insert
  with check (
    participant_id = auth.uid()
    and exists (select 1 from public.forms f
                where f.id = form_submissions.form_id
                  and f.status = 'open'
                  and exists (select 1 from public.registrations r
                              where r.webinar_id = f.webinar_id and r.user_id = auth.uid()))
  );

create policy "read my form submissions" on public.form_submissions for select
  using (
    participant_id = auth.uid()
    or exists (select 1 from public.forms f
               where f.id = form_submissions.form_id
                 and (
                   (select is_super_admin from public.me) is true
                   or exists (select 1 from public.my_agencies a where a.agency_id = f.agency_id)
                   or exists (select 1 from public.my_clients c where c.client_id = f.client_id)
                 ))
  );

-- 응답: 제출과 동일한 권한
create policy "insert my form answer" on public.form_answers for insert
  with check (
    participant_id = auth.uid()
    and exists (select 1 from public.form_submissions s
                where s.id = form_answers.submission_id and s.participant_id = auth.uid())
  );

create policy "read form answers in scope" on public.form_answers for select
  using (
    participant_id = auth.uid()
    or exists (select 1 from public.forms f
               where f.id = form_answers.form_id
                 and (
                   (select is_super_admin from public.me) is true
                   or exists (select 1 from public.my_agencies a where a.agency_id = f.agency_id)
                   or exists (select 1 from public.my_clients c where c.client_id = f.client_id)
                 ))
  );

-- 퀴즈 시도: 본인 것만
create policy "insert my quiz attempt" on public.quiz_attempts for insert
  with check (
    participant_id = auth.uid()
    and exists (select 1 from public.forms f
                where f.id = quiz_attempts.form_id
                  and f.kind = 'quiz'
                  and f.status = 'open'
                  and exists (select 1 from public.registrations r
                              where r.webinar_id = f.webinar_id and r.user_id = auth.uid()))
  );

create policy "read my quiz attempts" on public.quiz_attempts for select
  using (
    participant_id = auth.uid()
    or exists (select 1 from public.forms f
               where f.id = quiz_attempts.form_id
                 and (
                   (select is_super_admin from public.me) is true
                   or exists (select 1 from public.my_agencies a where a.agency_id = f.agency_id)
                   or exists (select 1 from public.my_clients c where c.client_id = f.client_id)
                 ))
  );

-- Realtime 활성화
alter publication supabase_realtime add table public.forms;
alter publication supabase_realtime add table public.form_questions;
alter publication supabase_realtime add table public.form_submissions;
alter publication supabase_realtime add table public.form_answers;
alter publication supabase_realtime add table public.quiz_attempts;

commit;

