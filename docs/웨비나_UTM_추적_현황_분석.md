# 웨비나 UTM 추적 현황 분석

**작성일**: 2026-02-02  
**질문**: "웨비나 페이지도 생성이 돼? 우리가 구조가 헷갈려서 설문/등록페이지만 UTM이 되지않아?"

---

## 📊 현재 상황 요약

### ✅ UTM 추적이 **작동하는** 경로

1. **이벤트/설문 페이지** (`/event/[...path]`)
   - ✅ Middleware에서 cookie 저장
   - ✅ 등록 API에서 UTM 저장 (`event_survey_entries` 테이블)
   - ✅ `RegistrationPage`, `SurveyPage`에서 UTM 전달

2. **웨비나 등록 페이지 (특수 케이스)** (`/webinar/426307/register`)
   - ✅ `OnePredictRegistrationPage` 사용
   - ✅ 이벤트 등록 API (`/api/public/event-survey/[campaignId]/register`) 사용
   - ✅ UTM 저장됨 (`event_survey_entries` 테이블)

### ❌ UTM 추적이 **작동하지 않는** 경로

1. **웨비나 메인 페이지** (`/webinar/[id]`)
   - ⚠️ Middleware에서 cookie 저장은 됨
   - ❌ 페이지 자체에서 UTM 추출/처리 없음
   - ❌ `WebinarEntry` 컴포넌트에서 UTM 사용 없음

2. **웨비나 등록 (일반)** (`/webinar/[id]/register` → `WebinarEntry`)
   - ⚠️ UTM 파라미터 추출은 하지만 전달되지 않음
   - ❌ 웨비나 등록 API (`/api/webinars/[webinarId]/register`)가 UTM을 받지 않음
   - ❌ `registrations` 테이블에 UTM 컬럼 없음

---

## 🔍 상세 분석

### 1. 웨비나 등록 API 구조

**파일**: `app/api/webinars/[webinarId]/register/route.ts`

```typescript
// 현재 구현: UTM 파라미터를 전혀 받지 않음
export async function POST(req: Request, { params }) {
  const body = await req.json()
  const nickname = body.nickname?.trim() || null  // nickname만 받음
  
  // registrations 테이블에 저장 (UTM 없음)
  await admin.from('registrations').insert({
    webinar_id: actualWebinarId,
    user_id: user.id,
    role: 'attendee',
    nickname,
    // ❌ UTM 파라미터 없음
  })
}
```

**문제점**:
- UTM 파라미터를 받지 않음
- `registrations` 테이블에 UTM 컬럼이 없음
- `WebinarEntry` 컴포넌트에서도 UTM을 전달하지 않음

### 2. 웨비나 등록 흐름

```
사용자 접속: /webinar/[id]?utm_source=google&utm_medium=cpc
  ↓
Middleware: cookie에 UTM 저장 ✅
  ↓
WebinarEntry 컴포넌트: 로그인/등록 처리
  ↓
API 호출: /api/webinars/[webinarId]/register
  ↓
Body: { nickname: "..." }  // ❌ UTM 없음
  ↓
DB 저장: registrations 테이블  // ❌ UTM 저장 안 됨
```

### 3. 이벤트 등록 흐름 (비교)

```
사용자 접속: /event/[path]?utm_source=google&utm_medium=cpc
  ↓
Middleware: cookie에 UTM 저장 ✅
  ↓
RegistrationPage 컴포넌트: UTM 추출 및 전달 ✅
  ↓
API 호출: /api/public/event-survey/[campaignId]/register
  ↓
Body: { 
  name: "...",
  utm_source: "google",  // ✅ UTM 포함
  utm_medium: "cpc",
  ...
}
  ↓
DB 저장: event_survey_entries 테이블  // ✅ UTM 저장됨
```

---

## 🎯 결론

**사용자 질문에 대한 답변**:

> "웨비나 페이지도 생성이 돼? 우리가 구조가 헷갈려서 설문/등록페이지만 UTM이 되지않아?"

**답변**: 
- ✅ **설문/등록 페이지** (`/event/[...path]`)는 UTM 추적이 **정상 작동**합니다.
- ❌ **웨비나 페이지** (`/webinar/[id]`)는 UTM 추적이 **작동하지 않습니다**.
  - Middleware에서 cookie 저장은 되지만, 실제 등록 시 UTM이 저장되지 않음
  - 웨비나 등록 API가 UTM을 받지 않음
  - `registrations` 테이블에 UTM 컬럼이 없음

**예외 케이스**:
- `/webinar/426307/register`는 `OnePredictRegistrationPage`를 사용하므로 이벤트 등록 API를 통해 UTM이 저장됨

---

## 🔧 해결 방안

웨비나 UTM 추적을 활성화하려면:

1. **`registrations` 테이블에 UTM 컬럼 추가** (마이그레이션 필요)
2. **웨비나 등록 API 수정**: UTM 파라미터 받기
3. **`WebinarEntry` 컴포넌트 수정**: UTM 파라미터 전달
4. **Cookie 복원 로직 적용**: 등록 API에서 cookie에서 UTM 복원

또는:

- 웨비나도 `registration_campaign_id`를 사용하여 `event_survey_entries` 테이블에 저장하도록 통일 (현재 일부 웨비나는 이미 이 방식 사용)
