begin;

-- 캠페인 테이블에 메타데이터 필드 추가
alter table public.event_survey_campaigns 
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists meta_thumbnail_url text;

-- 주석 추가
comment on column public.event_survey_campaigns.meta_title is '소셜 미디어 공유 및 메타 링크에 사용될 제목. 설정되지 않으면 title이 사용됩니다.';
comment on column public.event_survey_campaigns.meta_description is '소셜 미디어 공유 및 메타 링크에 사용될 설명. 설정되지 않으면 description이 사용됩니다.';
comment on column public.event_survey_campaigns.meta_thumbnail_url is '소셜 미디어 공유 및 메타 링크에 사용될 썸네일 이미지 URL.';

commit;
