# `/webinarform/wert` 빌드 에러 해결 명세서

## 1. 문제 개요

### 1.1 에러 발생 상황
- **에러 메시지**: `Module not found: Can't resolve './WebinarFormWertPageContent'`
- **발생 위치**: `app/webinarform/wert/page.tsx:2:1`
- **빌드 환경**: Vercel (Turbopack)
- **Next.js 버전**: 16.0.10

### 1.2 에러 원인
`WebinarFormWertPageContent.tsx` 파일이 Git 저장소에 커밋되지 않아 Vercel 빌드 시 모듈을 찾을 수 없었습니다.

## 2. 문제 분석

### 2.1 파일 구조
```
app/webinarform/wert/
├── page.tsx (서버 컴포넌트)
└── WebinarFormWertPageContent.tsx (클라이언트 컴포넌트) ← Git에 커밋되지 않음
```

### 2.2 원인 분석
1. **로컬 개발 환경**: 파일이 존재하여 로컬 빌드는 성공
2. **Vercel 빌드 환경**: Git 저장소에 파일이 없어 모듈을 찾을 수 없음
3. **Git 상태 확인 결과**:
   ```bash
   git status app/webinarform/wert/
   # Untracked files: WebinarFormWertPageContent.tsx
   ```

### 2.3 이전 해결 시도
- `useSearchParams()` Suspense boundary 에러 해결을 위해 서버/클라이언트 컴포넌트 분리
- `page.tsx`만 커밋하고 `WebinarFormWertPageContent.tsx`는 커밋 누락

## 3. 해결 방법

### 3.1 파일 추가 및 커밋
```bash
git add app/webinarform/wert/WebinarFormWertPageContent.tsx
git commit -m "fix: WebinarFormWertPageContent.tsx 파일 추가 (빌드 에러 해결)"
git push
```

### 3.2 파일 구조 확인
- `page.tsx`: 서버 컴포넌트 (Suspense boundary 포함)
- `WebinarFormWertPageContent.tsx`: 클라이언트 컴포넌트 (`"use client"` 지시어 포함)

## 4. 기술적 배경

### 4.1 Next.js 16 서버/클라이언트 컴포넌트 분리
- **서버 컴포넌트** (`page.tsx`):
  - `useSearchParams()` 사용 불가
  - Suspense boundary로 클라이언트 컴포넌트 감싸기
  - `export const dynamic = 'force-dynamic'` 설정

- **클라이언트 컴포넌트** (`WebinarFormWertPageContent.tsx`):
  - `"use client"` 지시어 필수
  - `useSearchParams()` 훅 사용 가능
  - Suspense boundary 내부에서 렌더링

### 4.2 빌드 설정
```typescript
// app/webinarform/wert/page.tsx
export const dynamic = 'force-dynamic';  // 동적 렌더링 강제
export const revalidate = 0;              // 캐시 비활성화
export const dynamicParams = true;        // 동적 파라미터 허용
```

## 5. 예방 조치

### 5.1 Git 커밋 체크리스트
- [ ] 새로 생성한 파일이 `git add` 되었는지 확인
- [ ] `git status`로 untracked files 확인
- [ ] 관련 파일들이 함께 커밋되었는지 확인

### 5.2 빌드 전 검증
- [ ] 로컬 빌드 테스트 (`npm run build`)
- [ ] Git 상태 확인 (`git status`)
- [ ] 변경된 파일 목록 확인 (`git diff --name-only`)

### 5.3 코드 리뷰 체크리스트
- [ ] 서버/클라이언트 컴포넌트 분리 확인
- [ ] Suspense boundary 적용 확인
- [ ] 모든 import 경로가 올바른지 확인
- [ ] 관련 파일들이 모두 커밋되었는지 확인

## 6. 관련 파일

### 6.1 수정된 파일
- `app/webinarform/wert/page.tsx`
- `app/webinarform/wert/WebinarFormWertPageContent.tsx` (신규 생성)

### 6.2 참고 문서
- [Next.js 16 useSearchParams() Suspense Boundary](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)
- [Next.js 16 Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

## 7. 해결 완료 확인

### 7.1 로컬 빌드 테스트
```bash
npm run build
# ✓ Compiled successfully
# ✓ Generating static pages
```

### 7.2 Git 상태 확인
```bash
git ls-files app/webinarform/wert/
# app/webinarform/wert/page.tsx
# app/webinarform/wert/WebinarFormWertPageContent.tsx  ← 확인됨
```

### 7.3 Vercel 빌드 확인
- 빌드 로그에서 모듈을 찾을 수 없다는 에러가 사라짐
- 빌드 성공 (Exit code: 0)

## 8. 향후 개선 사항

### 8.1 자동화
- Pre-commit hook으로 untracked files 경고
- CI/CD 파이프라인에서 빌드 전 파일 존재 여부 확인

### 8.2 문서화
- 새 컴포넌트 생성 시 Git 커밋 체크리스트 문서화
- 서버/클라이언트 컴포넌트 분리 가이드 작성

## 9. 결론

`WebinarFormWertPageContent.tsx` 파일이 Git에 커밋되지 않아 발생한 빌드 에러였습니다. 파일을 추가하고 커밋하여 해결했습니다. 향후 유사한 문제를 방지하기 위해 Git 커밋 체크리스트와 빌드 전 검증 프로세스를 마련했습니다.
