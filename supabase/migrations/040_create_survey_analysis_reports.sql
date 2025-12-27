begin;

-- 설문조사 AI 분석 보고서 테이블 생성 (v1 + v2 확장)
create table if not exists public.survey_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.event_survey_campaigns(id) on delete cascade,
  
  -- 분석 메타데이터
  analyzed_at timestamptz not null default now(),
  sample_count integer not null, -- 분석 시점의 샘플 수
  total_questions integer not null, -- 분석한 문항 수
  
  -- 분석 결과
  report_title text not null, -- 보고서 제목 (예: "2025-01-15 14:30 분석 보고서")
  report_content text not null, -- Markdown 형식의 분석 보고서 내용 (v1 호환)
  summary text, -- 요약 (선택사항)
  
  -- 통계 스냅샷 (JSONB)
  statistics_snapshot jsonb not null, -- 분석 시점의 통계 데이터 스냅샷
  
  -- 생성자 정보
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  
  -- v2 확장 컬럼
  lens text default 'general',
  references_used jsonb,
  report_content_md text, -- AI 본문(원문)
  report_content_full_md text, -- 고정 프리앰블 + 본문 합친 최종 MD
  pdf_storage_path text,
  pdf_generated_at timestamptz,
  pdf_meta jsonb
);

-- 인덱스
create index if not exists idx_survey_analysis_reports_campaign_id 
  on public.survey_analysis_reports(campaign_id);
create index if not exists idx_survey_analysis_reports_analyzed_at 
  on public.survey_analysis_reports(analyzed_at desc);
create index if not exists idx_survey_analysis_reports_campaign_analyzed 
  on public.survey_analysis_reports(campaign_id, analyzed_at desc);
create index if not exists idx_survey_analysis_reports_lens 
  on public.survey_analysis_reports(lens);
create index if not exists idx_survey_analysis_reports_pdf_path 
  on public.survey_analysis_reports(pdf_storage_path) 
  where pdf_storage_path is not null;

commit;

