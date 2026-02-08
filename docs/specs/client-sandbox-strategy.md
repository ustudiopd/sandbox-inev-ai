# 클라이언트 페이지 샌드박스화 전략

## 현재 문제점

현재 `app/event/[...path]/page.tsx`에서 모든 클라이언트 페이지를 하나의 파일에서 처리하고 있어:
- 하나의 클라이언트 컴포넌트에 에러가 있으면 전체 빌드 실패
- TypeScript가 모든 컴포넌트를 동시에 검사하여 타입 에러가 전체에 영향
- 코드 변경 시 전체 재빌드 필요

## 해결 방안

### 방안 1: 동적 Import + 에러 바운더리 (권장) ⭐

**장점**: 구현이 간단하고 즉시 적용 가능, 런타임 격리
**단점**: 빌드 타임 에러는 여전히 감지됨

#### 구현 방법:

1. **에러 바운더리 컴포넌트 생성**
```typescript
// app/event/[...path]/components/ClientErrorBoundary.tsx
'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  clientName: string
}

export class ClientErrorBoundary extends React.Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.clientName}] 에러 발생:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">페이지를 불러올 수 없습니다</h1>
            <p className="text-gray-600 mb-4">{this.props.clientName} 페이지에 오류가 발생했습니다.</p>
            <a href="/" className="text-blue-600 hover:underline">홈으로 돌아가기</a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

2. **동적 Import 래퍼 생성**
```typescript
// app/event/[...path]/components/ClientWrapper.tsx
'use client'

import { Suspense } from 'react'
import { ClientErrorBoundary } from './ClientErrorBoundary'

interface ClientWrapperProps {
  clientName: string
  loader: () => Promise<{ default: React.ComponentType<any> }>
  props?: any
  fallback?: React.ReactNode
}

export default function ClientWrapper({ 
  clientName, 
  loader, 
  props = {},
  fallback 
}: ClientWrapperProps) {
  const LazyComponent = React.lazy(loader)

  return (
    <ClientErrorBoundary clientName={clientName}>
      <Suspense fallback={fallback || <div>로딩 중...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    </ClientErrorBoundary>
  )
}
```

3. **page.tsx에서 사용**
```typescript
// app/event/[...path]/page.tsx
import ClientWrapper from './components/ClientWrapper'

// 426307은 OnePredictWebinarPage를 보여줌
if (publicPath === '/426307' || publicPath === '426307') {
  return (
    <ClientWrapper
      clientName="원프레딕트"
      loader={() => import('./components/OnePredictWebinarPage')}
      props={{ campaign, baseUrl }}
    />
  )
}
```

---

### 방안 2: TypeScript 프로젝트 참조 (Project References)

**장점**: 빌드 타임 에러도 격리 가능, 각 클라이언트를 독립적으로 타입 체크
**단점**: 설정이 복잡하고 구조 변경 필요

#### 구현 방법:

1. **각 클라이언트별 tsconfig 생성**
```json
// tsconfig.onepredict.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./.next/types/onepredict"
  },
  "include": [
    "app/event/[...path]/components/OnePredict*.tsx"
  ]
}
```

2. **메인 tsconfig.json 수정**
```json
{
  "compilerOptions": {
    "composite": true
  },
  "references": [
    { "path": "./tsconfig.onepredict.json" },
    { "path": "./tsconfig.wert.json" }
  ]
}
```

---

### 방안 3: 조건부 타입 체크 (TypeScript Skip)

**장점**: 특정 클라이언트만 타입 체크 스킵 가능
**단점**: 타입 안정성 저하

#### 구현 방법:

```typescript
// @ts-nocheck 또는 @ts-ignore 사용
// app/event/[...path]/components/OnePredictWebinarPage.tsx
// @ts-nocheck
'use client'
// ... 컴포넌트 코드
```

---

### 방안 4: 모노레포 구조 (Turborepo/Nx)

**장점**: 완전한 격리, 독립적인 빌드/배포 가능
**단점**: 대규모 리팩토링 필요, 복잡도 증가

#### 구조 예시:
```
packages/
  ├── core/          # 공통 코드
  ├── client-onepredict/
  ├── client-wert/
  └── client-default/
```

---

## 권장 구현: 방안 1 (동적 Import + 에러 바운더리)

가장 실용적이고 즉시 적용 가능한 방안입니다.

### 추가 개선 사항:

1. **개발 모드에서만 특정 클라이언트 활성화**
```typescript
const ENABLED_CLIENTS = process.env.ENABLED_CLIENTS?.split(',') || ['*']

if (ENABLED_CLIENTS.includes('*') || ENABLED_CLIENTS.includes('onepredict')) {
  // OnePredict 컴포넌트 로드
}
```

2. **빌드 시 특정 클라이언트 제외**
```typescript
// next.config.ts
const excludedClients = process.env.EXCLUDE_CLIENTS?.split(',') || []

const nextConfig = {
  webpack: (config) => {
    if (excludedClients.includes('onepredict')) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/app/event/[...path]/components/OnePredict': false,
      }
    }
    return config
  }
}
```

3. **각 클라이언트를 별도 라우트로 분리** (장기적)
```
app/
  ├── event/
  │   ├── [clientId]/
  │   │   └── [...path]/
  │   │       └── page.tsx  # 각 클라이언트별 독립 라우트
```

---

## 구현 완료 ✅

방안 1 (동적 Import + 에러 바운더리)이 구현되었습니다:

1. **ClientErrorBoundary.tsx**: 각 클라이언트 컴포넌트의 런타임 에러를 격리
2. **ClientWrapper.tsx**: 동적 import와 Suspense를 통한 코드 스플리팅
3. **page.tsx**: OnePredict 관련 컴포넌트들을 동적 import로 변경

### 적용된 컴포넌트:
- `OnePredictWebinarPage`
- `OnePredictRegistrationPage`
- `OnePredictEnterPage`
- `OnePredictWebinarLivePage`

### 효과:
- ✅ 하나의 클라이언트 컴포넌트에 에러가 있어도 다른 클라이언트는 정상 작동
- ✅ 런타임 에러가 발생해도 전체 앱이 크래시되지 않음
- ✅ 코드 스플리팅으로 번들 크기 감소
- ✅ 개발 모드에서 에러 상세 정보 표시

### 추가 개선 가능 사항:

1. **환경 변수로 특정 클라이언트 비활성화**
```typescript
// .env.local
EXCLUDE_CLIENTS=onepredict

// page.tsx
const excludedClients = process.env.EXCLUDE_CLIENTS?.split(',') || []
if (!excludedClients.includes('onepredict') && publicPath === '/426307') {
  // OnePredict 컴포넌트 로드
}
```

2. **빌드 타임 에러도 격리하려면 TypeScript 프로젝트 참조 사용** (방안 2)
