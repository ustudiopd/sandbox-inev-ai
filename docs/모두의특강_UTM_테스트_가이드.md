# 모두의특강 UTM 테스트 가이드

**작성일**: 2026-02-02  
**계정**: 모두의특강 (a556c562-03c3-4988-8b88-ae0a96648514)

---

## 📋 현재 상황

### 발견된 캠페인
- **설문조사 타입**: Test 설문조사 복사본
  - ID: `f91a1311-6be2-4c33-b265-94c42c1ef9d6`
  - Public Path: `/test-survey-copy-modu`
  - URL: `https://eventflow.kr/event/test-survey-copy-modu`
  - 상태: `published`

### 등록 타입 캠페인
- ❌ 없음 (새로 생성 필요)

---

## 🧪 테스트 방법

### 방법 1: 기존 설문조사 캠페인으로 테스트

**테스트 URL**:
```
https://eventflow.kr/event/test-survey-copy-modu?utm_source=test&utm_medium=email&utm_campaign=modu_test&utm_term=test_term&utm_content=test_content
```

**테스트 단계**:
1. 위 URL로 접속
2. 설문조사 완료
3. DB에서 UTM 저장 확인

**확인 쿼리**:
```sql
SELECT 
  id,
  campaign_id,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  marketing_campaign_link_id,
  created_at
FROM event_survey_entries
WHERE campaign_id = 'f91a1311-6be2-4c33-b265-94c42c1ef9d6'
ORDER BY created_at DESC
LIMIT 10;
```

---

### 방법 2: 등록 타입 캠페인 생성 후 테스트

**캠페인 생성**:
1. 모두의특강 대시보드 접속: `https://eventflow.kr/client/a556c562-03c3-4988-8b88-ae0a96648514`
2. "이벤트/설문" 메뉴에서 "등록 페이지" 생성
3. 생성된 캠페인의 `public_path` 확인

**테스트 URL**:
```
https://eventflow.kr/event/[public_path]/register?utm_source=test&utm_medium=email&utm_campaign=modu_test
```

---

## ✅ 확인 사항

### 1. Middleware Cookie 저장 확인
- 브라우저 개발자 도구 → Application → Cookies
- `ef_tracking` 쿠키 확인
- UTM 파라미터가 JSON으로 저장되어 있는지 확인

### 2. 등록 API UTM 저장 확인
- 서버 로그에서 `[register] 복원된 추적 정보` 확인
- `utm_source`, `utm_medium` 등이 올바르게 저장되는지 확인

### 3. DB 저장 확인
- `event_survey_entries` 테이블에서 최신 항목 확인
- `utm_source`, `utm_medium`, `utm_campaign` 등이 NULL이 아닌지 확인
- `marketing_campaign_link_id`가 올바르게 저장되는지 확인

---

## 🔍 디버깅 스크립트

### UTM 저장 상태 확인
```bash
npx tsx scripts/check-utm-storage-status.ts
```

### 특정 캠페인 UTM 통계 확인
```bash
# 캠페인 ID를 인자로 전달
npx tsx scripts/check-utm-tracking-status.ts
```

---

## 📝 테스트 체크리스트

- [ ] UTM 파라미터가 포함된 URL로 접속
- [ ] Middleware에서 cookie 저장 확인
- [ ] 등록/설문 완료
- [ ] 서버 로그에서 UTM 복원 확인
- [ ] DB에서 UTM 저장 확인
- [ ] 캠페인 링크 통계에서 UTM 집계 확인
