begin;

-- 캠페인 링크 메타데이터 테이블 생성
-- Phase 2: 캠페인 링크 관리 기능

create table public.campaign_link_meta (
  id uuid primary key default gen_random_uuid(), -- marketing_campaign_link_id로 사용
  agency_id uuid,
  client_id uuid not null,
  name text not null, -- 운영자 이름: "26년 1월 뉴스레터", "문자_리마인드"
  target_campaign_id uuid not null references public.event_survey_campaigns(id) on delete cascade,
  landing_variant text, -- welcome/register/survey
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  status text default 'active', -- active/paused/archived
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index idx_campaign_link_meta_client_target 
  on public.campaign_link_meta(client_id, target_campaign_id, status);

create unique index uniq_campaign_link_meta_name_client 
  on public.campaign_link_meta(client_id, name); -- 동일 클라이언트 내 이름 유니크

create index idx_campaign_link_meta_status 
  on public.campaign_link_meta(status) 
  where status = 'active'; -- 활성 링크만 빠르게 조회

-- 컬럼 코멘트
comment on table public.campaign_link_meta is '마케팅 캠페인 링크 메타데이터 (Phase 2)';
comment on column public.campaign_link_meta.id is '마케팅 캠페인 링크 ID (marketing_campaign_link_id로 사용)';
comment on column public.campaign_link_meta.name is '운영자가 지정한 링크 이름 (동일 클라이언트 내 유니크)';
comment on column public.campaign_link_meta.target_campaign_id is '전환 타겟 캠페인 ID';
comment on column public.campaign_link_meta.landing_variant is '랜딩 위치 (welcome/register/survey)';
comment on column public.campaign_link_meta.status is '링크 상태 (active/paused/archived)';

-- updated_at 자동 업데이트 트리거
create or replace function update_campaign_link_meta_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tg_update_campaign_link_meta_updated_at
  before update on public.campaign_link_meta
  for each row
  execute function update_campaign_link_meta_updated_at();

commit;
