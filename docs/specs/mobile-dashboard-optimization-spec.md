# 운영자 대시보드 모바일 최적화 명세서

## 1. 개요

### 1.1 목적
운영자 대시보드(슈퍼 관리자, 클라이언트, 에이전시)를 모바일 환경에서 사용하기 편리하도록 최적화합니다.

### 1.2 대상 페이지
- `/super/dashboard` - 슈퍼 관리자 대시보드
- `/client/[clientId]/dashboard` - 클라이언트 대시보드
- `/agency/[agencyId]/dashboard` - 에이전시 대시보드

### 1.3 모바일 화면 기준 (Tailwind CSS 브레이크포인트 기준)

**Tailwind CSS 공식 브레이크포인트**:
- **Base (기본)**: 0~639px - 작은 폰 포함 "진짜 모바일"
- **sm**: 640px 이상 - 큰 폰/가로모드 폰
- **md**: 768px 이상 - 태블릿
- **lg**: 1024px 이상 - 데스크톱
- **xl**: 1280px 이상
- **2xl**: 1536px 이상

**구현 전략**:
- 모바일 최적화는 **base + sm (0~767px)**에서 동일 UX로 유지
- 레이아웃 변화(열 증가, 헤더 가로 정렬 등)는 **`md:`부터** 적용
- `sm:`은 "큰 폰에서 살짝 더 여유" 정도로만 사용

## 2. 현재 문제점 분석

### 2.1 레이아웃 문제
- **고정된 패딩**: `p-8` (32px)가 모바일에서 너무 큼
- **헤더 레이아웃**: `flex justify-between`이 모바일에서 요소가 겹침
- **사이드바**: 고정 너비(256px)로 모바일 화면을 많이 차지
- **통계 카드**: 모바일에서도 1열이지만 여백이 과도함

### 2.2 텍스트 크기 문제
- **제목**: `text-4xl` (36px)가 모바일에서 너무 큼
- **통계 숫자**: `text-4xl` (36px)가 모바일에서 과도함
- **버튼 텍스트**: 모바일에서 가독성 저하

### 2.3 버튼 및 액션 문제
- **액션 버튼**: 여러 버튼이 가로로 배치되어 모바일에서 가로 스크롤 발생
- **UnifiedListItem**: 4개의 버튼이 가로로 배치되어 모바일에서 사용 불편
- **버튼 크기**: 모바일에서 터치하기 어려운 크기

### 2.4 리스트 아이템 문제
- **UnifiedListItem**: 버튼들이 많아 모바일에서 레이아웃 깨짐
- **클라이언트/에이전시 리스트**: 모바일에서 정보 표시 부족

## 3. 최적화 방안

### 3.1 반응형 패딩 및 마진
```tsx
// 현재: p-8 (모든 화면에서 32px)
// 변경: 모바일 최적화
className="p-4 sm:p-6 md:p-8"
```

**적용 위치**:
- 모든 대시보드 페이지의 최상위 컨테이너
- 통계 카드 내부 패딩
- 리스트 아이템 패딩

### 3.2 반응형 텍스트 크기
```tsx
// 제목
className="text-2xl sm:text-3xl md:text-4xl font-bold"

// 통계 숫자
className="text-3xl sm:text-4xl font-bold"

// 설명 텍스트
className="text-sm sm:text-base text-gray-600"
```

**적용 위치**:
- 대시보드 제목 (h1)
- 통계 카드의 숫자
- 설명 텍스트
- 리스트 아이템 제목

### 3.3 헤더 레이아웃 개선
```tsx
// 현재: flex justify-between (모바일에서 겹침)
// 변경: 모바일에서 세로 배치
<div className="mb-6 sm:mb-8">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
    <div className="flex-1">
      {/* 제목 및 설명 */}
    </div>
    <div className="bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow border border-gray-200 w-full sm:w-auto">
      {/* 프로필 정보 */}
    </div>
  </div>
</div>
```

**적용 위치**:
- 모든 대시보드의 헤더 섹션

### 3.4 액션 버튼 그룹 개선

**현재 문제점**:
- 여러 버튼이 가로로 배치되어 모바일에서 가로 스크롤 발생
- 버튼이 많아지면 wrap되지만 정렬이 어색함

