# 설문조사 AI 분석 보고서 기능 명세서

## 1. 개요

### 1.1 목적
설문조사 문항별 통계 데이터를 기반으로 Gemini 2.0 Flash를 활용하여 심층적인 AI 분석 보고서를 자동 생성하고, 시간대별로 저장하여 추이 분석이 가능하도록 합니다.

### 1.2 주요 기능
- 문항별 통계 데이터 기반 AI 분석 보고서 생성
- 분석 보고서 시간대별 저장 및 관리
- 저장된 보고서 불러오기 및 비교
- Markdown 형식 다운로드 기능
- 분석 시점 메타데이터 포함 (분석 시간, 샘플 수 등)

### 1.3 기술 스택
- **AI 모델**: Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
- **데이터베이스**: Supabase PostgreSQL
- **형식**: Markdown
- **API**: RESTful API

## 2. 데이터베이스 스키마 설계

### 2.1 테이블: `survey_analysis_reports`

```sql
CREATE TABLE survey_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES event_survey_campaigns(id) ON DELETE CASCADE,
  
  -- 분석 메타데이터
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sample_count INTEGER NOT NULL, -- 분석 시점의 샘플 수
  total_questions INTEGER NOT NULL, -- 분석한 문항 수
  
  -- 분석 결과
  report_title TEXT NOT NULL, -- 보고서 제목 (예: "2025-01-15 14:30 분석 보고서")
  report_content TEXT NOT NULL, -- Markdown 형식의 분석 보고서 내용
  summary TEXT, -- 요약 (선택사항)
  
  -- 통계 스냅샷 (JSONB)
  statistics_snapshot JSONB NOT NULL, -- 분석 시점의 통계 데이터 스냅샷
  
  -- 생성자 정보
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 인덱스
  CONSTRAINT fk_campaign FOREIGN KEY (campaign_id) REFERENCES event_survey_campaigns(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_survey_analysis_reports_campaign_id ON survey_analysis_reports(campaign_id);
CREATE INDEX idx_survey_analysis_reports_analyzed_at ON survey_analysis_reports(analyzed_at DESC);
CREATE INDEX idx_survey_analysis_reports_campaign_analyzed ON survey_analysis_reports(campaign_id, analyzed_at DESC);
```

### 2.2 마이그레이션 파일
- 파일명: `supabase/migrations/040_create_survey_analysis_reports.sql`

## 3. 분석 정확성 및 심층 분석 접근 방법

### 3.1 프롬프트 엔지니어링 전략

#### 3.1.1 구조화된 프롬프트 템플릿
```typescript
const ANALYSIS_PROMPT_TEMPLATE = `
당신은 설문조사 데이터 분석 전문가입니다. 다음 설문조사 통계 데이터를 분석하여 심층적인 인사이트를 제공해주세요.

## 분석 요청 사항
1. **전체적인 응답 패턴 분석**: 각 문항의 응답 분포를 분석하고 주요 트렌드를 파악하세요.
2. **문항 간 상관관계 분석**: 문항들 간의 연관성을 찾아 인사이트를 도출하세요.
3. **핵심 발견사항**: 가장 주목할 만한 발견사항 3-5개를 요약하세요.
4. **행동 권장사항**: 분석 결과를 바탕으로 실무에 활용할 수 있는 구체적인 권장사항을 제시하세요.
5. **향후 예측**: 현재 데이터 패턴을 바탕으로 향후 예상되는 트렌드를 예측하세요.

## 설문조사 정보
- 캠페인 제목: {campaignTitle}
- 분석 시점: {analyzedAt}
- 총 응답 수: {sampleCount}명
- 분석 문항 수: {totalQuestions}개

## 문항별 통계 데이터
{questionStatsJSON}

## 출력 형식
다음 Markdown 형식으로 작성해주세요:

# 설문조사 분석 보고서

## 📊 개요
- 분석 일시: {analyzedAt}
- 총 응답 수: {sampleCount}명
- 분석 문항 수: {totalQuestions}개

