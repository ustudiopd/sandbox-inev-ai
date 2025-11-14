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

