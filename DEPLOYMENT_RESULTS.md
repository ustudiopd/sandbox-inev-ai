# P0-PR1~3 배포 결과 보고서

**작성일**: 2026-02-07 11:48:14 KST  
**PR 번호**: #1

---

## 1. 배포 정보

- **머지 시각**: 2026-02-07 11:46:18 KST (2026-02-07T02:46:18Z UTC)
- **머지 커밋 SHA**: `a8719e7a02f879b3b39cdf290c3fbed7311410d5`
- **배포 완료 시각**: 2026-02-07 11:48:14 KST (사용자 확인)
- **배포 커밋 SHA**: `a8719e7` (머지 커밋과 일치)

---

## 2. 배포 후 30분 DoD 모니터링 결과

### DoD-1: PostgREST 400

**확인 항목**: `registrations.id` 관련 400이 0건인지 확인

**확인 방법**: Supabase 대시보드 → Logs → API Logs
- 검색 키워드: `registrations.id`, `column registrations.id does not exist`, `400`

**결과**: 
- 상태: ⏳ **모니터링 중** (배포 직후)
- 발견된 400 에러 수: `[배포 후 새 요청 확인 필요]`
- 로그 요약: 배포 전 로그에서는 `column registrations.id does not exist` 에러가 발견되었으나, 배포 후 새 요청에서는 확인 필요

**판정**: ⏳ **대기 중** - 배포 후 실제 트래픽 발생 시 확인 필요

---

### DoD-2: PostgREST 409

**확인 항목**: `duplicate key` / registrations 충돌이 "폭발"하지 않는지 확인

**확인 방법**: Supabase 대시보드 → Logs → Postgres Logs
- 검색 키워드: `409`, `duplicate key`, `registrations`, `onConflict`

**결과**:
- 상태: ⏳ **모니터링 중** (배포 직후)
- 발견된 409 에러 수: 배포 전 로그에서 `duplicate key value violates unique constraint "registrations_pkey"` 발견
- 트래픽 증폭 여부: `[배포 후 새 요청 확인 필요]`
- 로그 요약: 배포 전에는 `registrations_pkey` 중복키 에러가 있었으나, 배포 후 `access/track`에서 upsert 사용으로 감소 예상

**판정**: ⏳ **대기 중** - 배포 후 실제 트래픽 발생 시 확인 필요

---

### DoD-3: Auth 폭주 여부

**확인 항목**: `/auth/v1/user` 호출이 비정상 증가하지 않는지 확인

**확인 방법**: Supabase 대시보드 → Logs → Auth Logs
- 검색 키워드: `/auth/v1/user`, `refresh_token_already_used`, `401`

**결과**:
- 상태: ⏳ **모니터링 중** (배포 직후)
- `/auth/v1/user` 호출량: `[배포 후 확인 필요]`
- 비정상 증가 여부: `[배포 후 확인 필요]`
- 로그 요약: `[배포 후 확인 필요]`

**판정**: ⏳ **대기 중** - 배포 후 실제 트래픽 발생 시 확인 필요

---

### DoD-4: 기능 회귀 테스트

#### 4-1. 등록자 계정 테스트

- [ ] 등록자 계정으로 라이브 진입 → 채팅/Q&A 정상
- 결과: `[테스트 필요]`

#### 4-2. 관리자 계정 테스트

- [ ] 관리자 계정으로 stats/access 진입 → currentParticipants/타임라인 정상
- 결과: `[테스트 필요]`

#### 4-3. 체크C: 비등록자 플로우 확인 (중요)

**정책 확인 완료**:
- ✅ 현재 제품 정책: **"등록 없이도 입장 가능(자동등록)"** (옵션 B)
- ✅ 정상 플로우:
  1. 비등록자 → 라이브 진입 시도
  2. `access/track` 호출 → 자동 등록 생성 (upsert)
  3. 이후 `presence/ping` 호출 → 등록 있음 → 204 반환

**테스트 시나리오**:
- [ ] 비등록자 상태에서 라이브 진입 시도
- [ ] `access/track`에서 자동 등록 생성 확인
- [ ] `presence/ping`이 204 반환 확인 (403이 아님)
- 결과: `[테스트 필요]`

**체크C 판정**:
- ✅ 정책: **"등록 없이도 입장 가능(자동등록)"**
- ✅ 현재 동작이 정책과 일치하는지: **예** (코드 분석 기준)
- ⏳ 실제 테스트 결과: `[테스트 필요]`

---

## 3. 배포 전 로그 분석 (참고)

**프로젝트 ID**: `yqsayphssjznthrxpgfb`

**배포 전 Postgres 로그에서 발견된 에러** (배포 후 사라져야 함):
- `column registrations.id does not exist` - 여러 건 발견 (배포 전)
- `duplicate key value violates unique constraint "registrations_pkey"` - 여러 건 발견 (배포 전)

**예상**: 배포 후 이 에러들이 사라지고, DoD-1과 DoD-2가 통과해야 함

---

## 4. 롤백 트리거 확인

아래 중 하나라도 발생하면 즉시 롤백:

- [ ] DoD-1 실패 (400 재발)
- [ ] DoD-2 실패 (409 폭발 + DB 부하 상승)
- [ ] 기능 회귀로 운영 불가

**롤백 상태**: 
- 롤백 필요 여부: `아니오` (현재까지)
- 롤백 실행 여부: `아니오`

**롤백 절차** (필요 시):
```bash
git revert a8719e7
git push origin main
# Vercel 자동 배포 확인
```

---

## 5. 다음 단계

1. ✅ PR 머지 완료
2. ✅ 배포 완료 확인
3. ⏳ 배포 후 30분 DoD 모니터링 진행 중
4. ⏳ 기능 회귀 테스트 (체크C 포함)
5. ⏳ 최종 결과 보고 (30분 후)

---

## 6. 모니터링 권장 사항

**즉시 확인**:
1. Supabase 대시보드에서 최신 API/Postgres/Auth 로그 확인
2. 배포 후 실제 트래픽 발생 시 `registrations.id` 관련 400 에러가 발생하지 않는지 확인
3. `registrations_pkey` 중복키 에러가 감소했는지 확인

**30분 후 확인**:
1. DoD-1~3 최종 판정
2. 기능 회귀 테스트 완료
3. 체크C 최종 판정

---

**작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-07 11:48:14 KST
