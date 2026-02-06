-- Heartbeat 업데이트 최적화 RPC 함수
-- SELECT 없이 UPDATE ... WHERE ... RETURNING으로 한 번에 처리

begin;

-- Heartbeat 업데이트 RPC 함수 (SELECT 제거, 조건부 UPDATE)
create or replace function public.update_session_heartbeat(
  p_webinar_id uuid,
  p_session_id text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
  v_updated_row record;
  v_delta_seconds integer := 0;
  v_new_watched_seconds integer;
  v_updated_rows integer := 0;
begin
  -- UPDATE ... WHERE ... RETURNING으로 한 번에 처리
  -- 활성 세션만 업데이트 (exited_at IS NULL)
  -- 매칭 조건: webinar_id + session_id + exited_at is null (user_id 조건 제거)
  update public.webinar_user_sessions
  set 
    last_heartbeat_at = p_now,
    watched_seconds_raw = watched_seconds_raw + LEAST(
      EXTRACT(EPOCH FROM (p_now - COALESCE(last_heartbeat_at, entered_at)))::integer,
      360  -- Δt Cap: 최대 360초 (heartbeat 주기 120초의 3배)
    ),
    updated_at = p_now
  where webinar_id = p_webinar_id
    and session_id = p_session_id
    and exited_at is null
  returning 
    id,
    last_heartbeat_at,
    watched_seconds_raw,
    entered_at
  into v_updated_row;

  -- 업데이트된 행 수 확인
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  -- 업데이트된 행이 없으면 null 반환 (세션이 없거나 이미 종료됨)
  if v_updated_row.id is null or v_updated_rows = 0 then
    return jsonb_build_object(
      'success', false,
      'reason', 'no_active_session',
      'updated_rows', v_updated_rows
    );
  end if;

  -- 성공 반환 (updated_rows 필드 추가)
  return jsonb_build_object(
    'success', true,
    'session_id', v_updated_row.id,
    'last_heartbeat_at', v_updated_row.last_heartbeat_at,
    'watched_seconds_raw', v_updated_row.watched_seconds_raw,
    'updated_rows', v_updated_rows
  );
end;
$$;

comment on function public.update_session_heartbeat is '세션 heartbeat 업데이트 (SELECT 제거, 조건부 UPDATE 1번으로 최적화). Δt cap 360초 적용. updated_rows 필드 반환으로 디버깅 지원';

-- 서버측 throttle을 위한 함수 (최소 갱신 간격 체크)
-- 중요: last_heartbeat_at이 null이면 무조건 업데이트 허용 (첫 ping 스킵 금지)
create or replace function public.check_heartbeat_throttle(
  p_webinar_id uuid,
  p_session_id text,
  p_min_interval_seconds integer default 60  -- 기본값 60초
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_last_heartbeat timestamptz;
begin
  -- 마지막 heartbeat 시간 조회
  select last_heartbeat_at into v_last_heartbeat
  from public.webinar_user_sessions
  where webinar_id = p_webinar_id
    and session_id = p_session_id
    and exited_at is null
  limit 1;

  -- 세션이 없거나 heartbeat가 없으면 허용 (첫 ping은 무조건 업데이트)
  -- last_heartbeat_at이 null이면 무조건 true 반환 (첫 ping 스킵 금지)
  if v_last_heartbeat is null then
    return true;
  end if;

  -- 최소 간격 이내면 throttle (false 반환)
  if EXTRACT(EPOCH FROM (now() - v_last_heartbeat)) < p_min_interval_seconds then
    return false;
  end if;

  return true;
end;
$$;

comment on function public.check_heartbeat_throttle is '서버측 heartbeat throttle 체크. 최소 갱신 간격 이내면 false 반환. last_heartbeat_at이 null이면 무조건 true 반환 (첫 ping 스킵 금지)';

commit;