## 🔍 주요 발견사항

### 1. 전체 응답 패턴
[각 문항의 응답 분포를 분석한 내용]

### 2. 문항 간 상관관계
[문항들 간의 연관성 분석]

### 3. 핵심 인사이트
[가장 주목할 만한 발견사항 3-5개]

## 💡 행동 권장사항
[실무에 활용할 수 있는 구체적인 권장사항]

## 📈 향후 예측
[현재 데이터 패턴을 바탕으로 한 향후 트렌드 예측]

## 📋 문항별 상세 분석

### 문항 {orderNo}: {questionBody}
- 응답 수: {totalAnswers}명
- 주요 응답: [상위 3개 선택지 및 비율]
- 분석: [해당 문항에 대한 심층 분석]

[각 문항별로 반복]

---
*본 보고서는 Gemini 2.0 Flash AI에 의해 자동 생성되었습니다.*
`
```

#### 3.1.2 데이터 전처리 및 구조화
```typescript
interface QuestionStatsForAnalysis {
  orderNo: number
  questionBody: string
  questionType: 'single' | 'multiple' | 'text'
  totalAnswers: number
  options?: Array<{ id: string; text: string }>
  choiceDistribution?: Record<string, number>
  textAnswers?: string[]
  // 통계 계산
  topChoices?: Array<{ text: string; count: number; percentage: number }>
  averageResponseLength?: number // 텍스트 문항의 경우
}

// 통계 데이터를 분석에 최적화된 형태로 변환
function prepareStatsForAnalysis(questionStats: any[]): QuestionStatsForAnalysis[] {
  return questionStats.map(stat => {
    const processed: QuestionStatsForAnalysis = {
      orderNo: stat.orderNo,
      questionBody: stat.questionBody,
      questionType: stat.questionType,
      totalAnswers: stat.totalAnswers,
    }
    
    if (stat.questionType === 'single' || stat.questionType === 'multiple') {
      processed.options = stat.options
      processed.choiceDistribution = stat.choiceDistribution
      
      // 상위 선택지 계산
      const choices = Object.entries(stat.choiceDistribution || {})
        .map(([id, count]) => {
          const option = stat.options.find((opt: any) => 
            (typeof opt === 'string' ? opt : opt.id) === id
          )
          return {
            text: typeof option === 'string' ? option : option?.text || id,
            count: count as number,
            percentage: stat.totalAnswers > 0 
              ? ((count as number) / stat.totalAnswers * 100).toFixed(1)
              : '0'
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
      
      processed.topChoices = choices
    } else if (stat.questionType === 'text') {
      processed.textAnswers = stat.textAnswers
      
      // 평균 응답 길이 계산
      const avgLength = stat.textAnswers?.length > 0
        ? Math.round(
            stat.textAnswers.reduce((sum: number, text: string) => sum + text.length, 0) 
            / stat.textAnswers.length
          )
        : 0
      processed.averageResponseLength = avgLength
    }
    
    return processed
  })
}
```

#### 3.1.3 Gemini API 호출 최적화
```typescript
interface GeminiAnalysisConfig {
  temperature: number // 0.7 (창의성과 정확성의 균형)
  topK: number // 40
  topP: number // 0.95
  maxOutputTokens: number // 8192 (긴 보고서 생성)
}

const ANALYSIS_CONFIG: GeminiAnalysisConfig = {
  temperature: 0.7, // 창의적이면서도 정확한 분석
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192, // 충분한 길이의 보고서 생성
}
```

### 3.2 분석 정확성 향상 전략

#### 3.2.1 컨텍스트 강화
- **캠페인 메타데이터 포함**: 제목, 설명, 주최자 정보 등
- **통계 스냅샷 저장**: 분석 시점의 정확한 데이터 보존
- **비율 및 퍼센트 계산**: AI가 직접 계산하지 않고 사전 계산된 값 제공

