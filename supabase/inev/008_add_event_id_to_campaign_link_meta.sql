-- inev.ai: campaign_link_meta 테이블에 event_id 추가
-- Event 기반 UTM 링크 지원

begin;

-- event_id 컬럼 추가
alter table public.campaign_link_meta
  add column if not exists event_id uuid references public.events(id) on delete cascade;

-- 인덱스 추가
create index if not exists idx_campaign_link_meta_event_id 
  on public.campaign_link_meta(event_id)
  where event_id is not null;

create index if not exists idx_campaign_link_meta_client_event 
  on public.campaign_link_meta(client_id, event_id, status)
  where event_id is not null;

-- 제약 조건 업데이트: event_id가 있으면 target_type이 'event'여야 함
alter table public.campaign_link_meta
  drop constraint if exists check_target_type_campaign;

alter table public.campaign_link_meta
  add constraint check_target_type_campaign 
    check (
      (target_type = 'campaign' AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL AND event_id IS NULL) OR
      (target_type = 'webinar' AND target_webinar_id IS NOT NULL AND target_campaign_id IS NULL AND event_id IS NULL) OR
      (target_type = 'event' AND event_id IS NOT NULL AND target_campaign_id IS NULL AND target_webinar_id IS NULL) OR
      (target_type IS NULL AND target_campaign_id IS NOT NULL AND target_webinar_id IS NULL AND event_id IS NULL) -- 기존 데이터 호환성
    );

-- 컬럼 코멘트 추가
comment on column public.campaign_link_meta.event_id is 'inev: 이벤트 ID (Event 기반 UTM 링크). target_type이 event일 때 사용';

commit;
