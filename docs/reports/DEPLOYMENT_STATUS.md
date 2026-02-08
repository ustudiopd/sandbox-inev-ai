# P0-PR1~3 배포 상태 보고서

**작성일**: 2026-02-07 11:46:18 KST  
**PR 번호**: #1

---

## ✅ 1. PR 머지 완료

- **머지 시각**: 2026-02-07 11:46:18 KST (2026-02-07T02:46:18Z UTC)
- **머지 커밋 SHA**: `a8719e7a02f879b3b39cdf290c3fbed7311410d5`
- **상태**: MERGED ✅

---

## ⏳ 2. 프로덕션 배포 대기 중

**배포 확인 필요**: Vercel 대시보드에서 확인 필요

- 배포 완료 시각: `[Vercel 대시보드에서 확인 필요]`
- 배포 ID/URL: `[Vercel 대시보드에서 확인 필요]`
- 배포 커밋 SHA: `a8719e7` (머지 커밋과 일치 확인)

**참고**: Vercel 자동 배포가 활성화되어 있다면 머지 후 자동으로 배포가 시작됩니다.

**다음 단계**: 배포 완료 후 30분 DoD 모니터링 시작

---

## 📋 3. 배포 전 로그 분석 (참고)

**프로젝트 ID**: `yqsayphssjznthrxpgfb`

**배포 전 Postgres 로그에서 발견된 에러** (배포 후 사라져야 함):
- `column registrations.id does not exist` - 여러 건 발견 (배포 전)
- `duplicate key value violates unique constraint "registrations_pkey"` - 여러 건 발견 (배포 전)

**예상**: 배포 후 이 에러들이 사라지고, DoD-1과 DoD-2가 통과해야 함

---

## 📊 4. 체크C 정책 확인 완료

**코드 분석 결과**:
- ✅ 현재 제품 정책: **"등록 없이도 입장 가능(자동등록)"** (옵션 B)
- ✅ 정상 플로우:
  1. 비등록자 → 라이브 진입 시도
  2. `access/track` 호출 → 자동 등록 생성 (upsert)
  3. 이후 `presence/ping` 호출 → 등록 있음 → 204 반환

**체크C 판정**:
- ✅ 정책: **"등록 없이도 입장 가능(자동등록)"**
- ✅ 현재 동작이 정책과 일치하는지: **예**
- ✅ 결론: **정상 동작** - `access/track`에서 1회 등록 생성 후 `presence/ping`이 204로 바뀌는 것이 정상

---

## 🔍 5. 배포 후 모니터링 체크리스트

배포 완료 후 아래 항목을 확인하세요:

### DoD-1: PostgREST 400
- [ ] `registrations.id` 관련 400이 0건인지 확인
- **확인 방법**: Supabase 대시보드 → Logs → API Logs
- **검색 키워드**: `registrations.id`, `column registrations.id does not exist`, `400`

### DoD-2: PostgREST 409
- [ ] `duplicate key` / registrations 충돌이 "폭발"하지 않는지 확인
- **확인 방법**: Supabase 대시보드 → Logs → Postgres Logs
- **검색 키워드**: `409`, `duplicate key`, `registrations`, `onConflict`

### DoD-3: Auth 폭주 여부
- [ ] `/auth/v1/user` 호출이 비정상 증가하지 않는지 확인
- **확인 방법**: Supabase 대시보드 → Logs → Auth Logs
- **검색 키워드**: `/auth/v1/user`, `refresh_token_already_used`, `401`

### DoD-4: 기능 회귀 테스트
- [ ] 등록자 계정으로 라이브 진입 → 채팅/Q&A 정상
- [ ] 관리자 계정으로 stats/access 진입 → currentParticipants/타임라인 정상
- [ ] 비등록자 플로우 확인:
  - [ ] 라이브 진입 시도 → `access/track`에서 자동 등록 생성 확인
  - [ ] 이후 `presence/ping`이 204 반환 확인 (403이 아님)

---

## 🚨 6. 롤백 트리거

아래 중 하나라도 발생하면 즉시 롤백:

- `registrations.id` 관련 400이 다시 발생
- 409가 다시 폭발하며 DB CPU/커넥션이 상승
- 라이브 진입/채팅/Q&A가 치명적으로 깨짐(운영 불가)

**롤백 절차**:
```bash
git revert a8719e7
git push origin main
# Vercel 자동 배포 확인
```

---

## 📝 7. Supabase 로그 확인 방법

**프로젝트 ID**: `yqsayphssjznthrxpgfb`

**로그 확인 경로**:
1. Supabase 대시보드 접속: https://supabase.com/dashboard/project/yqsayphssjznthrxpgfb
2. 좌측 메뉴 → **Logs** 선택
3. 각 서비스별 로그 확인:
   - **API Logs**: PostgREST 400/409 확인
   - **Postgres Logs**: 데이터베이스 에러 확인
   - **Auth Logs**: 인증 관련 로그 확인

---

**작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-07 11:46:18 KST
