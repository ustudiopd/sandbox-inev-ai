# EventLive vs USLab 이메일 발송 라우터 비교 분석

**작성일**: 2026년 2월 4일  
**목적**: EventLive 프로젝트의 405 에러 원인 분석 및 USLab 구현과의 차이점 파악

---

## 📋 문제 상황 요약

### EventLive 프로젝트
- **증상**: 배포 환경에서 테스트 발송 시 405 (Method Not Allowed) 에러 발생
- **라우트**: `/api/client/emails/[id]/test-send`
- **에러 패턴**:
  - GET 요청: 500 에러 (X-Matched-Path: `/500`)
  - OPTIONS 요청: 204 (하지만 X-Matched-Path: `/500`)
  - POST 요청: 405 에러 (X-Matched-Path: `/500`)
- **핵심 문제**: 라우트 매칭 실패 (라우트 핸들러가 실행되지 않음)

### USLab 프로젝트
- **상태**: 정상 작동 ✅
- **라우트**: `/api/admin/newsletters/[id]/test-send`
- **에러**: 없음

---

## 🔍 구현 차이점 분석

### 1. 라우트 핸들러 구조

#### EventLive (문제 발생)
```typescript
// app/api/client/emails/[id]/test-send/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 구현 내용
}
```

**문제점**:
- `export const runtime = 'nodejs'` 명시적 선언 (불필요할 수 있음)
- `export const dynamic = 'force-dynamic'` 명시적 선언
- GET 핸들러가 없어서 GET 요청 시 500 에러 발생 가능

#### USLab (정상 작동)
```typescript
// app/api/admin/newsletters/[id]/test-send/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const { id } = await params;  // ✅ await로 파라미터 추출
    const body = await request.json();
    // ... 구현 내용
  } catch (error) {
    // 에러 처리
  }
}
```

**차이점**:
- ✅ `runtime`, `dynamic` 명시 없음 (Next.js 기본값 사용)
- ✅ `await params`로 파라미터 추출 (Next.js 15+ 권장 방식)
- ✅ `NextRequest` 사용 (타입 안정성)
- ✅ 명확한 에러 처리

---

### 2. 파라미터 처리 방식

#### EventLive
```typescript
{ params }: { params: Promise<{ id: string }> }
// params를 직접 사용 (await 없음)
```

**문제 가능성**: Next.js 15에서 `params`가 Promise로 변경되었는데, await 없이 사용하면 문제 발생 가능

#### USLab
```typescript
{ params }: { params: Promise<{ id: string }> }
const { id } = await params;  // ✅ 명시적으로 await
```

**장점**: Next.js 15+ 표준 방식 준수

---

### 3. 요청 타입 처리

#### EventLive
```typescript
export async function POST(
  req: Request,  // 기본 Request 타입
  { params }: { params: Promise<{ id: string }> }
)
```

#### USLab
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,  // ✅ Next.js 확장 타입
  { params }: { params: Promise<{ id: string }> }
)
```

**차이점**:
- `NextRequest`는 Next.js의 확장된 Request 타입 (쿠키, 헤더 등 편의 메서드 제공)
- `NextResponse`는 타입 안정성과 편의 메서드 제공

---

### 4. 에러 처리

#### EventLive
- 문서상 에러 처리 구조 불명확
- 405 에러 발생 시 라우트 핸들러가 실행되지 않음

#### USLab
```typescript
try {
  // 인증 확인
  // 비즈니스 로직
  return NextResponse.json({ success: true, ... });
} catch (error) {
  console.error('[Test Send] Error:', error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.', details: error.issues },
      { status: 400 }
    );
  }
  
  // SMTP 설정 오류 처리
  if (errorMessage.includes('SMTP')) {
    return NextResponse.json(
      { error: '메일 발송 설정에 실패했습니다.', details: errorMessage },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: '서버 오류가 발생했습니다.', details: errorMessage },
    { status: 500 }
  );
}
```

**장점**:
- ✅ 명확한 에러 타입별 처리
- ✅ 상세한 에러 메시지
- ✅ 적절한 HTTP 상태 코드

---

### 5. Cron 라우트 처리 (참고)

#### USLab Cron 라우트
```typescript
// app/api/cron/newsletter-send/route.ts
export async function POST(request: NextRequest) {
  // POST 핸들러
}

/**
 * GET /api/cron/newsletter-send
 * Vercel Cron은 기본적으로 GET 요청을 보내므로 GET 핸들러도 추가
 */
