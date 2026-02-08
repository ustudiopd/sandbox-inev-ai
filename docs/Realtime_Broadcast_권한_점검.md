# Realtime Broadcast 권한 정책 점검 (P1-티켓3)

## 목적
참가자가 관리자 전용 이벤트(poll:open, raffle:draw 등)를 **publish 하지 못하도록** 차단.

## 1. 코드 감사 결과

### 관리자 전용 이벤트 발신처
| 이벤트 | 발신처 | 비고 |
|--------|--------|------|
| poll:open, poll:close | 서버 API (`lib/webinar/broadcast.ts` → `broadcastPollOpen` 등) | 폼 상태 변경 API에서만 호출 |
| quiz:open, quiz:close | 서버 API | 동일 |
| raffle:start, raffle:draw, raffle:done | 서버 API (`broadcastRaffleStart`, `broadcastRaffleDraw`, `broadcastRaffleDone`) | 추첨 PUT/ draw API에서만 호출 |

**결론:** 위 이벤트를 **클라이언트에서 `channel.send()`로 보내는 코드 경로는 없음.** 참가자 앱에서는 해당 이벤트를 publish하지 않음.

### 클라이언트에서 send 하는 이벤트
| 이벤트 | 사용처 | 발신자 |
|--------|--------|--------|
| session_conflict | `WebinarView.tsx` (중복 세션 알림) | 참가자(동일 사용자 다른 탭) |
| qa:display | `QAModeration.tsx` (콘솔) | 운영자(콘솔 접속자) |

- 참가자 전용 화면에서는 **session_conflict**만 send 함.
- **poll:open, raffle:draw** 등은 참가자 클라이언트에서 전혀 호출하지 않음.

## 2. DoD 충족 방식

### 앱 레벨 (현재)
- **참가자 토큰으로 poll:open, raffle:draw publish** → 참가자 UI에는 해당 이벤트를 보내는 버튼/로직이 없어 **실질적으로 발생하지 않음.**
- **서버/관리자만 publish** → 설문/퀴즈/추첨 상태 변경은 모두 API 경유 후 `broadcastToWebinar()`로만 전송됨 (서버만 호출).

### Supabase Realtime Authorization (선택 강화)
- **realtime.messages** 테이블에 RLS를 걸어 **INSERT(send) 권한**을 제한할 수 있음.
- 정책 예: **INSERT**는 `service_role` JWT 또는 해당 웨비나의 **운영자(client_members 등)**만 허용.
- 적용 시 참가자 JWT로는 **모든** Broadcast send가 거부되므로, **session_conflict**는 서버 API 경유로 보내도록 변경 필요 (선택 사항).

## 3. “Realtime Authorization / private / Allow public access” 란?

### 지금 상태 (설정 전)
- **마이그레이션(104)만 적용된 상태**입니다. DB에 RLS 정책이 **들어가 있지만**, Supabase Realtime이 이 정책을 **아직 사용하지 않습니다**.
- 채널을 **public**(기본)으로 쓰고, 대시보드에서 **Allow public access**가 켜져 있으면, **누가 보내든 Realtime이 RLS를 검사하지 않습니다.**  
  → 그래서 “설정이 안 되어 있어서 안 되는 거냐?”라고 하면:  
  **“권한 정책(RLS)이 실제로 적용되려면 아래 설정이 필요하고, 그걸 안 했을 뿐이에요. 지금도 앱은 정상 동작합니다.”**

### 설정했을 때 (권한까지 적용하려면)
Realtime 권한을 **진짜로** 쓰려면 다음 두 가지를 해야 합니다.

| 항목 | 의미 |
|------|------|
| **채널을 private로** | 클라이언트에서 `supabase.channel('webinar:xxx', { config: { private: true } })` 로 구독. 이렇게 해야 접속 시 사용자 JWT로 RLS 검사가 일어남. |
| **Allow public access 끄기** | Supabase 대시보드 → **Project → Realtime → Settings** 에서 **Allow public access** 를 **끔**. 이걸 끄면 “private 채널만 허용” 모드가 되어, 채널 접속할 때마다 RLS가 적용됨. |

- **Allow public access** = “인증 없이도 채널 구독/발송 허용할까?”  
  - **켜져 있으면**: 지금처럼 public 채널은 RLS 없이 동작. (우리 앱은 그대로 잘 돌아감.)  
  - **끄면**: private 채널만 허용되고, 그 채널에 접속할 때 우리가 만든 RLS 정책(수신/발신 제한)이 적용됨.

### 정리
- **지금 설정이 안 되어 있어서 “안 되는” 것은 아님.**  
  설문/퀴즈/추첨은 서버만 보내고, 참가자 화면에는 해당 이벤트를 보내는 코드가 없어서 **이미 안전하게 동작** 중입니다.
- **다만** 악의적으로 개발자 도구로 `channel.send({ event: 'poll:open', ... })` 를 날리면, **지금 설정**에서는 Supabase가 막지 않고 그대로 나갈 수 있습니다.  
  **private 채널 + Allow public access 끄기** 까지 하면, 그런 시도는 RLS 때문에 **DB 단에서 거부**됩니다.

## 4. 적용된 조치

- 코드 감사 완료: 관리자 이벤트는 서버 전송만 존재.
- 선택 사항용 마이그레이션: `supabase/migrations/104_realtime_broadcast_authorization.sql` (이미 적용됨).  
  - Realtime Authorization을 **실제로** 쓰려면:  
    - 웨비나 Broadcast용 채널을 **private** 로 열고 (`config: { private: true }`),  
    - 대시보드에서 **Allow public access** 를 끄면 됨.  
  - 그렇게 하기 전에 `session_conflict` 를 API 경유로 옮기지 않으면, 참가자의 세션 충돌 알림이 실패할 수 있음.

## 5. 요약

| DoD | 상태 |
|-----|------|
| 참가자 토큰으로 poll:open, raffle:draw publish 시 실패 | **앱 레벨**: 참가자 코드에서 해당 이벤트 send 없음. **RLS 적용 시**: Supabase가 참가자 INSERT 거부 가능. |
| 서버/관리자만 publish 가능 | **현재**: 관리자 이벤트는 모두 서버 API에서만 broadcast 호출. **RLS 적용 시**: INSERT는 서버·운영자만 허용 가능. |