**해결책 1: 모바일 세로 배치 (권장)**
```tsx
// 모바일: 세로 스택 + 전체 너비
// 태블릿 이상: 가로 배치
<div className="flex flex-col md:flex-row gap-2 md:gap-3">
  <Link className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 min-h-[44px] flex items-center justify-center ...">
    + 웨비나 생성
  </Link>
  {/* ... */}
</div>
```

**해결책 2: 태블릿에서 2열 그리드 (버튼이 많을 때)**
```tsx
// 모바일: 세로 스택
// 태블릿: 2열 그리드 (정렬이 반듯함)
<div className="flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-3">
  <Link className="w-full px-4 py-2.5 md:px-6 md:py-3 min-h-[44px] ...">
    + 웨비나 생성
  </Link>
  {/* ... */}
</div>
```

**적용 위치**:
- 클라이언트 대시보드: 웨비나/설문조사 생성 버튼
- 에이전시 대시보드: 클라이언트 관리/리포트/도메인 관리 버튼

### 3.5 통계 카드 최적화

**현재 문제점**:
- 모바일에서도 1열이지만 여백이 과도함
- 패딩과 텍스트 크기가 모바일에 맞지 않음

**해결책**:
```tsx
// 모바일: 1열, 태블릿: 2열, 데스크톱: 3열
// gap도 반응형으로 조정
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
    <div className="flex items-center justify-between min-w-0">
      <div className="flex-1 min-w-0">
        <h2 className="text-xs md:text-sm font-medium text-gray-600 mb-1 truncate">웨비나 수</h2>
        <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
          {webinars?.length || 0}
        </p>
      </div>
      <div className="text-3xl md:text-4xl opacity-20 ml-2 flex-shrink-0">🎥</div>
    </div>
  </div>
</div>
```

**핵심 포인트**:
- `min-w-0`를 부모/자식에 추가하여 텍스트 오버플로우 방지
- `truncate`로 긴 텍스트 처리
- 아이콘은 `flex-shrink-0`로 고정 크기 유지

**적용 위치**:
- 모든 통계 카드 섹션

### 3.6 UnifiedListItem 모바일 최적화

**현재 문제점**:
- 버튼들이 가로로 배치되어 모바일에서 가로 스크롤 발생
- 4개 이상의 액션 버튼이 한 줄에 배치되어 터치하기 어려움

**권장 해결책: Bottom Sheet (모바일 친화적)**

```tsx
// 모바일: 오른쪽에 ⋯(kebab) 아이콘 버튼 하나만 (최소 44x44px)
// 데스크톱: 기존 버튼 레이아웃 유지

<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 p-3 md:p-4 bg-gray-50 rounded-lg">
  <div className="flex items-center gap-3 flex-1 min-w-0">
    {/* 태그 및 제목 */}
  </div>
  
  {/* 모바일: Kebab 메뉴 버튼 */}
  <div className="md:hidden flex justify-end">
    <Menu>
      <Menu.Button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors">
        <span className="text-xl">⋯</span>
      </Menu.Button>
      {/* Bottom Sheet로 표시 (Headless UI Dialog 사용) */}
      <Menu.Items as={Dialog} className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl shadow-lg z-50">
        <div className="p-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="space-y-2">
            {/* 각 액션 버튼 - 최소 44px 높이 */}
            <Menu.Item>
              {({ active }) => (
                <Link className={`block px-4 py-3 rounded-lg min-h-[44px] flex items-center ${active ? 'bg-gray-100' : ''}`}>
                  공개페이지
                </Link>
              )}
            </Menu.Item>
            {/* ... 다른 액션들 */}
            {/* 위험 액션은 구분선으로 분리 */}
            <div className="border-t border-gray-200 my-2"></div>
            <Menu.Item>
              {({ active }) => (
                <button className={`w-full text-left px-4 py-3 rounded-lg min-h-[44px] text-red-600 ${active ? 'bg-red-50' : ''}`}>
                  삭제
                </button>
              )}
            </Menu.Item>
          </div>
        </div>
      </Menu.Items>
    </Menu>
  </div>
  
  {/* 데스크톱: 기존 버튼 레이아웃 */}
  <div className="hidden md:flex gap-2 items-center">
    {/* 기존 버튼들 */}
  </div>
</div>
```

