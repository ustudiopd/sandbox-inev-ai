# CID 기반 집계 핫픽스 검토 보고서

**작성일**: 2026-02-06  
**작성자**: Cursor Agent  
**상태**: 검토 완료

---

## 📋 요구사항 요약

### 핵심 요구사항
1. **DB 무변경**: API 레벨에서만 수정
2. **CID를 '발송 배치/오디언스 그룹 키'로 취급**: 링크 식별자가 아닌 그룹핑 키로 사용
3. **화면별 집계 차원 분리**:
   - **전체 성과(캠페인 링크)**: `campaign_id + cid` 기준으로 CID별 분리
   - **전환효과(전환성과)**: `utm_source + utm_medium + utm_campaign` 기준으로 CID 합산

### 예시 시나리오
- 이메일 채널에 CID 2개: `0EC7X3G2`, `BEUXT27K`
- **전체 성과 화면**: CID별로 분리되어 각각 캠페인별 집계
- **전환효과 화면**: 이메일 카테고리로 묶여서 표시

---

## 🔍 현재 코드 상태 분석

### 1. 데이터 저장 현황

#### `event_access_logs` 테이블
- ✅ `cid` 컬럼 존재 (마이그레이션 `078_add_cid_to_event_access_logs.sql`)
- ✅ Visit API에서 `cid` 저장됨 (`/api/public/campaigns/[campaignId]/visit`)

#### `event_survey_entries` 테이블
- ✅ `registration_data` JSONB 필드에 `cid` 저장됨
- ✅ UTM 파라미터는 별도 컬럼에 저장 (`utm_source`, `utm_medium`, `utm_campaign`)
- ✅ `marketing_campaign_link_id` 컬럼 존재

### 2. 현재 집계 로직 분석

#### `/api/clients/[clientId]/campaigns/summary` (전체 성과 + 전환효과)

**현재 집계 키:**
- **링크별 집계**: `marketing_campaign_link_id` 또는 UTM 조합으로 매칭
- **조합별 집계**: `utm_source + utm_medium + utm_campaign`
- **CID는 집계 키에 포함되지 않음**

**문제점:**
1. ❌ CID별로 분리되지 않음
2. ❌ 같은 UTM 조합의 다른 CID가 합산됨
3. ❌ `conversions_by_link`에서 CID 정보 없음

#### `/api/clients/[clientId]/campaigns/links` (캠페인 링크 목록)

**현재 집계 키:**
- `marketing_campaign_link_id` 기준으로 집계
- CID는 링크 메타데이터의 `cid` 필드로만 표시

**문제점:**
1. ❌ CID별로 분리되지 않음
2. ❌ 같은 링크의 다른 CID가 합산됨
3. ❌ `campaign_id + cid` 조합으로 집계하지 않음

---

## ✅ 핫픽스 구현 계획

### 1. 전체 성과(캠페인 링크) 집계 수정

#### 1.1 `conversions_by_link` 수정

**현재 코드 위치**: `app/api/clients/[clientId]/campaigns/summary/route.ts`
- `getSummaryFromAggregated()` 함수 (405-516줄)
- `getSummaryFromRaw()` 함수 (739-832줄)

**수정 내용:**
```typescript
// 기존: marketing_campaign_link_id 또는 UTM으로 매칭
// 수정: campaign_id + cid 조합으로 집계

// Raw 데이터에서 CID 추출
const { data: rawEntries } = await admin
  .from('event_survey_entries')
  .select('campaign_id, marketing_campaign_link_id, utm_source, utm_medium, utm_campaign, registration_data')
  .in('campaign_id', campaignIds)
  .gte('created_at', fromDateUTC.toISOString())
  .lte('created_at', toDateUTC.toISOString())

// 집계 키: campaign_id + cid
const linkMap = new Map<string, { conversions: number; visits: number; cid: string | null }>()
rawEntries?.forEach(entry => {
  // CID 추출 (registration_data에서)
  const cid = entry.registration_data?.cid || null
  
  // 집계 키 생성: campaign_id + cid
  const key = `${entry.campaign_id}|${cid || '__no_cid__'}`
  
  const existing = linkMap.get(key) || { conversions: 0, visits: 0, cid }
  linkMap.set(key, {
    conversions: existing.conversions + 1,
    visits: existing.visits,
    cid: cid || existing.cid
  })
})
```

**링크 표시 이름:**
```typescript
// 링크 메타데이터에서 이름 가져오기
const linkMeta = allLinks?.find((m: any) => m.id === linkId)
const linkName = linkMeta?.name || 'Unknown Link'

// CID가 있으면 이름에 추가
const displayName = cid 
  ? `${linkName} (${cid})` 
  : linkName
```

