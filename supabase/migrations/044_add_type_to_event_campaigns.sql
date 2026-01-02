begin;

-- event_survey_campaigns에 type 컬럼 추가
-- 'survey': 설문조사 (기본값)
-- 'registration': 등록 페이지
alter table public.event_survey_campaigns
  add column if not exists type text not null default 'survey' 
  check (type in ('survey', 'registration'));

-- 기존 데이터는 모두 'survey'로 설정 (기본값이므로 자동 적용됨)

-- type 인덱스 추가 (필터링 성능 향상)
create index if not exists idx_campaigns_type 
  on public.event_survey_campaigns(type);

-- type과 status 복합 인덱스 (공개 페이지 조회 최적화)
create index if not exists idx_campaigns_type_status 
  on public.event_survey_campaigns(type, status);

commit;