#### 3.2.2 다단계 분석 접근
1. **1단계: 데이터 요약 및 구조화**
   - 문항별 핵심 통계 추출
   - 상위 선택지 및 비율 계산
   - 텍스트 응답 요약 (긴 경우)

2. **2단계: 패턴 분석**
   - 문항 간 상관관계 파악
   - 트렌드 및 이상치 식별
   - 응답자 세그먼트 분석

3. **3단계: 인사이트 도출**
   - 비즈니스 관점에서의 해석
   - 실무 활용 가능한 권장사항
   - 향후 예측 및 전략 제안

#### 3.2.3 검증 및 품질 관리
- **최소 샘플 수 확인**: 샘플 수가 너무 적으면 경고 메시지
- **응답률 검증**: 문항별 응답률이 일정 수준 이상인지 확인
- **AI 응답 검증**: 생성된 보고서의 구조 및 내용 검증

## 4. API 설계

### 4.1 분석 보고서 생성 API

**엔드포인트**: `POST /api/event-survey/campaigns/[campaignId]/analysis/generate`

**요청 본문**:
```typescript
{
  // 옵션 없음 (현재 시점의 통계 데이터 사용)
}
```

**응답**:
```typescript
{
  success: true,
  report: {
    id: string,
    campaign_id: string,
    analyzed_at: string,
    sample_count: number,
    total_questions: number,
    report_title: string,
    report_content: string,
    summary: string,
    created_at: string
  }
}
```

**에러 응답**:
```typescript
{
  success: false,
  error: string,
  code?: 'INSUFFICIENT_SAMPLES' | 'NO_QUESTIONS' | 'AI_GENERATION_FAILED'
}
```

### 4.2 분석 보고서 목록 조회 API

**엔드포인트**: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports`

**쿼리 파라미터**:
- `limit`: 페이지당 항목 수 (기본값: 10)
- `offset`: 오프셋 (기본값: 0)
- `order`: 정렬 순서 (`desc` | `asc`, 기본값: `desc`)

**응답**:
```typescript
{
  success: true,
  reports: Array<{
    id: string,
    analyzed_at: string,
    sample_count: number,
    total_questions: number,
    report_title: string,
    summary: string,
    created_at: string
  }>,
  total: number
}
```

### 4.3 분석 보고서 상세 조회 API

**엔드포인트**: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]`

**응답**:
```typescript
{
  success: true,
  report: {
    id: string,
    campaign_id: string,
    analyzed_at: string,
    sample_count: number,
    total_questions: number,
    report_title: string,
    report_content: string,
    summary: string,
    statistics_snapshot: object,
    created_at: string,
    created_by: {
      id: string,
      display_name: string,
      email: string
    }
  }
}
```

### 4.4 분석 보고서 삭제 API

**엔드포인트**: `DELETE /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]`

**응답**:
```typescript
{
  success: true,
  message: 'Report deleted successfully'
}
```

### 4.5 분석 보고서 MD 다운로드 API

