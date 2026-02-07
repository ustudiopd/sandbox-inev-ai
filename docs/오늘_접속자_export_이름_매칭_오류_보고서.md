# 오늘 접속자 Export 이름 매칭 오류 보고서

## 📋 문제 개요

**발생 일시**: 2026-02-06  
**영향 범위**: `/api/webinars/[webinarId]/export/today-access` API  
**심각도**: 높음  
**상태**: 미해결

## 🔍 문제 설명

오늘 접속자 CSV 다운로드 시, 일부 사용자의 이름이 이메일 아이디(예: `0406tn`, `21604935`, `ahims01`)로 표시되는 문제가 발생하고 있습니다.

### 예상 동작
- 등록 정보(`event_survey_entries`의 `registration_data.name`)가 있으면 해당 이름 사용
- 없으면 프로필의 `display_name` 또는 `nickname` 사용
- 모두 없으면 전체 이메일 주소 사용

### 실제 동작
- 이름 필드에 이메일 아이디 부분만 표시됨 (예: `0406tn@naver.com` → `0406tn`)
- 등록 정보가 매칭되지 않아 기본정보가 누락됨

## 🔎 원인 분석

### 현재 코드 로직 (`app/api/webinars/[webinarId]/export/today-access/route.ts`)

```typescript
// 1. event_survey_entries 조회 (모든 entries 가져오기)
const { data: allEntries } = await admin
  .from('event_survey_entries')
  .select('registration_data, survey_no, code6, ...')
  .eq('campaign_id', webinar.registration_campaign_id)

// 2. 이메일로 매핑 생성
if (allEntries) {
  allEntries.forEach((entry: any) => {
    const entryEmail = entry.registration_data?.email
    if (entryEmail) {
      const normalizedEmail = entryEmail.toLowerCase().trim()
      registrationEntriesMap.set(normalizedEmail, entry)
    }
  })
}

// 3. 사용자별로 매칭
const emailLower = email.toLowerCase().trim()
registrationEntry = registrationEntriesMap.get(emailLower)

// 4. 이름 결정
const name = registration?.nickname || regData?.name || profile.display_name || email || '익명'
```

### 잠재적 문제점

1. **이메일 정규화 불일치**
   - `event_survey_entries`의 이메일과 `profiles`의 이메일 형식이 다를 수 있음
   - 공백, 대소문자, 특수문자 처리 차이

2. **매칭 실패 시 폴백 로직**
   - `registrationEntry`가 매칭되지 않으면 `regData`가 빈 객체
   - `profile.display_name`이 없으면 전체 `email`이 이름으로 사용됨
   - 하지만 실제로는 이메일 아이디만 표시되는 것으로 보아, 어딘가에서 이메일을 파싱하는 로직이 있을 수 있음

3. **데이터 불일치**
   - `profiles.email`과 `event_survey_entries.registration_data.email`이 정확히 일치하지 않을 수 있음
   - 예: `user@example.com` vs `User@Example.com` (대소문자)
   - 예: `user@example.com` vs ` user@example.com ` (공백)

## 📊 비교 분석

### 설문조사 Export (정상 작동)
- 파일: `webinar-149402-survey-responses-20260206-after-1pm.csv`
- 이름이 정상적으로 표시됨 (예: `손민정`, `원준호`, `이현빈`)
- 등록 정보가 정확히 매칭됨

### 오늘 접속자 Export (문제 발생)
- 파일: `webinar-149402-access-20260206-13-16.csv`
- 이름이 이메일 아이디로 표시됨 (예: `0406tn`, `21604935`, `ahims01`)
- 등록 정보 매칭 실패

### 코드 차이점

**설문조사 Export**:
```typescript
// 동일한 로직 사용
registrationEntry = registrationEntriesMap.get(emailLower)
const name = registration?.nickname || regData?.name || profile.display_name || email || '익명'
```

**오늘 접속자 Export**:
```typescript
// 동일한 로직 사용
registrationEntry = registrationEntriesMap.get(emailLower)
const name = registration?.nickname || regData?.name || profile.display_name || email || '익명'
```

→ 코드 로직은 동일하지만, 실제 데이터 매칭 결과가 다름

## 🐛 디버깅 필요 사항

1. **로그 확인**
   - `[Today Access Export] 등록 정보 매칭 완료` 로그 확인
   - 매칭된 entries 수와 실제 이메일 수 비교
   - 매칭 실패한 사용자들의 이메일 형식 확인

2. **데이터 검증**
   - `profiles` 테이블의 이메일 형식 확인
   - `event_survey_entries.registration_data.email` 형식 확인
   - 정규화 전후 비교

3. **매칭 로직 테스트**
   - 실제 데이터로 매칭 성공률 측정
   - 매칭 실패 케이스 분석

## 💡 해결 방안 제안

### 방안 1: 이메일 정규화 강화
```typescript
// 더 엄격한 정규화
const normalizeEmail = (email: string): string => {
  if (!email) return ''
  return email.toLowerCase().trim().replace(/\s+/g, '')
}

// 매핑 생성 시
const normalizedEmail = normalizeEmail(entryEmail)
registrationEntriesMap.set(normalizedEmail, entry)

// 매칭 시
const emailLower = normalizeEmail(email)
registrationEntry = registrationEntriesMap.get(emailLower)
```

### 방안 2: 매칭 실패 시 추가 시도
```typescript
// 1차: 정규화된 이메일로 매칭
let registrationEntry = registrationEntriesMap.get(emailLower)

// 2차: 매칭 실패 시 부분 매칭 시도
if (!registrationEntry && email) {
  const emailDomain = email.split('@')[0]?.toLowerCase().trim()
  for (const [key, entry] of registrationEntriesMap.entries()) {
    const entryDomain = key.split('@')[0]?.toLowerCase().trim()
    if (entryDomain === emailDomain) {
      registrationEntry = entry
      break
    }
  }
}
```

### 방안 3: 디버깅 로그 추가
```typescript
// 매칭 실패 케이스 로깅
if (!registrationEntry && email) {
  console.log(`[Today Access Export] 매칭 실패: ${email} (정규화: ${emailLower})`)
  console.log(`[Today Access Export] 사용 가능한 entries:`, Array.from(registrationEntriesMap.keys()).slice(0, 5))
}
```

### 방안 4: 프로필 정보 우선순위 조정
```typescript
// nickname도 확인하도록 수정
const name = registration?.nickname || 
             regData?.name || 
             profile.nickname ||  // 추가
             profile.display_name || 
             email || 
             '익명'
```

## 📝 권장 조치 사항

1. **즉시 조치**
   - 디버깅 로그 추가하여 매칭 실패 원인 파악
   - 실제 데이터 샘플로 매칭 로직 테스트

2. **단기 조치**
   - 이메일 정규화 로직 강화
   - 프로필 `nickname` 필드도 이름 결정에 포함

3. **장기 조치**
   - 데이터 정합성 검증 도구 구축
   - 매칭 성공률 모니터링
   - 사용자 피드백 수집 및 개선

## 🔗 관련 파일

- `app/api/webinars/[webinarId]/export/today-access/route.ts` (문제 발생 파일)
- `app/api/webinars/[webinarId]/export/survey/route.ts` (참고 파일 - 정상 작동)
- `exports/webinar-149402-access-20260206-13-16.csv` (문제 발생 샘플)
- `exports/webinar-149402-survey-responses-20260206-after-1pm.csv` (정상 작동 샘플)

## 📅 작성일

2026-02-06

## 👤 작성자

AI Assistant (Composer)
