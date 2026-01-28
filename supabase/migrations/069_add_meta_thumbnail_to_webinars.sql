begin;

-- 웨비나 테이블에 메타 썸네일 필드 추가
alter table public.webinars 
  add column if not exists meta_thumbnail_url text;

-- 주석 추가
comment on column public.webinars.meta_thumbnail_url is '소셜 미디어 공유 및 메타 링크에 사용될 썸네일 이미지 URL. 설정되지 않으면 email_thumbnail_url이 사용됩니다.';

commit;
