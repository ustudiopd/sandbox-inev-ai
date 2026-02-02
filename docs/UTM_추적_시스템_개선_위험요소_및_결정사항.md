# UTM 추적 시스템 개선 위험요소 및 결정사항

**작성일**: 2026-02-02  
**목적**: 구현 전 반드시 확인해야 할 위험 요소 및 결정 포인트  
**상태**: 검토 완료, 결정 필요

---

## 🚨 위험 요소 (구현 전 반드시 해결)

### ⚠️ 위험 1: 쿠키 기반 복원의 멀티테넌시 오염

**문제**: Cookie를 무조건 신뢰하면 다른 캠페인에 오염될 수 있음

**시나리오**:
```
1. 사용자 A가 캠페인1 링크 클릭 → cookie에 캠페인1 정보 저장
2. 며칠 뒤 사용자 A가 캠페인2를 "UTM 없이" 직접 등록
3. 복원 로직이 cookie를 주워서 캠페인1로 귀속 → 오귀속 발생
```

**해결 방안**:

#### 필수 검증 조건

1. **캠페인 매칭 검증**
   ```typescript
   // cookie의 cid가 현재 campaignId로 resolve 되는지 확인
   if (cookieCid) {
     const link = await findLinkByCid(cookieCid, currentCampaignId)
     if (!link || link.target_campaign_id !== currentCampaignId) {
       // 캠페인 불일치 → cookie 무시
       cookieCid = null
     }
   }
   ```

2. **시간 창(Window) 검증**
   ```typescript
   // cookie의 captured_at이 허용 시간창 내인지 확인
   const COOKIE_TRUST_WINDOW_HOURS = 24 // 환경변수로 설정
   const cookieAge = Date.now() - new Date(cookieData.captured_at).getTime()
   const maxAge = COOKIE_TRUST_WINDOW_HOURS * 60 * 60 * 1000
   
   if (cookieAge > maxAge) {
     // 시간 창 초과 → cookie 무시
     cookieCid = null
   }
   ```

3. **캠페인 범위 명시**
   ```typescript
   // cookie에 현재 캠페인 ID도 함께 저장하여 검증
   trackingData = {
     cid,
     utm_source,
     campaign_id: currentCampaignId, // 현재 캠페인 ID 포함
     captured_at: new Date().toISOString(),
   }
   
   // 복원 시 캠페인 ID 일치 확인
   if (cookieData.campaign_id !== currentCampaignId) {
     // 캠페인 불일치 → cookie 무시
     return null
   }
   ```

**체크리스트 추가**:
- [ ] Cookie 복원 시 캠페인 매칭 검증 구현
- [ ] Cookie 복원 시 시간 창 검증 구현
- [ ] 검증 실패 시 cookie 무시 및 `untracked_reason` 기록
- [ ] 환경변수로 시간 창 설정 가능하게 (`COOKIE_TRUST_WINDOW_HOURS`)

---

### ⚠️ 위험 2: Signed Cookie 서명/검증 전략 부재

**문제**: "Signed cookie"라고 명시했지만 실제 서명/검증 방법이 없음

**선택지**:

#### 옵션 1: 진짜 서명 (권장, 장기 안정)

**장점**:
- 위변조 방지
- 비즈니스 지표에 바로 사용 가능
- 보안성 높음

**구현**:
```typescript
import { SignJWT, jwtVerify } from 'jose'

// 저장 시 서명
const secret = new TextEncoder().encode(process.env.COOKIE_SECRET!)
const token = await new SignJWT(trackingData)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('30d')
  .sign(secret)

response.cookies.set('ef_tracking', token, { ... })

// 읽기 시 검증
try {
  const { payload } = await jwtVerify(token, secret)
  return payload as TrackingData
} catch {
  // 검증 실패 → 무시
  return null
}
```

**단점**:
- 구현 복잡도 증가
- JWT 라이브러리 필요

---

#### 옵션 2: 미신뢰 입력 + DB 검증 (간단, 단기)

**장점**:
- 구현 간단
- 빠른 적용 가능

**구현**:
```typescript
// cookie는 그냥 저장 (서명 없음)
response.cookies.set('ef_tracking', JSON.stringify(trackingData), { ... })

// 읽기 시 DB로 검증
const cookieData = JSON.parse(cookie)
if (cookieData.cid) {
  // DB에서 cid로 링크 조회하여 검증
  const link = await findLinkByCid(cookieData.cid, currentCampaignId)
  if (link && link.target_campaign_id === currentCampaignId) {
    // 검증 성공 → 사용
    return cookieData
  }
}
// 검증 실패 → 무시
return null
```

**단점**:
- 위변조 가능 (하지만 DB 검증으로 차단)
- 보안성 낮음

---

**결정 포인트**:

- **비즈니스 지표에 바로 사용** → 옵션 1 (서명)
- **테스트/내부용, 오귀속만 막으면 됨** → 옵션 2 (DB 검증)

**체크리스트 추가**:
- [ ] 서명 방식 결정 (서명 vs DB 검증)
- [ ] 서명 방식 선택 시 JWT 라이브러리 추가
- [ ] DB 검증 방식 선택 시 검증 로직 구현
- [ ] 검증 실패 시 처리 로직 구현

---

### ⚠️ 위험 3: Next.js 16 Middleware vs Proxy 마이그레이션 이슈

**문제**: Next.js 16에서 middleware가 deprecate될 수 있음

**현재 상황**:
- Next.js 버전 확인 필요
- Middleware → Proxy 마이그레이션 필요성 확인

**해결 방안**:

#### 옵션 1: Middleware로 먼저 구현 (빠른 안정화)

**장점**:
- 빠른 적용 가능
- 즉시 문제 해결

**주의사항**:
- 추적 로직을 별도 모듈로 분리하여 추후 마이그레이션 용이하게
- 파일/함수 경계 명확히

**구현**:
```typescript
// lib/tracking/middleware-tracking.ts (별도 모듈)
export function extractTrackingFromRequest(request: NextRequest) { ... }
export function saveTrackingToCookie(response: NextResponse, data: TrackingData) { ... }

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

---

#### 옵션 2: Proxy 구조로 처음부터 (장기 유지보수)

**장점**:
- 장기적으로 안정적
- 마이그레이션 불필요

**단점**:
- 구현 시간 증가
- 학습 곡선

---

**결정 포인트**:

- **빠른 안정화 최우선** → 옵션 1 (Middleware, 모듈 분리)
- **장기 유지보수 최우선** → 옵션 2 (Proxy)

**체크리스트 추가**:
- [ ] Next.js 버전 확인
- [ ] 구현 방식 결정 (Middleware vs Proxy)
- [ ] Middleware 선택 시 모듈 분리 구조 설계
- [ ] 추후 마이그레이션 계획 문서화

---

### ⚠️ 위험 4: Visit 추적 정의 재검토 필요

**문제**: Visit 로그가 정말 필요한지 정의부터 필요

**결정 포인트**:

#### Visit이 필요한 경우

- 전환율(CVR) 계산 필요
- 퍼널 분석 필요
- 방문→등록 연결 필요

**구현**:
- 클라이언트 JS 호출에만 의존하지 않음
- 등록 API에서 "visit 없음"이어도 추적 스냅샷 저장
- 조건부 로깅 (cid/utm이 있을 때만)

---

#### Visit이 불필요한 경우

- 단순 Source 집계만 필요
- 등록 데이터만으로 충분

**구현**:
- Visit 추적 제거 또는 선택적
- 등록 API에서만 추적 정보 저장

---

**체크리스트 추가**:
- [ ] Visit 추적 필요성 결정
- [ ] 필요 시 조건부 로깅 구현
- [ ] 불필요 시 Visit 추적 제거 또는 선택적 처리

---

### ⚠️ 위험 5: 추적 성공률 정의 불명확

**문제**: "95% 성공률"의 정의가 애매함

**명확한 정의 필요**:

#### 성공(Tracking OK) 정의

아래 중 **하나 이상**이 "유효"하면 성공:

1. `marketing_campaign_link_id` 저장 성공
2. `utm_source` 등 최소 1개 저장 성공
3. `tracking_snapshot`에 `cid` + "캠페인 매칭 검증" 성공

#### 실패(Untracked) 정의

위 조건이 **모두 실패**하면 실패

**체크리스트 추가**:
- [ ] 추적 성공/실패 정의 명확화
- [ ] Phase 1의 `tracking_metadata`에 정의 반영
- [ ] UI/운영 문서에 정의 명시

---

## 📋 추가 보강 항목

### 1. Phase 1 집계 보정에 "추적 품질 메타" 최소셋 명시

**필수 항목**:
```typescript
tracking_metadata: {
  tracked_count: number,        // 추적 성공
  untracked_count: number,      // 추적 실패
  tracking_success_rate: string, // 성공률 (%)
  untracked_reason_top?: {      // 실패 이유 상위 (선택)
    reason: string,             // 'url_missing' | 'cookie_mismatch' | 'link_not_found' 등
    count: number
  }[]
}
```

**체크리스트 추가**:
- [ ] `tracking_metadata` 구조 명세
- [ ] 필수 항목 vs 선택 항목 구분
- [ ] 실패 이유 분류 로직 구현

---

### 2. Cookie 복원 적용 조건(Guard) 명시

**체크리스트에 추가**:
- [ ] Cookie에서 추적 정보 읽기
- [ ] **Cookie의 cid가 현재 campaignId에 매칭되는지 확인** ⚠️ 필수
- [ ] **captured_at이 허용 window 내인지 확인** ⚠️ 필수
- [ ] 조건 실패 시 cookie 무시 + `untracked_reason` 기록
- [ ] 환경변수로 허용 window 설정 (`COOKIE_TRUST_WINDOW_HOURS`)

---

### 3. 리다이렉트 체인 테스트 시나리오 명시

**필수 시나리오**:

1. **Short-link → Event page → Register API**
   - `cid` 보존 확인
   - `utm_*` 보존 확인
   - Cookie가 있더라도 URL이 우선 확인

2. **UTM 없이 Event page 직접 접근 → Register**
   - Cookie가 "현재 캠페인과 매칭될 때만" 복원 확인
   - 매칭 실패 시 cookie 무시 확인

**체크리스트 추가**:
- [ ] 리다이렉트 체인 테스트 시나리오 작성
- [ ] 자동화 테스트 구현 (선택)
- [ ] 각 시나리오별 검증 포인트 명시

---

### 4. 데이터 변경(스냅샷 컬럼)의 영향/롤백 명시

**필수 문서화**:

- **변경 필요 사유**: 복원/감사 불가능 문제 해결
- **영향 범위**: `event_survey_entries` 쓰기/조회, 리포트 쿼리
- **롤백**: 컬럼 미사용 상태로 유지 가능(읽기 호환), UI/집계는 null-safe

**체크리스트 추가**:
- [ ] 마이그레이션 영향 범위 문서화
- [ ] 롤백 계획 문서화
- [ ] Null-safe 처리 확인

---

### 5. 개인정보/보안 최소수칙

**가이드**:

- **Referer**: 도메인/경로까지만 저장, query는 제거 (또는 allowlist)
- **User-Agent**: Full 저장이 부담이면 해시/요약도 옵션
- **보관기간**: 운영 문서에 정책 명시

**체크리스트 추가**:
- [ ] Referer 정제 로직 구현 (query 제거)
- [ ] User-Agent 저장 방식 결정 (full vs hash)
- [ ] 보관기간 정책 문서화

---

### 6. 모니터링 알람 조건 우선 명시

**알람 조건 (대시보드보다 먼저)**:

- `tracking_success_rate`가 N% 미만이면 알림
- `untracked_count`가 갑자기 급증하면 알림
- 특정 캠페인에서만 0%면 알림

**체크리스트 추가**:
- [ ] 알람 조건 정의
- [ ] 알람 임계값 설정 (환경변수)
- [ ] 알람 채널 결정 (이메일/Slack 등)

---

## 🎯 최종 결정 포인트 체크리스트

구현 전 반드시 결정해야 할 사항:

- [ ] **Cookie 복원 적용 조건**: 캠페인 매칭 + 시간 창 검증
- [ ] **Cookie 서명 방식**: 서명(JWT) vs 미신뢰+DB검증
- [ ] **Middleware/Proxy**: Middleware(모듈 분리) vs Proxy(처음부터)
- [ ] **Visit 추적 필요성**: 필요 vs 불필요
- [ ] **추적 성공률 정의**: 성공/실패 조건 명확화
- [ ] **Referer/UA 처리**: 정제 방식 및 보관기간 정책

---

## 📝 구현 가이드 (만족 조건)

### 우선순위 적용

- URL > Cookie > Link 순서 유지
- **Cookie는 검증 조건 충족 시에만 적용** ⚠️ 필수

### 집계 API

- "Direct"를 곧장 채널로 보지 말고 **Untracked 상태로 분리 표시**

### 추적 스냅샷

- "복원 가능성"을 위한 증거 보관
- Referer/UA는 최소화/정제 기준 적용

---

## 🚨 리스크 체크

- [ ] 멀티캠페인 오귀속 (쿠키 오염) → **검증 조건으로 방지**
- [ ] 위변조 (cookie tampering) → **서명 또는 DB 검증으로 방지**
- [ ] 성능 (visit 로깅으로 DB write 폭증) → **조건부 로깅으로 방지**
- [ ] 개인정보 (referer query 포함) → **정제 로직으로 방지**

---

## ✅ 완료 조건(DoD)

- [ ] 캠페인 summary에서 tracked/untracked가 분리되고 성공률이 노출됨
- [ ] Short-link/리다이렉트 체인에서도 최소 1개의 추적 근거(cid or link_id or utm)가 저장됨
- [ ] Cookie 복원은 "캠페인 매칭 실패 시 무시"가 동작함
- [ ] 테스트 시나리오(UTM 있음/없음, cookie 있음/없음)에서 귀속이 기대대로 나옴

---

**마지막 업데이트**: 2026-02-02  
**검토 상태**: 리뷰 반영 완료
