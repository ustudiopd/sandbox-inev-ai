# UTM 추적 시스템 문제점 및 개선사항 종합보고서

**작성일**: 2026-02-02  
**상태**: 원인 규명 완료, 구조적 개선 필요  
**우선순위**: 🔴 긴급

---

## 📌 실행 요약

### 현재 상황

- **추적 성공률**: 0.2% (1/529)
- **Direct 오분류**: 99.8% (528/529)
- **Visit 로그**: 거의 없음 (오늘 0개)
- **링크 사용 확인**: "광고메일" 링크 사용 추정 (오늘 오전 10시 40개 폭증)

### 사건 재구성 (2026-02-02)

**시간대별 등록 패턴**:
- 오전 9시: 약 92개 등록
- 오전 9시 이후: 160개로 폭증 (약 68개 추가)
- **폭증 시간대**: 오전 10시대 집중

**링크 생성 시점**:
- 링크 생성: 2026-01-29 ~ 2026-01-30 (16개 활성 링크)
- "광고메일" 링크 포함 추정

**추정 근거**:
1. 시간 집중: 오전 10시대 급격한 증가 (이메일 발송 타이밍과 일치)
2. 링크 생성 시점 일치: 링크 생성 이후 등록 폭증
3. 추적 실패 패턴: 링크는 사용되었지만 추적 정보 미저장

**결론**: 이메일 캠페인(stibee 광고메일 링크) 발송 후 유입이 발생했으나, 리다이렉트/세션 부재로 추적 정보가 저장되지 않음

### 핵심 문제

> **링크를 통해 유입되었지만 추적 정보가 저장되지 않는 구조적 결함**

---

## 🔴 1. 발견된 문제점

### 1.1 링크 추적 실패 (가장 심각)

**증거**:
- 링크 생성: 2026-01-29 ~ 2026-01-30 (16개)
- 링크 생성 이후 등록: 122개
- 링크 ID 저장 성공: 1개 (0.8%)
- UTM 저장 성공: 1개 (0.8%)

**원인**:
- 리다이렉트 과정에서 `cid`, `utm_*` 파라미터 유실
- 서버 세션 부재로 정보 보존 실패
- URL 파라미터에만 의존하는 구조적 한계

**영향**:
- 마케팅 성과 측정 불가
- ROI 분석 불가능
- 채널별 최적화 불가능

---

### 1.2 Visit 추적 미작동

**증거**:
- 오늘 오전 9시 이후 등록: 74개
- 오늘 오전 9시 이후 Visit 로그: 0개
- Visit 추적률: 0%

**원인**:
- Visit API 호출 실패 또는 미호출
- 클라이언트 사이드 Visit 추적 실패
- 서버 사이드 Visit 추적 부재

**영향**:
- 전환율(CVR) 계산 불가
- 유입부터 전환까지 추적 불가
- 서버 로그 기반 분석 불가

---

### 1.3 UTM 파라미터 저장 실패

**증거**:
- 전체 등록: 529개
- UTM 있는 등록: 1개 (0.2%)
- Direct로 분류: 528개 (99.8%)

**원인**:
- 등록 API에서 링크의 UTM 파라미터 미사용 (수정 완료)
- 리다이렉트 과정에서 파라미터 유실
- 서버 세션 부재

**영향**:
- Source/Medium별 집계 불가
- 마케팅 채널 성과 분석 불가

---

### 1.4 추적 정보 복원 불가

**증거**:
- `utm_referrer` 저장: 0개
- Visit 로그: 거의 없음
- 서버 로그 기반 추정: 불가능

**원인**:
- 원본 추적 정보 미저장
- 추적 스냅샷 부재
- 감사/디버깅 데이터 없음

**영향**:
- 문제 발생 시 원인 파악 불가
- 데이터 복원 불가능
- 향후 개선 방향 결정 어려움

---

## ✅ 2. 보완해야 할 점 (우선순위별)

### 🔴 긴급 (즉시 조치)

