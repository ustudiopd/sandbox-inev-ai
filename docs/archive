# fix: P0-PR1~3 - registrations.id 제거, fail-fast, 자동등록 제거, 409 멱등성 처리

## 개요
P0 우선순위 최적화 작업 3개를 포함한 PR입니다.

**⚠️ 주의**: 원래 계획은 P0-PR1만 먼저 배포하고 관측하는 것이었으나, 현재 상태 그대로 P0-PR1~3이 모두 포함되어 있습니다.

---

## 포함된 작업

### P0-PR1: registrations.id 전수 제거 + 에러 즉시 종료 (Fail-fast)
- **파일**: 
  - `app/api/webinars/[webinarId]/presence/ping/route.ts`
  - `app/api/webinars/[webinarId]/access/track/route.ts`
- **변경사항**:
  - `.select('id')` → `.select('webinar_id, user_id')` 변경 (복합 PK 사용)
  - 등록 조회 에러 발생 시 즉시 500 반환 (추가 쿼리 방지)
- **목적**: `column registrations.id does not exist` 400 에러 제거
- **Fail-fast 정책**: 4xx는 재시도 없이 중단, 5xx는 후속(P1)에서 클라이언트 백오프/서킷브레이커를 보강 예정

### P0-PR2: presence/ping에서 자동 등록 제거
- **파일**: `app/api/webinars/[webinarId]/presence/ping/route.ts`
- **변경사항**:
  - 자동 등록 로직 제거 (약 80줄)
  - 등록 생성 책임을 `access/track` 또는 `register` 엔드포인트로 분리
  - 등록이 없으면 관리자 권한 확인으로 진행
- **목적**: presence 핫패스 경량화, 409/DB 락/경합 방지

### P0-PR3: 409를 정상 흐름으로 흡수 (멱등성)
- **파일**: `app/api/webinars/[webinarId]/access/track/route.ts`
- **변경사항**:
  - `insert` → `upsert` 변경
  - `onConflict: 'webinar_id,user_id'` 옵션으로 동시 요청 시 409 에러 방지
- **목적**: 동시 입장 시 중복키 에러를 정상 흐름으로 수렴

---

## 머지 전 리뷰 체크

### ✅ 체크 A: presence/ping에서 registrations INSERT 완전 제거 확인
- **확인 결과**: `presence/ping/route.ts`에서 `registrations.insert()` 호출 없음
- **등록 없을 때 동작**: 관리자 권한 확인 후, 관리자가 아니면 403 Forbidden 반환

### ✅ 체크 B: access/track upsert 멱등성 처리 확인
- **확인 결과**: `onConflict: 'webinar_id,user_id'` 정확히 설정됨
- **upsert 컬럼**: `webinar_id`, `user_id`, `role`, `registered_via`만 포함 (최소 필수 컬럼)

### ⚠️ 체크 C: 등록 없는 일반 사용자 플로우 확인 필요
- **현재 동작**: 등록 없는 사용자가 `presence/ping` 호출 시 403 Forbidden 반환
- **확인 필요**: 등록 없는 사용자가 라이브 진입 시 SSR/정책에 의해 차단/유도되는지
- **예상 동작**: `access/track`에서 자동 등록 처리되므로, 정상 플로우는 유지될 것으로 예상

---

## DoD 확인 사항 (배포 후 30분 관측)

- [ ] **DoD-1**: PostgREST 400 - `registrations.id` 관련 0건
- [ ] **DoD-2**: PostgREST 409 - registrations 중복키 급감 또는 발생해도 트래픽 증폭 없음
- [ ] **DoD-3**: Auth 폭주 여부 - `/auth/v1/user` 호출량이 비정상적으로 증가하지 않음
- [ ] **DoD-4**: 기능 회귀 테스트
  - 등록자: 라이브 진입 OK, 채팅/Q&A OK
  - 관리자: stats/access OK (접속자 수/타임라인 정상)
  - 비등록자: 정책대로 차단/유도, ping이 등록 생성하지 않음

---

## 롤백 트리거 (즉시 롤백 기준)

아래 중 하나라도 발생하면 즉시 롤백:
- `registrations.id` 관련 400이 다시 발생
- 409가 다시 폭발하며 DB CPU/커넥션이 상승
- 라이브 진입/채팅/Q&A가 치명적으로 깨짐(운영 불가)

---

## 테스트 시나리오

1. **정상 등록된 사용자**: presence ping 정상 동작 확인
2. **등록되지 않은 사용자**: presence ping에서 관리자 권한 확인 또는 403 반환 확인
3. **동시 입장**: access/track에서 409 에러 없이 정상 처리 확인

---

## 롤백 계획

문제 발생 시 즉시 롤백 가능하도록 커밋 단위로 관리됩니다.