**대안: 간단한 세로 배치 (빠른 구현)**
```tsx
<div className="flex flex-col gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
  <div className="flex items-center gap-3 min-w-0">
    {/* 태그 및 제목 */}
  </div>
  <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
    {/* 버튼들을 세로로 배치, 데스크톱에서만 가로 */}
  </div>
</div>
```

**적용 위치**:
- `app/(client)/client/[clientId]/dashboard/components/UnifiedListItem.tsx`

### 3.7 리스트 아이템 개선
```tsx
// 클라이언트/에이전시 리스트 아이템
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
  <div className="flex-1 min-w-0">
    <span className="font-medium text-gray-800 block truncate">{name}</span>
    {/* 추가 정보 */}
  </div>
  <Link className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-center sm:text-left">
    대시보드 →
  </Link>
</div>
```

**적용 위치**:
- 에이전시 대시보드의 클라이언트 리스트
- 슈퍼 관리자 대시보드의 최근 목록

### 3.8 하단 고정 메뉴 대응 (현재 프로젝트 구조 반영)

**현재 프로젝트 상태**:
- 사이드바는 `lg:` 브레이크포인트에서만 표시됨 (`hidden lg:flex`)
- 모바일에서는 하단 고정 메뉴가 이미 구현되어 있음 (`lg:hidden fixed bottom-0`)
- `LayoutWrapper`에서 이미 `pb-16 lg:pb-0`를 사용 중

**개선 사항**:
```tsx
// LayoutWrapper에서 iOS safe-area까지 고려
<main 
  className="
    min-w-0
    pb-[calc(4rem+env(safe-area-inset-bottom))]
    lg:pb-0
    transition-all duration-300 
    min-h-screen 
    bg-gradient-to-br from-gray-50 to-blue-50
  "
  style={{ 
    marginLeft: `${sidebarWidth}px`,
    width: `calc(100vw - ${sidebarWidth}px)`,
    maxWidth: `calc(100vw - ${sidebarWidth}px)`,
    boxSizing: 'border-box'
  }}
>
```

**적용 위치**:
- `components/layout/LayoutWrapper.tsx` - safe-area-inset 추가
- 대시보드 페이지들은 하단 메뉴가 콘텐츠를 가리지 않도록 충분한 패딩 확보

### 3.9 최대 너비 제한 개선
```tsx
// 현재: max-w-7xl (모바일에서도 적용)
// 변경: 모바일에서는 전체 너비 사용
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

**적용 위치**:
- 모든 대시보드의 최상위 컨테이너

## 4. 구현 우선순위

### Phase 1: 필수 개선 (즉시 적용)
1. ✅ 반응형 패딩/마진 적용
2. ✅ 반응형 텍스트 크기 조정
3. ✅ 헤더 레이아웃 개선 (모바일에서 세로 배치)
4. ✅ 통계 카드 최적화
5. ✅ 액션 버튼 그룹 세로 배치

### Phase 2: 중요 개선 (1주일 내)
6. ✅ UnifiedListItem 모바일 최적화 (드롭다운 메뉴 또는 세로 배치)
7. ✅ 리스트 아이템 개선
8. ✅ 최대 너비 제한 개선

### Phase 3: 추가 개선 (2주일 내)
9. ✅ 하단 고정 메뉴 safe-area 대응 (iOS notch/홈 인디케이터)
10. ✅ Button 컴포넌트에서 터치 최적화 강제 (44x44px)
11. ⚠️ 스와이프 제스처 지원 (선택사항)

## 5. 세부 구현 가이드

### 5.1 Tailwind CSS 클래스 매핑
```tsx
// 패딩
p-4 sm:p-6 md:p-8        // 모바일: 16px, 태블릿: 24px, 데스크톱: 32px
px-4 sm:px-6 md:px-8     // 가로 패딩
py-4 sm:py-6 md:py-8     // 세로 패딩

// 마진
mb-4 sm:mb-6 md:mb-8     // 하단 마진
gap-2 sm:gap-3 md:gap-4  // 간격

// 텍스트 크기
text-2xl sm:text-3xl md:text-4xl  // 제목
text-xl sm:text-2xl md:text-3xl  // 부제목
text-sm sm:text-base              // 본문

// 그리드
grid-cols-1 sm:grid-cols-2 md:grid-cols-3  // 통계 카드
flex-col sm:flex-row                        // 레이아웃 방향

// 너비
w-full md:w-auto        // 모바일: 전체, 태블릿 이상: 자동
min-w-0                 // 텍스트 오버플로우 방지 (부모/자식 모두에 필수)