#### 2.1 등록 API 개선 (완료 ✅)

**작업 내용**:
- 링크의 UTM 파라미터 사용하도록 수정
- 우선순위: URL > 링크 메타데이터

**상태**: 완료

---

#### 2.2 집계 API 보정 (1-2일)

**목적**: 현재 데이터를 올바르게 표시

**작업 내용**:
- "Direct (no tracking)" 라벨 추가
- 추적 성공률 메타데이터 추가
- UI에 추적 상태 표시

**파일**:
- `app/api/clients/[clientId]/campaigns/summary/route.ts`
- `app/(client)/client/[clientId]/campaigns/components/CampaignsPageClient.tsx`

**예상 효과**:
- 사용자에게 명확한 설명 제공
- 데이터 신뢰도 향상

---

### 🟡 중요 (1주 내)

#### 2.3 서버 세션 관리 (Middleware)

**목적**: 리다이렉트 체인에서 추적 정보 보존

**⚠️ 결정 필요**:
- Next.js 버전 확인 및 Middleware vs Proxy 선택
- Cookie 서명 방식 결정 (JWT 서명 vs 미신뢰+DB 검증)

**작업 내용**:
- Next.js Middleware에서 추적 정보 저장 (또는 Proxy 구조)
- Cookie에 `cid`, `utm_*`, `campaign_id` 저장 (30일 유효)
- 추적 로직을 별도 모듈로 분리 (추후 마이그레이션 용이)
- 리다이렉트 후에도 자동 복원

**파일**:
- `middleware.ts` (신규 생성) 또는 Proxy 구조
- `lib/tracking/middleware-tracking.ts` (별도 모듈)

**구현 예시**:
```typescript
// lib/tracking/middleware-tracking.ts (별도 모듈)
export function extractTrackingFromRequest(request: NextRequest) {
  const url = new URL(request.url)
  const cid = url.searchParams.get('cid')
  const utmSource = url.searchParams.get('utm_source')
  
  if (cid || utmSource) {
    return {
      cid,
      utm_source: utmSource,
      campaign_id: extractCampaignId(request), // 현재 캠페인 ID
      captured_at: new Date().toISOString(),
    }
  }
  return null
}

export function saveTrackingToCookie(response: NextResponse, data: TrackingData) {
  // 옵션 1: JWT 서명
  const token = await signJWT(data)
  response.cookies.set('ef_tracking', token, { ... })
  
  // 옵션 2: 미신뢰 + DB 검증
  response.cookies.set('ef_tracking', JSON.stringify(data), { ... })
}

// middleware.ts
import { extractTrackingFromRequest, saveTrackingToCookie } from '@/lib/tracking/middleware-tracking'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const trackingData = extractTrackingFromRequest(request)
  
  if (trackingData) {
    saveTrackingToCookie(response, trackingData)
  }
  
  return response
}
```

**⚠️ 위험 요소**:
- Next.js 16에서 middleware deprecate 가능성
- Cookie 위변조 가능성 (서명 필요)

**예상 효과**:
- 추적 성공률: 0.2% → 80%+ (예상)

---

#### 2.4 등록 API 다중 소스 복원

**목적**: 하나의 소스가 실패해도 다른 소스에서 복원

**⚠️ 위험 요소**: Cookie 복원 시 멀티테넌시 오염 가능 → 검증 조건 필수

**작업 내용**:
- 우선순위: URL > Cookie > Link 순서로 복원
- **Cookie 복원 시 검증 조건 적용** (필수)
  - 캠페인 매칭 검증
  - 시간 창 검증
- 모든 소스에서 추적 정보 수집 시도

**파일**:
- `app/api/public/event-survey/[campaignId]/register/route.ts`

