# CID 테스트 가이드

**작성일**: 2026-02-02  
**테스트 링크**: CID `KYYV8F87`, Link ID `58b5731a-8aab-4092-baf8-ff10c31c337f`

---

## 📋 테스트 시나리오

### 시나리오 1: CID만 사용 (링크의 UTM 사용)

**테스트 URL**:
```
http://localhost:3000/event/test-survey-copy-modu?cid=KYYV8F87
```

**예상 결과**:
- `utm_source`: `test_cid` (링크에서)
- `utm_medium`: `email` (링크에서)
- `utm_campaign`: `cid_test` (링크에서)
- `marketing_campaign_link_id`: `58b5731a-8aab-4092-baf8-ff10c31c337f` ✅

---

### 시나리오 2: CID + URL의 UTM (URL 우선)

**테스트 URL**:
```
http://localhost:3000/event/test-survey-copy-modu?cid=KYYV8F87&utm_source=test&utm_medium=email&utm_campaign=modu_test
```

**예상 결과**:
- `utm_source`: `test` (URL 우선)
- `utm_medium`: `email` (URL 우선)
- `utm_campaign`: `modu_test` (URL 우선)
- `marketing_campaign_link_id`: `58b5731a-8aab-4092-baf8-ff10c31c337f` ✅ (cid로 조회)

---

## ⚠️ 중요 확인 사항

### 1. CID 형식 확인
- CID는 **8자리 A-Z0-9** 형식이어야 합니다
- `normalizeCID` 함수가 유효하지 않은 형식을 null로 반환할 수 있습니다
- 현재 테스트 CID: `KYYV8F87` (유효함)

### 2. URL 확인
- 리다이렉트 후에도 cid 파라미터가 유지되는지 확인
- 브라우저 개발자 도구 → Network 탭에서 실제 요청 URL 확인

### 3. 서버 로그 확인
- `[Restore Tracking] cid로 링크 찾음` 로그 확인
- `[submit] 복원된 추적 정보` 로그에서 `link_id` 확인

---

## 🔍 디버깅

### CID 정규화 확인
```typescript
import { normalizeCID } from '@/lib/utils/cid'
console.log(normalizeCID('KYYV8F87')) // 'KYYV8F87' 반환되어야 함
```

### 링크 조회 확인
```sql
SELECT id, cid, target_campaign_id, status
FROM campaign_link_meta
WHERE cid = 'KYYV8F87'
AND client_id = 'a556c562-03c3-4988-8b88-ae0a96648514'
AND status = 'active';
```

---

## 📝 테스트 체크리스트

- [ ] CID만 있는 URL로 접속
- [ ] 리다이렉트 후 URL에 cid 유지 확인
- [ ] 설문조사 완료
- [ ] 서버 로그에서 cid lookup 확인
- [ ] DB에서 marketing_campaign_link_id 저장 확인
- [ ] CID + UTM URL로 테스트
- [ ] URL의 UTM 우선, link_id 저장 확인
