begin;

-- 웨비나 테이블에 프로젝트명 필드 추가
alter table public.webinars 
  add column if not exists project_name text;

-- 인덱스 추가 (프로젝트명 기반 조회 최적화)
create index if not exists idx_webinars_project_name 
  on public.webinars(project_name) 
  where project_name is not null;

-- 주석 추가
comment on column public.webinars.project_name is '대시보드에 표시되는 프로젝트명. 설정되지 않으면 title이 사용됩니다. title은 메인 페이지에 노출되는 웨비나 제목입니다.';

commit;
