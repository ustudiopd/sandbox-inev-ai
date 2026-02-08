# 워트인텔리전스 웨비나 시스템 구조 문서

## 개요

워트인텔리전스 웨비나 시스템은 4단계 플로우로 구성되어 있습니다:
1. **메인 페이지** (`/event/149403`) - 웨비나 소개 및 안내
2. **등록 페이지** (`/event/149403/register`) - 참가자 등록
3. **입장 페이지** (`/webinar/149402`) - 웨비나 입장 인증
4. **웨비나 시청 페이지** (`/webinar/149402/live`) - 라이브 웨비나 시청

---

## 1. 전체 플로우

```
메인 페이지 (/event/149403)
    ↓ [웨비나 등록하기 버튼]
등록 페이지 (/event/149403/register)
    ↓ [등록 완료]
입장 페이지 (/webinar/149402)
    ↓ [이름+이메일 인증]
웨비나 시청 페이지 (/webinar/149402/live)
```

---

## 2. 페이지별 상세 구조

### 2.1 메인 페이지 (`/event/149403`)

**경로**: `app/event/[...path]/page.tsx` → `WebinarFormWertPage` 컴포넌트  
**실제 컴포넌트**: `app/webinarform/wert/page.tsx`

**역할**:
- 웨비나 소개 및 홍보
- 등록 페이지로 이동하는 버튼 제공
- 웨비나 시청 페이지로 직접 이동하는 버튼 제공

**주요 기능**:
- IP Insight ON 이미지 표시
- 웨비나 제목: "AI 특허리서치 실무 활용 웨비나"
- 날짜/시간 정보 표시
- 등록하기 버튼 → `/event/149403/register`
- 웨비나 시청하기 버튼 → `/webinar/149402`

**특징**:
- 캠페인 조회 실패해도 페이지 표시 (하드코딩된 경로)
- `publicPath === '/149403'` 조건으로 특별 처리

---

### 2.2 등록 페이지 (`/event/149403/register`)

**경로**: `app/event/[...path]/page.tsx` → `subPath === 'register'`  
**실제 컴포넌트**: `app/event/[...path]/components/RegistrationPage.tsx`

**역할**:
- 참가자 정보 수집 및 등록 처리
- 개인정보 활용 동의 수집

**등록 필드**:
- **필수 필드**:
  - 이름*
  - 이메일*
  - 휴대폰번호* (국가코드 + 번호)
  - 소속*
  - 부서*
  - 직함*
  - 연차(경력)*
  - 개인정보 활용 동의* (라디오 버튼: "네, 동의합니다" / "아니요, 동의하지 않습니다")
- **선택 필드**:
  - 웨비나와 관련하여 궁금한 사항 (주관식 textarea)

**데이터 저장**:
- `event_survey_entries` 테이블에 저장
- `registration_data` JSONB 필드에 상세 정보 저장:
  ```json
  {
    "email": "user@example.com",
    "name": "홍길동",
    "organization": "소속",
    "department": "부서",
    "position": "직함",
    "yearsOfExperience": "연차(경력)",
    "question": "웨비나와 관련하여 궁금한 사항",
    "phoneCountryCode": "+82",
    "privacyConsent": true
  }
  ```
- `company` 필드에는 `organization` 값 저장 (기존 API 호환성)

**개인정보 활용 동의**:
- 주식회사 워트인텔리전스 개인정보 수집 및 이용 안내 문구 포함
- 수집 항목: 이름, 이메일, 휴대폰번호, 소속, 부서, 직함, 연차(경력)
- 수집 및 이용목적: 참가자 혜택 제공(서비스 안내 등)
- 보유 및 이용기간: 동의 철회까지
- **"네, 동의합니다" 선택 시에만 등록 가능**

**등록 완료 후**:
- 등록 성공 메시지 표시
- 자동으로 입장 페이지(`/webinar/149402`)로 리다이렉트되지 않음
- 사용자가 직접 "웨비나 시청하기" 버튼을 클릭하여 입장

---

### 2.3 입장 페이지 (`/webinar/149402`)

