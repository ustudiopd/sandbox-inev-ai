-- Phase 10-5: Event 통계 일별 집계 테이블 생성
-- 목적: 쿼리 시점 집계를 사전 집계로 대체하여 성능 개선
-- 버킷 단위: 일 단위 (UTC 기준)
-- 멱등성: upsert 기반 재실행 가능

begin;

-- Event 통계 일별 집계 테이블
create table if not exists public.event_stats_daily (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  bucket_date date not null, -- 일 단위 버킷 (UTC 기준)
  
  -- 집계 지표
  visits bigint not null default 0,
  unique_sessions bigint not null default 0,
  leads bigint not null default 0,
  unique_emails bigint not null default 0,
  survey_responses bigint not null default 0,
  participations bigint not null default 0,
  shortlink_clicks bigint not null default 0,
  
  -- 메타데이터
  first_aggregated_at timestamptz not null default now(),
  last_aggregated_at timestamptz not null default now(),
  
  -- 표준 필드
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- 유니크 제약조건
  unique(event_id, bucket_date)
);

-- 인덱스 생성
create index if not exists idx_event_stats_daily_event_date 
  on public.event_stats_daily(event_id, bucket_date desc);

create index if not exists idx_event_stats_daily_bucket_date 
  on public.event_stats_daily(bucket_date desc);

-- RLS 정책 (event 소유자만 조회 가능)
alter table public.event_stats_daily enable row level security;

create policy "event_stats_daily_select_own" on public.event_stats_daily
  for select
  using (
    event_id in (
      select id from public.events 
      where client_id in (select my_client_ids())
    )
  );

-- 코멘트 추가
comment on table public.event_stats_daily is 'Phase 10-5: Event 통계 일별 집계 테이블. 성능 최적화를 위한 사전 집계 데이터';
comment on column public.event_stats_daily.bucket_date is '집계 버킷 날짜 (UTC 기준, YYYY-MM-DD)';
comment on column public.event_stats_daily.visits is '일별 Visit 수 (event_visits 기준)';
comment on column public.event_stats_daily.unique_sessions is '일별 고유 세션 수';
comment on column public.event_stats_daily.leads is '일별 등록자 수 (leads 기준)';
comment on column public.event_stats_daily.unique_emails is '일별 고유 이메일 수';
comment on column public.event_stats_daily.survey_responses is '일별 설문 응답 수';
comment on column public.event_stats_daily.participations is '일별 참여자 수 (event_participations 기준)';
comment on column public.event_stats_daily.shortlink_clicks is '일별 ShortLink 클릭 수 (event_access_logs 기준)';

commit;
