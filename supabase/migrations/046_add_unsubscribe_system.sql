begin;

-- 수신거부 테이블 생성
create table if not exists public.marketing_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone_norm text,
  unsubscribe_email boolean not null default false,
  unsubscribe_phone boolean not null default false,
  unsubscribe_sms boolean not null default false,
  unsubscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(email, phone_norm)
);

-- 인덱스 추가
create index if not exists idx_unsubscribes_email on public.marketing_unsubscribes(email);
create index if not exists idx_unsubscribes_phone_norm on public.marketing_unsubscribes(phone_norm);
create index if not exists idx_unsubscribes_email_phone on public.marketing_unsubscribes(email, phone_norm);

-- updated_at 자동 업데이트 트리거
create or replace function update_unsubscribe_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tg_update_unsubscribe_updated_at
  before update on public.marketing_unsubscribes
  for each row
  execute function update_unsubscribe_updated_at();

commit;