**경로**: `app/(webinar)/webinar/[id]/page.tsx`  
**실제 컴포넌트**: `app/(webinar)/webinar/[id]/components/WebinarEntry.tsx`

**역할**:
- 웨비나 입장 전 인증 처리
- 이름+이메일 기반 인증 (149402 전용)

**인증 방식**:
- **149402 웨비나 전용**: `name_email_auth` 모드
  - 이름과 이메일 입력
  - 등록 페이지(`/event/149403`)에서 등록한 정보와 매칭
  - 매칭 성공 시 자동 로그인 및 웨비나 시청 페이지로 이동

**주요 로직**:
1. `handleNameEmailAuth` 함수 호출
2. `event_survey_entries` 테이블에서 이름+이메일로 등록 정보 조회
3. 등록 정보가 있으면:
   - 자동 계정 생성 또는 로그인 (`/api/auth/email-signup` API 호출)
   - 웨비나 등록 처리 (`/api/webinars/{id}/register`)
   - `/webinar/149402/live`로 리다이렉트
4. 등록 정보가 없으면:
   - `/event/149403` (등록 페이지가 아닌 메인 페이지)로 리다이렉트
   - 에러 메시지 표시: "등록 정보를 찾을 수 없습니다. 먼저 등록해주세요."

**UI 특징**:
- 149402 전용 스타일 적용 (WERT 브랜드 스타일)
- Pretendard 폰트 사용
- IP Insight ON 이미지 표시
- "고객사례로 알아보는" 서브타이틀
- "AI 특허리서치 실무 활용 웨비나" 제목 (고정)
- 카운트다운 타이머 (웨비나 시작 시간까지)

**데이터 연동**:
- `webinars` 테이블의 `registration_campaign_id`가 `149403` 캠페인 ID로 설정됨
- 이를 통해 등록 페이지와 웨비나가 연동됨

---

### 2.4 웨비나 시청 페이지 (`/webinar/149402/live`)

**경로**: `app/(webinar)/webinar/[id]/live/page.tsx`  
**실제 컴포넌트**: `app/(webinar)/webinar/[id]/components/WebinarView.tsx`

**역할**:
- 라이브 웨비나 시청
- 채팅, Q&A, 참여자 목록 등 상호작용 기능 제공

**주요 기능**:
- YouTube 라이브 스트리밍 플레이어
- 실시간 채팅 (`Chat` 컴포넌트)
- Q&A 기능 (`QA` 컴포넌트)
- 참여자 목록 (`Participants` 컴포넌트)
- 설문조사 폼 팝업 (관리자가 설정한 경우)
- 경품 이벤트 팝업 (관리자가 설정한 경우)
- 자료 다운로드 (관리자가 업로드한 경우)

**149402 웨비나 전용 기능**:
- `isWertWebinar` 플래그로 특별 스타일 적용
- 등록 페이지와 연동된 웨비나로 인식 (`registration_campaign_id` 확인)

**접근 제어**:
- 인증된 사용자만 접근 가능
- 등록 페이지에서 등록한 사용자만 시청 가능
- 관리자 모드: `?admin=true` 파라미터로 관리자 기능 활성화

---

## 3. 데이터베이스 구조

### 3.1 관련 테이블

#### `event_survey_campaigns`
- **캠페인 ID**: 149403
- **타입**: `registration`
- **public_path**: `/149403`
- 등록 페이지의 메타데이터 저장

#### `event_survey_entries`
- 등록 페이지에서 수집한 참가자 정보 저장
- `registration_data` JSONB 필드에 상세 정보 저장
- 이름+이메일로 입장 페이지에서 조회

#### `webinars`
- **웨비나 ID**: UUID 또는 slug `149402`
- **slug**: `149402`
- **registration_campaign_id**: 149403 캠페인 ID (등록 페이지 연동)
- 웨비나 메타데이터 및 설정 저장

#### `registrations`
- 웨비나 등록 정보 저장
- `webinar_id`와 `user_id`로 매핑
- 입장 시 자동으로 등록 처리됨

---

## 4. 컴포넌트 구조

