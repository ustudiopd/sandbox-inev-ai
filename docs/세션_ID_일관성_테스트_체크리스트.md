# 세션 ID 일관성 테스트 체크리스트

## 변경 사항 요약
- 세션 ID를 컴포넌트 상태로 관리하여 Visit API와 등록 API에서 동일한 세션 ID 사용 보장
- 쿠키 최신화 문제 해결

## 테스트 시나리오

### 1. 기본 등록 플로우 테스트
- [ ] 로컬 서버 실행 (`npm run dev`)
- [ ] 등록 페이지 접속 (예: `http://localhost:3000/event/149403/register`)
- [ ] 브라우저 콘솔 확인:
  - [ ] `[OnePredictRegistrationPage] 세션 ID 초기화:` 로그 확인
  - [ ] `[OnePredictRegistrationPage] Visit 수집` 로그 확인 (세션 ID 포함)
  - [ ] `[OnePredictRegistrationPage] 등록 요청 시작:` 로그 확인 (세션 ID 포함)
- [ ] **중요**: Visit API와 등록 API에서 사용한 세션 ID가 동일한지 확인

### 2. 세션 ID 일관성 검증
- [ ] 등록 완료 후 데이터베이스 확인:
  ```sql
  -- Visit 로그 확인
  SELECT session_id, campaign_id, accessed_at, converted_at, entry_id 
  FROM event_access_logs 
  WHERE campaign_id = '캠페인ID' 
  ORDER BY accessed_at DESC LIMIT 5;
  
  -- 등록 정보 확인
  SELECT id, survey_no, registration_data->>'email' as email, created_at
  FROM event_survey_entries 
  WHERE campaign_id = '캠페인ID' 
  ORDER BY created_at DESC LIMIT 5;
  ```
- [ ] `event_access_logs`의 `entry_id`가 `event_survey_entries`의 `id`와 일치하는지 확인
- [ ] `converted_at`이 제대로 설정되었는지 확인

### 3. 브라우저 호환성 테스트
- [ ] **크롬 (데스크톱)**
  - [ ] 등록 성공 확인
  - [ ] 콘솔에서 세션 ID 일관성 확인
- [ ] **엣지 (데스크톱)**
  - [ ] 등록 성공 확인
  - [ ] 콘솔에서 세션 ID 일관성 확인
- [ ] **모바일 크롬**
  - [ ] 등록 성공 확인
  - [ ] 세션 ID가 localStorage/sessionStorage에 저장되는지 확인
- [ ] **삼성 브라우저**
  - [ ] 등록 성공 확인
  - [ ] 세션 ID가 localStorage/sessionStorage에 저장되는지 확인

### 4. 세션 ID 초기화 타이밍 테스트
- [ ] 페이지 로드 직후 등록 시도 (세션 ID 초기화 전)
  - [ ] 등록이 정상적으로 진행되는지 확인
  - [ ] 세션 ID가 생성되어 사용되는지 확인
- [ ] 페이지 로드 후 몇 초 대기 후 등록 시도
  - [ ] Visit API와 등록 API에서 동일한 세션 ID 사용 확인

### 5. 에러 케이스 테스트
- [ ] localStorage 비활성화 상태에서 테스트
  - [ ] 등록이 정상적으로 진행되는지 확인
  - [ ] 세션 ID가 쿠키에 저장되는지 확인
- [ ] 쿠키 차단 상태에서 테스트
  - [ ] 등록이 정상적으로 진행되는지 확인
  - [ ] 세션 ID가 localStorage/sessionStorage에 저장되는지 확인

### 6. 여러 페이지 테스트
- [ ] `OnePredictRegistrationPage` (예: `/webinar/426307/register`)
  - [ ] 세션 ID 일관성 확인
- [ ] `RegistrationPage` (예: `/event/149403/register`)
  - [ ] 세션 ID 일관성 확인

## 확인 사항

### 코드 리뷰 포인트
1. ✅ 세션 ID가 컴포넌트 상태로 관리되는가?
2. ✅ Visit API 호출 시 세션 ID가 사용되는가?
3. ✅ 등록 API 호출 시 동일한 세션 ID가 사용되는가?
4. ✅ 세션 ID 초기화가 늦을 경우 폴백이 있는가?

### 잠재적 문제점
- ⚠️ 세션 ID 초기화가 비동기적으로 일어날 수 있음 → **해결됨**: 폴백 추가
- ⚠️ 브라우저별 스토리지 접근 제한 → **해결됨**: 다중 폴백 전략

## 배포 전 확인
- [ ] 로컬 테스트 완료
- [ ] 브라우저 호환성 테스트 완료
- [ ] 데이터베이스에서 세션 ID 일관성 확인 완료
- [ ] 에러 케이스 테스트 완료

## 배포 후 모니터링
- [ ] Vercel 로그에서 세션 ID 관련 에러 확인
- [ ] 데이터베이스에서 `converted_at`이 제대로 설정되는지 확인
- [ ] 등록 실패율 모니터링
