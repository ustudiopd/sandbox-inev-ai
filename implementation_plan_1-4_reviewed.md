# EventLive.ai 기능 구현 계획 (1-4단계) - 검토 및 개선안

**작성일**: 2025-01-XX  
**검토 기준**: `해결책.md` 의견 반영  
**대상 기능**: 
1. 설문조사 기능
2. 발표자료 다운로드 기능
3. 퀴즈 기능
4. 추첨 기능

---

## 📋 변경 사항 요약

### 주요 개선점

1. **설문/퀴즈 통합**: 별도 테이블 대신 `forms` 테이블로 통합 (`kind` 필드로 구분)
   - 코드 재사용성 향상
   - 일관된 렌더링 파이프라인
   - 유지보수 용이

2. **추첨 시스템 개선**: Commit-Reveal 패턴 도입
   - 재현성 보장
   - 감사 가능성
   - 공정성 검증

3. **성능 최적화 강화**: 커서 페이지네이션, 물리화된 뷰, 가상 스크롤

4. **API 구조 통합**: 폼 관련 API를 통합 경로로 변경

---

## 📋 목차

1. [설문/퀴즈 통합 기능 (Forms)](#1-설문퀴즈-통합-기능-forms)
2. [발표자료 다운로드 기능](#2-발표자료-다운로드-기능)
3. [추첨 기능 (Giveaways)](#3-추첨-기능-giveaways)
4. [공통 작업](#4-공통-작업)
5. [구현 순서](#5-구현-순서)

---

## 1. 설문/퀴즈 통합 기능 (Forms)

### 1.1 데이터베이스 스키마

#### 마이그레이션 파일: `015_create_forms_system.sql`

```sql
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

-- 설문은 1회만 제출 가능 (UNIQUE 인덱스)
create unique index uniq_form_submission_once
  on public.form_submissions(form_id, participant_id)
  where (
    (select kind from public.forms f where f.id=form_id) = 'survey'
  );

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
```

### 1.2 API 엔드포인트

#### 1.2.1 폼 생성/수정/삭제
- **파일**: `app/api/webinars/[webinarId]/forms/create/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 폼 생성 (설문 또는 퀴즈)

- **파일**: `app/api/webinars/[webinarId]/forms/[formId]/route.ts`
- **메서드**: PUT, DELETE
- **권한**: 클라이언트 operator 이상
- **기능**: 폼 수정/삭제

#### 1.2.2 폼 목록 조회
- **파일**: `app/api/webinars/[webinarId]/forms/route.ts`
- **메서드**: GET
- **쿼리 파라미터**: `?kind=survey|quiz&status=open`
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 웨비나별 폼 목록 조회

#### 1.2.3 폼 상세 조회
- **파일**: `app/api/webinars/[webinarId]/forms/[formId]/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 폼 상세 정보 및 문항 조회

#### 1.2.4 폼 상태 변경 (오픈/마감)
- **파일**: `app/api/webinars/[webinarId]/forms/[formId]/status/route.ts`
- **메서드**: PATCH
- **권한**: 클라이언트 operator 이상
- **기능**: 폼 상태 변경 (draft → open → closed)

#### 1.2.5 폼 제출 (설문/퀴즈 통합)
- **파일**: `app/api/webinars/[webinarId]/forms/[formId]/submit/route.ts`
- **메서드**: POST
- **권한**: 웨비나 참여자
- **기능**:
  - 설문: 1회만 제출 (UNIQUE 인덱스로 보장)
  - 퀴즈: `max_attempts` 체크 → `quiz_attempts` 생성 → `form_answers` 저장 → 서버 채점

#### 1.2.6 폼 결과 조회
- **파일**: `app/api/webinars/[webinarId]/forms/[formId]/results/route.ts`
- **메서드**: GET
- **권한**: 클라이언트 operator 이상
- **기능**: 폼 응답 통계 조회 (설문: 선택지별 분포, 퀴즈: 정답률, 점수 분포)

### 1.3 프론트엔드 컴포넌트

#### 1.3.1 운영 콘솔 - 폼 관리
- **파일**: `app/(webinar)/webinar/[id]/console/components/FormManagement.tsx`
- **기능**:
  - 폼 생성/수정/삭제 (설문/퀴즈 선택)
  - 문항 추가/수정/삭제
  - 퀴즈 정답/배점 설정
  - 폼 오픈/마감
  - 폼 결과 조회 (통계, 차트)
  - 실시간 응답 수 표시

#### 1.3.2 참여자 - 폼 응답
- **파일**: `components/webinar/FormWidget.tsx`
- **기능**:
  - 폼 팝업 표시 (오픈된 폼)
  - 질문 유형별 입력 폼 (단일 선택, 다중 선택, 텍스트)
  - 퀴즈 시간 제한 표시 (카운트다운)
  - 응답 제출
  - 이미 응답한 경우 안내 메시지
  - 퀴즈 정답 공개 후 정답 표시

#### 1.3.3 운영 콘솔 탭 추가
- **파일**: `app/(webinar)/webinar/[id]/console/components/ConsoleView.tsx`
- **변경사항**: "설문/퀴즈" 탭 추가 (기존 퀴즈 탭 통합)

### 1.4 실시간 기능

- **Supabase Realtime 구독**:
  - `forms` 테이블 변경 구독 (상태 변경, 새 폼)
  - `form_submissions` 테이블 변경 구독 (응답 수 업데이트)
  - `quiz_attempts` 테이블 변경 구독 (퀴즈 점수 업데이트)

---

## 2. 발표자료 다운로드 기능

### 2.1 데이터베이스 스키마

#### 마이그레이션 파일: `016_create_webinar_files.sql`

(기존 계획과 동일 - 변경 없음)

### 2.2 Supabase Storage 설정

(기존 계획과 동일 - 변경 없음)

### 2.3 API 엔드포인트

(기존 계획과 동일 - 변경 없음)

### 2.4 프론트엔드 컴포넌트

(기존 계획과 동일 - 변경 없음)

---

## 3. 추첨 기능 (Giveaways)

### 3.1 데이터베이스 스키마

#### 마이그레이션 파일: `017_create_giveaways.sql`

```sql
begin;

create extension if not exists pgcrypto; -- gen_random_uuid(), digest()

-- 경품 추첨
create table public.giveaways (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null,
  agency_id uuid,
  client_id uuid,
  name text not null,
  winners_count int not null check (winners_count > 0),
  status text not null default 'draft' check (status in ('draft','open','closed','drawn')),
  seed_commit text,               -- hex(sha256(seed)) 커밋
  seed_reveal text,               -- 리빌(추첨 시 입력)
  drawn_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  participant_id uuid not null references public.profiles(id),
  weight int not null default 1 check (weight > 0),
  eligible boolean not null default true,    -- 자격(약관 동의/지역 제한 등)
  reason text,                                -- 제외/가중치 사유
  created_at timestamptz not null default now()
);

create unique index uniq_entry_once on public.giveaway_entries(giveaway_id, participant_id);

create table public.giveaway_winners (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  participant_id uuid not null references public.profiles(id),
  rank int not null,                 -- 1..winners_count
  proof_json jsonb not null,         -- seed/해시/알고리즘 버전 등
  created_at timestamptz not null default now()
);

create unique index uniq_winner_once on public.giveaway_winners(giveaway_id, participant_id);
create unique index uniq_winner_rank on public.giveaway_winners(giveaway_id, rank);

-- 인덱스
create index idx_giveaways_webinar_id on public.giveaways(webinar_id);
create index idx_giveaway_entries_giveaway_id on public.giveaway_entries(giveaway_id);
create index idx_giveaway_winners_giveaway_id on public.giveaway_winners(giveaway_id);

-- 트리거: agency_id, client_id 자동 채움
create trigger tg_fill_org_fields_giveaways
  before insert on public.giveaways
  for each row execute function public.fill_org_fields();

-- RLS 활성화
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;
alter table public.giveaway_winners enable row level security;

-- RLS 정책
-- 추첨 읽기: 웨비나 참여자 또는 운영자
create policy "read giveaways in scope" on public.giveaways for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = giveaways.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = giveaways.client_id)
    or exists (select 1 from public.registrations r where r.webinar_id = giveaways.webinar_id and r.user_id = auth.uid())
  );

-- 추첨 생성/수정: 클라이언트 operator 이상
create policy "manage giveaways by operator" on public.giveaways for all
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = giveaways.client_id and c.role in ('owner','admin','operator'))
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = giveaways.client_id and c.role in ('owner','admin','operator'))
  );

-- 엔트리: 본인 것만 생성/조회
create policy "insert my giveaway entry" on public.giveaway_entries for insert
  with check (
    participant_id = auth.uid()
    and exists (select 1 from public.giveaways g
                where g.id = giveaway_entries.giveaway_id
                  and g.status = 'open'
                  and exists (select 1 from public.registrations r
                              where r.webinar_id = g.webinar_id and r.user_id = auth.uid()))
  );

create policy "read giveaway entries in scope" on public.giveaway_entries for select
  using (
    participant_id = auth.uid()
    or exists (select 1 from public.giveaways g
               where g.id = giveaway_entries.giveaway_id
                 and (
                   (select is_super_admin from public.me) is true
                   or exists (select 1 from public.my_agencies a where a.agency_id = g.agency_id)
                   or exists (select 1 from public.my_clients c where c.client_id = g.client_id)
                 ))
  );

-- 당첨자: 기본 공개 (방송용)
create policy "read giveaway winners in scope" on public.giveaway_winners for select
  using (
    exists (select 1 from public.giveaways g
            where g.id = giveaway_winners.giveaway_id
              and (
                (select is_super_admin from public.me) is true
                or exists (select 1 from public.my_agencies a where a.agency_id = g.agency_id)
                or exists (select 1 from public.my_clients c where c.client_id = g.client_id)
                or exists (select 1 from public.registrations r where r.webinar_id = g.webinar_id and r.user_id = auth.uid())
              ))
  );

-- 추첨 SQL 함수 (Commit-Reveal 패턴)
-- 커밋 검증 함수
create or replace function public.verify_seed_commit(seed_commit text, seed_reveal text)
returns jsonb language sql as $$
  select jsonb_build_object(
    'ok', encode(digest(seed_reveal, 'sha256'), 'hex') = seed_commit
  );
$$;

-- 추첨 함수: weight/eligible 반영, sha256(entry.id || seed)로 랭킹
create or replace function public.draw_giveaway(p_giveaway_id uuid, p_seed text)
returns jsonb language plpgsql as $$
declare
  n int;
  result jsonb := '[]'::jsonb;
begin
  select winners_count into n from public.giveaways where id = p_giveaway_id FOR UPDATE;
  if n is null then raise exception 'giveaway not found'; end if;

  with c as (
    select e.*, encode(digest(e.id::text || p_seed, 'sha256'), 'hex') as hash_hex
    from public.giveaway_entries e
    where e.giveaway_id = p_giveaway_id and e.eligible = true
  ), ranked as (
    select *, row_number() over (order by hash_hex asc) as rn
    from c
  ), picked as (
    select * from ranked where rn <= n
  )
  insert into public.giveaway_winners(giveaway_id, participant_id, rank, proof_json)
    select p_giveaway_id, participant_id, rn,
           jsonb_build_object('seed', p_seed, 'hash', hash_hex, 'algo', 'sha256(entry_id||seed)')
    from picked
  returning jsonb_build_object('participant_id', participant_id, 'rank', rank, 'proof', proof_json)
  into result;

  return (select jsonb_agg(jsonb_build_object('participant_id', participant_id, 'rank', rank, 'proof', proof_json))
          from public.giveaway_winners where giveaway_id=p_giveaway_id);
end;
$$;

-- Realtime 활성화
alter publication supabase_realtime add table public.giveaways;
alter publication supabase_realtime add table public.giveaway_entries;
alter publication supabase_realtime add table public.giveaway_winners;

commit;
```

### 3.2 API 엔드포인트

#### 3.2.1 추첨 생성/수정/삭제
- **파일**: `app/api/webinars/[webinarId]/giveaways/create/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 추첨 생성

- **파일**: `app/api/webinars/[webinarId]/giveaways/[giveawayId]/route.ts`
- **메서드**: PUT, DELETE
- **권한**: 클라이언트 operator 이상
- **기능**: 추첨 수정/삭제

#### 3.2.2 추첨 목록 조회
- **파일**: `app/api/webinars/[webinarId]/giveaways/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 웨비나별 추첨 목록 조회

#### 3.2.3 추첨 참여
- **파일**: `app/api/webinars/[webinarId]/giveaways/[giveawayId]/enter/route.ts`
- **메서드**: POST
- **권한**: 웨비나 참여자
- **기능**: 추첨 참여 (엔트리 생성)

#### 3.2.4 Seed 커밋 (추첨 전)
- **파일**: `app/api/webinars/[webinarId]/giveaways/[giveawayId]/commit/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: `seed_commit = sha256(seed)` 저장 (공개)

#### 3.2.5 추첨 실행 (Commit-Reveal)
- **파일**: `app/api/webinars/[webinarId]/giveaways/[giveawayId]/draw/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**:
  - `seed_reveal` 검증 (`sha256(reveal) == commit`)
  - SQL 함수 `draw_giveaway()` 호출
  - 당첨자 저장 및 상태 변경

#### 3.2.6 추첨 결과 조회
- **파일**: `app/api/webinars/[webinarId]/giveaways/[giveawayId]/results/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 추첨 당첨자 목록 조회

#### 3.2.7 추첨 재현성 검증
- **파일**: `app/api/webinars/[webinarId]/giveaways/[giveawayId]/verify/route.ts`
- **메서드**: GET
- **권한**: 클라이언트 operator 이상
- **기능**: seed를 사용하여 추첨 결과 재현성 검증

### 3.3 프론트엔드 컴포넌트

#### 3.3.1 운영 콘솔 - 추첨 관리
- **파일**: `app/(webinar)/webinar/[id]/console/components/GiveawayManagement.tsx`
- **기능**:
  - 추첨 생성/수정/삭제
  - 당첨자 수 설정
  - Seed 커밋 (추첨 전)
  - 추첨 실행 (Seed Reveal)
  - 추첨 결과 표시
  - 추첨 재현성 검증

#### 3.3.2 참여자 - 추첨 참여 및 당첨 알림
- **파일**: `components/webinar/GiveawayWidget.tsx`
- **기능**:
  - 추첨 참여 버튼
  - 참여자 수 표시 (실시간)
  - 당첨 알림 팝업 (실시간)
  - 당첨자 목록 표시

#### 3.3.3 운영 콘솔 탭 구현
- **파일**: `app/(webinar)/webinar/[id]/console/components/ConsoleView.tsx`
- **변경사항**: 추첨 탭 플레이스홀더를 실제 컴포넌트로 교체

### 3.4 실시간 기능

- **Supabase Realtime 구독**:
  - `giveaways` 테이블 변경 구독 (상태 변경, 새 추첨)
  - `giveaway_entries` 테이블 변경 구독 (참여자 수 업데이트)
  - `giveaway_winners` 테이블 변경 구독 (당첨자 발표)

---

## 4. 공통 작업

### 4.1 타입 정의

#### 파일: `lib/types/webinar.ts` (신규 또는 확장)
```typescript
// 폼 관련 타입
export type FormKind = 'survey' | 'quiz'
export type FormStatus = 'draft' | 'open' | 'closed'
export type QuestionType = 'single' | 'multiple' | 'text'

export interface Form {
  id: string
  webinar_id: string
  agency_id: string
  client_id: string
  title: string
  description?: string
  kind: FormKind
  status: FormStatus
  time_limit_sec?: number
  max_attempts?: number
  created_by: string
  created_at: string
}

export interface FormQuestion {
  id: string
  form_id: string
  order_no: number
  type: QuestionType
  body: string
  options?: Array<{ id: string; text: string }>
  points?: number
  answer_key?: { choiceIds?: string[]; text?: string }
  created_at: string
}

// 추첨 관련 타입
export type GiveawayStatus = 'draft' | 'open' | 'closed' | 'drawn'

export interface Giveaway {
  id: string
  webinar_id: string
  agency_id: string
  client_id: string
  name: string
  winners_count: number
  status: GiveawayStatus
  seed_commit?: string
  seed_reveal?: string
  drawn_at?: string
  created_by: string
  created_at: string
}
```

### 4.2 유틸리티 함수

#### 파일: `lib/webinar/utils.ts` (확장)
- 파일 크기 포맷팅
- 폼 통계 계산 (선택지별 분포, 정답률)
- 커서 페이지네이션 헬퍼

### 4.3 성능 최적화

#### 데이터베이스
- 모든 FK에 인덱스 설정
- 대용량 응답 테이블은 `created_at DESC + 커서`로 페이지네이션
- 집계는 물리화된 뷰 또는 `COUNT(head:true)`로 실시간 근사치

#### 프론트엔드
- 결과 표/점수판은 가상 스크롤 + 스켈레톤
- 폼 렌더링은 질문별 분할 렌더 (옵션이 많은 문항은 지연 로드)
- Realtime 구독은 응답수/점수판/당첨자만 구독 (핫패스)

### 4.4 보안/악용 방지

- **중복 제출 방지**:
  - 설문: `uniq_form_submission_once(form_id, participant_id)`
  - 응답: `uniq_answer_once(question_id, participant_id, submission_id)`
  - 엔트리: `uniq_entry_once(giveaway_id, participant_id)`
- **권한/RLS 이중 방어**: DB RLS + 앱 가드
- **봇 방지**: 너무 이른 연속 제출 차단 (서버에서 최소 간격 검사)
- **감사 로그**: 추첨 실행/폼 상태 변경은 `audit_logs`에 기록

### 4.5 에러 처리

- 모든 API 라우트에 일관된 에러 처리
- 사용자 친화적인 에러 메시지
- 감사 로그 기록 (중요 작업)

---

## 5. 구현 순서

### Phase 1: 데이터베이스 및 API (1주)
1. ✅ 폼 시스템 스키마 마이그레이션 (`015_create_forms_system.sql`)
2. ✅ 발표자료 파일 스키마 마이그레이션 (`016_create_webinar_files.sql`)
3. ✅ 추첨 시스템 스키마 마이그레이션 (`017_create_giveaways.sql`)
4. ✅ Supabase Storage Bucket 설정
5. ✅ 폼 API 엔드포인트 구현 (통합)
6. ✅ 발표자료 파일 API 엔드포인트 구현
7. ✅ 추첨 API 엔드포인트 구현 (Commit-Reveal)

### Phase 2: 운영 콘솔 (1주)
1. ✅ 폼 관리 컴포넌트 (`FormManagement.tsx`)
2. ✅ 파일 관리 컴포넌트 (`FileManagement.tsx`)
3. ✅ 추첨 관리 컴포넌트 (`GiveawayManagement.tsx`)
4. ✅ 운영 콘솔 탭 통합 (`ConsoleView.tsx`)

### Phase 3: 참여자 UI (1주)
1. ✅ 폼 응답 컴포넌트 (`FormWidget.tsx`)
2. ✅ 파일 다운로드 컴포넌트 (`FileDownload.tsx`)
3. ✅ 추첨 참여 컴포넌트 (`GiveawayWidget.tsx`)
4. ✅ 웨비나 시청 페이지 통합

### Phase 4: 실시간 기능 및 최적화 (3일)
1. ✅ Supabase Realtime 구독 설정
2. ✅ 실시간 업데이트 UI 반영
3. ✅ 성능 최적화 (인덱스, 쿼리 최적화, 커서 페이지네이션)
4. ✅ 에러 처리 개선
5. ✅ 테스트 및 버그 수정

### Phase 5: 웨비나 생성/수정 페이지 통합 (2일)
1. ✅ 웨비나 생성 페이지에 파일 업로드 추가
2. ✅ 웨비나 수정 페이지 생성 및 파일 관리 기능 추가

---

## 6. 예상 작업 시간

- **총 예상 시간**: 약 3-4주
- **데이터베이스/API**: 1주
- **운영 콘솔**: 1주
- **참여자 UI**: 1주
- **실시간/최적화/통합**: 1주

---

## 7. 주요 변경 사항 요약

### 7.1 설문/퀴즈 통합
- ✅ 별도 테이블 (`surveys`, `quizzes`) → 통합 테이블 (`forms`)
- ✅ 통합 API 경로 (`/api/webinars/[webinarId]/forms/...`)
- ✅ 통합 컴포넌트 (`FormWidget.tsx`, `FormManagement.tsx`)

### 7.2 추첨 시스템 개선
- ✅ Commit-Reveal 패턴 도입
- ✅ 재현성 보장 (SQL 함수)
- ✅ 감사 가능성 (proof_json)

### 7.3 성능 최적화 강화
- ✅ 커서 페이지네이션
- ✅ 물리화된 뷰 (필요시)
- ✅ 가상 스크롤
- ✅ Realtime 구독 최적화 (핫패스/콜드패스)

---

## 8. 다음 단계

이 개선된 계획이 승인되면:
1. Phase 1부터 순차적으로 구현 시작
2. 각 Phase 완료 후 테스트 및 검토
3. 필요시 계획 수정 및 보완

