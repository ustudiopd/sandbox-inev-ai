# 웨비나 등록 Visit 추적 안전장치

**작성일**: 2026-02-02  
**목적**: 웨비나 등록(원프레딕트 포함)과 Visit 추적의 완전한 분리 보장  
**상태**: 현재 구현 확인 완료, 안전장치 문서화

---

## 🚨 사용자 우려사항

> "과거에 설문/등록 페이지 UTM을 붙이다가, 웨비나 페이지가 등록이 안 되어서 꼬여서 Visit를 예외처리로 떼거나 해서 꼬인 것 같아. Visit를 다시 붙이면 원프레딕트(웨비나) 등록이 꼬일 수 있지 않아?"

---

## ✅ 현재 구현 상태 확인

### 1. 웨비나 등록 페이지에서 Visit 추적 사용 여부

**파일**: `app/event/[...path]/components/OnePredictRegistrationPage.tsx`

```typescript
// Visit 수집 (Phase 3) - 에러 발생해도 등록은 계속 진행
// 웨비나 ID도 Visit API를 지원하므로 호출
useEffect(() => {
  if (!campaign?.id) return
  
  // Visit 수집 (비동기, 실패해도 계속 진행)
  fetch(`/api/public/campaigns/${campaign.id}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  }).catch((error) => {
    // Visit 수집 실패는 무시 (graceful failure)
    console.warn('[OnePredictRegistrationPage] Visit 수집 실패 (무시):', error)
  })
}, [campaign?.id, ...])
```

**✅ 확인 사항**:
- Visit 추적은 `useEffect`에서 **fire-and-forget 방식**으로 호출
- `.catch()`로 graceful failure 처리
- **등록 submit과 완전히 분리**되어 있음

---

### 2. 웨비나 등록 API와 Visit 추적의 분리

**파일**: `app/api/webinars/[webinarId]/register/route.ts`

```typescript
export async function POST(req: Request, { params }: { params: Promise<{ webinarId: string }> }) {
  // ... 등록 로직만 처리
  // Visit 추적 호출 없음 ✅
  
  await admin.from('registrations').insert({ ... })
  
  return NextResponse.json({ success: true })
}
```

**파일**: `app/api/public/event-survey/[campaignId]/register/route.ts`

```typescript
export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  // ... 등록 로직 처리
  // Visit 추적 호출 없음 ✅
  
  // 웨비나 등록 시
  await admin.from('registrations').insert({ ... })
  
  return NextResponse.json({ success: true })
}
```

**✅ 확인 사항**:
- 웨비나 등록 API는 **Visit 추적을 호출하지 않음**
- 등록 성공/실패는 Visit 추적과 완전히 독립적

---

### 3. Visit API의 안전장치

**파일**: `app/api/public/campaigns/[campaignId]/visit/route.ts`

```typescript
// Visit 저장 실패해도 200 반환 (graceful failure)
if (insertError) {
  console.error('[VisitTrackFail]', JSON.stringify({ ... }))
  return NextResponse.json({ success: false, error: 'Failed to save visit' })
}

return NextResponse.json({ success: true })
```

**✅ 확인 사항**:
- Visit API는 실패해도 **200 반환** (에러 전파 안 함)
- 구조화 로그로만 기록

---

## 🛡️ 현재 안전장치

### 1. 클라이언트 측 분리

- ✅ Visit 호출은 `useEffect`에서 fire-and-forget 방식
- ✅ `.catch()`로 graceful failure 처리
- ✅ 등록 submit과 완전히 분리

### 2. 서버 측 분리

- ✅ 등록 API는 Visit를 호출하지 않음
- ✅ Visit API는 실패해도 200 반환 (에러 전파 안 함)

### 3. 회귀 방지 장치

- ✅ 강제 실패 모드 (`__debug_visit_fail=1`)로 테스트 가능
- ✅ 구조화 로그 (`[VisitTrackFail]`)로 모니터링 가능

---

## ⚠️ 잠재적 위험 요소

### 위험 1: Visit API 호출이 등록 페이지 렌더링을 막을 수 있음

**현재 상태**: ✅ 안전
- Visit 호출은 `useEffect`에서 비동기로 실행
- 등록 페이지 렌더링과 독립적

**추가 안전장치 제안**:
```typescript
// Visit 호출을 더 늦춰서 등록 페이지가 완전히 로드된 후 실행
useEffect(() => {
  if (!campaign?.id) return
  
  // 페이지 로드 완료 후 Visit 호출
  const timer = setTimeout(() => {
    fetch(`/api/public/campaigns/${campaign.id}/visit`, { ... })
      .catch((error) => {
        console.warn('[OnePredictRegistrationPage] Visit 수집 실패 (무시):', error)
      })
  }, 100) // 100ms 지연
  
  return () => clearTimeout(timer)
}, [campaign?.id, ...])
```

---

### 위험 2: Visit API가 너무 오래 걸리면 사용자 경험 저하

**현재 상태**: ✅ 안전
- Visit 호출은 fire-and-forget 방식
- 사용자가 기다릴 필요 없음

**추가 안전장치 제안**:
```typescript
// Visit 호출에 타임아웃 설정
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃

