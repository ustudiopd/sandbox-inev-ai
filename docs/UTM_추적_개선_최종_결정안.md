# UTM 추적 개선 최종 결정안

**작성일**: 2026-02-02  
**상태**: ✅ 확정 완료  
**목적**: 구현 중 흔들릴 의사결정 제거, 빠른 안정화 + 멀티테넌시 사고 방지

---

## 🎯 목표

- **Phase 2 종료 시점에 "UTM/링크 집계 정상화(Direct 오분류 급감)"** 달성
- "Visit 퍼널"은 **선택**. 우선은 **등록 시점 추적 저장**이 핵심

---

## ✅ 결정 사항 (확정)

### 1. Middleware vs Proxy

**결정**: **Middleware로 진행** (단기 안정화 우선)

- 단, 추적 로직은 반드시 **`lib/tracking/*` 모듈 분리** (향후 proxy 마이그레이션 대비)

**이유**:
- 이번 이슈는 "저장 자체가 안 되는 상태"라서 빨리 막는 게 우선 (Phase 2.1~2.3 크리티컬 패스)

---

### 2. Cookie 서명 방식

**결정**: **"미신뢰 + DB 검증"으로 시작**

- cookie 값은 **절대 신뢰하지 않고**, 항상 `cid → link_meta 조회`로 **현재 campaignId 매칭**이 될 때만 사용

**이유**:
- 구현 단순/빠름
- 위변조 리스크는 "DB resolve + campaign match"로 실질 차단 가능
- KPI가 커지면 Phase 3 이후 JWT 서명으로 업그레이드 가능

---

### 3. Cookie TTL vs Trust Window (분리 고정)

**결정**: **TTL 30일 / Trust 24시간** (환경변수로)

- `COOKIE_TTL_DAYS = 30` (보관/편의)
- `COOKIE_TRUST_WINDOW_HOURS = 24` (귀속 허용창/오귀속 방지)

**규칙**:
- TTL이 살아있어도 Trust window 밖이면 **귀속/복원에 사용하지 않는다** (오귀속 방지)

---

### 4. UTM + cid 충돌 규칙 (Conflict Rule)

**결정**: **"UTM 우선 진실 / cid는 보조 식별자"로 고정**

- URL에 UTM이 있으면 → **UTM 저장**
- cid는 → link_id 식별에만 사용
- cid가 **다른 캠페인**으로 resolve 되면:
  - `utm_*`는 저장
  - `marketing_campaign_link_id`는 저장하지 않음
  - `untracked_reason = 'cid_campaign_mismatch'` 기록

---

### 5. "추적 성공률" 정의 (Phase 1~2 vs Phase 3 단계화)

**결정**: **Phase 1~2 성공 정의에서 tracking_snapshot 제외**

#### Phase 1~2 성공(Tracking OK)

아래 중 **하나 이상**이 성공:
- `marketing_campaign_link_id` 저장 **OR**
- `utm_source` 등 UTM 최소 1개 저장 **OR**
- (cookie/cid resolve가 성공해서) "현재 campaign 매칭 검증" 성공

#### Phase 3 이후 성공 정의 확장

- 위 조건 + `tracking_snapshot.cid` + campaign 매칭

---

### 6. Visit 추적 필요성

**결정**: **Phase 2 성공조건에서 제외 + 당장 필수 구현 아님(보류)**

- 지금 목표는 Source/Medium 집계 정상화
- Visit는 CVR/퍼널이 필요해질 때 Phase 2.4~2.7로 별도 투자

**단, 운영 안전장치(권장)**:
- Visit가 없어도 등록 시점 tracking은 남게 (= 지금 문제 재발 방지)

---

## ✅ 운영/UI 추천 (혼선 방지)

- 기본 노출 링크: **짧은 링크(추천/공유 링크)**
- 버튼: **"광고용 UTM 링크 보기"**로만 UTM 노출
- 광고 집행은 무조건 UTM 링크 사용

---

## ✅ 지금 바로 실행 순서 (크리티컬 패스 고정)

1. **Phase 2.3**: short-link 리다이렉트에서 query 보존 (최우선)
2. **Phase 2.1**: middleware로 cookie 저장 (모듈 분리)
3. **Phase 2.2**: register에서 URL > cookie(가드) > link 복원
4. **Phase 1.1**: 집계 UI 보정 (Direct no tracking + success rate)

---

## ✅ DoD (이거 통과하면 "이제부터 집계 된다")

### 시나리오 1: UTM 링크 등록
- **기대**: `utm_source` 저장 & 집계 반영
- **판정**: ✅ 성공

### 시나리오 2: cid 링크 등록 (UTM 없음)
- **기대**: link_id 또는 캠페인 매칭 성공 (Direct만으로 안 떨어짐)
- **판정**: ✅ 성공

### 시나리오 3: `/s/[code]` 경유 등록
- **기대**: query+cookie 보존으로 추적 저장
- **판정**: ✅ 성공

