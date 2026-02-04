begin;

-- registration_campaign scope_type 지원을 위해 트리거 함수 업데이트
create or replace function public.fill_email_campaign_org_fields() returns trigger as $$
declare
  agency_id_val uuid;
  client_id_val uuid;
begin
  -- scope_type에 따라 조회
  if new.scope_type = 'webinar' then
    select agency_id, client_id into strict agency_id_val, client_id_val
    from public.webinars
    where id = new.scope_id;
  elsif new.scope_type = 'registration_campaign' then
    select agency_id, client_id into strict agency_id_val, client_id_val
    from public.event_survey_campaigns
    where id = new.scope_id and type = 'registration';
  elsif new.scope_type = 'survey_campaign' then
    select agency_id, client_id into strict agency_id_val, client_id_val
    from public.event_survey_campaigns
    where id = new.scope_id;
  else
    -- 알 수 없는 scope_type
    raise exception '지원되지 않는 scope_type: %', new.scope_type;
  end if;
  
  -- ⚠️ 중요: scope_id가 존재하지 않으면 strict로 인해 자동 예외 발생
  -- (존재하지 않는 scope_id로 캠페인 생성 방지 - 데이터 정합성 보장)
  
  -- agency_id 보조 채움 (null이면 자동 채움)
  if new.agency_id is null then
    new.agency_id := agency_id_val;
  end if;
  
  -- ⚠️ 중요: client_id는 NOT NULL 제약이 있으므로 요청에서 반드시 제공되어야 함
  -- 트리거는 agency_id만 보조 채움 (시스템 표준 fill_org_fields 패턴 준수)
  -- client_id는 API 레벨에서 검증 후 제공
  
  return new;
end;
$$ language plpgsql;

commit;
