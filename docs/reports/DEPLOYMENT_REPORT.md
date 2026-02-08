# P0-PR1~3 배포 작업 보고서

**작성일**: 2026-02-07  
**PR 번호**: #1  
**브랜치**: `fix/p0-registrations-id-remove-and-optimizations`

---

## 1. PR 생성 완료

**PR 링크**: https://github.com/ustudiopd/EventLive/pull/1

**PR 제목**: `fix: P0-PR1~3 - registrations.id 제거, fail-fast, 자동등록 제거, 409 멱등성 처리`

**상태**: OPEN (머지 대기 중)

---

## 2. 머지 전 리뷰 체크 결과

### ✅ 체크 A: presence/ping에서 registrations INSERT 완전 제거 확인

**확인 방법**: `presence/ping/route.ts`에서 `registrations.insert()` 호출 검색

**결과**: 
- ✅ `registrations.insert()` 호출 없음
- ✅ 자동 등록 로직 완전 제거됨 (약 80줄 제거)
- ✅ 등록이 없을 때: 관리자 권한 확인 후, 관리자가 아니면 403 Forbidden 반환

**코드 위치**: `app/api/webinars/[webinarId]/presence/ping/route.ts:84-89`
```typescript
// P0-PR2: 자동 등록 제거 - 등록이 없으면 관리자 권한 확인으로 진행
// 등록 생성 책임은 access/track 또는 register 엔드포인트에만 있음

// P0-PR2: 등록이 있으면 presence ping RPC 호출
if (registration) {
  // 등록이 있으면 presence ping RPC 호출
  const { error: rpcError } = await supabase.rpc('webinar_presence_ping', {
    _webinar_id: actualWebinarId,
  })
```

**결론**: ✅ **통과** - ping 핫패스가 등록 생성기로 변하지 않도록 보장됨

---

### ✅ 체크 B: access/track upsert 멱등성 처리 확인

**확인 방법**: `access/track/route.ts`에서 `onConflict` 옵션 확인

**결과**:
- ✅ `onConflict: 'webinar_id,user_id'` 정확히 설정됨
- ✅ upsert 컬럼: `webinar_id`, `user_id`, `role`, `registered_via`만 포함 (최소 필수 컬럼)
- ✅ `ignoreDuplicates: false`로 중복 시 UPDATE 수행 (멱등성 보장)

**코드 위치**: `app/api/webinars/[webinarId]/access/track/route.ts:82-92`
```typescript
// P0-PR3: upsert 사용 - 동시 요청 시 409 에러 대신 정상 흐름으로 수렴
const { error: upsertRegError } = await admin
  .from('registrations')
  .upsert({
    webinar_id: webinarId,
    user_id: user.id,
    role: role,
    registered_via: 'manual',
  }, {
    onConflict: 'webinar_id,user_id',
    ignoreDuplicates: false, // 중복 시 UPDATE 수행 (멱등성 보장)
  })
```

**결론**: ✅ **통과** - 동시 입장/재요청에서 409를 발생시키지 않음

---

### ⚠️ 체크 C: 등록 없는 일반 사용자 플로우 확인

**현재 동작**:
- 등록 없는 사용자가 `presence/ping` 호출 시: 403 Forbidden 반환
- 등록 없는 사용자가 `access/track` 호출 시: 자동 등록 처리 (기존 동작 유지)

**확인 필요 사항**:
- [ ] 등록 없는 사용자가 라이브 진입 시 SSR/정책에 의해 차단/유도되는지
- [ ] `access/track`에서 자동 등록이 정상 동작하는지

**예상 동작**:
- `access/track`에서 자동 등록 처리되므로, 정상 플로우는 유지될 것으로 예상
- `presence/ping`은 등록된 사용자만 업데이트하므로, 등록 없는 사용자는 `access/track`을 통해 먼저 등록되어야 함

**결론**: ⚠️ **배포 후 확인 필요** - 기능 회귀 테스트(DoD-4)에서 확인

---

## 3. 배포 준비 상태

**머지 가능 여부**: ✅ **예** (체크 A, B 통과, 체크 C는 배포 후 확인)

**주의사항**:
- 체크 C는 배포 후 기능 회귀 테스트에서 확인 필요
- 배포 후 30분간 DoD 모니터링 필수

---

## 4. 배포 후 DoD 모니터링 체크리스트

배포 완료 시각: `[배포 후 기록]`

### DoD-1: PostgREST 400
- [ ] `registrations.id` 관련 400이 0건인지 확인
- **확인 방법**: Supabase 대시보드 → Logs → API Logs에서 `column registrations.id does not exist` 검색

### DoD-2: PostgREST 409
- [ ] registrations 중복키(409)가 "급감"했는지 확인
- [ ] 혹시 409가 있어도 "추가 쿼리/재시도/트래픽 증폭"이 동반되지 않는지 확인
- **확인 방법**: Supabase 대시보드 → Logs → Postgres Logs에서 `duplicate key value violates unique constraint "registrations_pkey"` 검색

### DoD-3: Auth 폭주 여부
- [ ] `/auth/v1/user` 호출량이 비정상적으로 증가하지 않는지 확인
- **확인 방법**: Supabase 대시보드 → Logs → Auth Logs에서 `/auth/v1/user` 호출량 확인

### DoD-4: 기능 회귀 테스트
- [ ] **등록자**: 라이브 진입 OK, 채팅/Q&A OK
- [ ] **관리자**: stats/access OK (접속자 수/타임라인 정상)
- [ ] **비등록자**: 정책대로 차단/유도, ping이 등록 생성하지 않음

---

## 5. 롤백 트리거 (즉시 롤백 기준)

아래 중 하나라도 발생하면 즉시 롤백:

- [ ] `registrations.id` 관련 400이 다시 발생
- [ ] 409가 다시 폭발하며 DB CPU/커넥션이 상승
- [ ] 라이브 진입/채팅/Q&A가 치명적으로 깨짐(운영 불가)

**롤백 방법**:
```bash
git revert 3e34973
git push origin main
```

---

## 6. 변경사항 요약

### 수정된 파일
1. `app/api/webinars/[webinarId]/presence/ping/route.ts`
   - P0-PR1: `registrations.id` 제거 + fail-fast
   - P0-PR2: 자동 등록 제거

2. `app/api/webinars/[webinarId]/access/track/route.ts`
   - P0-PR1: `registrations.id` 제거 + fail-fast
   - P0-PR3: upsert로 409 멱등성 처리

### 통계
- **삭제된 라인**: 약 106줄
- **추가된 라인**: 약 48줄
- **순 감소**: 약 58줄

---

## 7. 다음 단계

1. ✅ PR 생성 완료
2. ⏳ 리뷰 및 머지 대기
3. ⏳ 프로덕션 배포
4. ⏳ 배포 후 30분 DoD 모니터링
5. ⏳ 결과 보고

---

**작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-07