**구현 예시**:
```typescript
// 1순위: URL 쿼리 파라미터
let cid = url.searchParams.get('cid') || body.cid || null
let utmSource = url.searchParams.get('utm_source') || body.utm_source || null

// ⚠️ UTM과 cid 충돌 규칙
if (utmSource && cid) {
  const link = await findLinkByCid(cid, currentCampaignId)
  if (link) {
    if (link.target_campaign_id === currentCampaignId) {
      // 정상: UTM 우선, cid는 link_id 저장용으로만 사용
      marketing_campaign_link_id = link.id
    } else {
      // 충돌: cid가 다른 캠페인을 가리킴
      // → UTM은 사용하되, link_id는 저장하지 않음
      untracked_reason = 'cid_campaign_mismatch'
      cid = null // cid 무시, UTM만 사용
    }
  }
}

// 2순위: 서버 세션/cookie (검증 필수)
if (!cid && !utmSource) {
  const cookie = req.headers.get('cookie')
  const trackingCookie = parseCookie(cookie)
  
  if (trackingCookie.ef_tracking) {
    const cookieData = parseTrackingCookie(trackingCookie.ef_tracking)
    
    // ⚠️ 필수 검증 1: 캠페인 매칭
    if (cookieData.campaign_id !== currentCampaignId) {
      // 캠페인 불일치 → cookie 무시
      cookieData = null
    }
    
    // ⚠️ 필수 검증 2: Trust Window (귀속 허용창)
    // TTL(보관기간)과 구분: TTL은 30일, Trust Window는 24시간
    const COOKIE_TRUST_WINDOW_HOURS = parseInt(process.env.COOKIE_TRUST_WINDOW_HOURS || '24')
    const cookieAge = Date.now() - new Date(cookieData.captured_at).getTime()
    const maxAge = COOKIE_TRUST_WINDOW_HOURS * 60 * 60 * 1000
    
    if (cookieAge > maxAge) {
      // 시간 창 초과 → cookie 무시
      cookieData = null
    }
    
    // ⚠️ 필수 검증 3: cid로 링크 조회하여 캠페인 재확인
    if (cookieData && cookieData.cid) {
      const link = await findLinkByCid(cookieData.cid, currentCampaignId)
      if (!link || link.target_campaign_id !== currentCampaignId) {
        // 링크가 현재 캠페인과 불일치 → cookie 무시
        cookieData = null
      } else {
        cid = cookieData.cid
        utmSource = cookieData.utm_source || utmSource
      }
    }
  }
}

// 3순위: 링크 메타데이터
if (cid && !linkId && !utmSource) {
  const link = await findLinkByCid(cid, currentCampaignId)
  if (link) {
    linkId = link.id
    // 링크의 UTM도 사용
    utmSource = link.utm_source || utmSource
  }
}
```

**⚠️ 위험 요소**:
- 멀티테넌시 오염 (다른 캠페인으로 오귀속)
- Cookie 위변조

**예상 효과**:
- 추적 성공률: 80% → 95%+ (예상)

---

#### 2.5 Short-link 리다이렉트 개선

**목적**: 리다이렉트 시 쿼리 파라미터 유지

**작업 내용**:
- Short-link에서 타겟 URL로 리다이렉트 시 UTM 파라미터 포함
- 기존 URL의 쿼리 파라미터도 유지

**파일**:
- `app/s/[code]/page.tsx` (웨비나용)
- 캠페인 링크 리다이렉트 로직 (확인 필요)

**구현 예시**:
```typescript
// Short-link의 UTM 파라미터를 타겟 URL에 추가
const targetUrl = new URL(shortLink.target_url)

if (shortLink.utm_source) {
  targetUrl.searchParams.set('utm_source', shortLink.utm_source)
}
// ... 기타 UTM 파라미터

// 기존 URL의 쿼리 파라미터도 유지
url.searchParams.forEach((value, key) => {
  if (key.startsWith('utm_') || key === 'cid') {
    targetUrl.searchParams.set(key, value)
  }
})

return NextResponse.redirect(targetUrl.toString())
```

**예상 효과**:
- 리다이렉트 후에도 UTM 파라미터 유지
- 추적 성공률 향상