// 터치 최적화
min-h-[44px]            // 버튼 최소 높이
min-w-[44px]            // 아이콘 버튼 최소 너비
```

### 5.2 컴포넌트별 수정 사항

#### 슈퍼 관리자 대시보드
- 파일: `app/(super)/super/dashboard/page.tsx`
- 수정 항목:
  - 최상위 컨테이너 패딩: `p-8` → `p-4 sm:p-6 md:p-8`
  - 제목 크기: `text-4xl` → `text-2xl sm:text-3xl md:text-4xl`
  - 헤더 레이아웃: `flex justify-between` → `flex flex-col sm:flex-row`
  - 통계 카드: 패딩 및 텍스트 크기 조정
  - 최근 목록: 리스트 아이템 레이아웃 개선

#### 클라이언트 대시보드
- 파일: `app/(client)/client/[clientId]/dashboard/page.tsx`
- 수정 항목:
  - 최상위 컨테이너 패딩: `p-8` → `p-4 sm:p-6 md:p-8`
  - 제목 크기: `text-4xl` → `text-2xl sm:text-3xl md:text-4xl`
  - 헤더 레이아웃: `flex justify-between` → `flex flex-col sm:flex-row`
  - 액션 버튼 그룹: `flex gap-3 flex-wrap` → `flex flex-col sm:flex-row gap-2 sm:gap-3`
  - 통계 카드: 패딩 및 텍스트 크기 조정
  - UnifiedListItem: 모바일 최적화

#### 에이전시 대시보드
- 파일: `app/(agency)/agency/[agencyId]/dashboard/page.tsx`
- 수정 항목:
  - 최상위 컨테이너 패딩: `p-8` → `p-4 sm:p-6 md:p-8`
  - 제목 크기: `text-4xl` → `text-2xl sm:text-3xl md:text-4xl`
  - 헤더 레이아웃: `flex justify-between` → `flex flex-col sm:flex-row`
  - 액션 버튼 그룹: `flex gap-4 flex-wrap` → `flex flex-col sm:flex-row gap-2 sm:gap-3`
  - 통계 카드: 패딩 및 텍스트 크기 조정
  - 클라이언트 리스트: 리스트 아이템 레이아웃 개선

#### UnifiedListItem 컴포넌트
- 파일: `app/(client)/client/[clientId]/dashboard/components/UnifiedListItem.tsx`
- 수정 항목:
  - 전체 레이아웃: 모바일에서 세로 배치 (`flex-col md:flex-row`)
  - 버튼 그룹: 모바일에서 Bottom Sheet 또는 Kebab 메뉴 (⋯ 아이콘)
  - 버튼 크기: 모든 버튼 최소 44x44px
  - 텍스트 오버플로우: `min-w-0` 및 `truncate` 적용

## 6. 테스트 체크리스트

### 6.1 화면 크기별 테스트
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12/13)
- [ ] 414px (iPhone Plus)
- [ ] 768px (iPad)
- [ ] 1024px (iPad Pro)
- [ ] 1280px 이상 (데스크톱)

### 6.2 기능 테스트
- [ ] 모든 버튼이 터치 가능한 크기인가?
- [ ] 텍스트가 잘리지 않는가?
- [ ] 가로 스크롤이 발생하지 않는가?
- [ ] 레이아웃이 깨지지 않는가?
- [ ] 모든 링크가 정상 작동하는가?

### 6.3 사용성 테스트
- [ ] 한 손으로 조작 가능한가?
- [ ] 중요한 정보가 한 화면에 보이는가?
- [ ] 액션이 직관적인가?
- [ ] 로딩 시간이 적절한가?

### 6.4 완료 기준 (Definition of Done)

**반드시 확인할 3가지**:
- [ ] **320px에서 가로 스크롤이 0** (DevTools에서 `body`/`main` overflow 확인)
- [ ] **모든 주요 액션 버튼/아이콘이 44px 이상** (특히 ⋯ 메뉴, 삭제/콘솔 버튼)
- [ ] **하단 고정 메뉴가 콘텐츠를 가리지 않음** (`pb + safe-area` 포함)

**추가 확인 사항**:
- [ ] iOS Safari에서 safe-area-inset이 제대로 적용되는가?
- [ ] 모든 텍스트가 `min-w-0`와 `truncate`로 오버플로우 방지되었는가?
- [ ] 버튼 그룹이 모바일에서 세로 배치되는가?

## 7. 참고 사항

### 7.1 Tailwind CSS 브레이크포인트 (정확한 정의)

**Tailwind CSS 공식 브레이크포인트**:
- **Base (기본)**: 0px (모든 화면 크기)
- **sm**: 640px 이상
- **md**: 768px 이상
- **lg**: 1024px 이상
- **xl**: 1280px 이상
- **2xl**: 1536px 이상

**구현 전략**:
- 모바일 최적화는 **base (0~639px) + sm (640~767px)**에서 동일 UX 유지
- 레이아웃 변화는 **`md:` (768px)부터** 적용
- `sm:`은 "큰 폰에서 살짝 더 여유" 정도로만 사용

### 7.2 터치 최적화 가이드라인

**Button 컴포넌트에서 강제 (권장)**:
```tsx
// components/ui/Button.tsx 또는 LinkButton.tsx
export function Button({ children, className, ...props }) {
  return (
    <button
      className={`
        min-h-[44px] 
        px-4 py-2.5 
        flex items-center justify-center
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

// 아이콘 버튼
export function IconButton({ children, className, ...props }) {
  return (
    <button
      className={`
        min-w-[44px] 
        min-h-[44px] 
        flex items-center justify-center
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
```

**터치 최적화 체크리스트**:
- 버튼 최소 크기: 44x44px (Apple HIG 기준)
- 버튼 간 최소 간격: 8px
- 텍스트 최소 크기: 16px (줌 방지)
- 모든 주요 액션 버튼/아이콘이 44px 이상인지 확인

### 7.3 가로 스크롤 방지 체크리스트

**반드시 확인할 2가지**:

1. **Flex 자식에서 텍스트가 길 때**:
   ```tsx
   // 부모와 자식 모두에 min-w-0 추가
   <div className="flex min-w-0">
     <div className="flex-1 min-w-0">
       <span className="truncate">긴 텍스트</span>
     </div>
   </div>
   ```

2. **버튼 그룹/태그들이 nowrap 상태로 길어질 때**:
   ```tsx
   // 모바일에서는 세로 스택 또는 wrap 허용
   <div className="flex flex-col md:flex-row md:flex-wrap gap-2">
     {/* 버튼들 */}
   </div>
   ```

### 7.4 성능 고려사항
- 모바일에서 불필요한 이미지/애니메이션 최소화
- 레이지 로딩 적용
- 코드 스플리팅 활용

### 7.5 현재 프로젝트 구조 반영

**LayoutWrapper 구조**:
- 사이드바는 `lg:` 브레이크포인트에서만 표시 (`hidden lg:flex`)
- 모바일에서는 하단 고정 메뉴 사용 (`lg:hidden fixed bottom-0`)
- `pb-16 lg:pb-0`로 하단 패딩 처리 (safe-area 추가 권장)

**사이드바 구조**:
- 데스크톱: 좌측 고정 사이드바 (`lg:flex`)
- 모바일: 하단 고정 메뉴 (`lg:hidden`)
- 슈퍼 관리자 페이지는 별도 사이드바 사용 (`SuperSidebar`)

## 8. 예상 효과

### 8.1 사용성 개선
- 모바일 사용자 경험 향상
- 터치 조작 편의성 증가
- 정보 접근성 향상

### 8.2 기술적 개선
- 반응형 디자인 완성
- 코드 일관성 향상
- 유지보수성 개선

---

**작성일**: 2025-01-XX  
**수정일**: 2025-01-XX  
**작성자**: AI Assistant  
**버전**: 1.1

## 변경 이력

### v1.1 (2025-01-XX)
- ✅ 브레이크포인트 정의 정확히 수정 (Tailwind CSS 공식 기준 반영)
- ✅ LayoutWrapper/사이드바 구조 반영 (하단 고정 메뉴 이미 구현됨)
- ✅ UnifiedListItem UX 개선 (Bottom Sheet/Kebab 메뉴 권장)
- ✅ Button 컴포넌트에서 터치 최적화 강제 방안 추가
- ✅ 가로 스크롤 방지 체크리스트 추가 (`min-w-0` 필수)
- ✅ 완료 기준 (Definition of Done) 추가
- ✅ iOS safe-area 대응 방안 추가