#### 1.2 Visits 배분 로직

**배분 공식:**
```typescript
// 전체 Visits를 CID별 전환 비율로 배분
const totalVisits = /* 전체 Visits */
const totalConversions = /* 전체 전환 */

rawEntries?.forEach(entry => {
  const cid = entry.registration_data?.cid || null
  const key = `${entry.campaign_id}|${cid || '__no_cid__'}`
  
  const stat = linkMap.get(key)!
  // 전환 비율로 Visits 배분
  const conversionRatio = stat.conversions / totalConversions
  stat.visits = Math.round(totalVisits * conversionRatio)
})
```

### 2. 전환효과(전환성과) 집계 수정

#### 2.1 `conversions_by_combo` 수정

**현재 코드 위치**: `app/api/clients/[clientId]/campaigns/summary/route.ts`
- `getSummaryFromAggregated()` 함수 (318-403줄)
- `getSummaryFromRaw()` 함수 (680-737줄)

**수정 내용:**
```typescript
// 기존: utm_source + utm_medium + utm_campaign 조합
// 수정: 동일 (CID는 집계 키에서 제외, 합산만)

// 집계 키: utm_source + utm_medium + utm_campaign (CID 제외)
const comboMap = new Map<string, { conversions: number; visits: number }>()
rawEntries?.forEach(entry => {
  const source = entry.utm_source || null
  const medium = entry.utm_medium || null
  const campaign = entry.utm_campaign || null
  
  const key = `${source}|${medium}|${campaign}`
  const existing = comboMap.get(key) || { conversions: 0, visits: 0 }
  comboMap.set(key, {
    conversions: existing.conversions + 1,
    visits: existing.visits
  })
})

// Visits 배분: 카테고리별 전환 비율로 배분
const totalVisits = /* 전체 Visits */
const totalConversions = /* 전체 전환 */

comboMap.forEach((stat, key) => {
  const conversionRatio = stat.conversions / totalConversions
  stat.visits = Math.round(totalVisits * conversionRatio)
})
```

**주의사항:**
- ✅ CID는 집계 키에서 제외
- ✅ 같은 UTM 조합의 모든 CID가 합산됨
- ✅ Visits는 배분값으로 계산

### 3. 캠페인 링크 목록 API 수정

#### 3.1 `/api/clients/[clientId]/campaigns/links` 수정

**현재 코드 위치**: `app/api/clients/[clientId]/campaigns/links/route.ts`
- GET 핸들러 (13-236줄)

**수정 내용:**
```typescript
// 기존: marketing_campaign_link_id 기준 집계
// 수정: campaign_id + cid 기준 집계

// Raw 데이터에서 CID별 집계
const { data: rawEntries } = await admin
  .from('event_survey_entries')
  .select('campaign_id, marketing_campaign_link_id, registration_data')
  .eq('marketing_campaign_link_id', link.id) // 링크 ID로 필터링
  .gte('created_at', fromDateTime.toISOString())
  .lte('created_at', toDateTime.toISOString())

// CID별로 그룹핑
const cidMap = new Map<string, { conversions: number; visits: number }>()
rawEntries?.forEach(entry => {
  const cid = entry.registration_data?.cid || '__no_cid__'
  const existing = cidMap.get(cid) || { conversions: 0, visits: 0 }
  cidMap.set(cid, {
    conversions: existing.conversions + 1,
    visits: existing.visits
  })
})

// CID별로 링크 항목 생성
const linksWithStats = Array.from(cidMap.entries()).map(([cid, data]) => ({
  ...link,
  cid: cid === '__no_cid__' ? null : cid,
  conversion_count: data.conversions,
  visits_count: data.visits, // 배분값
  link_name: cid ? `${link.name} (${cid})` : link.name
}))
```

---

## ⚠️ 주의사항 및 제약사항

### 1. 데이터 제약사항

#### CID 저장 위치
- `event_access_logs`: `cid` 컬럼에 직접 저장 ✅
- `event_survey_entries`: `registration_data` JSONB 필드에 저장 ✅

#### CID 추출 방법
```typescript
// event_survey_entries에서 CID 추출
const cid = entry.registration_data?.cid || null

// event_access_logs에서 CID 추출
const cid = visit.cid || null
```

### 2. Visits 배분 로직

**배분 공식:**
```
visits_cid = total_visits * (conversions_cid / conversions_total)
```

**주의사항:**
- 배분값은 근사치일 수 있음
- UI에 "(배분)" 라벨 표시 필수
- Tooltip으로 설명 추가 권장

