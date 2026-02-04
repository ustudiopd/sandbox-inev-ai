# Next.js App Router API 작성 헌법 v1

**EventLive 프로젝트 전용**  
**작성일**: 2026년 2월 4일  
**적용 범위**: 모든 Route Handler (`app/api/**/route.ts`)

---

## 🚨 헌법 제1조: Route Handler params 시그니처

### ❌ 절대 금지

```typescript
// ❌ 금지: Promise params
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // ❌ 금지
}
```

### ✅ 필수 사용

```typescript
// ✅ 필수: 일반 객체 params
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params  // ✅ 필수
}
```

---

## 📋 이유

### 왜 금지인가?

1. **Vercel Serverless 환경 호환성**
   - `params: Promise<>`는 Vercel 프로덕션에서 라우트 핸들러 실행을 막을 수 있음
   - 빌드는 성공하지만 런타임에서 라우트가 매칭되지 않음
   - 증상: `X-Matched-Path: /500` 패턴

2. **Next.js 16 App Router 동작**
   - 로컬 개발 환경에서는 작동할 수 있음
   - 프로덕션 빌드에서는 작동할 수 있음
   - **하지만 Vercel Serverless 런타임에서는 실패**

3. **일관성 보장**
   - 모든 Route Handler가 동일한 패턴 사용
   - 예측 가능한 동작 보장

---

## ✅ 올바른 Route Handler 작성 패턴

### 기본 템플릿

```typescript
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/example/[id]
 * 예시: GET 핸들러
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  // 구현
  return NextResponse.json({ id })
}

/**
 * POST /api/example/[id]
 * 예시: POST 핸들러
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const body = await req.json()
  
  // 구현
  return NextResponse.json({ success: true, id })
}
```

### 동적 라우트 파라미터가 여러 개인 경우

```typescript
export async function GET(
  req: Request,
  { params }: { params: { clientId: string; campaignId: string } }
) {
  const { clientId, campaignId } = params
  
  // 구현
}
```

### 파라미터가 없는 경우

```typescript
export async function POST(req: Request) {
  const body = await req.json()
  
  // 구현
}
```

---

## 🔍 코드 리뷰 체크리스트

### Route Handler 작성 시 확인 사항

- [ ] `params`가 `Promise<>`가 아닌 일반 객체로 선언되어 있는가?
- [ ] `await params`를 사용하지 않고 `params`를 직접 사용하는가?
- [ ] `export const runtime = 'nodejs'`가 설정되어 있는가? (필요시)
- [ ] `export const dynamic = 'force-dynamic'`이 설정되어 있는가? (필요시)

---

## 🛠️ 기존 코드 마이그레이션 가이드

### 변경 전

```typescript
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

### 변경 후

```typescript
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

**변경 사항**:
1. `Promise<{ id: string }>` → `{ id: string }`
2. `await params` → `params`
3. 나머지 로직은 동일

---

## 📚 참고 자료

### Next.js 공식 문서
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Dynamic Route Segments](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

### EventLive 프로젝트 사례
- `docs/테스트_발송_405_에러_명세서.md` - 실제 문제 사례
- `docs/curl_테스트_결과_분석.md` - 진단 과정

---

## ⚠️ 예외 사항

### 현재 프로젝트에서 확인된 사례

다음 라우트들이 `params: Promise<>`를 사용 중이지만, **향후 문제가 발생할 수 있으므로 수정 권장**:

- `app/api/client/emails/[id]/send/route.ts`
- `app/api/client/emails/[id]/approve/route.ts`
- `app/api/client/emails/[id]/cancel/route.ts`
- `app/api/client/emails/[id]/cancel-approval/route.ts`
- `app/api/client/emails/[id]/reset-stuck/route.ts`
- `app/api/client/emails/[id]/audience-list/route.ts`
- `app/api/client/emails/[id]/audience-preview/route.ts`
- `app/api/client/emails/[id]/route.ts`

**권장 조치**: 모든 라우트를 일괄 수정

---

## 🎯 적용 우선순위

### 즉시 수정 (P0)
1. ✅ `test-send/route.ts` - 현재 405 에러 발생 중

### 수정 권장 (P1)
2. `send/route.ts` - 실제 발송 기능 (중요)
3. `approve/route.ts` - 승인 기능 (중요)
4. `cancel/route.ts` - 취소 기능

### 수정 권장 (P2)
5. 나머지 모든 라우트

---

**작성자**: AI Assistant  
**검토 필요**: 프로젝트 리더  
**최종 승인일**: 미정
