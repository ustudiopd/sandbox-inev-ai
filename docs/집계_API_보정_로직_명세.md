# 집계 API 보정 로직 명세

**작성일**: 2026-02-02  
**목적**: Direct로 잘못 분류된 항목에 대한 집계 보정  
**원칙**: DB 수정 없이 집계 시점에만 보정

---

## 📋 목차

1. [문제 상황](#문제-상황)
2. [보정 전략](#보정-전략)
3. [구현 명세](#구현-명세)
4. [UI 표시 방법](#ui-표시-방법)

---

## 문제 상황

### 현재 집계 결과

- **Direct (UTM 없음)**: 528개 (99.8%)
- **keywert**: 1개 (0.2%)

### 실제 상황

- 대부분의 항목이 링크를 통해 들어왔지만 `marketing_campaign_link_id`가 저장되지 않음
- 실제 Direct 유입은 매우 적을 것으로 추정

---

## 보정 전략

### ✅ 원칙

1. **DB 수정 금지**: 원본 데이터는 그대로 유지
2. **집계 시점 보정**: API에서 집계할 때만 보정 적용
3. **명확한 라벨링**: 보정된 항목과 실제 Direct 구분

### 📊 보정 방법

#### 방법 1: 라벨 분리 (권장)

```
Direct (no tracking) - 추적 실패로 인한 Direct
Direct (actual) - 실제 Direct 유입
```

#### 방법 2: 주석 추가

```
Direct (UTM 없음) - *일부는 추적 실패로 인한 오분류일 수 있음
```

#### 방법 3: 별도 집계

```
Tracked Conversions: X개
Untracked Conversions: Y개 (Direct로 표시)
  - 실제 Direct: Z개
  - 추적 실패: Y-Z개
```

---

## 구현 명세

### 파일: `app/api/clients/[clientId]/campaigns/summary/route.ts`

#### 변경 사항

1. **집계 시 라벨 분리**

```typescript
// Source별 집계
const sourceMap = new Map<string | null, number>()
const untrackedMap = new Map<string, number>() // 추적 실패 항목

entries?.forEach(item => {
  const key = item.utm_source || null
  
  if (key === null) {
    // 추적 실패 항목 (marketing_campaign_link_id가 없으면 추적 실패 가능성 높음)
    if (!item.marketing_campaign_link_id) {
      untrackedMap.set('untracked', (untrackedMap.get('untracked') || 0) + 1)
    }
  }
  
  sourceMap.set(key, (sourceMap.get(key) || 0) + 1)
})

const conversions_by_source = Array.from(sourceMap.entries())
  .map(([source, count]) => ({
    source: source === null ? 'Direct (no tracking)' : source,
    count,
    // 추적 실패 항목이면 플래그 추가
    is_untracked: source === null && untrackedMap.get('untracked') > 0,
  }))
  .sort((a, b) => b.count - a.count)
```

2. **메타데이터 추가**

```typescript
const result = {
  total_conversions: totalConversions || 0,
  conversions_by_source,
  conversions_by_medium,
  conversions_by_campaign,
  conversions_by_combo,
  conversions_by_link,
  // ✨ 새로 추가: 추적 상태 메타데이터
  tracking_metadata: {
    total_tracked: entries?.filter(e => e.utm_source !== null).length || 0,
    total_untracked: entries?.filter(e => 
      e.utm_source === null && e.marketing_campaign_link_id === null
    ).length || 0,
    tracking_success_rate: totalConversions 
      ? ((entries?.filter(e => e.utm_source !== null).length || 0) / totalConversions * 100).toFixed(1)
      : '0.0',
  },
  date_range: {
    from,
    to,
  },
}
```

---

### 파일: `app/(client)/client/[clientId]/campaigns/components/CampaignsPageClient.tsx`

#### 변경 사항

1. **UI에 추적 상태 표시**

```typescript
const formatSource = (source: string | null, isUntracked?: boolean) => {
  if (!source) {
    return isUntracked 
      ? 'Direct (no tracking)' 
      : 'Direct (UTM 없음)'
  }
  return source
}

// Source별 전환 섹션
<div className="bg-white rounded-lg shadow-sm p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Source별 전환</h2>
  
  {/* 추적 상태 요약 */}
  {summary.tracking_metadata && (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800">
        <strong>추적 성공률:</strong> {summary.tracking_metadata.tracking_success_rate}%
        {' '}(추적 성공: {summary.tracking_metadata.total_tracked}개, 
        추적 실패: {summary.tracking_metadata.total_untracked}개)
      </p>
      <p className="text-xs text-yellow-600 mt-1">
        * "Direct (no tracking)"은 링크를 통해 들어왔지만 추적 정보가 저장되지 않은 항목일 수 있습니다.
      </p>
    </div>
  )}
  
  <div className="space-y-2">
    {summary.conversions_by_source.length === 0 ? (
      <p className="text-gray-500">데이터가 없습니다</p>
    ) : (
      summary.conversions_by_source.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">{formatSource(item.source, item.is_untracked)}</span>
            {item.is_untracked && (
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                추적 실패 가능
              </span>
            )}
          </div>
          <span className="font-semibold text-gray-900">{item.count.toLocaleString()}</span>
        </div>
      ))
    )}
  </div>
</div>
```

---

## UI 표시 방법

### 옵션 1: 라벨 분리 (권장)

```
Source별 전환
├─ newsletter: 50개
├─ google: 30개
├─ Direct (no tracking): 528개 ⚠️
└─ Direct (actual): 2개
```

### 옵션 2: 툴팁/주석

```
Source별 전환
├─ newsletter: 50개
├─ google: 30개
└─ Direct (UTM 없음): 530개
   ⚠️ 일부는 추적 실패로 인한 오분류일 수 있습니다.
```

### 옵션 3: 별도 섹션

```
📊 추적 상태 요약
├─ 추적 성공: 81개 (15.3%)
├─ 추적 실패: 448개 (84.7%)
└─ 실제 Direct: 2개 (0.4%)

📈 Source별 전환 (추적 성공 항목만)
├─ newsletter: 50개
├─ google: 30개
└─ keywert: 1개
```

---

## 집계 보정 로직 상세

### 1. 추적 실패 판단 기준

```typescript
function isUntracked(entry: any): boolean {
  // UTM이 없고 링크 ID도 없으면 추적 실패 가능성 높음
  return (
    entry.utm_source === null &&
    entry.marketing_campaign_link_id === null
  )
}
```

### 2. 실제 Direct 판단 기준

```typescript
function isActualDirect(entry: any): boolean {
  // UTM이 없고, 링크 ID도 없고, referer도 없으면 실제 Direct 가능성 높음
  return (
    entry.utm_source === null &&
    entry.marketing_campaign_link_id === null &&
    (!entry.utm_referrer || entry.utm_referrer === 'direct')
  )
}
```

### 3. 집계 시 분류

```typescript
const sourceMap = new Map<string | null, number>()
const untrackedCount = 0
const actualDirectCount = 0

entries?.forEach(item => {
  if (isUntracked(item)) {
    if (isActualDirect(item)) {
      actualDirectCount++
      sourceMap.set('Direct (actual)', (sourceMap.get('Direct (actual)') || 0) + 1)
    } else {
      untrackedCount++
      sourceMap.set('Direct (no tracking)', (sourceMap.get('Direct (no tracking)') || 0) + 1)
    }
  } else {
    const key = item.utm_source || null
    sourceMap.set(key, (sourceMap.get(key) || 0) + 1)
  }
})
```

---

## 예상 결과

### Before (현재)

```json
{
  "conversions_by_source": [
    { "source": null, "count": 528 },
    { "source": "keywert", "count": 1 }
  ]
}
```

### After (보정 후)

```json
{
  "conversions_by_source": [
    { "source": "Direct (no tracking)", "count": 448, "is_untracked": true },
    { "source": "Direct (actual)", "count": 80, "is_untracked": false },
    { "source": "keywert", "count": 1, "is_untracked": false }
  ],
  "tracking_metadata": {
    "total_tracked": 1,
    "total_untracked": 448,
    "tracking_success_rate": "0.2"
  }
}
```

---

## DoD (Definition of Done)

- [ ] 집계 API에 추적 상태 메타데이터 추가
- [ ] Source별 집계 시 라벨 분리 로직 구현
- [ ] UI에 추적 성공률 표시 추가
- [ ] "Direct (no tracking)" 라벨 및 설명 추가
- [ ] 추적 실패 항목에 대한 시각적 표시 추가

---

## 관련 문서

- [UTM 추적 문제 원인 규명 및 해결방안](./UTM_추적_문제_원인_규명_및_해결방안.md)
- [링크 추적 구조 개선 방안](./링크_추적_구조_개선_방안.md)
