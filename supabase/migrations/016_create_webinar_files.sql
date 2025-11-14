begin;

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
create index idx_webinar_files_created_at on public.webinar_files(created_at);

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

-- Realtime 활성화 (선택사항 - 파일 목록 실시간 업데이트)
alter publication supabase_realtime add table public.webinar_files;

commit;

