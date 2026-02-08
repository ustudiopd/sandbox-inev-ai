# inev.ai 개발 · 배포 운영 명세서

**문서 버전**: v1.0  
**최종 업데이트**: 2026-02-09  
**대상**: inev.ai 리빌딩 프로젝트 운영/배포 가이드

---

## 1) 개발 환경

### 로컬 개발
- Node.js >= 18.0.0
- Supabase CLI (마이그레이션 관리)
- 환경 변수: `.env.local` (Supabase URL/Key, Resend API Key 등)

### 스테이징/프로덕션
- Vercel 배포 (자동 배포: main 브랜치)
- Supabase 프로젝트 (공용 또는 전용)
- 도메인: `{client}.inev.ai` (서브도메인 앱)

---

## 2) 배포 프로세스

### 배포 전 체크리스트
- [ ] 모든 단위 테스트 통과
- [ ] DoD 테스트 통과 (해당 Phase)
- [ ] Linter 검증 통과
- [ ] 환경 변수 설정 확인
- [ ] 마이그레이션 적용 확인

### 배포 순서
1. **로컬 테스트**: `npm run dev` 실행 후 기능 검증
2. **Git 커밋**: 변경사항 커밋 (코드/마이그레이션/문서)
3. **Vercel 자동 배포**: main 브랜치 푸시 시 자동 배포
4. **배포 후 검증**: 프로덕션 환경에서 핵심 기능 테스트

---

## 3) 데이터베이스 관리

### 마이그레이션
- Supabase 마이그레이션 파일: `supabase/migrations/`
- 마이그레이션 적용: `supabase db push`
- 롤백: `supabase migration down`

### 백업
- 데이터 수정/삭제 전 반드시 CSV 백업 및 Supabase 백업 확인
- 더미 데이터 생성 금지 (테스트/통계 목적으로도 생성하지 않음)

---

## 4) 환경 변수 관리

### 필수 환경 변수
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 사이드 Admin 클라이언트용
- `RESEND_API_KEY`: 이메일 발송용 (Phase 4)

### 선택 환경 변수
- `NEXT_PUBLIC_SUPABASE_ORIGIN_URL`: Realtime 연결용 원본 URL

---

## 5) 테스트 / DoD 기준

### Phase별 DoD 검증
- Phase 1~3: `scripts/inev-dod-test-phase1-4-auth.mjs`
- Phase 4: `scripts/inev-dod-test-phase1-4-auth.mjs` (Phase 4 섹션)
- Phase 5: `scripts/inev-phase5-dod-test.mjs`
- RLS/Tenant Isolation: `scripts/inev-phase1-3-rls-test.mjs`

### 테스트 실행 방법
```bash
# 개발 서버 실행
npm run dev

# DoD 테스트 실행
node scripts/inev-dod-test-phase1-4-auth.mjs http://localhost:3000
node scripts/inev-phase5-dod-test.mjs http://localhost:3000
```

---

## 6) 운영 사고 방지 규칙

### 데이터 수정/삭제
- 데이터 수정/삭제 전 반드시 CSV 백업 및 Supabase 백업 확인
- 백업 없으면 안내 후 사용자 확인을 기다린다
- 데이터 수정 스크립트: `--execute` 플래그 없이는 실제 수정/삭제하지 않음

