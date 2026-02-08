# 400 Bad Request 근거 수집 및 분석 보고서

**작성일**: 2026-02-07  
**목적**: `registrations.id` 또는 존재하지 않는 컬럼 참조로 인한 400 에러 분석

---

## 요약

`registrations` 테이블은 **복합 기본 키 `(webinar_id, user_id)`**를 사용하며, **`id` 컬럼이 존재하지 않습니다**. 하지만 코드에서 `.select('id')`를 사용하여 400 Bad Request 에러가 발생합니다.

**핵심 발견**:
- ❌ **400 에러 재시도 로직 없음**: 클라이언트에서 400 에러 발생 시 재시도하지 않고 다음 주기까지 대기
- ✅ **400이 폭발한 이유**: Presence ping이 120초마다 호출되며, 모든 사용자가 동시에 요청하여 400 에러가 집중 발생

---

## 1. registrations.id 참조 위치 전수 리스트

### 1.1 POST /api/webinars/[webinarId]/presence/ping

**파일**: `app/api/webinars/[webinarId]/presence/ping/route.ts`

| 라인 | 코드 | 호출 스택 | 문제 |
|---|---|---|---|
| **69** | `.select('id')` | `POST /api/webinars/[webinarId]/presence/ping` → 등록 확인 쿼리 | `registrations` 테이블에 `id` 컬럼 없음 |
| **117** | `.select('id')` | `POST /api/webinars/[webinarId]/presence/ping` → 중복 등록 체크 후 재조회 | `registrations` 테이블에 `id` 컬럼 없음 |
| **148** | `.select('id')` | `POST /api/webinars/[webinarId]/presence/ping` → 실제 등록 재확인 | `registrations` 테이블에 `id` 컬럼 없음 |

**호출 스택 상세**:

```
[클라이언트]
  components/webinar/hooks/usePresencePing.ts:60
    fetch(`/api/webinars/${webinarId}/presence/ping`)
      ↓
[서버]
  app/api/webinars/[webinarId]/presence/ping/route.ts:26
    POST handler
      ↓
  라인 67-72: 등록 확인
    admin.from('registrations').select('id')  ← 400 에러 발생
      ↓
  라인 115-120: 중복 등록 체크 후 재조회
    admin.from('registrations').select('id')  ← 400 에러 발생
      ↓
  라인 146-151: 실제 등록 재확인
    admin.from('registrations').select('id')  ← 400 에러 발생
```

**요청 주기**: **120초 ± 10초** (2분마다)

---

### 1.2 POST /api/webinars/[webinarId]/access/track

**파일**: `app/api/webinars/[webinarId]/access/track/route.ts`

| 라인 | 코드 | 호출 스택 | 문제 |
|---|---|---|---|
| **52** | `.select('id')` | `POST /api/webinars/[webinarId]/access/track` → 등록 확인 쿼리 | `registrations` 테이블에 `id` 컬럼 없음 |

**호출 스택 상세**:

```
[클라이언트]
  app/(webinar)/webinar/[id]/components/WebinarView.tsx:289
    fetch(`/api/webinars/${webinar.id}/access/track`)
      ↓
[서버]
  app/api/webinars/[webinarId]/access/track/route.ts:12
    POST handler
      ↓
  라인 50-55: 등록 확인
    admin.from('registrations').select('id')  ← 400 에러 발생
```

**요청 주기**: 입장 시 1회, 이후 **5분마다** 갱신

---

## 2. registrations 테이블 스키마 확인

**스키마 정의** (`docs/plan.md` 라인 178-184):

```sql
create table public.registrations (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'attendee' check (role in ('attendee','host','moderator')),
  created_at timestamptz default now(),
  primary key (webinar_id, user_id)  -- 복합 기본 키, id 컬럼 없음
);
```

**확인 사항**:
- ✅ **Primary Key**: `(webinar_id, user_id)` 복합 키
- ❌ **`id` 컬럼**: 존재하지 않음
- ✅ **추가 컬럼**: `nickname`, `role`, `registered_via`, `registration_data`, `survey_no`, `code6` 등 (마이그레이션으로 추가됨)

---

## 3. API 매핑

### 3.1 POST /api/webinars/[webinarId]/presence/ping