### 4.1 메인 페이지 컴포넌트

```
app/webinarform/wert/page.tsx
├── WebinarFormWertPage (메인 컴포넌트)
│   ├── 히어로 섹션
│   │   ├── IP Insight ON 이미지
│   │   ├── 제목: "AI 특허리서치 실무 활용 웨비나"
│   │   ├── 날짜/시간 배지
│   │   └── 등록하기/시청하기 버튼
│   ├── Q&A 섹션
│   ├── 웨비나 내용 섹션
│   └── 행사 개요 섹션
```

### 4.2 등록 페이지 컴포넌트

```
app/event/[...path]/components/RegistrationPage.tsx
├── RegistrationPage (메인 컴포넌트)
│   ├── 히어로 섹션
│   │   ├── IP Insight ON 이미지
│   │   ├── 제목
│   │   └── 날짜/시간 배지
│   └── 등록 폼
│       ├── 이름 입력
│       ├── 이메일 입력
│       ├── 휴대폰번호 입력 (국가코드 + 번호)
│       ├── 소속 입력
│       ├── 부서 입력
│       ├── 직함 입력
│       ├── 연차(경력) 입력
│       ├── 질문 입력 (선택)
│       └── 개인정보 활용 동의 (라디오 버튼)
```

### 4.3 입장 페이지 컴포넌트

```
app/(webinar)/webinar/[id]/components/WebinarEntry.tsx
├── WebinarEntry (메인 컴포넌트)
│   ├── 히어로 섹션 (149402 전용 스타일)
│   │   ├── IP Insight ON 이미지
│   │   ├── "고객사례로 알아보는" 서브타이틀
│   │   ├── "AI 특허리서치 실무 활용 웨비나" 제목
│   │   └── 카운트다운 타이머
│   └── 인증 폼
│       ├── 이름 입력
│       ├── 이메일 입력
│       └── 입장 버튼
```

### 4.4 웨비나 시청 페이지 컴포넌트

```
app/(webinar)/webinar/[id]/components/WebinarView.tsx
├── WebinarView (메인 컴포넌트)
│   ├── YouTube 플레이어
│   ├── 채팅 탭
│   │   └── Chat 컴포넌트
│   ├── Q&A 탭
│   │   └── QA 컴포넌트
│   ├── 참여자 탭
│   │   └── Participants 컴포넌트
│   └── 팝업 시스템
│       ├── 설문조사 폼 팝업
│       ├── 경품 이벤트 팝업
│       └── 자료 다운로드 팝업
```

---

## 5. 라우팅 구조

### 5.1 Next.js 라우트 구조

```
app/
├── event/
│   └── [...path]/
│       ├── page.tsx (캐치올 라우트)
│       └── components/
│           ├── RegistrationPage.tsx
│           └── WertSummitPage.tsx (사용 안 함)
│
├── webinarform/
│   └── wert/
│       └── page.tsx (메인 페이지)
│
└── (webinar)/
    └── webinar/
        └── [id]/
            ├── page.tsx (입장 페이지)
            ├── live/
            │   └── page.tsx (시청 페이지)
            └── components/
                ├── WebinarEntry.tsx
                └── WebinarView.tsx
```

### 5.2 라우팅 로직

**메인 페이지** (`/event/149403`):
- `app/event/[...path]/page.tsx`에서 `publicPath === '/149403'` 체크
- `subPath`가 없으면 `WebinarFormWertPage` 렌더링
- 실제로는 `app/webinarform/wert/page.tsx` 컴포넌트 사용

**등록 페이지** (`/event/149403/register`):
- `app/event/[...path]/page.tsx`에서 `subPath === 'register'` 체크
- `RegistrationPage` 컴포넌트 렌더링

**입장 페이지** (`/webinar/149402`):
- `app/(webinar)/webinar/[id]/page.tsx`에서 `id === '149402'` 처리
- `WebinarEntry` 컴포넌트 렌더링
- `isWertPage` prop으로 149402 전용 스타일 적용

**시청 페이지** (`/webinar/149402/live`):
- `app/(webinar)/webinar/[id]/live/page.tsx`에서 처리
- `WebinarView` 컴포넌트 렌더링