export async function GET(request: NextRequest) {
  // POST 핸들러와 동일한 로직 사용
  return POST(request);
}
```

**설명**: Vercel Cron은 GET 요청을 보낼 수 있으므로, Cron 라우트는 GET 핸들러도 추가

---

## 🎯 EventLive 405 에러 원인 분석

### 가능한 원인들

#### 1. **Next.js 버전 차이**
- Next.js 15에서 `params`가 Promise로 변경됨
- `await params` 없이 사용하면 라우트 매칭 실패 가능

#### 2. **빌드/배포 문제**
- 라우트 파일이 빌드에 포함되지 않음
- 동적 라우트(`[id]`) 빌드 실패
- Vercel 배포 시 라우트 핸들러 누락

#### 3. **라우트 핸들러 export 문제**
- `export const runtime` 선언이 문제를 일으킬 수 있음
- GET 핸들러 부재로 인한 라우트 매칭 실패

#### 4. **파라미터 처리 오류**
- `params`를 await 없이 사용
- Next.js가 라우트를 인식하지 못함

---

## ✅ USLab 구현의 장점

### 1. **Next.js 표준 준수**
- `NextRequest`, `NextResponse` 사용
- `await params`로 파라미터 추출
- 불필요한 `runtime`, `dynamic` 선언 없음

### 2. **명확한 에러 처리**
- 타입별 에러 처리 (ZodError, SMTP 에러 등)
- 적절한 HTTP 상태 코드
- 상세한 에러 메시지

### 3. **인증 처리**
- Bearer 토큰 인증 명확히 처리
- 401 Unauthorized 적절히 반환

### 4. **로깅**
- 상세한 로그 메시지 (`[Test Send]` 접두사)
- 성공/실패 로그 구분

---

## 🛠️ EventLive 해결 방안

### 즉시 적용 가능한 수정사항

#### 1. **파라미터 처리 수정**
```typescript
// Before
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // params 직접 사용
}

// After (USLab 방식)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // ✅ await 추가
  // ...
}
```

#### 2. **불필요한 export 제거**
```typescript
// Before
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// After (제거 또는 조건부 사용)
// Next.js가 자동으로 처리하므로 명시 불필요
```

#### 3. **타입 변경**
```typescript
// Before
import { Request } from 'next/server';

// After
import { NextRequest, NextResponse } from 'next/server';
```

#### 4. **에러 처리 개선**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // ... 구현
  } catch (error) {
    console.error('[Test Send] Error:', error);
    // 명확한 에러 처리
  }
}
```

#### 5. **GET 핸들러 추가 (선택사항)**
```typescript
// GET 요청에 대한 명시적 처리 (디버깅용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
```

---

## 📊 비교 표

| 항목 | EventLive | USLab | 권장 |
|------|-----------|-------|------|
| **Request 타입** | `Request` | `NextRequest` | ✅ USLab |
| **Response 타입** | 불명확 | `NextResponse` | ✅ USLab |
| **params 처리** | await 없음 | `await params` | ✅ USLab |
| **runtime 선언** | `export const runtime` | 없음 | ✅ USLab |
| **dynamic 선언** | `export const dynamic` | 없음 | ✅ USLab |
| **에러 처리** | 불명확 | 명확한 타입별 처리 | ✅ USLab |
| **로깅** | 불명확 | 상세한 로그 | ✅ USLab |
| **인증 처리** | 불명확 | 명확한 Bearer 토큰 | ✅ USLab |

---

## 🎯 핵심 권장사항

### 1. **Next.js 15+ 표준 준수**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // 필수!
  // ...
}
```

### 2. **불필요한 export 제거**
- `export const runtime` 제거 (필요한 경우만)
- `export const dynamic` 제거 (필요한 경우만)

### 3. **명확한 에러 처리**
- try-catch 블록 사용
- 타입별 에러 처리
- 적절한 HTTP 상태 코드

### 4. **로깅 추가**
- 상세한 로그 메시지
- 성공/실패 구분
- 디버깅 정보 포함

---

## 📚 참고 자료

### Next.js 공식 문서
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)

### USLab 구현 참고
- `app/api/admin/newsletters/[id]/test-send/route.ts`
- `app/api/cron/newsletter-send/route.ts`

---

**작성일**: 2026년 2월 4일  
**작성자**: AI Assistant  
**상태**: 분석 완료
