-- Realtime Broadcast 권한 정책 (P1-티켓3)
-- 참가자는 Broadcast send(INSERT) 불가, 수신(SELECT)만 허용.
-- 적용 조건: supabase-js v2.44.0+, 채널은 config: { private: true }, 대시보드에서 Allow public access 비활성화.
-- 참고: session_conflict 등 참가자 발신 이벤트가 있으면 API 경유로 전환 후 적용할 것.
-- https://supabase.com/docs/guides/realtime/authorization

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'realtime' and table_name = 'messages'
  ) then
    drop policy if exists "webinar_authenticated_can_receive_broadcast" on realtime.messages;
    create policy "webinar_authenticated_can_receive_broadcast"
      on realtime.messages for select to authenticated
      using (realtime.messages.extension in ('broadcast'));

    drop policy if exists "webinar_only_operator_or_service_can_send_broadcast" on realtime.messages;
    create policy "webinar_only_operator_or_service_can_send_broadcast"
      on realtime.messages for insert to authenticated
      with check (
        realtime.messages.extension in ('broadcast')
        and (
          (current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role'
          or exists (
            select 1 from public.webinars w
            join public.client_members cm on cm.client_id = w.client_id
              and cm.user_id = auth.uid()
              and cm.role in ('owner', 'admin', 'operator', 'member')
            where 'webinar:' || w.id::text = realtime.topic()
          )
        )
      );
  end if;
end $$;
