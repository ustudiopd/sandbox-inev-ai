# 메모: Realtime Authorization 설정은 나중에 점검·적용

**날짜:** 2026-02-08

**결정:**  
Realtime Broadcast 권한(참가자 publish 차단)의 **실제 적용**은 당장 하지 않고, **나중에 점검해서 넣기로 함.**

**현재 완료된 것**
- P1-티켓1: GiveawayWidget postgres_changes 제거 → Broadcast만 구독 (기능 구현 완료)
- P1-티켓2: Giveaway open/closed 시 Broadcast 호출 추가 (기능 구현 완료)
- P1-티켓3: 코드 감사 완료, `realtime.messages` RLS 마이그레이션(104) 적용, 문서화 완료

**나중에 할 것**
- Realtime Authorization **설정** 점검 후 적용:
  - 웨비나 Broadcast 채널을 `config: { private: true }` 로 구독하도록 코드 수정
  - Supabase 대시보드 → Realtime → Settings 에서 **Allow public access** 끄기
  - 참가자 발신 이벤트 `session_conflict` 가 있으므로, 적용 전에 API 경유로 보낼지 검토

**참고:** `docs/Realtime_Broadcast_권한_점검.md`
