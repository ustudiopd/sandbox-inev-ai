begin;

-- forms 테이블에 opened_at, closed_at 컬럼 추가
alter table public.forms
  add column if not exists opened_at timestamptz,
  add column if not exists closed_at timestamptz;

-- 인덱스 추가 (상태별 조회 최적화)
create index if not exists idx_forms_opened_at on public.forms(opened_at) where opened_at is not null;
create index if not exists idx_forms_closed_at on public.forms(closed_at) where closed_at is not null;

commit;

