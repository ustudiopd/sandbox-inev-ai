begin;

-- email_templates (Phase 2용, 지금은 생략 가능)
-- create table public.email_templates (...);

-- email_campaigns
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  scope_type text not null check (scope_type in ('webinar', 'registration_campaign', 'survey_campaign')),
  scope_id uuid not null,
  campaign_type text not null check (campaign_type in ('reminder_d1', 'reminder_h1', 'confirmation', 'custom')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'sending', 'sent', 'failed', 'canceled')),
  subject text not null,
  preheader text,
  body_md text not null,
  variables_json jsonb default '{}',
  audience_query_json jsonb default '{}',
  scheduled_send_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  sending_started_at timestamptz,
  sent_at timestamptz,
  from_domain text,
  from_localpart text,
  from_name text,
  reply_to text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_email_campaigns_client_id on public.email_campaigns(client_id);
create index idx_email_campaigns_scope on public.email_campaigns(scope_type, scope_id);
create index idx_email_campaigns_status on public.email_campaigns(status);
create index idx_email_campaigns_created_at on public.email_campaigns(created_at desc);

-- email_runs
create table public.email_runs (
  id uuid primary key default gen_random_uuid(),
  email_campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  run_type text not null check (run_type in ('generate', 'test_send', 'send')),
  status text not null check (status in ('success', 'failed')),
  provider text not null default 'resend' check (provider in ('resend', 'smtp')),
  meta_json jsonb default '{}',
  error text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_email_runs_campaign_id on public.email_runs(email_campaign_id);
create index idx_email_runs_created_at on public.email_runs(created_at desc);

-- email_send_logs
create table public.email_send_logs (
  id uuid primary key default gen_random_uuid(),
  email_campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  recipient_email text not null,
  status text not null check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  dedupe_key text not null,
  created_at timestamptz not null default now()
);

create unique index uniq_email_send_logs_dedupe_key on public.email_send_logs(dedupe_key);
create index idx_email_send_logs_campaign_id on public.email_send_logs(email_campaign_id);
create index idx_email_send_logs_status on public.email_send_logs(status);
create index idx_email_send_logs_recipient_email on public.email_send_logs(recipient_email);

-- client_email_policies
create table public.client_email_policies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  send_mode text not null default 'platform' check (send_mode in ('platform', 'white_label', 'customer_smtp')),
  from_domain text not null,
  from_localpart_default text not null default 'notify',
  from_name_default text not null,
  reply_to_default text not null,
  link_base_url_default text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_client_email_policies_client_id on public.client_email_policies(client_id);

-- updated_at 트리거
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_email_campaigns_updated_at
  before update on public.email_campaigns
  for each row
  execute function update_updated_at_column();

create trigger update_client_email_policies_updated_at
  before update on public.client_email_policies
  for each row
  execute function update_updated_at_column();

-- fill_org_fields 트리거: agency_id 자동 채움
-- email_campaigns: scope_id로부터 agency_id, client_id 조회
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

create trigger tg_fill_email_campaign_org_fields
  before insert on public.email_campaigns
  for each row execute function public.fill_email_campaign_org_fields();

-- RLS 활성화
alter table public.email_campaigns enable row level security;
alter table public.email_runs enable row level security;
alter table public.email_send_logs enable row level security;
alter table public.client_email_policies enable row level security;

-- RLS 정책: email_campaigns
-- ⚠️ 중요: 행위별로 정책 분리 (for all 사용 금지 - 디버깅 난이도 증가 방지)

-- SELECT: 클라이언트 멤버만 조회 가능
create policy "read_campaigns_in_scope" on public.email_campaigns
  for select
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.my_clients c 
      where c.client_id = email_campaigns.client_id
    )
  );

-- INSERT: owner/admin/operator만
create policy "insert_campaigns_by_operator" on public.email_campaigns
  for insert
  with check (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = email_campaigns.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'operator')
    )
  );

-- UPDATE: owner/admin/operator만
create policy "update_campaigns_by_operator" on public.email_campaigns
  for update
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = email_campaigns.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'operator')
    )
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = email_campaigns.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'operator')
    )
  );

-- DELETE: owner/admin/operator만
create policy "delete_campaigns_by_operator" on public.email_campaigns
  for delete
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = email_campaigns.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'operator')
    )
  );

-- RLS 정책: email_runs (읽기 전용, 서버에서만 생성)
-- ⚠️ 중요: INSERT/UPDATE는 서버(service role)에서만 가능, 클라이언트는 SELECT만
create policy "read_runs_in_scope" on public.email_runs
  for select
  using (
    exists (
      select 1 from public.email_campaigns ec
      where ec.id = email_runs.email_campaign_id
        and (
          (select is_super_admin from public.me) is true
          or exists (
            select 1 from public.my_clients c 
            where c.client_id = ec.client_id
          )
        )
    )
  );

-- INSERT/UPDATE 정책은 명시적으로 생성하지 않음 (서버 전용)
-- 클라이언트가 INSERT 시도하면 RLS에 의해 자동 차단됨

-- RLS 정책: email_send_logs (읽기 전용, 서버에서만 생성)
-- ⚠️ 중요: INSERT/UPDATE는 서버(service role)에서만 가능, 클라이언트는 SELECT만
-- PII 테이블이므로 엄격한 접근 제어
create policy "read_logs_in_scope" on public.email_send_logs
  for select
  using (
    exists (
      select 1 from public.email_campaigns ec
      where ec.id = email_send_logs.email_campaign_id
        and (
          (select is_super_admin from public.me) is true
          or exists (
            select 1 from public.my_clients c 
            where c.client_id = ec.client_id
          )
        )
    )
  );

-- INSERT/UPDATE 정책은 명시적으로 생성하지 않음 (서버 전용)
-- 클라이언트가 INSERT 시도하면 RLS에 의해 자동 차단됨

-- RLS 정책: client_email_policies
-- ⚠️ 중요: 행위별로 정책 분리 (for all 사용 금지)

-- SELECT: 클라이언트 멤버만 조회 가능
create policy "read_policies_in_scope" on public.client_email_policies
  for select
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.my_clients c 
      where c.client_id = client_email_policies.client_id
    )
  );

-- INSERT: owner/admin만
create policy "insert_policies_by_admin" on public.client_email_policies
  for insert
  with check (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = client_email_policies.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- UPDATE: owner/admin만
create policy "update_policies_by_admin" on public.client_email_policies
  for update
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = client_email_policies.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  )
  with check (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = client_email_policies.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- DELETE: owner/admin만
create policy "delete_policies_by_admin" on public.client_email_policies
  for delete
  using (
    (select is_super_admin from public.me) is true
    or exists (
      select 1 from public.client_members cm
      where cm.client_id = client_email_policies.client_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

commit;
