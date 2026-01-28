begin;

-- event_survey_entries 테이블에 UTM 추적 필드 추가
-- Phase 1: UTM 저장 + Conversions 중심 대시보드

-- UTM 파라미터 컬럼 추가 (Last-touch 기준)
alter table public.event_survey_entries
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text;

-- First-touch 스냅샷 컬럼 추가
alter table public.event_survey_entries
  add column if not exists utm_first_visit_at timestamptz,
  add column if not exists utm_referrer text;

-- 캠페인 링크 추적 컬럼 추가 (Phase 2에서 값 채움)
alter table public.event_survey_entries
  add column if not exists marketing_campaign_link_id uuid;

-- 인덱스 추가 (최소 세트)
-- 1. 기본 집계용 (campaign_id + created_at)
create index if not exists idx_entries_campaign_created 
  on public.event_survey_entries(campaign_id, created_at desc);

-- 2. UTM 조합 집계용 (campaign_id + utm_source + utm_medium + utm_campaign)
-- UTM이 있는 항목만 인덱싱 (부분 인덱스)
create index if not exists idx_entries_utm_combo 
  on public.event_survey_entries(campaign_id, utm_source, utm_medium, utm_campaign)
  where utm_source is not null;

-- 컬럼 코멘트 추가
comment on column public.event_survey_entries.utm_source is 'UTM source 파라미터 (Last-touch)';
comment on column public.event_survey_entries.utm_medium is 'UTM medium 파라미터 (Last-touch)';
comment on column public.event_survey_entries.utm_campaign is 'UTM campaign 파라미터 (Last-touch)';
comment on column public.event_survey_entries.utm_term is 'UTM term 파라미터 (Last-touch)';
comment on column public.event_survey_entries.utm_content is 'UTM content 파라미터 (Last-touch)';
comment on column public.event_survey_entries.utm_first_visit_at is '최초 유입 시각 (First-touch 스냅샷)';
comment on column public.event_survey_entries.utm_referrer is 'HTTP Referer 도메인 (First-touch 스냅샷)';
comment on column public.event_survey_entries.marketing_campaign_link_id is '마케팅 캠페인 링크 ID (Phase 2에서 값 채움, nullable)';

commit;
