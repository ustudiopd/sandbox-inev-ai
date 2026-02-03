# AI 분석 보고서 디자인 명세서

## 📋 목차

1. [디자인 시스템 개요](#1-디자인-시스템-개요)
2. [색상 체계](#2-색상-체계)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 구조](#4-레이아웃-구조)
5. [그래프 디자인](#5-그래프-디자인)
6. [카드 컴포넌트](#6-카드-컴포넌트)
7. [모달 UI](#7-모달-ui)
8. [반응형 디자인](#8-반응형-디자인)
9. [재사용 가능한 컴포넌트](#9-재사용-가능한-컴포넌트)
10. [이식 가이드](#10-이식-가이드)

---

## 1. 디자인 시스템 개요

### 1.1 디자인 철학

- **명확성**: 데이터를 명확하고 이해하기 쉽게 표현
- **일관성**: 모든 요소에서 일관된 디자인 언어 사용
- **접근성**: 색상 대비 및 가독성 고려
- **미니멀리즘**: 불필요한 장식 제거, 핵심 정보에 집중

### 1.2 기술 스택

- **UI 프레임워크**: React + TypeScript
- **스타일링**: Tailwind CSS
- **차트 라이브러리**: Recharts
- **아이콘**: Lucide React (선택)

### 1.3 디자인 토큰

```typescript
// 색상 팔레트
const colors = {
  // Primary (Cyan)
  primary: '#06b6d4',      // cyan-500
  primaryLight: '#67e8f9',  // cyan-300
  primaryDark: '#0891b2',  // cyan-600
  
  // Secondary (Purple)
  secondary: '#8b5cf6',    // violet-500
  secondaryLight: '#a78bfa', // violet-400
  secondaryDark: '#7c3aed', // violet-600
  
  // Neutral
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Status Colors
  success: '#10b981',      // green-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444',        // red-500
  info: '#3b82f6',         // blue-500
};

// 간격 시스템
const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
};

// 타이포그래피 스케일
const typography = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
};
```

---

## 2. 색상 체계

### 2.1 주요 색상

#### Primary (Cyan) - 메인 액션 및 강조
- **사용 용도**: 
  - 페이지뷰 라인 그래프 (`#06b6d4`)
  - 현재 기간 바 차트 (`#06b6d4`)
  - 링크 및 버튼
  - 강조 텍스트

#### Secondary (Purple) - 보조 데이터
- **사용 용도**:
  - 방문자 라인 그래프 (`#8b5cf6`)
  - 보조 바 차트 (`#8b5cf6`)
  - 보조 정보 표시

#### Neutral (Slate) - 텍스트 및 배경
- **사용 용도**:
  - 텍스트: `slate-900` (제목), `slate-700` (본문), `slate-600` (보조)
  - 배경: `slate-50` (카드 배경), `slate-100` (섹션 배경)
  - 테두리: `slate-200`, `slate-300`

### 2.2 상태 색상

#### Success (Green) - 긍정적 지표
```tsx
// 사용 예시
className="bg-green-50 border-green-200 text-green-700"
```
- **사용 용도**: 
  - 긍정적 인사이트 카드
  - 증가 추세 표시
  - Web Vitals "good" 상태

#### Warning (Yellow/Amber) - 주의 필요
```tsx
className="bg-yellow-50 border-yellow-200 text-yellow-700"
```
- **사용 용도**:
  - 주의 인사이트 카드
  - Web Vitals "needs-improvement" 상태
  - 중간 우선순위 태그

#### Error (Red) - 부정적 지표
```tsx
className="bg-red-50 border-red-200 text-red-700"
```
- **사용 용도**:
  - 부정적 인사이트 카드
  - 감소 추세 표시
  - Web Vitals "poor" 상태
  - 높은 우선순위 태그

#### Info (Blue) - 정보성
```tsx
className="bg-blue-50 border-blue-200 text-blue-700"
```
- **사용 용도**:
  - 정보성 인사이트 카드
  - 카테고리 태그
  - 일반 버튼

---

## 3. 타이포그래피

### 3.1 계층 구조

```tsx
// 제목 계층
<h2 className="text-xl font-bold text-slate-900">        // 모달 제목
<h3 className="text-lg font-bold text-slate-900 mb-3">  // 섹션 제목
<h4 className="text-md font-semibold text-slate-900 mb-3"> // 하위 섹션 제목
<h5 className="text-sm font-semibold text-slate-900 mb-2"> // 카드 제목

// 본문
<p className="text-slate-700 whitespace-pre-line">       // 본문 텍스트
<p className="text-sm text-slate-700">                  // 작은 본문
<p className="text-xs text-slate-600">                  // 보조 텍스트
<p className="text-xs text-slate-500">                  // 최소 텍스트
```

### 3.2 숫자 표시

```tsx
// 큰 숫자 (메트릭)
<div className="text-2xl font-bold text-slate-900">
  {value.toLocaleString()}
</div>

// 중간 숫자
<div className="text-lg font-bold text-slate-900">
  {value.toLocaleString()}
</div>

// 작은 숫자
<div className="text-sm text-slate-600">
  {value.toLocaleString()}
</div>
```

---

## 4. 레이아웃 구조

### 4.1 모달 구조

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
    {/* 헤더 (Sticky) */}
    <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      {/* 제목 및 메타 정보 */}
      {/* 액션 버튼 */}
    </div>
    
    {/* 본문 */}
    <div className="p-6 space-y-6">
      {/* 섹션들 */}
    </div>
  </div>
</div>
```

### 4.2 섹션 구조

```tsx
<div>
  <h3 className="text-lg font-bold text-slate-900 mb-3">섹션 제목</h3>
  
  {/* 콘텐츠 */}
  <div className="space-y-3">
    {/* 카드 또는 그래프 */}
  </div>
</div>
```

### 4.3 그리드 레이아웃

```tsx
// 2열 그리드
<div className="grid grid-cols-2 gap-4">
  {/* 카드들 */}
</div>

// 3열 그리드 (반응형)
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  {/* 카드들 */}
</div>
```

---

## 5. 그래프 디자인

### 5.1 Line Chart (일별 트래픽 추이)

#### 디자인 스펙

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    {/* 그리드 */}
    <CartesianGrid 
      strokeDasharray="3 3" 
      stroke="#e2e8f0"  // slate-200
    />
    
    {/* X축 */}
    <XAxis
      dataKey="day"
      stroke="#cbd5e1"  // slate-300
      tick={{ fill: '#64748b', fontSize: 12 }}  // slate-500
      tickFormatter={(value) => {
        const date = new Date(value);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }}
    />
    
    {/* Y축 */}
    <YAxis 
      stroke="#cbd5e1" 
      tick={{ fill: '#64748b', fontSize: 12 }} 
    />
    
    {/* 툴팁 */}
    <Tooltip
      contentStyle={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
      labelStyle={{ color: '#1e293b' }}
    />
    
    {/* 범례 */}
    <Legend />
    
    {/* 라인 1: 페이지뷰 */}
    <Line
      type="monotone"
      dataKey="pageviews"
      stroke="#06b6d4"  // cyan-500
      strokeWidth={2}
      name="페이지뷰"
      dot={{ fill: '#06b6d4', r: 3 }}
    />
    
    {/* 라인 2: 방문자 */}
    <Line
      type="monotone"
      dataKey="uniques"
      stroke="#8b5cf6"  // violet-500
      strokeWidth={2}
      name="방문자"
      dot={{ fill: '#8b5cf6', r: 3 }}
    />
  </LineChart>
</ResponsiveContainer>
```

#### 색상 매핑
- **페이지뷰**: `#06b6d4` (cyan-500)
- **방문자**: `#8b5cf6` (violet-500)

#### 데이터 형식
```typescript
interface DailyStat {
  day: string;        // "2025-01-15"
  pageviews: number;
  uniques: number;
}
```

---

### 5.2 Bar Chart (이전 기간 비교)

#### 디자인 스펙

```tsx
<ResponsiveContainer width="100%" height={250}>
  <BarChart data={[
    {
      name: '페이지뷰',
      현재: currentPageviews,
      이전: previousPageviews,
    },
    {
      name: '방문자',
      현재: currentUniques,
      이전: previousUniques,
    },
  ]}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
    <XAxis 
      dataKey="name" 
      stroke="#cbd5e1" 
      tick={{ fill: '#64748b', fontSize: 12 }} 
    />
    <YAxis 
      stroke="#cbd5e1" 
      tick={{ fill: '#64748b', fontSize: 12 }} 
    />
    <Tooltip
      contentStyle={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
      }}
    />
    <Legend />
    <Bar 
      dataKey="현재" 
      fill="#06b6d4"  // cyan-500
      radius={[4, 4, 0, 0]}  // 상단 모서리 둥글게
    />
    <Bar 
      dataKey="이전" 
      fill="#94a3b8"  // slate-400
      radius={[4, 4, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
```

#### 색상 매핑
- **현재 기간**: `#06b6d4` (cyan-500)
- **이전 기간**: `#94a3b8` (slate-400)

---

### 5.3 Horizontal Bar Chart (인기 페이지)

#### 디자인 스펙

```tsx
<ResponsiveContainer width="100%" height={250}>
  <BarChart
    data={topPages.slice(0, 5).map(page => ({
      name: page.page_path.length > 30 
        ? page.page_path.substring(0, 30) + '...' 
        : page.page_path,
      pageviews: page.pageviews,
      uniques: page.uniques,
    }))}
    layout="vertical"
  >
    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
    <XAxis 
      type="number" 
      stroke="#cbd5e1" 
      tick={{ fill: '#64748b', fontSize: 12 }} 
    />
    <YAxis 
      type="category" 
      dataKey="name" 
      stroke="#cbd5e1" 
      tick={{ fill: '#64748b', fontSize: 11 }}
      width={150}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
      }}
    />
    <Legend />
    <Bar 
      dataKey="pageviews" 
      fill="#06b6d4" 
      radius={[0, 4, 4, 0]}  // 오른쪽 모서리 둥글게
      name="페이지뷰" 
    />
    <Bar 
      dataKey="uniques" 
      fill="#8b5cf6" 
      radius={[0, 4, 4, 0]} 
      name="방문자" 
    />
  </BarChart>
</ResponsiveContainer>
```

---

### 5.4 Radar Chart (Web Vitals)

#### 디자인 스펙

```tsx
<ResponsiveContainer width="100%" height={300}>
  <RadarChart data={metrics.map((m) => {
    // 각 메트릭의 최대값 설정 (정규화용)
    let maxValue = 2500;
    if (m.name === 'CLS') maxValue = 0.25;
    else if (m.name === 'INP') maxValue = 500;
    else if (m.name === 'FCP') maxValue = 1800;
    else if (m.name === 'TTFB') maxValue = 800;
    else if (m.name === 'FID') maxValue = 100;
    
    return {
      metric: m.name,
      value: m.value,
      fullMark: maxValue,
      status: m.status,
    };
  })}>
    <PolarGrid />
    <PolarAngleAxis 
      dataKey="metric" 
      tick={{ fill: '#64748b', fontSize: 12 }} 
    />
    <PolarRadiusAxis 
      angle={90} 
      domain={[0, 'dataMax']} 
      tick={{ fill: '#64748b', fontSize: 10 }} 
    />
    <Radar
      name="값"
      dataKey="value"
      stroke="#06b6d4"
      fill="#06b6d4"
      fillOpacity={0.6}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
      }}
      formatter={(value: number, name: string, props: any) => {
        const metric = props.payload.metric;
        if (metric === 'CLS') {
          return [value.toFixed(3), 'CLS'];
        }
        return [value.toLocaleString(), name];
      }}
    />
  </RadarChart>
</ResponsiveContainer>
```

#### 메트릭별 최대값
- **LCP**: 2500ms
- **CLS**: 0.25
- **INP**: 500ms
- **FCP**: 1800ms
- **TTFB**: 800ms
- **FID**: 100ms

---

## 6. 카드 컴포넌트

### 6.1 메트릭 카드

```tsx
<div className="p-4 bg-slate-50 rounded-lg">
  <div className="text-sm text-slate-600 mb-1">라벨</div>
  <div className="text-2xl font-bold text-slate-900">
    {value.toLocaleString()}
  </div>
  {subLabel && (
    <div className="text-xs text-slate-500 mt-1">{subLabel}</div>
  )}
</div>
```

### 6.2 인사이트 카드

```tsx
<div className={`p-4 rounded-lg border ${
  type === 'positive'
    ? 'bg-green-50 border-green-200'
    : type === 'warning'
    ? 'bg-yellow-50 border-yellow-200'
    : type === 'negative'
    ? 'bg-red-50 border-red-200'
    : 'bg-blue-50 border-blue-200'
}`}>
  <div className="flex items-start justify-between mb-2">
    <h4 className="font-bold text-slate-900">{title}</h4>
    <span className={`px-2 py-1 text-xs rounded ${
      priority === 'high'
        ? 'bg-red-100 text-red-700'
        : priority === 'medium'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-slate-100 text-slate-700'
    }`}>
      {priority === 'high' ? '높음' : priority === 'medium' ? '중간' : '낮음'}
    </span>
  </div>
  <p className="text-sm text-slate-700 mb-2">{description}</p>
  {evidence && (
    <div className="text-xs text-slate-600 mt-2">
      근거: {evidence.metric}
      {evidence.current !== undefined && ` (현재: ${evidence.current})`}
      {evidence.changePct !== undefined && 
        ` (변화: ${evidence.changePct > 0 ? '+' : ''}${evidence.changePct.toFixed(1)}%)`}
    </div>
  )}
  <div className="text-xs text-slate-500 mt-1">
    신뢰도: {confidence === 'high' ? '높음' : confidence === 'medium' ? '중간' : '낮음'}
  </div>
</div>
```

### 6.3 비교 카드

```tsx
<div className="text-center p-4 bg-slate-50 rounded-lg">
  <div className="text-sm text-slate-600 mb-1">라벨</div>
  <div className={`text-2xl font-bold ${
    trend === 'up'
      ? 'text-green-600'
      : trend === 'down'
      ? 'text-red-600'
      : 'text-slate-600'
  }`}>
    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
    {Math.abs(change).toLocaleString()}
  </div>
  <div className="text-xs text-slate-500 mt-1">
    {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
  </div>
</div>
```

### 6.4 Web Vitals 메트릭 카드

```tsx
<div className="p-3 bg-slate-50 rounded-lg">
  <div className="flex items-center justify-between mb-1">
    <span className="text-sm font-semibold text-slate-900">
      {metric.name}
      {metric.name === 'CLS' && (
        <span className="text-xs text-slate-500 ml-1">(목표: ≤0.1)</span>
      )}
    </span>
    <span className={`px-2 py-0.5 text-xs rounded ${
      metric.status === 'good'
        ? 'bg-green-100 text-green-700'
        : metric.status === 'needs-improvement'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700'
    }`}>
      {metric.status === 'good' ? '양호' : 
       metric.status === 'needs-improvement' ? '개선 필요' : '불량'}
    </span>
  </div>
  <div className={`text-lg font-bold ${
    isPoor ? 'text-red-600' : 'text-slate-900'
  }`}>
    {metric.name === 'CLS' ? metric.value.toFixed(3) : metric.value.toLocaleString()}
  </div>
  {isAbnormal && (
    <div className="text-xs text-red-700 mt-1 font-semibold">
      ⚠️ 비정상적으로 높은 값입니다. 파이프라인 검증 필요
    </div>
  )}
  {metric.recommendation && (
    <div className="text-xs text-slate-600 mt-1">{metric.recommendation}</div>
  )}
</div>
```

---

## 7. 모달 UI

### 7.1 모달 구조

```tsx
{/* 오버레이 */}
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  {/* 모달 컨테이너 */}
  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
    {/* 헤더 (Sticky) */}
    <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">제목</h2>
        <p className="text-xs text-slate-600 mt-1">부제목</p>
      </div>
      <div className="flex gap-2">
        {/* 액션 버튼들 */}
        <button className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors">
          액션
        </button>
        <button className="text-slate-500 hover:text-slate-700">
          ✕
        </button>
      </div>
    </div>
    
    {/* 본문 */}
    <div className="p-6 space-y-6">
      {/* 섹션들 */}
    </div>
  </div>
</div>
```

### 7.2 스크롤 동작

- **모달 컨테이너**: `max-h-[90vh] overflow-y-auto`
- **헤더**: `sticky top-0` (스크롤 시 상단 고정)
- **본문**: `space-y-6` (섹션 간 간격)

---

## 8. 반응형 디자인

### 8.1 브레이크포인트

```tsx
// Tailwind 기본 브레이크포인트
sm: '640px'   // 모바일 가로
md: '768px'   // 태블릿
lg: '1024px'  // 데스크톱
xl: '1280px'  // 큰 데스크톱
```

### 8.2 반응형 패턴

```tsx
// 그리드 반응형
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  {/* 카드들 */}
</div>

// 텍스트 반응형
<h2 className="text-lg md:text-xl font-bold">
  제목
</h2>

// 간격 반응형
<div className="p-4 md:p-6">
  콘텐츠
</div>
```

### 8.3 모바일 최적화

- **모달**: `p-4` (모바일 패딩)
- **그래프 높이**: 모바일에서 `height={250}`, 데스크톱에서 `height={300}`
- **텍스트 크기**: 모바일에서 작게, 데스크톱에서 크게

---

## 9. 재사용 가능한 컴포넌트

### 9.1 ReportModal 컴포넌트 구조

```tsx
interface ReportModalProps {
  report: AIReport;
  onClose: () => void;
  onExport?: () => void;
}

export function ReportModal({ report, onClose, onExport }: ReportModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <ReportModalHeader 
          report={report} 
          onClose={onClose} 
          onExport={onExport} 
        />
        
        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 요약 섹션 */}
          {report.summary && (
            <ReportSummarySection report={report} />
          )}
          
          {/* 인사이트 섹션 */}
          {report.insights && (
            <ReportInsightsSection insights={report.insights} />
          )}
          
          {/* 성능 섹션 */}
          {report.performance && (
            <ReportPerformanceSection performance={report.performance} />
          )}
          
          {/* 트렌드 섹션 */}
          {report.trends && (
            <ReportTrendsSection trends={report.trends} />
          )}
          
          {/* 권장사항 섹션 */}
          {report.recommendations && (
            <ReportRecommendationsSection recommendations={report.recommendations} />
          )}
        </div>
      </div>
    </div>
  );
}
```

### 9.2 그래프 컴포넌트

```tsx
// LineChart 컴포넌트
interface TrafficTrendChartProps {
  data: DailyStat[];
  height?: number;
}

export function TrafficTrendChart({ data, height = 300 }: TrafficTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {/* ... LineChart 설정 ... */}
      </LineChart>
    </ResponsiveContainer>
  );
}

// BarChart 컴포넌트
interface ComparisonBarChartProps {
  current: { pageviews: number; uniques: number };
  previous: { pageviews: number; uniques: number };
  height?: number;
}

export function ComparisonBarChart({ current, previous, height = 250 }: ComparisonBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={[
        { name: '페이지뷰', 현재: current.pageviews, 이전: previous.pageviews },
        { name: '방문자', 현재: current.uniques, 이전: previous.uniques },
      ]}>
        {/* ... BarChart 설정 ... */}
      </BarChart>
    </ResponsiveContainer>
  );
}

// RadarChart 컴포넌트
interface WebVitalsRadarChartProps {
  metrics: WebVitalMetric[];
  height?: number;
}

export function WebVitalsRadarChart({ metrics, height = 300 }: WebVitalsRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={normalizeMetrics(metrics)}>
        {/* ... RadarChart 설정 ... */}
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

---

## 10. 이식 가이드

### 10.1 필수 의존성 설치

```bash
npm install recharts
# 또는
yarn add recharts
```

### 10.2 파일 구조

```
components/
  └── reports/
      ├── ReportModal.tsx
      ├── ReportSummarySection.tsx
      ├── ReportInsightsSection.tsx
      ├── ReportPerformanceSection.tsx
      ├── ReportTrendsSection.tsx
      ├── ReportRecommendationsSection.tsx
      └── charts/
          ├── TrafficTrendChart.tsx
          ├── ComparisonBarChart.tsx
          ├── WebVitalsRadarChart.tsx
          └── TopPagesBarChart.tsx
```

### 10.3 기본 사용법

```tsx
import { ReportModal } from '@/components/reports/ReportModal';

function Dashboard() {
  const [report, setReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>
        보고서 보기
      </button>
      
      {showModal && report && (
        <ReportModal
          report={report}
          onClose={() => setShowModal(false)}
          onExport={() => exportToMarkdown(report)}
        />
      )}
    </>
  );
}
```

### 10.4 커스터마이징

#### 색상 변경

```tsx
// components/reports/charts/TrafficTrendChart.tsx
const colors = {
  pageviews: '#your-color',  // 기본: '#06b6d4'
  uniques: '#your-color',     // 기본: '#8b5cf6'
};
```

#### 그래프 높이 조정

```tsx
<TrafficTrendChart 
  data={data} 
  height={400}  // 기본: 300
/>
```

#### 폰트 크기 조정

```tsx
// Tailwind 클래스 수정
<h2 className="text-2xl font-bold">  // 기본: text-xl
```

### 10.5 데이터 형식

#### AI Report JSON 구조

```typescript
interface AIReport {
  summary: {
    overview: string;
    keyMetrics: {
      totalPageviews: number;
      totalUniques: number;
      avgDailyPageviews: number;
    };
  };
  insights: Array<{
    title: string;
    description: string;
    type: 'positive' | 'warning' | 'negative' | 'info';
    priority: 'high' | 'medium' | 'low';
    confidence: 'high' | 'medium' | 'low';
    evidence?: {
      metric: string;
      current?: number;
      changePct?: number;
    };
  }>;
  performance: {
    webVitals: {
      summary: string;
      overall: 'good' | 'needs-improvement' | 'poor';
      metrics: Array<{
        name: string;
        value: number;
        status: 'good' | 'needs-improvement' | 'poor';
        recommendation?: string;
      }>;
    };
    engagement?: {
      avgScrollDepthPct: number;
      avgViewDurationSec: number;
      topEngagedPages?: Array<{
        page_path: string;
        avgScrollDepthPct: number;
        avgViewDurationSec: number;
      }>;
    };
  };
  trends: {
    trafficTrendDescription: string;
    topContentTrend: string;
    referrerTrend: string;
  };
  recommendations: Array<{
    title: string;
    description: string;
    category: string;
    actionItems?: string[];
  }>;
  comparison?: {
    previousPeriod: {
      startDate: string;
      endDate: string;
    };
    changes: {
      pageviews: {
        current: number;
        previous: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
      uniques: {
        current: number;
        previous: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
    };
  };
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}
```

---

## 11. 디자인 체크리스트

### 11.1 일관성 체크

- [ ] 모든 그래프가 동일한 색상 팔레트 사용
- [ ] 모든 카드가 동일한 간격 및 패딩 사용
- [ ] 모든 텍스트가 타이포그래피 계층 구조 준수
- [ ] 모든 버튼이 동일한 스타일 사용

### 11.2 접근성 체크

- [ ] 색상 대비 비율 4.5:1 이상 (WCAG AA)
- [ ] 모든 인터랙티브 요소에 포커스 표시
- [ ] 그래프에 적절한 라벨 및 범례 제공
- [ ] 모바일에서도 모든 정보 접근 가능

### 11.3 성능 체크

- [ ] 그래프가 지연 로딩되는지 확인
- [ ] 대용량 데이터에 대한 최적화 적용
- [ ] 애니메이션 성능 확인

---

## 12. 참고 자료

- [Recharts 공식 문서](https://recharts.org/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)
- [WCAG 접근성 가이드라인](https://www.w3.org/WAI/WCAG21/quickref/)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-25  
**작성자**: AI Assistant

---

**이 명세서는 AI 분석 보고서의 디자인 시스템과 그래프 구현을 다른 프로젝트에서 재사용할 수 있도록 상세히 문서화한 것입니다. 각 섹션의 코드 예시를 참고하여 동일한 디자인 언어로 보고서를 구현할 수 있습니다.**

