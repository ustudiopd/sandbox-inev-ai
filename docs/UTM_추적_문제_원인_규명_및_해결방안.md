# UTM 추적 문제 원인 규명 및 해결방안

**작성일**: 2026-02-02  
**문제**: "Direct 159 / keywert 1" 집계 오류  
**상태**: 원인 규명 완료, 구조적 개선 필요

---

## 📌 결론 요약 (한 줄)

> **"Direct 159 / keywert 1"은 UTM 저장 문제가 아니라,
> `marketing_campaign_link_id` 자체가 저장되지 않은 유입이 대량 존재해서 발생한 집계 오류다.**
> → 복원은 불가능, **원인 규명 + 집계 로직 보정**이 필요하다.

---

## 1️⃣ 지금 상태가 의미하는 것 (정확한 해석)

### DB 사실관계 (이미 검증 완료)

- `marketing_campaign_link_id IS NOT NULL` → **1건**
- 그 1건은 **UTM도 정상 저장**
- `marketing_campaign_link_id IS NOT NULL AND utm_source IS NULL` → **0건**

👉 즉,

- **"링크를 통해 들어왔고, 링크 ID는 있는데 UTM이 안 찍힌 데이터"는 없다**
- 복원 스크립트가 할 수 있는 역할은 **100% 완료**

---

## 2️⃣ 그럼 Direct 159는 뭐냐? (원인 후보 축소)

이제 가능한 원인은 **3개로 압축**됩니다.

---

### ✅ 원인 A (가장 유력)

### **링크를 통해 들어왔지만 `marketing_campaign_link_id` 자체가 저장되지 않았다**

이 경우 특징:

- 실제 유입:
  - `short link / 캠페인 링크 / QR / 이메일`
- DB 저장 결과:

  ```
  marketing_campaign_link_id = null
  utm_source = null
  ```
- 집계 결과:
  → **Direct**

📌 즉 **"링크 인식 실패"**이지 UTM 실패가 아님

---

### ⚠️ 원인 B

### short-link → 최종 페이지 리다이렉트 과정에서 파라미터 유실

흐름 예시:

```
/s/903514
 → redirect(/webinar/UUID)
   → register API
```

이 중 하나라도 빠지면:

- `cid` 미전달
- utm 미전달
- 결과적으로 Direct

👉 특히 **Next.js redirect()** + **서버 라우트 체인**에서 자주 발생

---

### ⚠️ 원인 C (가능성 낮음)

### 실제로 진짜 Direct 유입

- 북마크
- 주소창 직접 입력
- 내부 테스트

하지만 **159 vs 1 비율**이면 거의 배제 가능

---

## 3️⃣ 지금 당장 해야 할 "팩트 확인 쿼리"

아래 순서대로 확인하세요.

---

### 🔍 1단계: Direct 159의 실체 확인

```sql
SELECT
  COUNT(*) AS cnt
FROM event_survey_entries
WHERE utm_source IS NULL
  AND marketing_campaign_link_id IS NULL;
```

👉 이 숫자가 **159 근처면**
→ 원인 A/B 확정

---

### 🔍 2단계: 시간대 비교 (캠페인 발송 시점)

```sql
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) FILTER (WHERE utm_source IS NULL) AS direct_cnt,
  COUNT(*) FILTER (WHERE utm_source IS NOT NULL) AS utm_cnt
FROM event_survey_entries
GROUP BY 1
ORDER BY 1 DESC
LIMIT 24;
```

👉 특정 발송 시간대에 Direct가 몰리면
→ **"의도된 캠페인 유입이 Direct로 저장됨" 확정**

---

### 🔍 3단계: 링크 추적 상태 분포 확인

```sql
SELECT
  CASE
    WHEN marketing_campaign_link_id IS NOT NULL AND utm_source IS NOT NULL THEN '링크+UTM 있음'
    WHEN marketing_campaign_link_id IS NOT NULL AND utm_source IS NULL THEN '링크만 있음'
    WHEN marketing_campaign_link_id IS NULL AND utm_source IS NOT NULL THEN 'UTM만 있음'
    ELSE '추적 없음 (Direct)'
  END AS tracking_status,
  COUNT(*) AS cnt
FROM event_survey_entries
GROUP BY 1
ORDER BY 2 DESC;
```

---

## 4️⃣ 이 데이터는 "복원"이 가능한가?

### ❌ 결론: **DB 레벨 복원은 불가**

이유:

- link_id 없음
- utm 없음
- 원본 식별자 없음

👉 **사실 데이터가 없기 때문에**
추정해서 채우는 건 **데이터 위조에 해당**

---

## 5️⃣ 그럼 실무적으로 어떻게 처리해야 하나? (중요)

### ✅ 권장 정책 (EventFlow 기준)

#### 1. 통계 라벨 분리

```
Direct (no tracking)
Campaign (tracked)
```

→ 지금 Direct 159는 **"미추적 캠페인 유입"**

---

#### 2. 보고서 문구 명확화

> "해당 기간 일부 캠페인 유입은 링크 식별자가 저장되지 않아
> Direct로 분류되었으며, 실제 Direct 유입보다 과대 계상되어 있습니다."

---

#### 3. 운영용 '보정 지표'는 따로

- DB 수정 ❌
- 리포트 계산용 보정 ⭕ (선택)

---

## 6️⃣ 재발 방지: 반드시 고쳐야 할 구조 (핵심)

### 🔴 현재 구조의 치명점

- `marketing_campaign_link_id`가
  - **리다이렉트 흐름에 의존**
  - **URL 파라미터에만 의존**

---

### ✅ 필수 개선 지침

#### (1) short-link 단계에서 **서버 세션 고정**

- 최초 `/s/[code]` 접근 시
  - `cid`, `utm_*`를 **서버 세션 or signed cookie**에 저장
- 이후 어떤 redirect를 거쳐도 유지

#### (2) register API는

```
URL > cookie/session > link_meta
```

순서로 **강제 복원**

#### (3) entry 저장 시

```typescript
tracking_snapshot: {
  cid,
  utm_source,
  utm_medium,
  utm_campaign,
  referer,
  user_agent,
  first_visit_at,
  link_id
}
```

JSON으로 **원본 보존**

> ❗ 이후 어떤 집계 버그가 나도 "복원 가능 상태" 유지

---

## 7️⃣ DoD (Definition of Done)

- [ ] Direct 159 중 `marketing_campaign_link_id IS NULL` 비율 확인
- [ ] short-link → register 경로에서 cid 유실 지점 특정
- [ ] redirect 체인에서 query / cookie 유지 여부 점검
- [ ] register API에서 tracking 우선순위 보강
- [ ] tracking_snapshot JSON 필드 추가 (향후 감사/복원용)

---

## 마지막 한 줄 정리

> **이건 데이터 복원 문제가 아니라 "링크 추적이 중간에서 끊긴 사건"이다.**
> 지금 데이터는 **분리해서 설명하고**,
> 구조를 고치지 않으면 **다음 캠페인도 100% 다시 터진다.**

---

## 다음 단계

1. ✅ 팩트 확인 쿼리 실행
2. ✅ short-link → register 전체 추적 시퀀스 다이어그램 작성
3. ✅ tracking_snapshot 스키마 제안
4. ✅ 집계 API 보정 로직 명세