**호출 위치**:
- `components/webinar/hooks/usePresencePing.ts:60`
- `app/(webinar)/webinar/[id]/components/WebinarView.tsx:273` (usePresencePing 훅 사용)

**요청 주기**: 120초 ± 10초

**영향받는 쿼리**:
1. 라인 69: 등록 확인 (매 요청마다)
2. 라인 117: 중복 등록 체크 후 재조회 (등록 없을 때만)
3. 라인 148: 실제 등록 재확인 (임시 등록 표시일 때만)

**400 에러 발생 시나리오**:
- 모든 로그인 사용자가 120초마다 ping 전송
- 각 ping마다 라인 69에서 `.select('id')` 실행 → **400 에러**
- 등록이 없으면 라인 117에서도 `.select('id')` 실행 → **400 에러**
- 임시 등록 표시일 때 라인 148에서도 `.select('id')` 실행 → **400 에러**

---

### 3.2 POST /api/webinars/[webinarId]/access/track

**호출 위치**:
- `app/(webinar)/webinar/[id]/components/WebinarView.tsx:289` (입장 시 1회)
- `app/(webinar)/webinar/[id]/components/WebinarView.tsx:299` (5분마다 갱신)

**요청 주기**: 입장 시 1회, 이후 5분마다

**영향받는 쿼리**:
1. 라인 52: 등록 확인 (로그인 사용자만, 매 요청마다)

**400 에러 발생 시나리오**:
- 라이브 페이지 진입 시 1회 호출
- 로그인 사용자가 진입하면 라인 52에서 `.select('id')` 실행 → **400 에러**
- 5분마다 갱신 시에도 동일한 에러 발생

---

## 4. 재시도 로직 확인

### 4.1 클라이언트 사이드 (프론트엔드)

#### 4.1.1 Presence Ping (`usePresencePing.ts`)

**파일**: `components/webinar/hooks/usePresencePing.ts`

**코드** (라인 60-78):

```typescript
const response = await fetch(`/api/webinars/${webinarId}/presence/ping`, {
  method: 'POST',
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body,
  credentials: 'include',
})

if (response.ok) {
  lastPingRef.current = now
  console.log(`[Presence Ping] 전송 성공: ${response.status}`)
} else {
  console.error(`[Presence Ping] 전송 실패: ${response.status} ${response.statusText}`)
  const errorText = await response.text().catch(() => '')
  console.error(`[Presence Ping] 오류 내용:`, errorText)
  // ❌ 재시도 로직 없음 - 다음 주기까지 대기
}
```

**재시도 로직**: ❌ **없음**
- 400 에러 발생 시 로그만 출력하고 다음 주기(120초)까지 대기
- 즉시 재시도하지 않음

---

#### 4.1.2 Access Track (`WebinarView.tsx`)

**파일**: `app/(webinar)/webinar/[id]/components/WebinarView.tsx`

**코드** (라인 288-294):

```typescript
await fetch(`/api/webinars/${webinar.id}/access/track`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ sessionId }),
})
// ❌ 에러 핸들링 없음, 재시도 로직 없음
```

**재시도 로직**: ❌ **없음**
- 400 에러 발생 시 아무 처리 없음
- 5분마다 자동 재시도되지만, 그 사이에는 재시도하지 않음

---

### 4.2 서버 사이드 (백엔드)

#### 4.2.1 Presence Ping API

**파일**: `app/api/webinars/[webinarId]/presence/ping/route.ts`

**에러 핸들링**:
- 라인 394-400: catch 블록에서 500 에러 반환
- **400 에러는 Supabase에서 발생하므로 catch되지 않음** (쿼리 실행 시점에 발생)

**재시도 로직**: ❌ **없음**

---

#### 4.2.2 Access Track API

**파일**: `app/api/webinars/[webinarId]/access/track/route.ts`

**에러 핸들링**:
- 라인 131-136: catch 블록에서 500 에러 반환
- **400 에러는 Supabase에서 발생하므로 catch되지 않음**

**재시도 로직**: ❌ **없음**

---

## 5. 400이 "폭발"한 이유 분석

### 5.1 트래픽 증폭 메커니즘

**시나리오**: 1,000명 동시 접속 (모두 로그인 사용자)

**1분당 요청 수**:
- Presence ping: 1,000명 × 0.5회/분 = **500회**
- Access track: 입장 시 1,000회 + 5분마다 200회 = **1,200회** (첫 1분)

