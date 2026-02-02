begin;

-- campaign_link_meta 테이블에 웨비나 지원 추가
-- target_type 필드 추가 (campaign 또는 webinar)
alter table public.campaign_link_meta
  add column if not exists target_type text default 'campaign';

-- target_campaign_id를 nullable로 변경 (웨비나 선택 시 null 가능)
alter table public.campaign_link_meta
  alter column target_campaign_id drop not null;

-- target_webinar_id 필드 추가
alter table public.campaign_link_meta
  add column if not exists target_webinar_id uuid references public.webinars(id) on delete cascade;

-- 제약 조건: target_type이 'campaign'이면 target_campaign_id가 필수, 'webinar'이면 target_webinar_id가 필수
-- 기존 데이터 호환성을 위해 NULL도 허용하되, 새 데이터는 반드시 하나만 설정되어야 함
alter table public.campaign_link_meta
  drop constraint if exists check_target_type_campaign;
  
alter table public.campaign_link_meta
  add constraint check_target_type_campaign 
    check (
      (target_type = 'campaign' AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL) OR
      (target_type = 'webinar' AND target_webinar_id IS NOT NULL AND target_campaign_id IS NULL) OR
      (target_type IS NULL AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL) -- 기존 데이터 호환성
    );

-- 인덱스 추가
create index if not exists idx_campaign_link_meta_client_webinar 
  on public.campaign_link_meta(client_id, target_webinar_id, status)
  where target_webinar_id is not null;

create index if not exists idx_campaign_link_meta_target_type 
  on public.campaign_link_meta(target_type);

-- 기존 데이터의 target_type을 'campaign'으로 설정
update public.campaign_link_meta
  set target_type = 'campaign'
  where target_type IS NULL;

-- 컬럼 코멘트 추가
comment on column public.campaign_link_meta.target_type is '전환 타겟 타입 (campaign 또는 webinar)';
comment on column public.campaign_link_meta.target_webinar_id is '전환 타겟 웨비나 ID (target_type이 webinar일 때 사용)';

commit;