---

## 6. API 엔드포인트

### 6.1 등록 API

**POST** `/api/events/149403/register`
- 등록 페이지에서 호출
- `event_survey_entries` 테이블에 등록 정보 저장
- `registration_data` JSONB 필드에 상세 정보 저장

### 6.2 인증 API

**POST** `/api/auth/email-signup`
- 입장 페이지에서 호출
- 이름+이메일로 계정 생성 또는 로그인
- 세션 생성 및 반환

### 6.3 웨비나 등록 API

**POST** `/api/webinars/{id}/register`
- 입장 페이지에서 자동 호출
- `registrations` 테이블에 웨비나 등록 정보 저장

---

## 7. 특별 처리 사항

### 7.1 149402 웨비나 전용 처리

- **입장 페이지**: `name_email_auth` 모드 강제 적용
- **스타일**: WERT 브랜드 스타일 적용 (Pretendard 폰트, 특정 색상)
- **등록 연동**: `registration_campaign_id`로 149403 캠페인과 연동
- **리다이렉트**: 등록 정보 없으면 `/event/149403`으로 리다이렉트

### 7.2 하드코딩된 경로

- 메인 페이지: `/event/149403` 하드코딩
- 등록 페이지: `/event/149403/register` 하드코딩
- 입장 페이지: `/webinar/149402` 하드코딩
- 시청 페이지: `/webinar/149402/live` 하드코딩

### 7.3 이미지 리소스

- **IP Insight ON 이미지**: `wert/ip_insight_on.png`
- Supabase Storage의 `webinar-thumbnails` 버킷에 저장
- 모든 페이지의 히어로 섹션에 표시

---

## 8. 사용자 플로우 시나리오

### 시나리오 1: 정상 플로우

1. 사용자가 메인 페이지(`/event/149403`) 접속
2. "웨비나 등록하기" 버튼 클릭 → 등록 페이지로 이동
3. 등록 폼 작성 및 제출
4. 등록 완료 후 "웨비나 시청하기" 버튼 클릭 → 입장 페이지로 이동
5. 이름+이메일 입력 및 입장 버튼 클릭
6. 자동 인증 및 웨비나 시청 페이지로 이동
7. 라이브 웨비나 시청

### 시나리오 2: 등록 없이 입장 시도

1. 사용자가 입장 페이지(`/webinar/149402`) 직접 접속
2. 이름+이메일 입력 및 입장 버튼 클릭
3. 등록 정보 조회 실패
4. 메인 페이지(`/event/149403`)로 리다이렉트
5. 에러 메시지 표시: "등록 정보를 찾을 수 없습니다. 먼저 등록해주세요."

### 시나리오 3: 등록 후 바로 시청

1. 사용자가 등록 페이지에서 등록 완료
2. "웨비나 시청하기" 버튼 클릭 → 입장 페이지로 이동
3. 이름+이메일 입력 (등록 시 사용한 정보와 동일)
4. 자동 인증 성공 → 웨비나 시청 페이지로 이동

---

## 9. 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS + 인라인 스타일
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth
- **스토리지**: Supabase Storage
- **실시간 통신**: Supabase Realtime (채팅, Q&A)

---

## 10. 향후 개선 사항

1. **동적 경로 처리**: 하드코딩된 경로를 동적으로 처리
2. **에러 처리 강화**: 더 명확한 에러 메시지 및 처리
3. **등록 정보 검증**: 입장 시 등록 정보 유효성 검증 강화
4. **자동 리다이렉트**: 등록 완료 후 자동으로 입장 페이지로 이동 옵션
5. **모바일 최적화**: 모바일 환경에서의 사용자 경험 개선

---

## 11. 관련 문서

- 등록 페이지 폼 필드 구조: `supabase/migrations/062_update_registration_data_fields.sql`
- 웨비나 연동 스크립트: `scripts/link-149403-to-149402.ts`
- 진행 상황: `memory_bank/progress.md`

---

**작성일**: 2026-01-27  
**최종 업데이트**: 2026-01-27
