-- event_access_logs 테이블에 cid 컬럼 추가
-- Visit API에서 cid를 저장하기 위해 필요

begin;

-- cid 컬럼 추가 (이미 있으면 무시)
alter table public.event_access_logs
  add column if not exists cid text;

-- 주석 추가
comment on column public.event_access_logs.cid is 'CID (Campaign Identifier) - 마케팅 캠페인 링크 식별자';

commit;