### 3. 전환 총합 일치 조건

**요구사항:**
- 전환 총합 = CID 있는 전환 합 (496)
- CID 없는 전환은 제외하거나 별도 표시

**구현:**
```typescript
// CID 있는 전환만 카운트
const totalConversions = rawEntries
  .filter(entry => entry.registration_data?.cid)
  .length
```

### 4. 성능 고려사항

**현재 쿼리:**
- `event_survey_entries` 전체 조회 후 메모리에서 집계
- `registration_data` JSONB 필드 조회 필요

**최적화 방안:**
- JSONB 필드 인덱스 활용
- 필요한 필드만 SELECT
- 날짜 범위 필터링 필수

---

## 📝 구현 체크리스트

### Phase 1: 전체 성과(캠페인 링크) 수정

- [ ] `getSummaryFromAggregated()` 함수 수정
  - [ ] `conversions_by_link` 집계 키를 `campaign_id + cid`로 변경
  - [ ] CID 추출 로직 추가 (`registration_data`에서)
  - [ ] 링크 표시 이름에 CID 추가
  - [ ] Visits 배분 로직 추가

- [ ] `getSummaryFromRaw()` 함수 수정
  - [ ] `conversions_by_link` 집계 키를 `campaign_id + cid`로 변경
  - [ ] CID 추출 로직 추가
  - [ ] 링크 표시 이름에 CID 추가
  - [ ] Visits 배분 로직 추가

### Phase 2: 전환효과(전환성과) 수정

- [ ] `getSummaryFromAggregated()` 함수 수정
  - [ ] `conversions_by_combo` 집계 키 유지 (CID 제외)
  - [ ] CID 있는 전환만 카운트
  - [ ] Visits 배분 로직 추가 (카테고리별)

- [ ] `getSummaryFromRaw()` 함수 수정
  - [ ] `conversions_by_combo` 집계 키 유지 (CID 제외)
  - [ ] CID 있는 전환만 카운트
  - [ ] Visits 배분 로직 추가

### Phase 3: 캠페인 링크 목록 API 수정

- [ ] `/api/clients/[clientId]/campaigns/links` GET 핸들러 수정
  - [ ] CID별로 링크 항목 분리
  - [ ] 집계 키를 `campaign_id + cid`로 변경
  - [ ] 링크 표시 이름에 CID 추가
  - [ ] Visits 배분 로직 추가

### Phase 4: UI 수정 (별도 작업)

- [ ] Visits 옆에 "(배분)" 라벨 추가
- [ ] Tooltip으로 배분 설명 추가
- [ ] 링크 이름에 CID 표시 확인

---

## 🔄 마이그레이션 전략

### 데이터 마이그레이션 불필요
- ✅ DB 스키마 변경 없음
- ✅ 기존 데이터 그대로 사용
- ✅ API 레벨에서만 집계 로직 변경

### 롤백 계획
- 기존 코드로 롤백 가능
- 데이터 손실 없음

---

## 📊 예상 결과

### 전체 성과(캠페인 링크) 화면

**Before:**
```
개인화메일: 전환 496, Visits 1000
```

**After:**
```
개인화메일 (0EC7X3G2): 전환 248, Visits 500 (배분)
개인화메일 (BEUXT27K): 전환 248, Visits 500 (배분)
```

### 전환효과(전환성과) 화면

**Before:**
```
stibee / crmemail / 202602: 전환 496, Visits 1000
```

**After:**
```
stibee / crmemail / 202602: 전환 496, Visits 1000 (배분)
```

---

## ✅ 검토 완료 사항

1. ✅ DB 스키마 확인: CID 저장 위치 확인 완료
2. ✅ 현재 집계 로직 분석 완료
3. ✅ 수정 필요 부분 식별 완료
4. ✅ 구현 계획 수립 완료
5. ✅ 제약사항 및 주의사항 정리 완료

---

## 🚀 다음 단계

1. **구현 시작**: 위 체크리스트 순서대로 구현
2. **테스트**: CID별 집계 정확성 확인
3. **배포**: 단계별 배포 및 모니터링

---

## 📌 참고사항

### 관련 파일
- `app/api/clients/[clientId]/campaigns/summary/route.ts`
- `app/api/clients/[clientId]/campaigns/links/route.ts`
- `app/api/public/campaigns/[campaignId]/visit/route.ts`
- `app/api/public/event-survey/[campaignId]/register/route.ts`

### 관련 마이그레이션
- `078_add_cid_to_event_access_logs.sql`
- `063_add_utm_tracking_to_entries.sql`

---

**검토 완료일**: 2026-02-06  
**검토자**: Cursor Agent