### 시간대 처리
- 표시는 항상 KST(한국 표준시)
- DB 저장은 UTC, 조회 후 표시 시 KST 변환
- `toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 사용

### Git 규칙
- 절대로 자동으로 `git commit` 또는 `git push`를 실행하지 않는다
- 사용자가 명시적으로 요청할 때만 실행한다
- 허용: `git add`, `git status`, `git diff`, `git log`

---

## 7) Phase 6 Rollback Triggers (명시적 롤백 조건)

**Phase 6 작업 중 아래 조건이 발생하면 즉시 롤백합니다.**

### 롤백 트리거 목록

1. **중복 로그인 테스트(2탭/2기기)에서 "둘 다 튕김" 재현**
   - 두 탭 또는 두 기기에서 동시 접속 시 양쪽 모두 퇴장되는 현상 발생
   - 기대 동작: 승자 1명만 유지, 기존 세션은 다음 갱신에서 자연 퇴장

2. **Entry Gate에서 링크 오픈만으로 세션/등록 생성이 발생**
   - `/event/[slug]/enter?email=` 페이지 로드만으로 세션이 생성되거나 등록이 생성됨
   - 기대 동작: 버튼 클릭 시에만 API 호출 및 세션 생성

3. **표시이름이 이메일 로컬파트로 fallback되는 케이스 발생**
   - 등록 정보가 없을 때 이메일의 `@` 앞부분(로컬파트)이 표시이름으로 사용됨
   - 기대 동작: `NAME_REQUIRED` 에러 반환, 이메일 로컬파트 사용 금지

4. **웨비나 핫패스 트래픽이 Phase 5 기준 대비 증가**
   - 폴링/구독 추가로 DB 부하 증가 징후
   - 무거운 집계/재계산이 실시간 화면에서 실행됨
   - AI 호출이 웨비나 라이브 화면에서 발생함

5. **운영 앱(release 브랜치)에서 D-1 이후 코드 배포가 필요한 상황 발생**
   - 프로덕션 환경에서 긴급 수정이 필요한 경우
   - 즉시 동결/되돌림 절차 실행

### 롤백 절차

1. **즉시 Vercel 배포 롤백**: 이전 배포 버전으로 되돌림
2. **데이터베이스 마이그레이션 롤백**: 필요 시 `supabase migration down`
3. **문제 분석**: 롤백 트리거 발생 원인 분석
4. **수정 후 재배포**: 문제 해결 후 재테스트 및 재배포

---

## 8) 모니터링 및 알림

### 모니터링 항목
- API 응답 시간
- 데이터베이스 쿼리 성능
- 에러 로그 (Supabase Logs)
- 배포 상태 (Vercel)

### 알림 기준
- API 에러율 증가 (>5%)
- 데이터베이스 쿼리 타임아웃 발생
- 롤백 트리거 조건 발생

---

## 9) 클라이언트 추가 절차 (수동)

### 새 클라이언트(서브도메인 앱) 생성
1. 템플릿 repo 클론 → 인스턴스 repo 생성
2. Vercel 프로젝트 생성, 서브도메인 연결 (`{client}.inev.ai`)
3. `.env` 설정: 공용 Supabase 또는 전용 Supabase 선택
4. Admin에서 Client 폴더/기본 이벤트 생성

### 발송 링크 표준
- **발송 링크는 항상 해당 클라이언트 도메인을 사용한다.**  
  예: `wert.inev.ai/s/{code}?u={email}`  
- `/s`는 전역 라우터가 아니라, 클라이언트 앱 내부 게이트로 둔다.
- **도메인 정책**: 
  - `canonical_domain`이 설정되면 우선 사용, 없으면 `subdomain_domain` 사용
  - `public_base_url = canonical_domain ?? subdomain_domain`
  - Vercel preview(`*.vercel.app`)는 내부 운영/QA/장애 대응 용도이며, 외부 발송 링크로 사용하지 않는다.
- **ShortLink 클릭 로그**: 
  - `/s/{code}` 클릭 로그는 `event_access_logs`에 기록되며, 운영 지표의 1차 근거로 사용된다.
  - 클릭 로그는 UTM 파라미터, referrer, user_agent, session_id를 포함한다.

### 이벤트 종료/폐기
1. 도메인 연결 끊기 (또는 maintenance 페이지로)
2. 데이터 export (등록/응답/로그/메일 로그)
3. repo 유지 (재사용/감사/재오픈 대비)

---

## 10) 참고 문서

- [inev 리빌딩 전체 구현 계획](./inev_리빌딩_전체구현계획.md)
- [inev Phase 1~3 테스트 결과 보고서](../reports/inev_Phase1-3_테스트_결과_보고서.md)
- [inev Phase 4~5 테스트 결과 보고서](../reports/inev_Phase4-5_테스트_결과_보고서.md)
- [inev Phase 1~4 DoD 체크리스트](./inev_Phase1-4_DoD_체크리스트.md)

---

**문서 작성자**: Cursor Agent  
**최종 업데이트**: 2026-02-09 (Phase 7 발송 링크 표준 및 도메인 정책 추가)
