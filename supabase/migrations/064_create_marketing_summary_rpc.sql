begin;

-- 마케팅 캠페인 요약 RPC 함수 생성
-- Phase 1: Conversions 중심 집계

create or replace function get_marketing_summary(
  p_client_id uuid,
  p_from_date date,
  p_to_date date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
  v_total_conversions bigint;
  v_by_source jsonb;
  v_by_medium jsonb;
  v_by_campaign jsonb;
  v_by_combo jsonb;
begin
  -- 전체 전환 수 (해당 클라이언트의 캠페인에 등록/제출된 항목)
  select count(*) into v_total_conversions
  from public.event_survey_entries e
  inner join public.event_survey_campaigns c on e.campaign_id = c.id
  where c.client_id = p_client_id
    and e.created_at >= p_from_date::timestamp
    and e.created_at < (p_to_date::date + interval '1 day')::timestamp;
  
  -- Source별 집계
  select jsonb_agg(
    jsonb_build_object(
      'source', coalesce(utm_source, '__direct__'),
      'count', count(*)
    ) order by count(*) desc
  ) into v_by_source
  from public.event_survey_entries e
  inner join public.event_survey_campaigns c on e.campaign_id = c.id
  where c.client_id = p_client_id
    and e.created_at >= p_from_date::timestamp
    and e.created_at < (p_to_date::date + interval '1 day')::timestamp
  group by coalesce(utm_source, '__direct__');
  
  -- Medium별 집계
  select jsonb_agg(
    jsonb_build_object(
      'medium', coalesce(utm_medium, '__direct__'),
      'count', count(*)
    ) order by count(*) desc
  ) into v_by_medium
  from public.event_survey_entries e
  inner join public.event_survey_campaigns c on e.campaign_id = c.id
  where c.client_id = p_client_id
    and e.created_at >= p_from_date::timestamp
    and e.created_at < (p_to_date::date + interval '1 day')::timestamp
  group by coalesce(utm_medium, '__direct__');
  
  -- Campaign별 집계
  select jsonb_agg(
    jsonb_build_object(
      'campaign', coalesce(utm_campaign, '__direct__'),
      'count', count(*)
    ) order by count(*) desc
  ) into v_by_campaign
  from public.event_survey_entries e
  inner join public.event_survey_campaigns c on e.campaign_id = c.id
  where c.client_id = p_client_id
    and e.created_at >= p_from_date::timestamp
    and e.created_at < (p_to_date::date + interval '1 day')::timestamp
  group by coalesce(utm_campaign, '__direct__');
  
  -- Source + Medium + Campaign 조합별 집계
  select jsonb_agg(
    jsonb_build_object(
      'source', coalesce(utm_source, '__direct__'),
      'medium', coalesce(utm_medium, '__direct__'),
      'campaign', coalesce(utm_campaign, '__direct__'),
      'count', count(*)
    ) order by count(*) desc
  ) into v_by_combo
  from public.event_survey_entries e
  inner join public.event_survey_campaigns c on e.campaign_id = c.id
  where c.client_id = p_client_id
    and e.created_at >= p_from_date::timestamp
    and e.created_at < (p_to_date::date + interval '1 day')::timestamp
  group by 
    coalesce(utm_source, '__direct__'),
    coalesce(utm_medium, '__direct__'),
    coalesce(utm_campaign, '__direct__');
  
  -- 결과 조합
  v_result := jsonb_build_object(
    'total_conversions', coalesce(v_total_conversions, 0),
    'by_source', coalesce(v_by_source, '[]'::jsonb),
    'by_medium', coalesce(v_by_medium, '[]'::jsonb),
    'by_campaign', coalesce(v_by_campaign, '[]'::jsonb),
    'by_combo', coalesce(v_by_combo, '[]'::jsonb)
  );
  
  return v_result;
end;
$$;

comment on function get_marketing_summary is '마케팅 캠페인 요약 데이터를 반환합니다 (Phase 1: Conversions 중심)';

commit;
