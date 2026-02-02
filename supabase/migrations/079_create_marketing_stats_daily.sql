-- Phase 1: 마케팅 통계 일별 집계 테이블 생성
-- 목적: 쿼리 시점 집계를 사전 집계로 대체하여 성능 개선
-- 버킷 단위: 일 단위 (기본)
-- 멱등성: upsert 기반 재실행 가능

begin;

-- 마케팅 통계 일별 집계 테이블
create table if not exists public.marketing_stats_daily (
  id uuid primary key default gen_random_uuid(),
  
  -- 필수 차원 (키 구성 요소)
  client_id uuid not null,
  bucket_date date not null, -- 일 단위 버킷 (UTC 기준)
  campaign_id uuid references public.event_survey_campaigns(id) on delete cascade,
  
  -- 선택 차원 (optional, NULL 허용)
  marketing_campaign_link_id uuid references public.campaign_link_meta(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  
  -- 집계 지표
  visits bigint not null default 0, -- COUNT(DISTINCT session_id)
  conversions bigint not null default 0, -- COUNT(entry_id)
  cvr numeric(5, 2) generated always as (
    case 
      when visits > 0 then round((conversions::numeric / visits::numeric * 100)::numeric, 2)
      else 0
    end
  ) stored,
  
  -- 메타데이터
  first_aggregated_at timestamptz not null default now(),
  last_aggregated_at timestamptz not null default now(),
  
  -- 표준 필드
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 유니크 제약조건은 함수 기반 인덱스로 대체 (아래 참조)
);

-- 인덱스 생성
create index if not exists idx_marketing_stats_daily_client_date 
  on public.marketing_stats_daily(client_id, bucket_date desc);

create index if not exists idx_marketing_stats_daily_campaign_date 
  on public.marketing_stats_daily(campaign_id, bucket_date desc) 
  where campaign_id is not null;

create index if not exists idx_marketing_stats_daily_link_date 
  on public.marketing_stats_daily(marketing_campaign_link_id, bucket_date desc) 
  where marketing_campaign_link_id is not null;

create index if not exists idx_marketing_stats_daily_utm 
  on public.marketing_stats_daily(client_id, utm_source, utm_medium, utm_campaign, bucket_date desc)
  where utm_source is not null;

-- 유니크 제약조건 (함수 기반 인덱스로 구현)
create unique index if not exists uq_marketing_stats_daily_key 
  on public.marketing_stats_daily(
    client_id,
    bucket_date,
    campaign_id,
    coalesce(marketing_campaign_link_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(utm_source, '__null__'),
    coalesce(utm_medium, '__null__'),
    coalesce(utm_campaign, '__null__')
  );

-- RLS 정책
alter table public.marketing_stats_daily enable row level security;

-- 읽기 정책: 클라이언트 멤버만 자신의 클라이언트 데이터 조회
create policy "marketing_stats_daily_select_client_members" 
  on public.marketing_stats_daily
  for select
  using (
    exists (
      select 1 from public.client_members cm
      where cm.client_id = marketing_stats_daily.client_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.agency_members am
      join public.clients c on c.agency_id = am.agency_id
      where c.id = marketing_stats_daily.client_id
      and am.user_id = auth.uid()
      and am.role in ('owner', 'admin', 'analyst')
    )
  );

-- 쓰기 정책: 서비스 롤만 (크론/잡에서 사용)
create policy "marketing_stats_daily_insert_service_role" 
  on public.marketing_stats_daily
  for insert
  with check (true);

create policy "marketing_stats_daily_update_service_role" 
  on public.marketing_stats_daily
  for update
  using (true);

-- updated_at 자동 업데이트 트리거
create or replace function update_marketing_stats_daily_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.last_aggregated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger marketing_stats_daily_updated_at
  before update on public.marketing_stats_daily
  for each row
  execute function update_marketing_stats_daily_updated_at();

-- 코멘트
comment on table public.marketing_stats_daily is '마케팅 통계 일별 집계 테이블 (Phase 1: 증분 집계)';
comment on column public.marketing_stats_daily.bucket_date is '일 단위 버킷 (UTC 기준, YYYY-MM-DD)';
comment on column public.marketing_stats_daily.visits is '방문 수 (COUNT DISTINCT session_id)';
comment on column public.marketing_stats_daily.conversions is '전환 수 (COUNT entry_id)';
comment on column public.marketing_stats_daily.cvr is '전환율 (conversions / visits * 100, 자동 계산)';

commit;
