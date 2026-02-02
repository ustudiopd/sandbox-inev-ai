# 워트 페이지 Visit 추적 오류 상세 명세서

**작성일**: 2026-02-02  
**최종 확인 시각**: 2026-02-02 19:52 (KST)  
**상태**: 🔴 **심각 - Visit 추적이 전혀 작동하지 않음**

---

## 📊 현재 상황 요약

### 데이터 현황 (2026-02-02 기준)

| 항목 | 수치 | 상태 |
|------|------|------|
| **오늘 등록** | 20개 | ✅ 정상 |
| **오늘 Visit** | 0개 | 🔴 **문제** |
| **워트 오늘 등록** | 5개 | ✅ 정상 |
| **워트 오늘 Visit** | 0개 | 🔴 **문제** |
| **전체 Visit** | 10건 | 🔴 매우 적음 |
| **최근 Visit 기록** | 2026-01-28 (5일 전) | 🔴 **멈춤** |
| **Visit 추적률** | 0% (오늘) | 🔴 **완전 실패** |

### 핵심 문제

**워트 페이지(`/event/149403`)에 Visit API 호출 코드는 있지만, 실제로 Visit이 전혀 기록되지 않고 있습니다.**

---

## 🔍 문제 분석

### 1. 코드 상태 확인

#### 1.1 워트 페이지 Visit API 호출 코드

**파일**: `app/webinarform/wert/WebinarFormWertPageContent.tsx`

**현재 코드** (254-278줄):
```typescript
// Visit 수집 (랜딩 페이지 진입 시 — 통계 시스템 연동)
useEffect(() => {
  try {
    const sessionId = getOrCreateSessionId("ef_session_id", 30)
    fetch(`/api/public/campaigns/${WERT_CAMPAIGN_ID}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        utm_source: utmParams.utm_source ?? null,
        utm_medium: utmParams.utm_medium ?? null,
        utm_campaign: utmParams.utm_campaign ?? null,
        utm_term: utmParams.utm_term ?? null,
        utm_content: utmParams.utm_content ?? null,
        cid: searchParams.get("cid") ?? null,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    }).catch(() => {
      // Visit 실패해도 페이지 동작에는 영향 없음
    })
  } catch {
    // 초기화 실패 무시
  }
}, [])
```

**문제점**:
- ❌ 에러가 완전히 무시됨 (`.catch(() => {})`)
- ❌ 성공/실패 여부를 알 수 없음
- ❌ 디버깅 불가능

**캠페인 ID**: `3a88682e-6fab-463c-8328-6b403c8c5c7a` (정상)

#### 1.2 Visit API 서버 코드

**파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`

**상태**: ✅ 정상 (에러 로깅 포함)

**주요 로직**:
1. 캠페인 ID로 `event_survey_campaigns` 조회
2. 없으면 웨비나 ID로 `webinars` 조회
3. `event_access_logs`에 Visit 기록 저장
4. 실패 시 `[VisitTrackFail]` 로그 출력

#### 1.3 데이터베이스 스키마

**테이블**: `event_access_logs`

**스키마** (마이그레이션 071, 074):
- `campaign_id` (nullable) - 캠페인 ID
- `webinar_id` (nullable) - 웨비나 ID  
- `session_id` (required) - 세션 ID
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `cid`, `referrer`, `user_agent`
- `accessed_at` (required) - 방문 시각

**제약조건**: `campaign_id` 또는 `webinar_id` 중 하나는 필수

---

## 🚨 가능한 원인 분석

### 원인 1: Visit API가 호출되지 않음 (가능성 높음)

**증거**:
- 오늘 Visit 0건
- 최근 Visit 5일 전
- 등록은 정상적으로 발생 (20개)

**가능한 이유**:
1. **코드가 배포되지 않음**
   - 로컬에는 코드가 있지만 프로덕션에 반영되지 않았을 수 있음
   - Git 커밋/푸시 누락
   - Vercel 빌드 실패

2. **페이지가 렌더링되지 않음**
   - `/event/149403` 경로가 다른 페이지로 리다이렉트됨
   - `WebinarFormWertPageContent` 컴포넌트가 마운트되지 않음
   - Suspense boundary에서 에러 발생

3. **JavaScript 실행 실패**
   - 브라우저에서 JavaScript 비활성화
   - 네트워크 오류로 스크립트 로드 실패
   - CSP(Content Security Policy) 차단

### 원인 2: Visit API 호출은 되지만 실패함 (가능성 중간)

**증거**:
- 코드는 있지만 데이터가 없음
- 서버 로그 확인 필요

**가능한 이유**:
1. **API 엔드포인트 오류**
   - 404: 경로 오류
   - 500: 서버 내부 오류
   - 네트워크 타임아웃

