# EventLive.ai 기능 구현 계획 (1-4단계)

**작성일**: 2025-01-XX  
**대상 기능**: 
1. 설문조사 기능
2. 발표자료 다운로드 기능
3. 퀴즈 기능
4. 추첨 기능

---

## 📋 목차

1. [설문조사 기능](#1-설문조사-기능)
2. [발표자료 다운로드 기능](#2-발표자료-다운로드-기능)
3. [퀴즈 기능](#3-퀴즈-기능)
4. [추첨 기능](#4-추첨-기능)
5. [공통 작업](#5-공통-작업)
6. [구현 순서](#6-구현-순서)

---

## 1. 설문조사 기능

### 1.1 데이터베이스 스키마

#### 마이그레이션 파일: `015_create_surveys.sql`

```sql
-- 설문조사 테이블
create table public.surveys (
  id bigserial primary key,
  agency_id uuid not null,
  client_id uuid not null,
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  title text not null,
  description text,
  questions jsonb not null,  -- [{"id":1,"type":"single_choice","question":"질문","options":["A","B","C"]},...]
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_by uuid not null references public.profiles(id),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now()
);

-- 설문조사 응답 테이블
create table public.survey_responses (
  id bigserial primary key,
  agency_id uuid not null,
  client_id uuid not null,
  survey_id bigint not null references public.surveys(id) on delete cascade,
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  answers jsonb not null,  -- [{"question_id":1,"answer":"A"},...]
  created_at timestamptz default now(),
  unique (survey_id, user_id)
);

-- 인덱스
create index idx_surveys_webinar_id on public.surveys(webinar_id);
create index idx_surveys_status on public.surveys(status);
create index idx_survey_responses_survey_id on public.survey_responses(survey_id);
create index idx_survey_responses_user_id on public.survey_responses(user_id);

-- 트리거: agency_id, client_id 자동 채움
create trigger tg_fill_org_fields_surveys
  before insert on public.surveys
  for each row execute function public.fill_org_fields();

create trigger tg_fill_org_fields_survey_responses
  before insert on public.survey_responses
  for each row execute function public.fill_org_fields();

-- RLS 활성화
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- RLS 정책
-- 설문조사 읽기: 웨비나 참여자 또는 운영자
create policy "read surveys in scope" on public.surveys for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = surveys.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = surveys.client_id)
    or exists (select 1 from public.registrations r where r.webinar_id = surveys.webinar_id and r.user_id = auth.uid())
  );

-- 설문조사 생성/수정: 클라이언트 operator 이상
create policy "manage surveys by operator" on public.surveys for all
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = surveys.client_id and c.role in ('owner','admin','operator'))
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = surveys.client_id and c.role in ('owner','admin','operator'))
  );

-- 설문조사 응답: 웨비나 참여자만, 1회만
create policy "insert my survey response" on public.survey_responses for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.registrations r where r.webinar_id = survey_responses.webinar_id and r.user_id = auth.uid())
  );

-- 설문조사 응답 읽기: 운영자 또는 자신의 응답
create policy "read survey responses in scope" on public.survey_responses for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = survey_responses.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = survey_responses.client_id)
    or user_id = auth.uid()
  );

-- Realtime 활성화
alter publication supabase_realtime add table public.surveys;
alter publication supabase_realtime add table public.survey_responses;
```

### 1.2 API 엔드포인트

#### 1.2.1 설문조사 생성/수정/삭제
- **파일**: `app/api/surveys/create/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 설문조사 생성

- **파일**: `app/api/surveys/[surveyId]/route.ts`
- **메서드**: PUT, DELETE
- **권한**: 클라이언트 operator 이상
- **기능**: 설문조사 수정/삭제

#### 1.2.2 설문조사 목록 조회
- **파일**: `app/api/webinars/[webinarId]/surveys/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 웨비나별 설문조사 목록 조회

#### 1.2.3 설문조사 상태 변경 (오픈/마감)
- **파일**: `app/api/surveys/[surveyId]/status/route.ts`
- **메서드**: PATCH
- **권한**: 클라이언트 operator 이상
- **기능**: 설문조사 상태 변경 (draft → open → closed)

#### 1.2.4 설문조사 응답
- **파일**: `app/api/surveys/[surveyId]/respond/route.ts`
- **메서드**: POST
- **권한**: 웨비나 참여자
- **기능**: 설문조사 응답 제출 (1회만 가능)

#### 1.2.5 설문조사 결과 조회
- **파일**: `app/api/surveys/[surveyId]/results/route.ts`
- **메서드**: GET
- **권한**: 클라이언트 operator 이상
- **기능**: 설문조사 응답 통계 조회

### 1.3 프론트엔드 컴포넌트

#### 1.3.1 운영 콘솔 - 설문조사 관리
- **파일**: `app/(webinar)/webinar/[id]/console/components/SurveyManagement.tsx`
- **기능**:
  - 설문조사 생성/수정/삭제
  - 설문조사 오픈/마감
  - 설문조사 결과 조회 (통계, 차트)
  - 실시간 응답 수 표시

#### 1.3.2 참여자 - 설문조사 응답
- **파일**: `components/webinar/Survey.tsx`
- **기능**:
  - 설문조사 팝업 표시 (오픈된 설문조사)
  - 질문 유형별 입력 폼 (단일 선택, 다중 선택, 텍스트)
  - 응답 제출
  - 이미 응답한 경우 안내 메시지

#### 1.3.3 운영 콘솔 탭 추가
- **파일**: `app/(webinar)/webinar/[id]/console/components/ConsoleView.tsx`
- **변경사항**: 설문조사 탭 추가

### 1.4 실시간 기능

- **Supabase Realtime 구독**:
  - `surveys` 테이블 변경 구독 (상태 변경, 새 설문조사)
  - `survey_responses` 테이블 변경 구독 (응답 수 업데이트)

---

## 2. 발표자료 다운로드 기능

### 2.1 데이터베이스 스키마

#### 마이그레이션 파일: `016_create_webinar_files.sql`

```sql
-- 웨비나 파일 테이블
create table public.webinar_files (
  id bigserial primary key,
  agency_id uuid not null,
  client_id uuid not null,
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  file_name text not null,
  file_path text not null,  -- Supabase Storage 경로
  file_size bigint not null,  -- 바이트 단위
  mime_type text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

-- 인덱스
create index idx_webinar_files_webinar_id on public.webinar_files(webinar_id);

-- 트리거: agency_id, client_id 자동 채움
create trigger tg_fill_org_fields_webinar_files
  before insert on public.webinar_files
  for each row execute function public.fill_org_fields();

-- RLS 활성화
alter table public.webinar_files enable row level security;

-- RLS 정책
-- 파일 읽기: 웨비나 참여자 또는 운영자
create policy "read webinar files in scope" on public.webinar_files for select
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_agencies a where a.agency_id = webinar_files.agency_id)
    or exists (select 1 from public.my_clients c where c.client_id = webinar_files.client_id)
    or exists (select 1 from public.registrations r where r.webinar_id = webinar_files.webinar_id and r.user_id = auth.uid())
  );

-- 파일 업로드/삭제: 클라이언트 operator 이상
create policy "manage webinar files by operator" on public.webinar_files for all
  using (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = webinar_files.client_id and c.role in ('owner','admin','operator'))
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (select 1 from public.my_clients c
               where c.client_id = webinar_files.client_id and c.role in ('owner','admin','operator'))
  );
```

### 2.2 Supabase Storage 설정

#### Storage Bucket 생성
- **Bucket 이름**: `webinar-files`
- **Public**: false (인증된 사용자만 접근)
- **File size limit**: 100MB (설정 가능)
- **Allowed MIME types**: PDF, PPT, PPTX, DOC, DOCX, ZIP 등

### 2.3 API 엔드포인트

#### 2.3.1 파일 업로드
- **파일**: `app/api/webinars/[webinarId]/files/upload/route.ts`
- **메서드**: POST (multipart/form-data)
- **권한**: 클라이언트 operator 이상
- **기능**:
  - 파일 업로드 (Supabase Storage)
  - 파일 메타데이터 DB 저장
  - 파일 크기/타입 검증

#### 2.3.2 파일 목록 조회
- **파일**: `app/api/webinars/[webinarId]/files/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 웨비나별 파일 목록 조회

#### 2.3.3 파일 다운로드 URL 생성
- **파일**: `app/api/webinars/[webinarId]/files/[fileId]/download/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 서명된 다운로드 URL 생성 (1시간 유효)

#### 2.3.4 파일 삭제
- **파일**: `app/api/webinars/[webinarId]/files/[fileId]/route.ts`
- **메서드**: DELETE
- **권한**: 클라이언트 operator 이상
- **기능**: 파일 삭제 (Storage + DB)

### 2.4 프론트엔드 컴포넌트

#### 2.4.1 웨비나 생성/수정 페이지 - 파일 업로드
- **파일**: `app/(client)/client/[clientId]/webinars/new/page.tsx` (수정)
- **파일**: `app/(client)/client/[clientId]/webinars/[webinarId]/edit/page.tsx` (신규)
- **기능**:
  - 파일 드래그 앤 드롭 업로드
  - 업로드 진행률 표시
  - 파일 목록 표시 및 삭제

#### 2.4.2 웨비나 시청 페이지 - 파일 다운로드
- **파일**: `app/(webinar)/webinar/[id]/live/page.tsx` (수정)
- **파일**: `components/webinar/FileDownload.tsx` (신규)
- **기능**:
  - 발표자료 섹션 추가
  - 파일 목록 표시
  - 다운로드 버튼 (서명된 URL로 다운로드)

#### 2.4.3 운영 콘솔 - 파일 관리
- **파일**: `app/(webinar)/webinar/[id]/console/components/FileManagement.tsx` (신규)
- **기능**:
  - 파일 업로드
  - 파일 목록 표시
  - 파일 삭제

#### 2.4.4 운영 콘솔 탭 추가
- **파일**: `app/(webinar)/webinar/[id]/console/components/ConsoleView.tsx`
- **변경사항**: 파일 관리 탭 추가

---

## 3. 퀴즈 기능

### 3.1 데이터베이스 스키마

#### 기존 스키마 확인 및 보완
- **파일**: `plan.md`에 이미 `quizzes`, `quiz_responses` 테이블 정의됨
- **마이그레이션 파일**: `017_enhance_quizzes.sql` (필요시 보완)

```sql
-- 기존 quizzes 테이블이 있으므로 추가 인덱스/정책만 확인
-- Realtime 활성화 확인
alter publication supabase_realtime add table public.quizzes;
alter publication supabase_realtime add table public.quiz_responses;

-- 퀴즈 응답 시간 제한 트리거 (선택사항)
create or replace function public.check_quiz_time_limit() returns trigger as $$
declare
  quiz_record record;
begin
  select * into quiz_record from public.quizzes where id = new.quiz_id;
  
  -- 퀴즈가 live 상태가 아니면 응답 불가
  if quiz_record.status != 'live' then
    raise exception 'Quiz is not live';
  end if;
  
  -- 시간 제한 확인
  if quiz_record.time_limit_sec is not null then
    if now() > quiz_record.start_at + (quiz_record.time_limit_sec || ' seconds')::interval then
      raise exception 'Quiz time limit exceeded';
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger tg_check_quiz_time_limit
  before insert on public.quiz_responses
  for each row execute function public.check_quiz_time_limit();
```

### 3.2 API 엔드포인트

#### 3.2.1 퀴즈 생성/수정/삭제
- **파일**: `app/api/quizzes/create/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 퀴즈 생성

- **파일**: `app/api/quizzes/[quizId]/route.ts`
- **메서드**: PUT, DELETE
- **권한**: 클라이언트 operator 이상
- **기능**: 퀴즈 수정/삭제

#### 3.2.2 퀴즈 목록 조회
- **파일**: `app/api/webinars/[webinarId]/quizzes/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 웨비나별 퀴즈 목록 조회

#### 3.2.3 퀴즈 출제 (라이브 전환)
- **파일**: `app/api/quizzes/[quizId]/launch/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 퀴즈 상태를 `draft` → `live`로 변경, `start_at` 설정

#### 3.2.4 퀴즈 마감
- **파일**: `app/api/quizzes/[quizId]/close/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 퀴즈 상태를 `live` → `closed`로 변경, `end_at` 설정

#### 3.2.5 퀴즈 응답
- **파일**: `app/api/quizzes/[quizId]/respond/route.ts`
- **메서드**: POST
- **권한**: 웨비나 참여자
- **기능**: 퀴즈 응답 제출 (1회만 가능, live 상태일 때만)

#### 3.2.6 퀴즈 정답 공개
- **파일**: `app/api/quizzes/[quizId]/reveal/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**: 퀴즈 정답 공개 (프론트엔드에서 `correct_option_id` 표시 허용)

#### 3.2.7 퀴즈 결과 조회
- **파일**: `app/api/quizzes/[quizId]/results/route.ts`
- **메서드**: GET
- **권한**: 클라이언트 operator 이상
- **기능**: 퀴즈 응답 통계 조회 (정답률, 선택지별 분포)

### 3.3 프론트엔드 컴포넌트

#### 3.3.1 운영 콘솔 - 퀴즈 관리
- **파일**: `app/(webinar)/webinar/[id]/console/components/QuizManagement.tsx`
- **기능**:
  - 퀴즈 생성/수정/삭제
  - 퀴즈 출제 (라이브 전환)
  - 퀴즈 마감
  - 퀴즈 정답 공개
  - 퀴즈 결과 조회 (통계, 차트)
  - 실시간 응답 수 표시

#### 3.3.2 참여자 - 퀴즈 응답
- **파일**: `components/webinar/Quiz.tsx`
- **기능**:
  - 퀴즈 팝업 표시 (라이브 퀴즈)
  - 선택지 표시 및 선택
  - 시간 제한 표시 (카운트다운)
  - 응답 제출
  - 이미 응답한 경우 안내 메시지
  - 정답 공개 후 정답 표시

#### 3.3.3 운영 콘솔 탭 구현
- **파일**: `app/(webinar)/webinar/[id]/console/components/ConsoleView.tsx`
- **변경사항**: 퀴즈 탭 플레이스홀더를 실제 컴포넌트로 교체

### 3.4 실시간 기능

- **Supabase Realtime 구독**:
  - `quizzes` 테이블 변경 구독 (상태 변경, 새 퀴즈)
  - `quiz_responses` 테이블 변경 구독 (응답 수 업데이트)

---

## 4. 추첨 기능

### 4.1 데이터베이스 스키마

#### 기존 스키마 확인 및 보완
- **파일**: `plan.md`에 이미 `draws`, `winners` 테이블 정의됨
- **마이그레이션 파일**: `018_enhance_draws.sql` (필요시 보완)

```sql
-- 기존 draws, winners 테이블이 있으므로 추가 인덱스/정책만 확인
-- Realtime 활성화 확인
alter publication supabase_realtime add table public.draws;
alter publication supabase_realtime add table public.winners;

-- 추첨 그룹 타입 추가 (선택사항)
-- draws 테이블에 group_type 컬럼 추가 (전원/채팅참여자/정답자)
alter table public.draws add column if not exists group_type text default 'all' check (group_type in ('all','chat_participants','quiz_winners'));
alter table public.draws add column if not exists winner_count int default 1;
```

### 4.2 API 엔드포인트

#### 4.2.1 추첨 실행
- **파일**: `app/api/draws/run/route.ts`
- **메서드**: POST
- **권한**: 클라이언트 operator 이상
- **기능**:
  - 추첨 그룹 선택 (전원/채팅참여자/정답자)
  - 당첨자 수 설정
  - 결정적 해시 기반 추첨 (seed 사용)
  - `draws`, `winners` 테이블에 저장
  - 감사 로그 기록

#### 4.2.2 추첨 목록 조회
- **파일**: `app/api/webinars/[webinarId]/draws/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 웨비나별 추첨 목록 조회

#### 4.2.3 추첨 결과 조회
- **파일**: `app/api/draws/[drawId]/results/route.ts`
- **메서드**: GET
- **권한**: 웨비나 참여자 또는 운영자
- **기능**: 추첨 당첨자 목록 조회

#### 4.2.4 추첨 재현성 검증
- **파일**: `app/api/draws/[drawId]/verify/route.ts`
- **메서드**: GET
- **권한**: 클라이언트 operator 이상
- **기능**: seed를 사용하여 추첨 결과 재현성 검증

### 4.3 프론트엔드 컴포넌트

#### 4.3.1 운영 콘솔 - 추첨 관리
- **파일**: `app/(webinar)/webinar/[id]/console/components/DrawManagement.tsx`
- **기능**:
  - 추첨 그룹 선택 (전원/채팅참여자/정답자)
  - 당첨자 수 설정
  - 추첨 실행
  - 추첨 결과 표시
  - 추첨 재현성 검증

#### 4.3.2 참여자 - 당첨 알림
- **파일**: `components/webinar/DrawToast.tsx`
- **기능**:
  - 당첨 알림 팝업 (실시간)
  - 당첨자 목록 표시
  - 추첨 결과 확인

#### 4.3.3 운영 콘솔 탭 구현
- **파일**: `app/(webinar)/webinar/[id]/console/components/ConsoleView.tsx`
- **변경사항**: 추첨 탭 플레이스홀더를 실제 컴포넌트로 교체

### 4.4 실시간 기능

- **Supabase Realtime 구독**:
  - `draws` 테이블 변경 구독 (새 추첨)
  - `winners` 테이블 변경 구독 (당첨자 발표)

---

## 5. 공통 작업

### 5.1 타입 정의

#### 파일: `lib/types/webinar.ts` (신규 또는 확장)
- 설문조사, 파일, 퀴즈, 추첨 관련 타입 정의

### 5.2 유틸리티 함수

#### 파일: `lib/webinar/utils.ts` (확장)
- 추첨 해시 함수 (결정적 추첨)
- 파일 크기 포맷팅
- 설문조사/퀴즈 통계 계산

### 5.3 에러 처리

- 모든 API 라우트에 일관된 에러 처리
- 사용자 친화적인 에러 메시지
- 감사 로그 기록 (중요 작업)

### 5.4 테스트

- 각 기능별 E2E 테스트 시나리오 작성
- 권한 테스트 (RLS 정책 검증)
- 실시간 기능 테스트

---

## 6. 구현 순서

### Phase 1: 데이터베이스 및 API (1주)
1. ✅ 설문조사 스키마 마이그레이션 (`015_create_surveys.sql`)
2. ✅ 발표자료 파일 스키마 마이그레이션 (`016_create_webinar_files.sql`)
3. ✅ 퀴즈 스키마 보완 (`017_enhance_quizzes.sql`)
4. ✅ 추첨 스키마 보완 (`018_enhance_draws.sql`)
5. ✅ Supabase Storage Bucket 설정
6. ✅ 설문조사 API 엔드포인트 구현
7. ✅ 발표자료 파일 API 엔드포인트 구현
8. ✅ 퀴즈 API 엔드포인트 구현
9. ✅ 추첨 API 엔드포인트 구현

### Phase 2: 운영 콘솔 (1주)
1. ✅ 설문조사 관리 컴포넌트 (`SurveyManagement.tsx`)
2. ✅ 파일 관리 컴포넌트 (`FileManagement.tsx`)
3. ✅ 퀴즈 관리 컴포넌트 (`QuizManagement.tsx`)
4. ✅ 추첨 관리 컴포넌트 (`DrawManagement.tsx`)
5. ✅ 운영 콘솔 탭 통합 (`ConsoleView.tsx`)

### Phase 3: 참여자 UI (1주)
1. ✅ 설문조사 응답 컴포넌트 (`Survey.tsx`)
2. ✅ 파일 다운로드 컴포넌트 (`FileDownload.tsx`)
3. ✅ 퀴즈 응답 컴포넌트 (`Quiz.tsx`)
4. ✅ 당첨 알림 컴포넌트 (`DrawToast.tsx`)
5. ✅ 웨비나 시청 페이지 통합

### Phase 4: 실시간 기능 및 최적화 (3일)
1. ✅ Supabase Realtime 구독 설정
2. ✅ 실시간 업데이트 UI 반영
3. ✅ 성능 최적화 (인덱스, 쿼리 최적화)
4. ✅ 에러 처리 개선
5. ✅ 테스트 및 버그 수정

### Phase 5: 웨비나 생성/수정 페이지 통합 (2일)
1. ✅ 웨비나 생성 페이지에 파일 업로드 추가
2. ✅ 웨비나 수정 페이지 생성 및 파일 관리 기능 추가

---

## 7. 예상 작업 시간

- **총 예상 시간**: 약 3-4주
- **데이터베이스/API**: 1주
- **운영 콘솔**: 1주
- **참여자 UI**: 1주
- **실시간/최적화/통합**: 1주

---

## 8. 주의사항

### 8.1 보안
- 모든 파일 업로드는 MIME 타입 및 크기 검증 필수
- 서명된 URL은 1시간 유효기간 설정
- RLS 정책으로 데이터 접근 제어 강화

### 8.2 성능
- 파일 업로드는 청크 업로드 고려 (대용량 파일)
- 설문조사/퀴즈 응답 통계는 캐싱 고려
- Realtime 구독은 필요한 경우만 활성화

### 8.3 사용자 경험
- 파일 업로드 진행률 표시
- 퀴즈 시간 제한 카운트다운 표시
- 당첨 알림은 눈에 띄게 표시
- 이미 응답한 설문조사/퀴즈는 명확히 표시

---

## 9. 다음 단계

이 계획이 승인되면:
1. Phase 1부터 순차적으로 구현 시작
2. 각 Phase 완료 후 테스트 및 검토
3. 필요시 계획 수정 및 보완