---

### 🟢 중기 (2주 내)

#### 2.6 추적 스냅샷 저장

**목적**: 향후 감사/복원/디버깅용 원본 보존

**⚠️ 개인정보/보안 고려사항**:
- Referer query 제거 (도메인/경로만)
- User-Agent 저장 방식 결정 (full vs hash)
- 보관기간 정책 수립

**작업 내용**:
- `event_survey_entries` 테이블에 `tracking_snapshot` JSON 필드 추가
- 모든 추적 정보 원본 저장 (정제 후)

**마이그레이션**:
```sql
ALTER TABLE public.event_survey_entries
  ADD COLUMN IF NOT EXISTS tracking_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_entries_tracking_snapshot_cid
  ON public.event_survey_entries((tracking_snapshot->>'cid'))
  WHERE tracking_snapshot IS NOT NULL;

-- 영향 범위: event_survey_entries 쓰기/조회, 리포트 쿼리
-- 롤백: 컬럼 미사용 상태로 유지 가능(읽기 호환), UI/집계는 null-safe
```

**저장 정보** (정제 후):
```typescript
tracking_snapshot: {
  cid: string | null,
  utm_source: string | null,
  utm_medium: string | null,
  utm_campaign: string | null,
  referer_domain: string | null, // query 제거된 도메인만
  user_agent_hash?: string | null, // 해시 또는 요약 (선택)
  first_visit_at: string | null,
  link_id: string | null,
  captured_at: string,
  source: 'url' | 'cookie' | 'link_meta' | 'none',
  untracked_reason?: string // 실패 이유 (선택)
}
```

**예상 효과**:
- 문제 발생 시 원인 파악 가능
- 데이터 복원 가능
- 향후 분석/개선 용이

---

#### 2.7 Visit 추적 강화

**⚠️ 결정 필요**: Visit 추적이 정말 필요한지 정의부터 필요

**⚠️ 중요**: Visit 추적은 Phase 2 성공조건에서 제외
- UTM 집계 정상화의 핵심은 **등록 시점에 tracking 저장**
- Visit 추적은 퍼널/CVR 목적일 때만 투자 가치 있음

**선택지**:
- **필요**: 전환율(CVR), 퍼널 분석, 방문→등록 연결
- **불필요**: 단순 Source 집계만 필요

**작업 내용** (필요 시):
- 등록 페이지 Visit 추적 확인 및 수정
- 조건부 로깅 구현 (cid/utm이 있을 때만)
- 서버 사이드 Visit 추적 추가 (선택)
- Visit API 호출 실패 원인 파악 및 수정
- 등록 API에서 "visit 없음"이어도 추적 스냅샷 저장

**확인 사항**:
- Visit API가 실제로 호출되는지 확인
- 호출 실패 원인 파악
- 네트워크 오류, CORS, 인증 문제 등

**⚠️ 위험 요소**:
- 클라이언트 JS 호출에만 의존하면 다시 깨질 가능성
- DB write 폭증 가능성

**예상 효과** (필요 시):
- 전환율(CVR) 계산 가능
- 유입부터 전환까지 전체 추적
- 서버 로그 기반 분석 가능

---

#### 2.8 모니터링 대시보드

**목적**: 추적 성공률 실시간 모니터링

**⚠️ 중요**: 알람 조건을 대시보드보다 먼저 정의

**작업 내용**:
- 알람 조건 정의 (우선)
  - `tracking_success_rate`가 N% 미만이면 알림
  - `untracked_count`가 갑자기 급증하면 알림
  - 특정 캠페인에서만 0%면 알림
  - 알람 임계값 설정 (환경변수)
  - 알람 채널 결정 (이메일/Slack 등)
- 추적 성공률 대시보드 추가
- 알림 시스템 구현
- 일일 리포트 자동 생성

**예상 효과**:
- 문제 조기 발견
- 지속적인 품질 관리

---

## 📋 3. 개선 로드맵