2. **캠페인 ID 조회 실패**
   - `3a88682e-6fab-463c-8328-6b403c8c5c7a`가 DB에 없음
   - `client_id`가 없어서 저장 실패

3. **DB 저장 실패**
   - 제약조건 위반 (FK, NOT NULL)
   - RLS 정책 차단
   - 권한 문제

### 원인 3: Visit API 호출 성공하지만 집계 오류 (가능성 낮음)

**증거**:
- 스크립트가 `campaign_id`로만 조회
- `webinar_id`로 저장된 경우 누락 가능

**확인 필요**:
- `webinar_id`로 저장된 Visit 확인

---

## 🔧 적용한 수정 내역

### 수정 1: 에러 로깅 추가 (2026-02-02)

**파일**: `app/webinarform/wert/WebinarFormWertPageContent.tsx`

**변경 내용**:
- Visit API 호출 시 성공/실패 로깅 추가
- 브라우저 콘솔에서 확인 가능하도록 개선

**코드**:
```typescript
fetch(visitUrl, { ... })
  .then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[워트 Visit API 실패]', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: visitUrl,
        campaignId: WERT_CAMPAIGN_ID,
      })
    } else {
      const result = await response.json()
      console.log('[워트 Visit API 성공]', {
        success: result.success,
        campaignId: WERT_CAMPAIGN_ID,
      })
    }
  })
  .catch((error) => {
    console.error('[워트 Visit API 네트워크 오류]', {
      error: error.message,
      url: visitUrl,
      campaignId: WERT_CAMPAIGN_ID,
    })
  })
```

**효과**:
- 브라우저 콘솔에서 Visit API 호출 여부 확인 가능
- 실패 원인 파악 가능

---

## 📋 확인 방법

### 1. 브라우저 콘솔 확인

**단계**:
1. `/event/149403` 페이지 접속
2. 브라우저 개발자 도구 열기 (F12)
3. Console 탭 확인
4. 다음 로그 확인:
   - `[워트 Visit API 성공]` - 성공 시
   - `[워트 Visit API 실패]` - 실패 시
   - `[워트 Visit API 네트워크 오류]` - 네트워크 오류 시

**예상 결과**:
- ✅ 성공: `{ success: true, campaignId: "3a88682e-..." }`
- ❌ 실패: `{ status: 404/500, error: "..." }`

### 2. 네트워크 탭 확인

**단계**:
1. 브라우저 개발자 도구 열기
2. Network 탭 열기
3. `/event/149403` 페이지 접속
4. `visit` 필터로 검색
5. `POST /api/public/campaigns/3a88682e-.../visit` 요청 확인

**확인 사항**:
- 요청이 있는지 (없으면 호출 안 됨)
- 상태 코드 (200 = 성공, 4xx/5xx = 실패)
- 응답 본문 (`{ success: true/false }`)

### 3. 서버 로그 확인

**확인 명령어** (Vercel):
```bash
vercel logs --follow
```

**확인할 로그**:
- `[VisitTrackFail]` - Visit 저장 실패
- `[visit] 웨비나의 registration_campaign_id 사용` - 웨비나 ID 사용
- `[visit] 캠페인/웨비나 조회 실패` - 캠페인 조회 실패

### 4. 데이터베이스 직접 확인

**SQL 쿼리**:
```sql
-- 오늘 Visit 확인
SELECT 
  id, 
  campaign_id, 
  webinar_id, 
  session_id, 
  accessed_at,
  utm_source,
  utm_medium
FROM event_access_logs
WHERE accessed_at >= CURRENT_DATE
ORDER BY accessed_at DESC
LIMIT 20;

-- 워트 캠페인 Visit 확인
SELECT 
  id, 
  campaign_id, 
  session_id, 
  accessed_at
FROM event_access_logs
WHERE campaign_id = '3a88682e-6fab-463c-8328-6b403c8c5c7a'
ORDER BY accessed_at DESC
LIMIT 20;

-- 최근 Visit 확인
SELECT 
  id, 
  campaign_id, 
  webinar_id, 
  session_id, 
  accessed_at
FROM event_access_logs
ORDER BY accessed_at DESC
LIMIT 10;
```

### 5. 스크립트로 확인

**명령어**:
```bash
# 오늘 Visit 현황 확인
npx tsx scripts/wert-today-visitors-by-hour.ts

# Visit API 상태 확인
npx tsx scripts/check-visit-api-status.ts
```

---

## 🔄 이전 수정 내역

### 2026-01-28 이전
- Visit API 호출 코드 없음
- 랜딩 페이지에서 Visit 기록 안 됨

### 2026-01-28 이후 (추정)
- Visit API 호출 코드 추가 시도
- 하지만 실제로 작동하지 않음

