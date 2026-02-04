begin;

-- email_campaigns 테이블에 헤더 이미지와 푸터 텍스트 필드 추가
alter table public.email_campaigns
  add column if not exists header_image_url text,
  add column if not exists footer_text text;

comment on column public.email_campaigns.header_image_url is '이메일 상단에 표시될 헤더 이미지 URL';
comment on column public.email_campaigns.footer_text is '이메일 하단 푸터 텍스트 (마크다운 지원)';

commit;