### Phase 1: 즉시 조치 (1-2일)

- [x] 등록 API 개선 (링크 UTM 사용)
- [ ] 집계 API 보정 ("Direct (no tracking)" 라벨)
- [ ] UI에 추적 상태 표시

**목표**: 현재 데이터를 올바르게 표시

---

### Phase 2: 구조적 개선 (1주)

- [ ] 서버 세션 관리 (Middleware)
- [ ] 등록 API 다중 소스 복원
- [ ] Short-link 리다이렉트 개선
- [ ] Visit 추적 문제 해결

**목표**: 추적 성공률 95%+

---

### Phase 3: 장기 개선 (2주)

- [ ] 추적 스냅샷 저장
- [ ] 모니터링 대시보드
- [ ] 자동 알림 시스템
- [ ] 성능 최적화

**목표**: 안정적이고 신뢰할 수 있는 추적 시스템

---

## 🎯 4. 예상 효과

### Before (현재)

| 지표 | 값 |
|------|-----|
| 추적 성공률 | 0.2% |
| Direct 오분류 | 99.8% |
| Visit 로그 | 거의 없음 |
| 데이터 복원 가능 | 불가능 |

### After (개선 후)

| 지표 | 목표 |
|------|------|
| 추적 성공률 | 95%+ |
| Direct 오분류 | 5% 미만 |
| Visit 로그 | 모든 접근 기록 |
| 데이터 복원 가능 | 가능 (스냅샷) |

---

## 📊 5. 우선순위 매트릭스

| 작업 | 긴급도 | 중요도 | 예상 소요 | 효과 |
|------|--------|--------|----------|------|
| 집계 API 보정 | 🔴 높음 | 🟡 중간 | 1-2일 | 즉시 개선 |
| 서버 세션 관리 | 🔴 높음 | 🔴 높음 | 2-3일 | 핵심 개선 |
| 다중 소스 복원 | 🔴 높음 | 🔴 높음 | 1-2일 | 핵심 개선 |
| Short-link 개선 | 🟡 중간 | 🔴 높음 | 1일 | 중요 개선 |
| 추적 스냅샷 | 🟢 낮음 | 🟡 중간 | 2-3일 | 장기 개선 |
| Visit 추적 강화 | 🟡 중간 | 🟡 중간 | 2-3일 | 중요 개선 |
| 모니터링 | 🟢 낮음 | 🟡 중간 | 2-3일 | 장기 개선 |

---

## 🔧 6. 기술적 상세

### 6.1 현재 구조의 문제점

#### 문제 1: 단일 소스 의존

```
현재: URL 파라미터만 사용
문제: 리다이렉트 시 유실

개선: URL > Cookie > Link 순서로 복원
```

#### 문제 2: 서버 세션 부재

```
현재: 클라이언트 localStorage만 사용
문제: 서버 리다이렉트 시 정보 손실

개선: 서버 세션/cookie에 저장
```

#### 문제 3: 추적 정보 미보존

```
현재: 정규화된 값만 저장
문제: 원본 정보 손실, 복원 불가

개선: 추적 스냅샷 JSON 저장
```

---

### 6.2 개선 후 구조

```
1. 사용자 링크 클릭
   ↓
2. Middleware에서 추적 정보 cookie 저장
   ↓
3. 리다이렉트 (쿼리 파라미터 + cookie 유지)
   ↓
4. 등록 페이지 접속
   ↓
5. Visit API 호출 (cookie에서 복원)
   ↓
6. 등록 API 호출
   ↓
7. 다중 소스에서 추적 정보 복원
   - URL 쿼리 파라미터
   - Cookie
   - 링크 메타데이터
   ↓
8. 추적 스냅샷 저장 (원본 보존)
   ↓
9. 정규화된 UTM 저장
```

---

## 📝 7. 체크리스트

### 즉시 조치 (1-2일)

