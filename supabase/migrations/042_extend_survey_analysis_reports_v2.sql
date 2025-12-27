begin;

-- survey_analysis_reports 테이블에 v2 확장 컬럼 추가
alter table public.survey_analysis_reports
  add column if not exists action_pack jsonb,
  add column if not exists report_md text,
  add column if not exists report_html text,
  add column if not exists generation_warnings jsonb;

-- action_pack 인덱스 추가 (JSONB 쿼리 최적화)
create index if not exists idx_survey_analysis_reports_action_pack 
  on public.survey_analysis_reports using gin(action_pack)
  where action_pack is not null;

-- lens와 analyzed_at 복합 인덱스 (v2 쿼리 최적화)
create index if not exists idx_survey_analysis_reports_lens_analyzed 
  on public.survey_analysis_reports(campaign_id, lens, analyzed_at desc);

commit;

