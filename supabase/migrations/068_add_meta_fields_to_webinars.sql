begin;

-- 웨비나 테이블에 메타데이터 필드 추가
alter table public.webinars 
  add column if not exists meta_title text,
  add column if not exists meta_description text;

-- 주석 추가
comment on column public.webinars.meta_title is '소셜 미디어 공유 및 메타 링크에 사용될 제목. 설정되지 않으면 title이 사용됩니다.';
comment on column public.webinars.meta_description is '소셜 미디어 공유 및 메타 링크에 사용될 설명. 설정되지 않으면 description이 사용됩니다.';

commit;
