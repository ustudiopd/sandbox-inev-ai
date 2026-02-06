-- 세션 스위퍼를 위한 배치 업데이트 RPC 함수
-- 오래된 활성 세션들을 한 번에 종료 처리

begin;

-- 배치 세션 종료 RPC 함수
create or replace function public.batch_close_stale_sessions(
  p_stale_timeout timestamptz
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_closed_count integer;
  v_result jsonb;
begin
  -- 오래된 활성 세션들을 한 번에 종료 처리
  -- exited_at = COALESCE(last_heartbeat_at, entered_at)
  with updated_sessions as (
    update public.webinar_user_sessions
    set 
      exited_at = COALESCE(last_heartbeat_at, entered_at),
      updated_at = now()
    where exited_at is null
      and (
        (last_heartbeat_at is not null and last_heartbeat_at < p_stale_timeout)
        or (last_heartbeat_at is null and entered_at < p_stale_timeout)
      )
    returning id
  )
  select count(*) into v_closed_count
  from updated_sessions;

  -- 결과 반환
  v_result := jsonb_build_object(
    'success', true,
    'closed_count', v_closed_count
  );

  return v_result;
end;
$$;

comment on function public.batch_close_stale_sessions is '오래된 활성 세션들을 배치로 종료 처리. exited_at = COALESCE(last_heartbeat_at, entered_at)';

commit;