- [ ] 집계 API에 추적 상태 메타데이터 추가
- [ ] UI에 "Direct (no tracking)" 라벨 표시
- [ ] 추적 성공률 표시 추가
- [ ] 사용자에게 명확한 설명 제공

### 구조적 개선 (1주)

- [ ] `middleware.ts` 생성 및 서버 세션 관리 구현
- [ ] 등록 API에서 다중 소스 복원 로직 구현
- [ ] Short-link 리다이렉트에서 쿼리 파라미터 유지
- [ ] Visit 추적 문제 원인 파악 및 수정
- [ ] 테스트 및 검증

### 장기 개선 (2주)

- [ ] `tracking_snapshot` 컬럼 추가 및 마이그레이션
- [ ] 등록 API에서 추적 스냅샷 저장
- [ ] 모니터링 대시보드 구현
- [ ] 알림 시스템 구현
- [ ] 문서화 및 가이드 작성

---

## 🎯 8. 성공 기준

### 추적 성공률 정의 (단계별 명확화)

#### Phase 1~2 성공 정의 (현 시점 가능한 증거만)

**성공(Tracking OK)**:
아래 중 **하나 이상**이 "유효"하면 성공:
1. `marketing_campaign_link_id` 저장 성공
2. `utm_source` 저장 성공
3. (Cookie/cid resolve로) 캠페인 매칭 성공

**실패(Untracked)**:
위 조건이 **모두 실패**하면 실패

**⚠️ 주의**: `tracking_snapshot`은 Phase 3에서 추가되므로, Phase 1~2 성공 정의에는 포함하지 않음

#### Phase 3 이후 성공 정의 확장

**성공(Tracking OK)**:
아래 중 **하나 이상**이 "유효"하면 성공:
1. `marketing_campaign_link_id` 저장 성공
2. `utm_source` 저장 성공
3. (Cookie/cid resolve로) 캠페인 매칭 성공
4. **`tracking_snapshot.cid` + 캠페인 매칭 검증 성공** (Phase 3 추가)

### 단기 목표 (1주)

- ✅ 추적 성공률: 80%+ (위 정의 기준)
- ✅ Visit 로그: 모든 접근 기록 (필요 시)
- ✅ 집계 정확도: 95%+
- ✅ Cookie 복원 검증 작동 확인

### 중기 목표 (1개월)

- ✅ 추적 성공률: 95%+ (위 정의 기준)
- ✅ Direct 오분류: 5% 미만
- ✅ 데이터 복원 가능: 100%
- ✅ 멀티테넌시 오염 방지 확인

### 장기 목표 (3개월)

- ✅ 추적 성공률: 98%+ (위 정의 기준)
- ✅ 자동 모니터링 및 알림
- ✅ 완전한 추적 스냅샷 시스템

---

## 🚨 9. 위험 요소 및 결정사항

**⚠️ 구현 전 반드시 확인**: [UTM 추적 시스템 개선 위험요소 및 결정사항](./UTM_추적_시스템_개선_위험요소_및_결정사항.md)

### 주요 위험 요소

1. **쿠키 기반 복원의 멀티테넌시 오염** → 검증 조건 필수
2. **Signed Cookie 서명/검증 전략 부재** → 서명 방식 결정 필요
3. **Next.js 16 Middleware vs Proxy 이슈** → 구현 방식 결정 필요
4. **Visit 추적 정의 재검토** → 필요성 결정 필요
5. **추적 성공률 정의 불명확** → 명확한 정의 필요

---

## 📚 10. 관련 문서

### 필수 확인 문서 (구현 전)
1. [UTM 추적 시스템 개선 위험요소 및 결정사항](./UTM_추적_시스템_개선_위험요소_및_결정사항.md) - ⚠️ **구현 전 필수 확인**
2. [체크리스트 추가 항목 패치 2탄](./체크리스트_추가_항목_패치_2탄.md) - ⚠️ **추가 결정 포인트**

