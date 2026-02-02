# test-registration-modu CID 테스트 링크

**작성일**: 2026-02-02  
**테스트 페이지**: `/event/test-registration-modu/register`  
**페이지 타입**: 간소화된 등록 페이지 (이름, 전화번호만)

---

## 📋 테스트 시나리오

### 시나리오 1: CID만 사용

**테스트 URL**:
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST001
```

**로컬 테스트**:
```
http://localhost:3000/event/test-registration-modu/register?cid=TEST001
```

**예상 결과**:
- URL에서 `cid=TEST001` 추출
- 등록 시 `cid` 파라미터가 API에 전달됨
- 등록 데이터에 `cid` 저장됨

---

### 시나리오 2: CID + UTM 파라미터

**테스트 URL**:
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST001&utm_source=email&utm_medium=newsletter&utm_campaign=test_campaign
```

**로컬 테스트**:
```
http://localhost:3000/event/test-registration-modu/register?cid=TEST001&utm_source=email&utm_medium=newsletter&utm_campaign=test_campaign
```

**예상 결과**:
- `cid`: `TEST001`
- `utm_source`: `email`
- `utm_medium`: `newsletter`
- `utm_campaign`: `test_campaign`
- 모든 파라미터가 등록 데이터에 저장됨

---

### 시나리오 3: 다양한 CID 값 테스트

#### CID 1: 기본 테스트
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST001
```

#### CID 2: 숫자 포함
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST123
```

#### CID 3: 대소문자 혼합
```
https://eventflow.kr/event/test-registration-modu/register?cid=TestAbC
```

#### CID 4: 긴 CID
```
https://eventflow.kr/event/test-registration-modu/register?cid=TESTCID123456
```

---

## 🔍 확인 사항

### 1. URL 파라미터 확인
- 브라우저 개발자 도구 → Network 탭에서 실제 요청 URL 확인
- 등록 API 호출 시 `cid` 파라미터가 포함되는지 확인

### 2. 등록 데이터 확인
```sql
SELECT 
  id,
  survey_no,
  name,
  phone_norm,
  cid,
  utm_source,
  utm_medium,
  utm_campaign,
  created_at
FROM event_survey_entries
WHERE campaign_id = (
  SELECT id FROM event_survey_campaigns 
  WHERE public_path = '/test-registration-modu'
)
ORDER BY created_at DESC
LIMIT 10;
```

### 3. 콘솔 로그 확인
브라우저 개발자 도구 → Console 탭에서 다음 로그 확인:
- `[RegistrationPage] 세션 ID 초기화`
- `[RegistrationPage] 등록 요청 시작` (cid 포함 여부 확인)

---

## 📝 테스트 체크리스트

- [ ] CID만 있는 URL로 접속
- [ ] 이름과 전화번호 입력 후 등록
- [ ] 등록 완료 메시지 확인
- [ ] DB에서 `cid` 값 저장 확인
- [ ] CID + UTM 파라미터가 모두 저장되는지 확인
- [ ] 여러 CID 값으로 테스트

---

## 🚀 빠른 테스트 링크 (프로덕션)

### 기본 CID 테스트
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST001
```

### UTM 파라미터만 테스트
```
https://eventflow.kr/event/test-registration-modu/register?utm_source=email&utm_medium=newsletter&utm_campaign=test_campaign&utm_term=test_term&utm_content=test_content
```

### CID + UTM 파라미터
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST001&utm_source=email&utm_medium=newsletter&utm_campaign=test_campaign
```

### 다양한 UTM 시나리오 테스트

#### 이메일 마케팅
```
https://eventflow.kr/event/test-registration-modu/register?utm_source=email&utm_medium=newsletter&utm_campaign=modu_feb_2026
```

#### 소셜 미디어
```
https://eventflow.kr/event/test-registration-modu/register?utm_source=facebook&utm_medium=social&utm_campaign=modu_promo
```

#### 검색 광고
```
https://eventflow.kr/event/test-registration-modu/register?utm_source=google&utm_medium=cpc&utm_campaign=modu_search&utm_term=이벤트등록
```

#### 전체 UTM 파라미터 포함
```
https://eventflow.kr/event/test-registration-modu/register?utm_source=email&utm_medium=newsletter&utm_campaign=modu_test_2026&utm_term=test_term&utm_content=test_content
```

### 다양한 CID 값 테스트
```
https://eventflow.kr/event/test-registration-modu/register?cid=TEST001
https://eventflow.kr/event/test-registration-modu/register?cid=TEST123
https://eventflow.kr/event/test-registration-modu/register?cid=TestAbC
https://eventflow.kr/event/test-registration-modu/register?cid=TESTCID123456
```

### 로컬 개발 (참고용)
- **CID만**: http://localhost:3000/event/test-registration-modu/register?cid=TEST001
- **CID + UTM**: http://localhost:3000/event/test-registration-modu/register?cid=TEST001&utm_source=email&utm_medium=newsletter&utm_campaign=test

---

## 💡 참고사항

1. **CID 형식**: 
   - 일반적으로 8자리 A-Z0-9 형식 권장
   - 하지만 현재 시스템은 다양한 형식 지원

2. **파라미터 유지**:
   - 등록 페이지에서 완료 페이지로 이동 시 파라미터 유지되지 않음 (간소화된 폼)
   - 등록 완료 후 같은 페이지에 완료 메시지 표시

3. **데이터 저장**:
   - `event_survey_entries` 테이블의 `cid` 컬럼에 저장
   - UTM 파라미터는 `utm_source`, `utm_medium`, `utm_campaign` 등 별도 컬럼에 저장
