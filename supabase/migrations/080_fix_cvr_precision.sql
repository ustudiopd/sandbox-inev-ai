-- CVR precision 수정: numeric(5, 2) -> numeric(10, 2)
-- 이유: 한 번의 방문으로 여러 전환이 발생할 수 있어 CVR이 100%를 초과할 수 있음
-- 예: visits=6, conversions=80인 경우 CVR = 1333.33%

begin;

-- 기존 CVR 컬럼 삭제 (generated 컬럼이므로 직접 수정 불가)
alter table public.marketing_stats_daily drop column if exists cvr;

-- 새로운 CVR 컬럼 생성 (precision 증가)
alter table public.marketing_stats_daily 
  add column cvr numeric(10, 2) generated always as (
    case 
      when visits > 0 then round((conversions::numeric / visits::numeric * 100)::numeric, 2)
      else 0
    end
  ) stored;

comment on column public.marketing_stats_daily.cvr is '전환율 (conversions / visits * 100, 자동 계산, 최대 999999.99% 지원)';

commit;