**1분당 400 에러 발생 수**:
- Presence ping: 500회 × 1개 쿼리(라인 69) = **500건**
- Access track: 1,200회 × 1개 쿼리(라인 52) = **1,200건**
- **총 1,700건의 400 에러 발생**

---

### 5.2 400 에러 폭발 증명

#### 증명 1: Presence Ping 주기

**코드**: `components/webinar/hooks/usePresencePing.ts:90-94`

```typescript
const getIntervalWithJitter = useCallback(() => {
  const baseInterval = 120000 // 120초
  const jitter = (Math.random() - 0.5) * 20000 // ±10초
  return baseInterval + jitter
}, [])
```

**결과**: 모든 사용자가 거의 동시에 ping 전송 (지터 ±10초)

---

#### 증명 2: 재시도 로직 부재

**코드**: `components/webinar/hooks/usePresencePing.ts:67-74`

```typescript
if (response.ok) {
  lastPingRef.current = now
} else {
  console.error(`[Presence Ping] 전송 실패: ${response.status}`)
  // ❌ 재시도 없음 - 다음 주기까지 대기
}
```

**결과**: 400 에러 발생 시 즉시 재시도하지 않고 다음 주기(120초)까지 대기

---

#### 증명 3: 동시 요청 집중

**코드**: `app/api/webinars/[webinarId]/presence/ping/route.ts:67-72`

```typescript
let { data: registration } = await admin
  .from('registrations')
  .select('id')  // ❌ 존재하지 않는 컬럼
  .eq('webinar_id', actualWebinarId)
  .eq('user_id', user.id)
  .maybeSingle()
```

**결과**: 
- 1,000명이 거의 동시에 요청
- 각 요청마다 `.select('id')` 실행
- Supabase가 400 Bad Request 반환
- **짧은 시간 내 수백 건의 400 에러 집중 발생**

---

#### 증명 4: 에러 전파 메커니즘

**흐름**:

```
[사용자 1] → Presence Ping → .select('id') → 400 에러
[사용자 2] → Presence Ping → .select('id') → 400 에러
[사용자 3] → Presence Ping → .select('id') → 400 에러
...
[사용자 1000] → Presence Ping → .select('id') → 400 에러

→ 동시에 1,000건의 400 에러 발생 (2분 주기)
→ Access Track도 동시에 1,000건의 400 에러 발생 (입장 시)
→ 총 2,000건의 400 에러가 짧은 시간 내 집중 발생
```

---

### 5.3 400 에러 폭발 타임라인

**웨비나 시작 시간 (예: 14:00:00)**:

```
14:00:00 - 사용자들 대량 진입
  ↓
  POST /api/webinars/[webinarId]/access/track (1,000건)
  → 각 요청마다 .select('id') 실행
  → 1,000건의 400 에러 발생 (약 1초 내)
  
14:00:10 - Presence Ping 첫 전송 (지터로 인해 약간 분산)
  ↓
  POST /api/webinars/[webinarId]/presence/ping (약 500건)
  → 각 요청마다 .select('id') 실행
  → 500건의 400 에러 발생 (약 10초 내)
  
14:02:00 - Presence Ping 두 번째 전송
  ↓
  POST /api/webinars/[webinarId]/presence/ping (약 500건)
  → 각 요청마다 .select('id') 실행
  → 500건의 400 에러 발생 (약 10초 내)
  
... (계속 반복)
```

**결과**: 웨비나 시작 후 첫 2분 동안 **약 2,000건의 400 에러** 발생

---

## 6. 수정 방안

### 6.1 즉시 수정 (긴급)

**문제**: `.select('id')` 사용

**해결책**: `id` 컬럼 제거 또는 실제 존재하는 컬럼으로 변경

**수정 위치**:

1. **`app/api/webinars/[webinarId]/presence/ping/route.ts`**:
   - 라인 69: `.select('id')` → `.select('webinar_id, user_id')` 또는 제거
   - 라인 117: `.select('id')` → `.select('webinar_id, user_id')` 또는 제거
   - 라인 148: `.select('id')` → `.select('webinar_id, user_id')` 또는 제거

2. **`app/api/webinars/[webinarId]/access/track/route.ts`**:
   - 라인 52: `.select('id')` → `.select('webinar_id, user_id')` 또는 제거