### 참고 문서
3. [UTM 추적 문제 원인 규명 및 해결방안](./UTM_추적_문제_원인_규명_및_해결방안.md)
4. [링크 추적 구조 개선 방안](./링크_추적_구조_개선_방안.md)
5. [집계 API 보정 로직 명세](./집계_API_보정_로직_명세.md)
6. [서버 로그 기반 추정 분석 결과](./서버_로그_기반_추정_분석_결과.md)
7. [UTM 파라미터 복원 스크립트 명세서](./UTM_파라미터_복원_스크립트_명세서.md)
8. [체크리스트 추가 항목 패치](./체크리스트_추가_항목_패치.md)

---

## 💡 11. 핵심 메시지

> **이건 데이터 복원 문제가 아니라 "링크 추적이 중간에서 끊긴 사건"이다.**
> 
> 지금 데이터는 **분리해서 설명하고**,
> 구조를 고치지 않으면 **다음 캠페인도 100% 다시 터진다.**

---

## 🚀 다음 단계

1. ✅ **원인 규명 완료**: 팩트 확인 및 분석 완료
2. ✅ **사건 재구성 완료**: 10시 폭증 + stibee 광고메일 링크 추정
3. ✅ **위험 요소 검토 완료**: 위험 요소 보강 완료
4. ✅ **추가 결정 포인트 확정 완료**: [최종 결정안](./UTM_추적_개선_최종_결정안.md) 확정
5. ⏳ **구현 시작**: 크리티컬 패스 순서대로 진행
   - Phase 2.3: Short-link 리다이렉트 개선 (최우선)
   - Phase 2.1: Middleware로 cookie 저장
   - Phase 2.2: Register에서 다중 소스 복원
   - Phase 1.1: 집계 UI 보정

---

## ⚠️ 구현 전 필수 확인사항

다음 항목을 반드시 결정/확인한 후 구현 시작:

### 기본 결정 포인트
1. [ ] Cookie 복원 적용 조건 (캠페인 매칭 + 시간 창 검증)
2. [ ] Cookie 서명 방식 (서명 vs DB 검증)
3. [ ] Middleware/Proxy 선택 (Next.js 버전 확인)
4. [ ] Visit 추적 필요성 결정
5. [ ] 추적 성공률 정의 명확화 (Phase 1~2 vs Phase 3)
6. [ ] Referer/UA 처리 정책

### 추가 결정 포인트 (패치 2탄)
7. [ ] **성공 정의의 단계별 정합성**: Phase 1~2는 tracking_snapshot 제외
8. [ ] **Cookie TTL vs Trust Window 구분**: TTL(30일) vs Trust Window(24시간)
9. [ ] **UTM과 cid 충돌 규칙**: UTM 우선, cid는 보조 식별자로만
10. [ ] **Visit 추적을 Phase 2 성공조건에서 제외**: 등록 시점 tracking만으로 충분

---

## 🎯 최종 DoD 판정 기준

다음 4가지 시나리오로 "집계 정상" 판정:

### 시나리오 1: UTM 링크로 들어와 등록
- **기대**: `utm_source`가 저장되고 Source 집계에 잡힘
- **판정**: ✅ 성공

### 시나리오 2: cid 짧은 링크로 들어와 등록 (UTM 없음)
- **기대**: `marketing_campaign_link_id` 또는 최소한 추적 근거가 저장 (Direct로만 떨어지지 않음)
- **판정**: ✅ 성공

### 시나리오 3: /s/[code] 경유 후 등록
- **기대**: query 보존 + cookie/session 보존으로 추적 저장 성공
- **판정**: ✅ 성공

### 시나리오 4: 아무 파라미터 없는 진짜 Direct
- **기대**: "Direct (no tracking)"로 분리 표기되고 tracking_success_rate 계산에 반영
- **판정**: ✅ 성공 (정상 동작)

---

**작성자**: Cursor Agent  
**검토 상태**: 리뷰 반영 완료  
**검토 필요**: 개발팀 리뷰 및 승인