### 2026-02-02 오늘
- 에러 로깅 추가
- 문제 진단 시작

---

## ⚠️ 영향 범위

### 직접 영향
1. **워트 캠페인 통계 불가**
   - Visit 수 집계 불가
   - 전환율(CVR) 계산 불가
   - 퍼널 분석 불가

2. **마케팅 성과 측정 불가**
   - UTM 파라미터 기반 분석 불가
   - 채널별 성과 비교 불가
   - ROI 계산 불가

### 간접 영향
1. **다른 캠페인도 동일 문제 가능성**
   - 워트만의 문제가 아닐 수 있음
   - 전체 Visit 추적 시스템 점검 필요

2. **데이터 손실**
   - 지난 5일간의 Visit 데이터 손실
   - 복구 불가능

---

## 🎯 해결 방안

### 즉시 조치 (긴급)

1. **배포 확인**
   - [ ] Git 커밋/푸시 확인
   - [ ] Vercel 빌드 상태 확인
   - [ ] 프로덕션 환경에 코드 반영 확인

2. **실제 테스트**
   - [ ] `/event/149403` 페이지 접속
   - [ ] 브라우저 콘솔 확인
   - [ ] 네트워크 탭 확인
   - [ ] Visit API 호출 여부 확인

3. **서버 로그 확인**
   - [ ] Vercel 로그 확인
   - [ ] `[VisitTrackFail]` 로그 검색
   - [ ] 에러 원인 파악

### 단기 조치 (1-2일)

1. **코드 개선**
   - [ ] 에러 로깅 강화 (이미 완료)
   - [ ] 재시도 로직 추가 검토
   - [ ] 모니터링 알림 추가

2. **다른 페이지 점검**
   - [ ] 다른 랜딩 페이지 Visit API 확인
   - [ ] 등록 페이지 Visit API 확인
   - [ ] 전체 플로우 점검

3. **데이터 복구 검토**
   - [ ] 서버 로그에서 Visit 데이터 추출 가능 여부 확인
   - [ ] 복구 스크립트 작성 (가능한 경우)

### 장기 조치 (1주일)

1. **모니터링 시스템 구축**
   - [ ] Visit 추적 실패 알림 설정
   - [ ] 일일 Visit 수 모니터링
   - [ ] 자동 진단 스크립트

2. **회귀 방지**
   - [ ] E2E 테스트 추가
   - [ ] CI/CD 파이프라인에 Visit 테스트 포함
   - [ ] 문서화

---

## 📝 체크리스트

### 배포 전 확인
- [ ] Visit API 호출 코드가 커밋됨
- [ ] Git에 푸시됨
- [ ] Vercel 빌드 성공
- [ ] 프로덕션 환경에 반영됨

### 배포 후 확인
- [ ] `/event/149403` 페이지 접속 테스트
- [ ] 브라우저 콘솔에서 Visit API 호출 확인
- [ ] 네트워크 탭에서 요청 확인
- [ ] DB에서 Visit 기록 확인
- [ ] 서버 로그 확인

### 정상 동작 확인
- [ ] Visit API 성공 로그 확인
- [ ] `event_access_logs` 테이블에 데이터 저장 확인
- [ ] 스크립트로 집계 확인
- [ ] 대시보드에서 통계 확인

---

## 🔗 관련 파일

### 코드 파일
- `app/webinarform/wert/WebinarFormWertPageContent.tsx` - 워트 페이지 컴포넌트
- `app/webinarform/wert/page.tsx` - 워트 페이지 서버 컴포넌트
- `app/api/public/campaigns/[campaignId]/visit/route.ts` - Visit API 엔드포인트
- `app/event/[...path]/page.tsx` - 이벤트 페이지 라우팅

### 데이터베이스
- `supabase/migrations/071_create_event_access_logs.sql` - Visit 테이블 생성
- `supabase/migrations/074_add_webinar_id_to_access_logs.sql` - 웨비나 ID 지원

### 스크립트
- `scripts/wert-today-visitors-by-hour.ts` - 오늘 Visit 확인
- `scripts/check-visit-api-status.ts` - Visit API 상태 확인

### 문서
- `docs/통계_시스템_Visit_점검_보고서.md` - 이전 점검 보고서
- `docs/통계_시스템_문제점_및_해결방안_요약.md` - 문제 요약

---

## 📞 다음 단계

1. **즉시**: 배포 상태 확인 및 실제 테스트
2. **오늘**: 서버 로그 확인 및 원인 파악
3. **내일**: 문제 해결 및 재테스트
4. **이번 주**: 전체 시스템 점검 및 모니터링 구축

---

**작성자**: AI Assistant  
**검토 필요**: 개발팀, 운영팀  
**우선순위**: 🔴 긴급
