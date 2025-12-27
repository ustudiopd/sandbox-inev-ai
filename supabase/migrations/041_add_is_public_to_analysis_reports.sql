begin;

-- survey_analysis_reports에 is_public 필드 추가
alter table public.survey_analysis_reports
  add column if not exists is_public boolean default false;

-- 공개 보고서 조회를 위한 인덱스 추가
create index if not exists idx_survey_analysis_reports_public 
  on public.survey_analysis_reports(campaign_id, is_public, analyzed_at desc)
  where is_public = true;

commit;

