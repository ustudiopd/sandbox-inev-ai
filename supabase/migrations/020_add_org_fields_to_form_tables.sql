begin;

-- form_submissions, form_answers, quiz_attempts 테이블에 agency_id, client_id 컬럼 추가
-- RLS 정책과 트리거를 위해 필요

alter table public.form_submissions
  add column if not exists agency_id uuid,
  add column if not exists client_id uuid;

alter table public.form_answers
  add column if not exists agency_id uuid,
  add column if not exists client_id uuid;

alter table public.quiz_attempts
  add column if not exists agency_id uuid,
  add column if not exists client_id uuid;

-- 인덱스 추가 (RLS 정책 성능 향상)
create index if not exists idx_form_submissions_agency_id on public.form_submissions(agency_id) where agency_id is not null;
create index if not exists idx_form_submissions_client_id on public.form_submissions(client_id) where client_id is not null;

create index if not exists idx_form_answers_agency_id on public.form_answers(agency_id) where agency_id is not null;
create index if not exists idx_form_answers_client_id on public.form_answers(client_id) where client_id is not null;

create index if not exists idx_quiz_attempts_agency_id on public.quiz_attempts(agency_id) where agency_id is not null;
create index if not exists idx_quiz_attempts_client_id on public.quiz_attempts(client_id) where client_id is not null;

commit;

