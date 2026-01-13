begin;

-- 웨비나 테이블에 이메일 템플릿 및 썸네일 필드 추가
alter table public.webinars 
  add column if not exists email_template_text text,
  add column if not exists email_thumbnail_url text;

-- 주석 추가
comment on column public.webinars.email_template_text is '웨비나 등록 이메일 템플릿 문구. 설정되지 않으면 기본 문구 사용.';
comment on column public.webinars.email_thumbnail_url is '웨비나 등록 이메일 및 입장 페이지에 사용할 썸네일 이미지 URL. 설정되지 않으면 기본 이미지 사용.';

commit;
