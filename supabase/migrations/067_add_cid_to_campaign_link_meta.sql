begin;

-- campaign_link_meta 테이블에 cid 필드 추가
alter table public.campaign_link_meta
  add column if not exists cid text;

-- unique 인덱스 추가 (client_id, cid 조합 유니크)
create unique index if not exists uniq_campaign_link_meta_client_cid 
  on public.campaign_link_meta(client_id, cid)
  where cid is not null;

-- cid 인덱스 추가 (조회 최적화)
create index if not exists idx_campaign_link_meta_cid 
  on public.campaign_link_meta(cid)
  where cid is not null;

-- 컬럼 코멘트
comment on column public.campaign_link_meta.cid is '캠페인 링크 식별자 (8자리 Base32/Alnum, querystring에서 사용)';

commit;