**권장 수정**:
- 등록 존재 여부만 확인하는 경우: `.select('webinar_id')` 또는 `.select('webinar_id, user_id')`
- 또는 `.select()` 없이 `maybeSingle()`만 사용 (데이터가 있으면 truthy, 없으면 falsy)

---

### 6.2 재시도 로직 추가 (중기)

**문제**: 400 에러 발생 시 재시도 없음

**해결책**: 클라이언트 사이드에 재시도 로직 추가

**수정 위치**: `components/webinar/hooks/usePresencePing.ts`

**제안 코드**:

```typescript
const sendPing = useCallback(async (retryCount = 0) => {
  // ... 기존 코드 ...
  
  try {
    const response = await fetch(`/api/webinars/${webinarId}/presence/ping`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body,
      credentials: 'include',
    })

    if (response.ok) {
      lastPingRef.current = now
      console.log(`[Presence Ping] 전송 성공: ${response.status}`)
    } else if (response.status === 400 && retryCount < 2) {
      // 400 에러 시 최대 2회 재시도 (지수 백오프)
      const delay = Math.pow(2, retryCount) * 1000 // 1초, 2초
      console.warn(`[Presence Ping] 400 에러, ${delay}ms 후 재시도 (${retryCount + 1}/2)`)
      setTimeout(() => {
        sendPing(retryCount + 1)
      }, delay)
    } else {
      console.error(`[Presence Ping] 전송 실패: ${response.status} ${response.statusText}`)
      // 재시도 실패 시 다음 주기까지 대기
    }
  } catch (error) {
    // 네트워크 오류는 조용히 무시 (재시도는 다음 주기에서)
    console.error('[Presence Ping] 전송 실패:', error)
  }
}, [webinarId, getSessionId])
```

---

## 7. 전체 문제 위치 요약표

| 파일 경로 | 라인 | 코드 | API 엔드포인트 | 요청 주기 | 재시도 로직 |
|---|---|---|---|---|---|
| `app/api/webinars/[webinarId]/presence/ping/route.ts` | 69 | `.select('id')` | `POST /api/webinars/[webinarId]/presence/ping` | 120초 ± 10초 | ❌ 없음 |
| `app/api/webinars/[webinarId]/presence/ping/route.ts` | 117 | `.select('id')` | `POST /api/webinars/[webinarId]/presence/ping` | 120초 ± 10초 (등록 없을 때만) | ❌ 없음 |
| `app/api/webinars/[webinarId]/presence/ping/route.ts` | 148 | `.select('id')` | `POST /api/webinars/[webinarId]/presence/ping` | 120초 ± 10초 (임시 등록일 때만) | ❌ 없음 |
| `app/api/webinars/[webinarId]/access/track/route.ts` | 52 | `.select('id')` | `POST /api/webinars/[webinarId]/access/track` | 입장 시 1회, 이후 5분마다 | ❌ 없음 |

---

## 8. 결론

### 8.1 근본 원인

1. **스키마 불일치**: `registrations` 테이블에 `id` 컬럼이 없는데 코드에서 `.select('id')` 사용
2. **재시도 로직 부재**: 400 에러 발생 시 즉시 재시도하지 않고 다음 주기까지 대기
3. **동시 요청 집중**: 웨비나 시작 시간에 모든 사용자가 동시에 요청하여 400 에러가 폭발적으로 발생

### 8.2 400이 폭발한 이유

1. **Presence ping 주기**: 120초마다 모든 사용자가 거의 동시에 요청
2. **재시도 없음**: 400 에러 발생 시 다음 주기까지 대기하므로 에러가 누적되지 않지만, 동시 요청으로 인해 짧은 시간 내 집중 발생
3. **트래픽 증폭**: 1,000명 동시 접속 시 1분에 약 500건의 presence ping 요청 → 각 요청마다 400 에러 발생

### 8.3 권장 조치

1. **즉시 수정**: `.select('id')` 제거 또는 실제 존재하는 컬럼으로 변경
2. **재시도 로직 추가**: 400 에러 발생 시 지수 백오프로 재시도 (최대 2회)
3. **에러 모니터링**: 400 에러 발생 시 알림 설정

---

**분석 완료일**: 2026-02-07  
**분석자**: AI Assistant (Composer)