### 시나리오 4: 진짜 Direct
- **기대**: "Direct (no tracking)"로 분리 표기
- **판정**: ✅ 성공 (정상 동작)

---

## 📋 구현 체크리스트

### Phase 2.3: Short-link 리다이렉트 개선 (최우선)

- [ ] `app/s/[code]/page.tsx` 수정
  - [ ] Short-link의 UTM 파라미터를 타겟 URL에 추가
  - [ ] 기존 URL의 쿼리 파라미터 유지
  - [ ] `cid` 파라미터 추가
- [ ] 리다이렉트 체인 테스트
  - [ ] `/s/[code]` → event page → register API까지 query 보존 확인

---

### Phase 2.1: 서버 세션 관리 (Middleware)

- [ ] `lib/tracking/middleware-tracking.ts` 모듈 생성
  - [ ] UTM 파라미터 추출 로직
  - [ ] Cookie 저장 로직 (미신뢰 방식)
  - [ ] 환경변수: `COOKIE_TTL_DAYS` (기본값: 30)
- [ ] `middleware.ts` 파일 생성
  - [ ] `lib/tracking/middleware-tracking.ts` 모듈 사용
  - [ ] Matcher 설정 (`/event/*`, `/webinar/*`, `/s/*`)
- [ ] 테스트
  - [ ] 쿠키 저장 확인
  - [ ] 리다이렉트 후 쿠키 유지 확인

---

### Phase 2.2: 등록 API 다중 소스 복원

- [ ] `app/api/public/event-survey/[campaignId]/register/route.ts` 수정
  - [ ] URL 쿼리 파라미터 읽기 (1순위)
  - [ ] Cookie에서 추적 정보 읽기 (2순위)
    - [ ] Cookie의 cid가 현재 campaignId에 매칭되는지 검증 (필수)
    - [ ] captured_at이 Trust Window 내인지 검증 (필수)
    - [ ] 환경변수: `COOKIE_TRUST_WINDOW_HOURS` (기본값: 24)
    - [ ] 검증 실패 시 cookie 무시 + `untracked_reason` 기록
  - [ ] 링크 메타데이터에서 추적 정보 읽기 (3순위)
  - [ ] UTM과 cid 충돌 규칙 구현
    - [ ] UTM 우선, cid는 보조 식별자로만 사용
    - [ ] cid가 다른 캠페인을 가리키면: UTM 저장, link_id 미저장, `untracked_reason = 'cid_campaign_mismatch'`
- [ ] 테스트
  - [ ] URL만 있는 경우
  - [ ] Cookie만 있는 경우 (캠페인 매칭 성공)
  - [ ] Cookie만 있는 경우 (캠페인 불일치 → 무시)
  - [ ] Cookie만 있는 경우 (시간 창 초과 → 무시)
  - [ ] UTM과 cid 충돌 케이스

---

### Phase 1.1: 집계 API 보정

- [ ] `app/api/clients/[clientId]/campaigns/summary/route.ts` 수정
  - [ ] 추적 상태 메타데이터 추가 (`tracking_metadata`)
    - [ ] `tracked_count`: 추적 성공 수
    - [ ] `untracked_count`: 추적 실패 수
    - [ ] `tracking_success_rate`: 성공률 (%)
    - [ ] Phase 1~2 성공 정의 적용 (tracking_snapshot 제외)
  - [ ] Source별 집계 시 "Direct (no tracking)" 라벨 추가
  - [ ] 추적 실패 항목 플래그 추가 (`is_untracked`)
- [ ] `app/(client)/client/[clientId]/campaigns/components/CampaignsPageClient.tsx` 수정
  - [ ] 추적 성공률 표시 추가
  - [ ] "Direct (no tracking)" 라벨 및 설명 추가
  - [ ] 추적 실패 항목 시각적 표시 추가

---

## 🎯 성공 기준

### Phase 2 완료 기준

- [ ] 추적 성공률 80%+ 달성 (Phase 1~2 성공 정의 기준)
- [ ] 모든 리다이렉트에서 추적 정보 유지
- [ ] Cookie 복원 검증 작동 확인 (캠페인 매칭 + Trust Window)
- [ ] UTM과 cid 충돌 규칙 작동 확인
- [ ] DoD 4가지 시나리오 모두 통과

---

## 📚 관련 문서

- [UTM 추적 시스템 개선 작업 체크리스트](./UTM_추적_시스템_개선_작업_체크리스트.md)
- [UTM 추적 시스템 문제점 및 개선사항 종합보고서](./UTM_추적_시스템_문제점_및_개선사항_종합보고서.md)
- [체크리스트 추가 항목 패치 2탄](./체크리스트_추가_항목_패치_2탄.md)

---

**마지막 업데이트**: 2026-02-02  
**상태**: ✅ 확정 완료, 구현 준비 완료