**엔드포인트**: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/download`

**응답**: 
- Content-Type: `text/markdown`
- Content-Disposition: `attachment; filename="survey-analysis-{reportId}.md"`
- 본문: Markdown 형식의 보고서 내용

## 5. UI/UX 설계

### 5.1 OverviewTab에 분석 보고서 섹션 추가

**위치**: `app/(client)/client/[clientId]/surveys/[campaignId]/components/tabs/OverviewTab.tsx`

**구성 요소**:
1. **분석 보고서 생성 버튼**
   - 위치: 문항별 통계 섹션 아래
   - 상태: 로딩 중 표시
   - 조건: 최소 10개 이상의 응답 필요

2. **저장된 보고서 목록**
   - 카드 형식으로 표시
   - 분석 일시, 샘플 수, 요약 표시
   - 액션: 상세 보기, 다운로드, 삭제

3. **보고서 상세 모달**
   - Markdown 렌더링 (react-markdown 사용)
   - 다운로드 버튼
   - 닫기 버튼

### 5.2 컴포넌트 구조

```
OverviewTab
├── AnalysisReportSection (신규)
│   ├── GenerateReportButton
│   ├── ReportList
│   │   ├── ReportCard
│   │   │   ├── ReportHeader (일시, 샘플 수)
│   │   │   ├── ReportSummary
│   │   │   └── ReportActions (보기, 다운로드, 삭제)
│   │   └── EmptyState
│   └── ReportDetailModal
│       ├── MarkdownRenderer
│       ├── DownloadButton
│       └── CloseButton
```

## 6. 구현 단계

### Phase 1: 데이터베이스 및 기본 API (1주)
1. ✅ 마이그레이션 파일 생성
2. ✅ 분석 보고서 생성 API 구현
3. ✅ 분석 보고서 목록 조회 API 구현
4. ✅ 분석 보고서 상세 조회 API 구현

### Phase 2: AI 분석 엔진 구현 (1주)
5. ✅ Gemini API 통합
6. ✅ 프롬프트 엔지니어링 및 최적화
7. ✅ 데이터 전처리 로직 구현
8. ✅ 분석 품질 검증 로직 구현

### Phase 3: UI 구현 (1주)
9. ✅ OverviewTab에 분석 보고서 섹션 추가
10. ✅ 보고서 생성 버튼 및 로딩 상태 처리
11. ✅ 보고서 목록 UI 구현
12. ✅ 보고서 상세 모달 구현
13. ✅ Markdown 렌더링 구현

### Phase 4: 다운로드 및 고급 기능 (3일)
14. ✅ MD 다운로드 기능 구현
15. ✅ 보고서 삭제 기능 구현
16. ✅ 보고서 비교 기능 (선택사항)

## 7. 보안 및 권한

### 7.1 권한 확인
- 분석 보고서 생성: `owner`, `admin`, `operator`, `analyst` 권한 필요
- 보고서 조회: `owner`, `admin`, `operator`, `analyst`, `viewer` 권한 필요
- 보고서 삭제: `owner`, `admin` 권한만 허용

### 7.2 데이터 보안
- 통계 스냅샷에 민감한 개인정보 포함 금지
- RLS 정책 적용
- API 키 환경 변수 관리

## 8. 성능 고려사항

### 8.1 AI API 호출 최적화
- 타임아웃 설정: 60초
- 재시도 로직: 최대 2회
- 에러 처리: 사용자 친화적 메시지

### 8.2 데이터베이스 최적화
- 통계 스냅샷은 JSONB로 저장하여 쿼리 성능 향상
- 인덱스 최적화
- 페이지네이션 적용

### 8.3 캐싱 전략
- 보고서 목록은 캐싱 가능
- 상세 보고서는 실시간 조회

## 9. 테스트 계획

### 9.1 단위 테스트
- 데이터 전처리 함수 테스트
- 프롬프트 생성 함수 테스트
- API 엔드포인트 테스트

### 9.2 통합 테스트
- 전체 분석 플로우 테스트
- 에러 케이스 테스트
- 권한 테스트

### 9.3 사용자 테스트
- 다양한 샘플 수에 대한 분석 품질 테스트
- 보고서 가독성 테스트
- 다운로드 기능 테스트

## 10. 향후 개선 사항

### 10.1 고급 분석 기능
- 시계열 분석 (시간대별 트렌드)
- 응답자 세그먼트 분석
- 감정 분석 (텍스트 응답)

### 10.2 보고서 커스터마이징
- 보고서 템플릿 선택
- 분석 관점 선택 (마케팅, 제품, 고객 등)
- 자동 스케줄링 (주간/월간 자동 분석)

### 10.3 비교 분석
- 여러 시점의 보고서 비교
- 다른 캠페인과의 비교
- 벤치마크 비교

---

**작성일**: 2025-01-XX  
**작성자**: AI Assistant  
**버전**: 1.0

