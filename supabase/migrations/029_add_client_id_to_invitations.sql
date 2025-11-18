begin;

-- client_invitations 테이블에 client_id 컬럼 추가
alter table public.client_invitations
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

-- 인덱스 추가
create index if not exists idx_client_invitations_client_id on public.client_invitations(client_id) where client_id is not null;

commit;

