# test-send 라우트 최종 진단 및 권장사항

**작성일**: 2026년 2월 4일  
**상태**: 구조적 문제 아님 확인됨

---

## ✅ 확인된 사실

### 1. 라우트 구조는 정상
- `approve` 라우트와 **완전히 동일한 구조**로 변경했지만 여전히 실패
- 라우트 핸들러 시그니처, 타입, export 모두 정상

### 2. 빌드는 성공
- 로컬 빌드: ✅ 성공
- Vercel 빌드: ✅ 성공
- 라우트 포함: ✅ 빌드 로그에 명시적으로 포함

### 3. 런타임에서만 실패
- `approve`: ✅ 정상 매칭 (`X-Matched-Path: /api/client/emails/[id]/approve`)
- `test-send`: ❌ 실패 (`X-Matched-Path: /500`)

---

## 🎯 핵심 문제

**라우트 핸들러가 런타임에서 실행되지 않음**

가능한 원인:
1. **Import 의존성 에러** (가장 가능성 높음)
   - `sendEmailViaResend` import 실패
   - `getCampaignEmailPolicy` import 실패
   - 관련 모듈의 런타임 에러

2. **환경 변수 누락**
   - `RESEND_API_KEY` 등 필수 환경 변수 누락
   - 런타임에서 모듈 초기화 실패

3. **Vercel Function 제한**
   - 함수 크기 제한 초과
   - 메모리 제한 초과

---

## 🛠️ 즉시 확인 필요 (P0)

### 1. Vercel Function Logs 확인 ⭐ 최우선

**경로**:
```
Vercel 대시보드 → Deployments → 최신 배포
→ Function Logs 탭
→ test-send 호출 시 에러 확인
```

**확인 사항**:
- 런타임 에러 메시지
- Import 에러 여부
- 스택 트레이스
- 환경 변수 로드 여부

### 2. 환경 변수 확인

**Vercel 대시보드**:
```
Settings → Environment Variables
```

**확인 사항**:
- `RESEND_API_KEY` 설정 여부
- 프로덕션 환경에 설정되어 있는지 확인
- 값이 올바른지 확인

---

## 🔬 추가 진단 방법

### 방법 1: 최소 코드로 테스트

`test-send` 라우트를 최소한의 코드로 변경하여 import 없이 기본 응답만 반환:

```typescript
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return NextResponse.json({ 
      success: true, 
      message: 'Test route works',
      id 
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

**목적**: Import 없이 라우트가 작동하는지 확인

### 방법 2: 단계적 Import 추가

1. 기본 응답만 반환 (위 코드)
2. `createAdminSupabase` 추가
3. `requireClientMember` 추가
4. `sendEmailViaResend` 추가
5. 나머지 기능 추가

**목적**: 어떤 import에서 문제가 발생하는지 확인

### 방법 3: 동적 Import 사용

```typescript
// 정적 import 대신 동적 import 사용
const { sendEmailViaResend } = await import('@/lib/email/resend')
```

**목적**: 런타임에서만 로드하여 에러 처리 가능

---

## 📊 비교 분석

### approve 라우트 (정상 작동)
```typescript
import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 간단한 로직만
}
```

**특징**:
- ✅ 간단한 import만 사용
- ✅ 복잡한 의존성 없음

### test-send 라우트 (실패)
```typescript
import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/email/resend'  // ⚠️
import { markdownToHtml, markdownToText } from '@/lib/email/markdown-to-html'  // ⚠️
import { processTemplate } from '@/lib/email/template-processor'  // ⚠️
import { getCampaignEmailPolicy } from '@/lib/email/send-campaign'  // ⚠️

export const runtime = 'nodejs'

export async function POST(...) {
  // 복잡한 로직
}
```

**특징**:
- ⚠️ 많은 import 사용
- ⚠️ `sendEmailViaResend` 등 복잡한 의존성

---

## 🎯 권장 조치 순서

### 1단계: Vercel Function Logs 확인 (필수)
- 런타임 에러 메시지 확인
- 정확한 원인 파악

### 2단계: 환경 변수 확인
- `RESEND_API_KEY` 등 필수 환경 변수 확인

### 3단계: 최소 코드로 테스트
- Import 없이 기본 응답만 반환
- 라우트가 작동하는지 확인

### 4단계: 단계적 Import 추가
- 하나씩 import 추가하며 문제 지점 확인

### 5단계: 동적 Import 적용
- 문제가 되는 import를 동적 import로 변경

---

## 📝 다음 커밋 제안

### 옵션 1: 최소 코드로 테스트
```typescript
// Import 없이 기본 응답만 반환
// 라우트가 작동하는지 확인
```

### 옵션 2: 동적 Import 적용
```typescript
// sendEmailViaResend 등을 동적 import로 변경
// 런타임 에러 처리 가능
```

---

## 🔍 추가 확인 사항

### lib/email/resend.ts 확인
- `RESEND_API_KEY` 환경 변수 체크 로직 확인
- 런타임에서 에러 발생 가능성 확인

### lib/email/send-campaign.ts 확인
- Import 의존성 확인
- 순환 참조 여부 확인

### Vercel Function 제한 확인
- 함수 크기 제한: 50MB
- 메모리 제한: 설정에 따라 다름
- 타임아웃: 기본 10초

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026년 2월 4일  
**상태**: 구조적 문제 아님 확인, 런타임 에러 가능성 높음