fetch(`/api/public/campaigns/${campaign.id}/visit`, {
  method: 'POST',
  signal: controller.signal,
  ...
})
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.warn('[OnePredictRegistrationPage] Visit 수집 타임아웃 (무시)')
    } else {
      console.warn('[OnePredictRegistrationPage] Visit 수집 실패 (무시):', error)
    }
  })
  .finally(() => {
    clearTimeout(timeoutId)
  })
```

---

### 위험 3: Visit API가 등록 페이지의 다른 기능과 충돌

**현재 상태**: ✅ 안전
- Visit 호출은 독립적인 `useEffect`에서 실행
- 다른 기능과 의존성 없음

**추가 안전장치 제안**:
```typescript
// Visit 호출을 조건부로 실행 (등록 페이지가 완전히 준비된 후)
const [isPageReady, setIsPageReady] = useState(false)

useEffect(() => {
  // 페이지 준비 완료 후 Visit 호출
  setIsPageReady(true)
}, [])

useEffect(() => {
  if (!campaign?.id || !isPageReady) return
  
  // Visit 호출
  fetch(`/api/public/campaigns/${campaign.id}/visit`, { ... })
    .catch((error) => {
      console.warn('[OnePredictRegistrationPage] Visit 수집 실패 (무시):', error)
    })
}, [campaign?.id, isPageReady, ...])
```

---

## 🎯 권장 사항

### 1. 현재 구현 유지 (권장)

현재 구현은 이미 안전장치가 충분히 갖춰져 있습니다:
- ✅ Visit 추적과 등록 완전 분리
- ✅ Graceful failure 처리
- ✅ 회귀 방지 장치 존재

**추가 작업 불필요** (현재 상태로 충분)

---

### 2. 모니터링 강화 (선택)

웨비나 등록 페이지에서 Visit 추적이 안전하게 작동하는지 모니터링:

```typescript
// Visit 호출 성공/실패 로깅 강화
fetch(`/api/public/campaigns/${campaign.id}/visit`, { ... })
  .then((response) => {
    if (!response.ok) {
      console.warn('[OnePredictRegistrationPage] Visit API 응답 오류:', response.status)
    }
  })
  .catch((error) => {
    console.warn('[OnePredictRegistrationPage] Visit 수집 실패 (무시):', error)
    // 추가: Sentry에 경고만 기록 (에러 아님)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage('Visit tracking failed (non-blocking)', 'warning')
    }
  })
```

---

### 3. 테스트 시나리오

웨비나 등록 페이지에서 Visit 추적이 안전하게 작동하는지 테스트:

1. **정상 케이스**: Visit API 정상 작동 → 등록 성공
2. **Visit 실패 케이스**: Visit API 실패 → 등록 성공 (Visit 실패 무시)
3. **Visit 타임아웃 케이스**: Visit API 타임아웃 → 등록 성공 (Visit 타임아웃 무시)
4. **강제 실패 모드**: `__debug_visit_fail=1` → 등록 성공 (Visit 실패 무시)

---

## 📋 체크리스트

### 현재 상태 확인

- [x] Visit 추적은 `useEffect`에서 fire-and-forget 방식으로 호출됨
- [x] Visit 실패 시 `.catch()`로 graceful failure 처리됨
- [x] 등록 API는 Visit를 호출하지 않음
- [x] Visit API는 실패해도 200 반환 (에러 전파 안 함)
- [x] 회귀 방지 장치 존재 (`__debug_visit_fail=1`)

### 추가 안전장치 (선택)

- [ ] Visit 호출 지연 추가 (페이지 로드 완료 후)
- [ ] Visit 호출 타임아웃 설정 (5초)
- [ ] Visit 호출 조건부 실행 (페이지 준비 완료 후)
- [ ] 모니터링 강화 (Sentry 경고 기록)

---

## 🎯 결론

### 현재 구현은 안전합니다

1. **완전한 분리**: Visit 추적과 웨비나 등록이 완전히 분리되어 있음
2. **Graceful failure**: Visit 실패해도 등록은 계속 진행됨
3. **회귀 방지**: 과거 문제가 재발하지 않도록 안전장치 존재

### 추가 작업 불필요

현재 구현으로 충분히 안전하며, 웨비나 등록이 Visit 추적에 의해 영향을 받지 않습니다.

### 모니터링 권장

운영 중에 Visit 추적이 안전하게 작동하는지 모니터링하는 것을 권장합니다.

---

**마지막 업데이트**: 2026-02-02  
**검토 상태**: 현재 구현 확인 완료, 안전장치 문서화 완료
