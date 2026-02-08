-- inev.ai: Client Domain Policy (Phase 1-6 소급 적용)
-- clients 테이블에 도메인 필드 추가

alter table public.clients
  add column if not exists canonical_domain text,
  add column if not exists subdomain_domain text;

-- subdomain_domain 기본값: {slug}.inev.ai
-- 기존 레코드에 대해 자동으로 설정
update public.clients
set subdomain_domain = slug || '.inev.ai'
where subdomain_domain is null;

-- 인덱스 추가 (조회 성능 향상)
create index if not exists idx_clients_canonical_domain on public.clients(canonical_domain);
create index if not exists idx_clients_subdomain_domain on public.clients(subdomain_domain);

-- 코멘트 추가
comment on column public.clients.canonical_domain is 'inev: 고객 커스텀 도메인 (있으면 외부 발송 기준)';
comment on column public.clients.subdomain_domain is 'inev: 서브도메인 도메인 (기본값: {slug}.inev.ai)';
