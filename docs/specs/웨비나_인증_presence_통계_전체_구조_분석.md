# 웨비나 실시간 세션: 인증 → Presence → 접속 통계 집계 전체 구조 분석

**작성일**: 2026-02-07  
**분석 범위**: Supabase + Vercel 기반 웨비나 시스템의 실시간 접속 추적 및 통계 집계

---

## 목차

1. [인증 및 세션 연결](#1-인증-및-세션-연결)
2. [Presence 관리](#2-presence-관리)
3. [접속 통계 집계](#3-접속-통계-집계)
4. [보완 필요 사항 (DoD 형식)](#4-보완-필요-사항-dod-형식)

---

## 1. 인증 및 세션 연결

### 1.1 전체 흐름 개요

```
[사용자 라이브 페이지 진입]
    ↓
[서버 사이드: 라이브 페이지 권한 체크]
    ↓
[클라이언트 사이드: Supabase 클라이언트 초기화]
    ↓
[JWT 토큰 → Realtime 연결]
    ↓
[WebSocket 채널 구독]
```

### 1.2 서버 사이드 인증 흐름

**파일**: `app/(webinar)/webinar/[id]/live/page.tsx`

**Step-by-Step**:

1. **웨비나 조회** (RLS 우회)
   ```typescript
   const admin = createAdminSupabase()
   const { data: webinar } = await admin
     .from('webinars')
     .select('*')
     .eq('id', webinarId)
     .single()
   ```

2. **사용자 인증 확인**
   ```typescript
   const supabase = await createServerSupabase()
   const { data: { user } } = await supabase.auth.getUser()
   ```

3. **권한 체크** (등록 여부, 관리자 권한 등)
   - 일반 사용자: `registrations` 테이블에서 등록 확인
   - 관리자: `client_members`, `agency_members` 테이블에서 권한 확인
   - 슈퍼 관리자: `user.app_metadata.is_super_admin` 확인

4. **접근 정책 확인**
   - `access_policy` 필드에 따라:
     - `auth`: 로그인 필수
     - `email_auth`: `webinar_allowed_emails` 테이블 확인
     - `name_email_auth`: 등록 캠페인 확인

5. **WebinarView 컴포넌트 렌더링**
   ```typescript
   return <WebinarView webinar={finalWebinar} isAdminMode={isAdminMode} />
   ```

### 1.3 클라이언트 사이드 Realtime 연결

**파일**: `lib/supabase/client.ts`

**핵심 구현**:

```typescript
// 싱글턴 패턴으로 클라이언트 생성
let supabaseClientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClientSupabase() {
  if (supabaseClientInstance) {
    return supabaseClientInstance
  }
  
  // 원본 Supabase URL 사용 (WebSocket 프록시 이슈 방지)
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!supabaseUrl.includes('.supabase.co')) {
    const originUrl = process.env.NEXT_PUBLIC_SUPABASE_ORIGIN_URL
    if (originUrl && originUrl.includes('.supabase.co')) {
      supabaseUrl = originUrl
    }
  }
  
  supabaseClientInstance = createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // JWT 토큰을 Realtime에 주입
  supabaseClientInstance.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      supabaseClientInstance!.realtime.setAuth(session.access_token)
    } else {
      supabaseClientInstance!.realtime.setAuth(null)
    }
  })
  
  // 초기 세션 확인 및 토큰 주입
  supabaseClientInstance.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
      supabaseClientInstance!.realtime.setAuth(session.access_token)
    }
  })
  
  return supabaseClientInstance
}
```

**주요 특징**:
- **싱글턴 패턴**: Realtime 연결 유지 (인스턴스 재생성 방지)
- **JWT 자동 주입**: `onAuthStateChange`로 세션 변경 시 자동 토큰 업데이트
- **원본 URL 사용**: Vercel 프록시 우회 (WebSocket 연결 안정성)

### 1.4 WebSocket 채널 구독

**파일**: `components/webinar/Chat.tsx`, `components/webinar/QA.tsx`

**채널 생성 및 구독**:

```typescript
// 채널명: webinar:{webinarId}
const channel = supabase
  .channel(channelName, {
    config: {
      broadcast: { self: false }, // 자신의 메시지 제외
    },
  })
  .on('broadcast', { event: '*' }, (payload) => {
    // 실시간 이벤트 처리
  })
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ 실시간 구독 성공')
    } else if (status === 'CHANNEL_ERROR') {
      // 재연결 로직
    }
  })
```

**사용되는 Realtime 기능**:
- **Broadcast**: 채팅 메시지, Q&A, 설문/퀴즈 오픈 이벤트
- **Postgres Changes**: (선택적) DB 변경 이벤트 구독
- **Presence**: (선택적) 중복 로그인 방지용 세션 관리

### 1.5 JWT 클레임 및 RLS 정책

**JWT 클레임 구조**:
- `sub`: 사용자 UUID (`auth.uid()`)
- `app_metadata.is_super_admin`: 슈퍼 관리자 여부
- `email`: 사용자 이메일

**RLS 정책 연계**:
- `webinar_live_presence` 테이블:
  - INSERT/UPDATE: 등록된 사용자만 (`registrations` 테이블 확인)
  - SELECT: 서버 전용 (클라이언트 직접 조회 금지)

**관련 RLS 정책** (`supabase/migrations/033_create_webinar_stats_v2.sql`):

```sql
-- 본인 upsert 허용(등록자)
create policy "wlp_upsert_self_if_registered"
on public.webinar_live_presence
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.registrations r
    where r.webinar_id = webinar_live_presence.webinar_id
      and r.user_id = auth.uid()
  )
);
```

### 1.6 정리

**무엇이 어떻게 동작하는가**:
1. 서버 사이드에서 웨비나 접근 권한 확인 (등록, 관리자 권한)
2. 클라이언트에서 Supabase 클라이언트 싱글턴 생성
3. JWT 토큰을 Realtime WebSocket 연결에 자동 주입
4. Broadcast 채널 구독으로 실시간 이벤트 수신

**사용되는 테이블/컬럼**:
- `webinars`: 웨비나 정보 (`id`, `access_policy`, `agency_id`, `client_id`)
- `registrations`: 등록 확인 (`webinar_id`, `user_id`)
- `client_members`, `agency_members`: 관리자 권한 확인
- `profiles`: 사용자 정보 (`is_super_admin`)

**사용되는 API/함수**:
- `createServerSupabase()`: 서버 사이드 Supabase 클라이언트
- `createClientSupabase()`: 클라이언트 사이드 Supabase 클라이언트
- `supabase.realtime.setAuth()`: JWT 토큰 주입
- `supabase.channel().subscribe()`: WebSocket 채널 구독

---

## 2. Presence 관리

### 2.1 전체 흐름 개요

```
[라이브 페이지 진입]
    ↓
[usePresencePing 훅 초기화]
    ↓
[120초 ± 10초 주기로 ping 전송]
    ↓
[POST /api/webinars/[webinarId]/presence/ping]
    ↓
[webinar_presence_ping RPC 호출]
    ↓
[webinar_live_presence 테이블 upsert]
```

### 2.2 클라이언트 사이드 Presence Ping

**파일**: `components/webinar/hooks/usePresencePing.ts`

**핵심 구현**:

```typescript
export function usePresencePing(webinarId: string | null) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPingRef = useRef<number>(0)
  
  // ping 전송 함수
  const sendPing = useCallback(async () => {
    // 클라이언트 측 중복 방지: 60초 이내 재호출 방지
    const now = Date.now()
    if (now - lastPingRef.current < 60000) {
      return
    }
    
    // session_id가 있으면 함께 전송 (옵션)
    const sessionId = getSessionId()
    const body = sessionId ? JSON.stringify({ session_id: sessionId }) : undefined
    
    const response = await fetch(`/api/webinars/${webinarId}/presence/ping`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body,
      credentials: 'include',
    })
    
    if (response.ok) {
      lastPingRef.current = now
    }
  }, [webinarId])
  
  // 지터가 포함된 간격 계산 (120초 ± 10초)
  const getIntervalWithJitter = useCallback(() => {
    const baseInterval = 120000 // 120초
    const jitter = (Math.random() - 0.5) * 20000 // ±10초
    return baseInterval + jitter
  }, [])
  
  useEffect(() => {
    // 초기 ping 전송
    sendPing()
    
    // 탭 visibility 체크
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendPing()
        const interval = getIntervalWithJitter()
        intervalRef.current = setInterval(sendPing, interval)
      } else {
        // 탭이 hidden이면 ping 중지
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
    
    // 페이지 언로드 시 마지막 ping 전송 (sendBeacon 사용)
    const handleBeforeUnload = () => {
      if (navigator.sendBeacon && webinarId) {
        const sessionId = getSessionId()
        const body = sessionId ? JSON.stringify({ session_id: sessionId }) : ''
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(`/api/webinars/${webinarId}/presence/ping`, blob)
      }
    }
    
    // 주기적 ping 시작
    const interval = getIntervalWithJitter()
    intervalRef.current = setInterval(sendPing, interval)
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
    
    return () => {
      // cleanup
    }
  }, [webinarId, sendPing, getIntervalWithJitter])
}
```

**주요 특징**:
- **주기**: 120초 (2분) ± 10초 지터 (동시 폭주 방지)
- **중복 방지**: 클라이언트 측 60초 throttle
- **탭 숨김 처리**: `visibilitychange` 이벤트로 ping 중지
- **페이지 언로드**: `sendBeacon`으로 마지막 ping 전송 보장

### 2.3 서버 사이드 Presence Ping API

**파일**: `app/api/webinars/[webinarId]/presence/ping/route.ts`

**Step-by-Step**:

1. **인증 확인**
   ```typescript
   const { data: { user }, error: authError } = await supabase.auth.getUser()
   if (authError || !user) {
     return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
   }
   ```

2. **웨비나 등록 확인** (자동 등록 시도)
   ```typescript
   let { data: registration } = await admin
     .from('registrations')
     .select('id')
     .eq('webinar_id', actualWebinarId)
     .eq('user_id', user.id)
     .maybeSingle()
   
   // 등록이 없으면 자동 등록 시도
   if (!registration) {
     await admin.from('registrations').insert({
       webinar_id: actualWebinarId,
       user_id: user.id,
       role: 'attendee',
     })
   }
   ```

3. **Presence Ping RPC 호출**
   ```typescript
   if (registration) {
     const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
       _webinar_id: actualWebinarId,
     })
   }
   ```

4. **세션 Heartbeat 업데이트** (옵션, session_id가 있는 경우)
   ```typescript
   if (sessionId) {
     // throttle 체크 (60초 최소 간격)
     const { data: throttleCheck } = await admin.rpc('check_heartbeat_throttle', {
       p_webinar_id: actualWebinarId,
       p_session_id: sessionId,
       p_min_interval_seconds: 60,
     })
     
     if (throttleCheck) {
       await admin.rpc('update_session_heartbeat', {
         p_webinar_id: actualWebinarId,
         p_session_id: sessionId,
         p_now: new Date().toISOString(),
       })
     }
   }
   ```

5. **응답**: `204 No Content`

### 2.4 데이터베이스 RPC 함수

**파일**: `supabase/migrations/033_create_webinar_stats_v2.sql`

**webinar_presence_ping 함수**:

```sql
create or replace function public.webinar_presence_ping(_webinar_id uuid)
returns void
language sql
security invoker
as $$
  insert into public.webinar_live_presence (webinar_id, user_id, joined_at, last_seen_at)
  values (_webinar_id, auth.uid(), now(), now())
  on conflict (webinar_id, user_id) do update
    set last_seen_at = excluded.last_seen_at,
        updated_at = now()
    where public.webinar_live_presence.last_seen_at < excluded.last_seen_at - interval '60 seconds';
$$;
```

**주요 특징**:
- **Upsert 방식**: SELECT 없이 INSERT ... ON CONFLICT로 성능 최적화
- **60초 throttle**: WHERE 조건으로 중복 업데이트 억제
- **SECURITY INVOKER**: 호출자 권한으로 실행 (RLS 정책 적용)

### 2.5 테이블 구조

**테이블**: `webinar_live_presence`

```sql
create table public.webinar_live_presence (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  
  -- org fields
  agency_id uuid,
  client_id uuid,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  primary key (webinar_id, user_id)
);
```

**인덱스**:
```sql
create index idx_wlp_webinar_last_seen
  on public.webinar_live_presence (webinar_id, last_seen_at desc);

create index idx_wlp_last_seen
  on public.webinar_live_presence (last_seen_at desc);
```

**컬럼 설명**:
- `joined_at`: 첫 진입 시각 (변경되지 않음)
- `last_seen_at`: 마지막 ping 시각 (60초 throttle 적용)
- `webinar_id`, `user_id`: 복합 기본 키

### 2.6 중복 방지 및 지터 적용

**클라이언트 측**:
- 60초 이내 재호출 방지 (`lastPingRef`)
- 120초 ± 10초 지터로 동시 폭주 방지

**서버 측**:
- RPC 함수의 WHERE 조건으로 60초 이내 업데이트 억제
- 세션 heartbeat의 경우 `check_heartbeat_throttle` RPC로 추가 throttle

**탭 숨김/언로드 처리**:
- `visibilitychange`: 탭이 hidden이면 ping 중지
- `beforeunload`/`pagehide`: 마지막 ping 전송 (`sendBeacon` 사용)

### 2.7 정리

**무엇이 어떻게 동작하는가**:
1. 클라이언트에서 120초 ± 10초 주기로 ping 전송
2. 서버에서 등록 확인 후 `webinar_presence_ping` RPC 호출
3. RPC 함수가 `webinar_live_presence` 테이블에 upsert (60초 throttle)
4. 탭 숨김/언로드 시 ping 중지/마지막 전송

**사용되는 테이블/컬럼**:
- `webinar_live_presence`: `webinar_id`, `user_id`, `joined_at`, `last_seen_at`
- `registrations`: 등록 확인 (`webinar_id`, `user_id`)

**사용되는 API/함수**:
- `POST /api/webinars/[webinarId]/presence/ping`: Presence ping API
- `webinar_presence_ping(_webinar_id)`: RPC 함수 (60초 throttle)
- `check_heartbeat_throttle()`, `update_session_heartbeat()`: 세션 heartbeat (옵션)

**Realtime 사용 여부**:
- ❌ Presence ping은 **HTTP API 호출** (Realtime 사용 안 함)
- ✅ 채팅/Q&A는 Broadcast 사용 (별도 채널)

---

## 3. 접속 통계 집계

### 3.1 전체 흐름 개요

```
[크론 작업: 1분마다 실행]
    ↓
[GET /api/cron/webinar-access-snapshot]
    ↓
[get_active_webinar_participant_counts RPC 호출]
    ↓
[webinar_live_presence에서 활성 사용자 집계]
    ↓
[record_webinar_access_snapshot_batch RPC 호출]
    ↓
[webinar_access_logs 테이블에 5분 버킷으로 저장]
    ↓
[통계 API에서 조회]
```

### 3.2 크론 작업: 접속 스냅샷 수집

**파일**: `app/api/cron/webinar-access-snapshot/route.ts`

**Step-by-Step**:

1. **인증 확인** (Vercel Cron 자동 인증 또는 secret 파라미터)
   ```typescript
   const authHeader = request.headers.get('authorization')
   const secretParam = request.nextUrl.searchParams.get('secret')
   const isAuthorized = 
     authHeader === `Bearer ${process.env.CRON_SECRET}` ||
     (secretParam && secretParam === process.env.CRON_SECRET)
   ```

2. **활성 사용자 판정 기준 설정**
   ```typescript
   const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()
   // now() - 3분 이내에 활동한 사용자만 활성으로 판정
   ```

3. **활성 웨비나별 접속자 수 집계**
   ```typescript
   const { data: snapshots } = await admin.rpc(
     'get_active_webinar_participant_counts',
     { _active_since: cutoff }
   )
   ```

4. **5분 버킷으로 배치 저장**
   ```typescript
   const snapshotsJsonb = snapshots.map((s) => ({
     webinar_id: s.webinar_id,
     participant_count: s.participant_count,
   }))
   
   await admin.rpc('record_webinar_access_snapshot_batch', {
     _snapshots: snapshotsJsonb,
     _sampled_at: new Date().toISOString(),
   })
   ```

5. **응답**: `204 No Content` (활성 웨비나가 없으면 조기 종료)

**스케줄**: Vercel Cron `*/1 * * * *` (1분마다)

### 3.3 데이터베이스 RPC 함수

**파일**: `supabase/migrations/033_create_webinar_stats_v2.sql`

**get_active_webinar_participant_counts 함수**:

```sql
create or replace function public.get_active_webinar_participant_counts(_active_since timestamptz)
returns table (webinar_id uuid, participant_count int)
language sql
security definer
as $$
  select webinar_id, count(*)::int as participant_count
  from public.webinar_live_presence
  where last_seen_at >= _active_since
  group by webinar_id;
$$;
```

**record_webinar_access_snapshot_batch 함수**:

```sql
create or replace function public.record_webinar_access_snapshot_batch(
  _snapshots jsonb,
  _sampled_at timestamptz default now()
)
returns int
language plpgsql
security definer
as $$
declare
  bucket timestamptz;
  affected int;
begin
  -- 5분 버킷 계산
  bucket := public.bucket_time(_sampled_at, 300);
  
  with rows as (
    select
      (s->>'webinar_id')::uuid as webinar_id,
      (s->>'participant_count')::int as participant_count
    from jsonb_array_elements(_snapshots) as s
  ),
  ins as (
    insert into public.webinar_access_logs (
      webinar_id,
      time_bucket,
      sample_count,
      sum_participants,
      min_participants,
      max_participants,
      last_participants,
      first_sample_at,
      last_sample_at
    )
    select
      webinar_id,
      bucket,
      1,
      participant_count,
      participant_count,
      participant_count,
      participant_count,
      _sampled_at,
      _sampled_at
    from rows
    on conflict (webinar_id, time_bucket) do update
      set sample_count     = public.webinar_access_logs.sample_count + 1,
          sum_participants = public.webinar_access_logs.sum_participants + excluded.sum_participants,
          min_participants = least(public.webinar_access_logs.min_participants, excluded.last_participants),
          max_participants = greatest(public.webinar_access_logs.max_participants, excluded.last_participants),
          last_participants = excluded.last_participants,
          last_sample_at    = excluded.last_sample_at,
          updated_at        = now()
    returning 1
  )
  select count(*) into affected from ins;
  
  return affected;
end;
$$;
```

**bucket_time 유틸 함수**:

```sql
create or replace function public.bucket_time(_ts timestamptz, _bucket_seconds int)
returns timestamptz
language sql
immutable
as $$
  select to_timestamp(floor(extract(epoch from _ts) / _bucket_seconds) * _bucket_seconds);
$$;
```

**주요 특징**:
- **5분 버킷**: `bucket_time(_sampled_at, 300)`로 5분 단위로 내림
- **Upsert 방식**: `ON CONFLICT`로 기존 버킷에 누적
- **누적 통계**: `sample_count`, `sum_participants`, `min_participants`, `max_participants` 집계

### 3.4 테이블 구조

**테이블**: `webinar_access_logs`

```sql
create table public.webinar_access_logs (
  id uuid primary key default gen_random_uuid(),
  
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  
  -- 5분 버킷 시작 시각(UTC)
  time_bucket timestamptz not null,
  
  -- 버킷 내 샘플 누적 (크론이 1분마다 찍으면 sample_count는 최대 5)
  sample_count int not null default 0,
  sum_participants int not null default 0,
  min_participants int not null default 0,
  max_participants int not null default 0,
  last_participants int not null default 0,
  
  first_sample_at timestamptz not null default now(),
  last_sample_at timestamptz not null default now(),
  
  -- org fields
  agency_id uuid,
  client_id uuid,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**인덱스**:
```sql
create unique index uq_wal_webinar_bucket
  on public.webinar_access_logs (webinar_id, time_bucket);

create index idx_wal_webinar_bucket_desc
  on public.webinar_access_logs (webinar_id, time_bucket desc);
```

**컬럼 설명**:
- `time_bucket`: 5분 버킷 시작 시각 (예: 14:00, 14:05, 14:10)
- `sample_count`: 해당 버킷에 수집된 샘플 수 (최대 5개, 1분마다 수집)
- `sum_participants`: 샘플들의 접속자 수 합계
- `min_participants`, `max_participants`: 버킷 내 최소/최대 접속자 수
- `last_participants`: 마지막 샘플의 접속자 수

### 3.5 통계 조회 API

**파일**: `app/api/webinars/[webinarId]/stats/access/route.ts`

**Step-by-Step**:

1. **권한 확인**
   ```typescript
   const { hasPermission, webinar } = await checkWebinarStatsPermission(webinarId)
   ```

2. **현재 접속자 수 조회** (실시간)
   ```typescript
   const activeSince = new Date(Date.now() - 3 * 60 * 1000).toISOString()
   const { data: activePresences } = await admin
     .from('webinar_live_presence')
     .select('user_id, last_seen_at, joined_at')
     .eq('webinar_id', actualWebinarId)
     .gte('last_seen_at', activeSince)
   
   const currentParticipants = activePresences?.length || 0
   ```

3. **접속 로그 조회** (5분 버킷)
   ```typescript
   const { data: accessLogs } = await admin
     .from('webinar_access_logs')
     .select('*')
     .eq('webinar_id', actualWebinarId)
     .gte('time_bucket', from.toISOString())
     .lt('time_bucket', to.toISOString())
     .order('time_bucket', { ascending: true })
   ```

4. **통계 계산**
   ```typescript
   // 최대 동시접속
   let maxConcurrentParticipants = 0
   accessLogs?.forEach((log) => {
     if (log.max_participants > maxConcurrentParticipants) {
       maxConcurrentParticipants = log.max_participants
     }
   })
   
   // 평균 동시접속
   const totalSum = accessLogs?.reduce((sum, log) => sum + log.sum_participants, 0) || 0
   const totalSamples = accessLogs?.reduce((sum, log) => sum + log.sample_count, 0) || 0
   const avgConcurrentParticipants = totalSamples > 0 ? totalSum / totalSamples : 0
   
   // 타임라인
   const timeline = accessLogs?.map((log) => ({
     time: log.time_bucket,
     avgParticipants: log.sample_count > 0 ? log.sum_participants / log.sample_count : 0,
     maxParticipants: log.max_participants,
     minParticipants: log.min_participants,
     lastParticipants: log.last_participants,
   })) || []
   ```

5. **응답**
   ```typescript
   return NextResponse.json({
     success: true,
     data: {
       currentParticipants, // 실시간 현재 접속자 수
       currentParticipantList, // 현재 접속 중인 참여자 목록
       totalAttendees, // 입장한 사람 수
       maxConcurrentParticipants,
       avgConcurrentParticipants,
       timeline, // 타임라인 데이터
       peakTime, // 피크 시간대
     },
   })
   ```

### 3.6 실시간 통계 vs 지연 통계

**실시간 통계**:
- **데이터 소스**: `webinar_live_presence` 테이블 직접 조회
- **활성 기준**: `last_seen_at >= now() - 3분`
- **용도**: 현재 접속자 수, 접속 중인 참여자 목록
- **지연**: 없음 (실시간)

**지연 통계**:
- **데이터 소스**: `webinar_access_logs` 테이블 (5분 버킷)
- **집계 주기**: 크론이 1분마다 수집, 5분 버킷으로 저장
- **용도**: 타임라인, 최대/평균 동시접속, 피크 시간대
- **지연**: 최대 5분 (버킷 단위)

### 3.7 정리

**무엇이 어떻게 동작하는가**:
1. 크론 작업이 1분마다 실행되어 활성 웨비나별 접속자 수 집계
2. `webinar_live_presence`에서 `last_seen_at >= now() - 3분` 조건으로 활성 사용자 판정
3. 5분 버킷으로 `webinar_access_logs` 테이블에 누적 저장
4. 통계 API에서 실시간 데이터(`webinar_live_presence`)와 지연 데이터(`webinar_access_logs`) 조회

**사용되는 테이블/컬럼**:
- `webinar_live_presence`: `webinar_id`, `user_id`, `last_seen_at` (활성 사용자 판정)
- `webinar_access_logs`: `webinar_id`, `time_bucket`, `sample_count`, `sum_participants`, `min_participants`, `max_participants`, `last_participants`

**사용되는 API/함수**:
- `GET /api/cron/webinar-access-snapshot`: 크론 작업 (1분마다)
- `GET /api/webinars/[webinarId]/stats/access`: 통계 조회 API
- `get_active_webinar_participant_counts(_active_since)`: 활성 접속자 수 집계 RPC
- `record_webinar_access_snapshot_batch(_snapshots, _sampled_at)`: 5분 버킷 저장 RPC
- `bucket_time(_ts, _bucket_seconds)`: 버킷 계산 유틸 함수

**크론 설정**:
- **경로**: `/api/cron/webinar-access-snapshot`
- **스케줄**: `*/1 * * * *` (1분마다)
- **인증**: `CRON_SECRET` 환경 변수

**Realtime 사용 여부**:
- ❌ 통계 집계는 **크론 작업** (Realtime 사용 안 함)
- ✅ 통계 조회는 **HTTP API** (서버 사이드)

---

## 4. 보완 필요 사항 (DoD 형식)

### 4.1 인증 및 세션 연결

**현재 상태**: ✅ 정상 동작

**보완 제안**:
- [ ] **Realtime 연결 실패 시 재연결 로직 강화**
  - 현재: `onAuthStateChange`로 토큰만 재주입
  - 제안: 연결 끊김 감지 시 명시적 재연결 시도
  - 우선순위: 낮음 (현재 동작 정상)

- [ ] **WebSocket 연결 상태 모니터링**
  - 현재: 연결 상태 로깅만 존재
  - 제안: 연결 상태를 UI에 표시 (옵션)
  - 우선순위: 낮음

### 4.2 Presence 관리

**현재 상태**: ✅ 정상 동작

**보완 제안**:
- [ ] **Presence ping 실패 시 재시도 로직**
  - 현재: 네트워크 오류 시 조용히 무시, 다음 주기에서 재시도
  - 제안: 지수 백오프로 재시도 (최대 3회)
  - 우선순위: 중간

- [ ] **Presence 데이터 정리 (오래된 레코드 삭제)**
  - 현재: `webinar_live_presence` 테이블에 데이터 누적
  - 제안: 웨비나 종료 후 N일 경과 시 자동 삭제 (크론 작업)
  - 우선순위: 낮음 (용량 이슈 발생 시)

- [ ] **Presence ping 주기 조정 가능성**
  - 현재: 하드코딩된 120초
  - 제안: 환경 변수로 조정 가능 (`NEXT_PUBLIC_HEARTBEAT_INTERVAL_SECONDS`)
  - 우선순위: 낮음

### 4.3 접속 통계 집계

**현재 상태**: ✅ 정상 동작

**보완 제안**:
- [ ] **크론 작업 실패 시 알림**
  - 현재: 실패 시 로깅만
  - 제안: Vercel 알림 또는 외부 모니터링 서비스 연동
  - 우선순위: 중간

- [ ] **통계 조회 성능 최적화**
  - 현재: 매번 DB 조회
  - 제안: 짧은 TTL 캐싱 (예: 30초) 또는 SWR 사용
  - 우선순위: 낮음 (현재 성능 문제 없음)

- [ ] **통계 데이터 보관 기간 정책**
  - 현재: 무기한 보관
  - 제안: N개월 경과 시 아카이브 또는 삭제 정책 수립
  - 우선순위: 낮음

- [ ] **버킷 크기 조정 가능성**
  - 현재: 하드코딩된 5분 버킷
  - 제안: 웨비나별 또는 설정으로 조정 가능 (예: 1분, 5분, 15분)
  - 우선순위: 낮음

### 4.4 전체 시스템

**보완 제안**:
- [ ] **에러 로깅 및 모니터링 강화**
  - 현재: 콘솔 로깅
  - 제안: 구조화된 로깅 (예: Sentry, LogRocket) 및 메트릭 수집
  - 우선순위: 중간

- [ ] **문서화 보완**
  - 현재: 코드 주석 및 일부 문서 존재
  - 제안: API 문서 (OpenAPI/Swagger), 아키텍처 다이어그램
  - 우선순위: 낮음

- [ ] **테스트 코드 작성**
  - 현재: 테스트 코드 없음
  - 제안: 단위 테스트 (RPC 함수), 통합 테스트 (API 엔드포인트)
  - 우선순위: 중간

---

## 부록: 주요 파일 목록

### 인증 및 세션 연결
- `lib/supabase/client.ts`: 클라이언트 Supabase 클라이언트 생성
- `lib/supabase/server.ts`: 서버 사이드 Supabase 클라이언트 생성
- `app/(webinar)/webinar/[id]/live/page.tsx`: 라이브 페이지 서버 사이드 렌더링
- `app/(webinar)/webinar/[id]/components/WebinarView.tsx`: 라이브 페이지 클라이언트 컴포넌트
- `components/webinar/Chat.tsx`: 채팅 컴포넌트 (Realtime 구독)
- `components/webinar/QA.tsx`: Q&A 컴포넌트 (Realtime 구독)

### Presence 관리
- `components/webinar/hooks/usePresencePing.ts`: Presence ping 훅
- `app/api/webinars/[webinarId]/presence/ping/route.ts`: Presence ping API
- `supabase/migrations/033_create_webinar_stats_v2.sql`: `webinar_presence_ping` RPC 함수

### 접속 통계 집계
- `app/api/cron/webinar-access-snapshot/route.ts`: 크론 작업 (1분마다)
- `app/api/webinars/[webinarId]/stats/access/route.ts`: 통계 조회 API
- `supabase/migrations/033_create_webinar_stats_v2.sql`: 집계 RPC 함수들

### 데이터베이스 스키마
- `supabase/migrations/033_create_webinar_stats_v2.sql`: 테이블 생성 및 RLS 정책
- `supabase/migrations/100_add_foreign_key_indexes.sql`: 인덱스 추가

---

**분석 완료일**: 2026-02-07  
**분석자**: AI Assistant (Composer)
