# CID 저장 테스트 가이드

**작성일**: 2026-02-02  
**상태**: ✅ 배포 완료

---

## 🎯 테스트 목적

CID가 `registration_data` JSONB 필드에 제대로 저장되는지 확인

---

## 📋 테스트 링크

**UTM + CID 포함 테스트 링크:**
```
https://eventflow.kr/event/test-registration-modu/register?utm_source=test_email_deploy&utm_medium=email&utm_campaign=modu_cid_test_2026&utm_term=test_term&utm_content=test_content&cid=TESTCID456
```

**포함된 파라미터:**
- `utm_source`: test_email_deploy
- `utm_medium`: email
- `utm_campaign`: modu_cid_test_2026
- `utm_term`: test_term
- `utm_content`: test_content
- `cid`: TESTCID456

---

## 🧪 테스트 단계

### 1. 등록 페이지 접속

위 테스트 링크로 접속합니다.

### 2. 등록 폼 작성

다음 정보를 입력:
- 이름: CID테스트
- 이메일: cid-test-deploy@example.com
- 소속: 테스트회사
- 부서: 테스트부서
- 직함: 테스터
- 연차: 5년
- 휴대폰: 010-1234-5678
- 개인정보 활용 동의: 네, 동의합니다

### 3. 제출

"제출 →" 버튼을 클릭하여 등록을 완료합니다.

### 4. 결과 확인

다음 명령어로 등록 데이터 확인:
```bash
npx tsx scripts/test-modu-utm-cid-registration.ts
```

또는 직접 SQL 쿼리:
```sql
SELECT 
  id,
  campaign_id,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  registration_data->>'cid' as cid,
  marketing_campaign_link_id,
  created_at
FROM event_survey_entries
WHERE campaign_id = 'd220d5dc-1f01-4b1b-9c33-e1badd793e98'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ 예상 결과

### UTM 저장
- `utm_source`: test_email_deploy
- `utm_medium`: email
- `utm_campaign`: modu_cid_test_2026
- `utm_term`: test_term
- `utm_content`: test_content

### CID 저장
- `registration_data->>'cid'`: TESTCID456

---

## 🔍 확인 사항

1. **UTM이 컬럼에 저장되는지 확인**
   - `utm_source`, `utm_medium`, `utm_campaign` 컬럼 확인

2. **CID가 registration_data에 저장되는지 확인**
   - `registration_data->>'cid'` 쿼리로 확인
   - 또는 `registration_data` JSON 전체 확인

3. **이전 등록과 비교**
   - 이전 등록은 CID가 없었음 (0% 저장률)
   - 이번 등록부터는 CID가 저장되어야 함

---

## 📝 수정 내용

**파일**: `app/api/public/event-survey/[campaignId]/register/route.ts`

**변경 사항**:
1. 일반 캠페인 등록: `normalizedRegistrationData`에 `finalCid` 추가
2. 웨비나 ID 등록: `completeRegistrationData`에 `finalCid` 추가
3. 원프레딕트 웨비나 등록: `completeRegistrationData`에 `finalCid` 추가

**코드 위치**:
- 일반 캠페인: 937-939줄
- 웨비나 ID: 321줄 근처
- 원프레딕트: 621줄 근처

---

## 🚨 문제 해결

### CID가 저장되지 않는 경우

1. **등록 API 로그 확인**
   - Vercel Functions 로그에서 `[register] CID 저장:` 메시지 확인
   - `finalCid` 값이 있는지 확인

2. **URL 파라미터 확인**
   - 브라우저 개발자 도구 → Network 탭
   - 등록 API 요청의 body에 `cid` 파라미터가 포함되어 있는지 확인

3. **쿠키 확인**
   - Application → Cookies → `ef_tracking`
   - CID가 쿠키에 저장되어 있는지 확인

---

## 📊 테스트 결과 기록

테스트 후 다음 정보를 기록하세요:

- [ ] UTM 저장 확인 (utm_source, utm_medium, utm_campaign)
- [ ] CID 저장 확인 (registration_data->>'cid')
- [ ] 등록 시간
- [ ] 등록 ID
