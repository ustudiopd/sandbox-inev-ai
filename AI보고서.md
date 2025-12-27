According to a document from **2025-12-27**, 현재 생성되는 AI 분석 보고서는 “AAPOR/ISO/ESOMAR + BANT/MEDDIC” 신뢰 문구와 레퍼런스 요약까지는 좋지만, **상관관계/인사이트가 ‘~일 가능성이 높을 것으로 예상됩니다’ 같은 추정형 문장**으로 끝나서 “그래서 어쩌라고?” 느낌을 줄 수 있어요.
또한 현재 시스템은 **설문조사 캠페인 모듈(공개 페이지, 응답 제출, `survey_no` 순차 번호, `code6` 확인코드 등)**이 이미 구현되어 있고, AI 분석 보고서 v1 명세/DB/API/UI 기본 골격도 존재합니다.

아래는 **Cursor AI에 그대로 붙여넣어 구현 지시로 쓸 수 있는 “Actionable AI 분석 보고서 v2” 명세서**입니다. (코드 블록 안은 복사용 / 코드 블록 밖은 참고 설명)

````md
# [Cursor Spec] 설문조사 AI 분석 보고서 v2 (Actionable / Sales&Marketing)

## 0) 목표: “그래서 어쩌라고?”를 없애는 보고서
현재 v1 보고서는 문항별 분포 요약 + 추정형 상관관계(“~일 가능성”)가 많아 실무자가 바로 실행할 다음 액션이 부족함.
v2는 다음을 강제한다:

- **모든 인사이트는 ‘근거(숫자/비율/분모) → 해석(so-what) → 다음 액션(누가/언제/무엇을)’** 3단 구조
- 상관관계는 “추정”이 아니라 **실제 교차표(crosstab) + lift(조건부 확률 차이)** 기반
- 세일즈/마케팅이 바로 쓰는 산출물:
  - **Priority Queue(리드 우선순위)**
  - **세그먼트별 Talk Track**
  - **후속 액션 플로우(SLA)**
  - **캠페인/콘텐츠 제안(마케팅 Pack)**
- AI는 “서술”이 아니라 **구조화 JSON(Action Pack)** 을 먼저 내고, 서버가 Markdown/PDF로 렌더링한다(품질/일관성/검증).

---

## 1) 범위(Scope)
- 대상: event_survey_campaigns 기반 설문조사 캠페인
- 입력: form_questions / form_answers / form_submissions + event_survey_entries(회사/이름/전화 등은 AI로 보내지 않음)
- 출력:
  - DB에 저장되는 AI 분석 리포트(목록/상세/다운로드)
  - UI: 분석 대상/레퍼런스/도넛 차트 요약 → 본문 분석 → Action Pack
  - 다운로드: **PDF(그래프 포함)** + MD(텍스트/표 중심)

---

## 2) “신뢰 문구” 고정(서버가 삽입)
보고서 최상단에 아래 문구를 **항상 동일 문장으로 삽입** (AI 생성물이 아니라 템플릿 상수)

> 본 보고서는 캠페인 설문 응답을 기반으로, 리서치/방법론 공개 원칙(AAPOR Transparency)과 시장조사 품질/윤리 가이드라인(ISO 20252, ICC/ESOMAR Code)을 참고하여 작성되었습니다. 또한 리드 우선순위와 후속 액션 제안은 BANT 및 MEDDIC 프레임워크 관점으로 구조화했습니다.

그리고 “관련 레퍼런스 요약” 섹션도 서버 템플릿으로 고정(짧게):

- AAPOR Transparency: 표본수/분모/분석시점 명시
- ISO 20252: 조사 서비스 품질관리/프로세스 문서화
- ICC/ESOMAR Code: 윤리/개인정보/해석 책임성
- BANT: Timing/Need 신호로 우선순위 구조화(예: Timing 강하면 Hot)
- MEDDIC: Pain/Process/Criteria 등 추가 질문 가이드로 활용

---

## 3) 데이터 처리(Deterministic) — AI에게 “숫자 계산”을 맡기지 않는다
### 3.1 통계 스냅샷(statistics_snapshot)
기존 question-stats 결과를 그대로 저장 (문항별 선택지 분포, 상위 선택지, 텍스트면 요약값 등).
+ v2에서 추가로 아래를 snapshot에 포함:

- `computed.crosstabs[]`: 핵심 문항 쌍의 교차표 (counts + row% + col% + lift)
- `computed.leadSignals`: 우선순위 분포(P0~P4), 선호 접촉 채널 분포, Timing 분포
- `computed.accountSignals` (옵션): 회사 단위 집계(회사명은 DB에만, AI로는 선택적으로 전달)
- `dataQuality`: 응답 누락률, 유효표본수, 편향/주의사항(룰 기반)

> NOTE: AI는 위 computed를 근거로 “해석”만 한다. 숫자/퍼센트는 서버가 제공한 값만 쓰도록 강제.

### 3.2 교차표(crosstab) & lift 계산
- 입력: submission 단위로 question_id -> 선택값을 맵핑
- 대상 쌍: (기본) 상위 3~4개 “분석 가치” 문항 쌍
  - 예: Timing(questionRole=timeframe) x Followup(questionRole=followup_intent)
  - 예: ProjectType(questionRole=project_type) x Followup
- 출력:
  - `rowTotals`, `colTotals`, `cells[{rowKey,colKey,count,rowPct,colPct}]`
  - `lift`: P(col | row) / P(col overall) 또는 (P(col | row) - P(col overall))
- 품질:
  - 셀 count가 너무 작으면(예: <5) `lowSampleWarning` 표기 → AI는 과도한 결론 금지

### 3.3 리드 스코어(Deterministic)
AI가 주관적으로 “핫리드”를 찍는 게 아니라, 룰 기반 점수 → AI는 “왜 이 기준이 맞는지/어떻게 후속 액션할지”를 설명

#### 3.3.1 기본 점수 모델(예시 — 커스터마이징 가능)
- Timing 점수:
  - 1주 이내: +30
  - 1개월 이내: +25
  - 1~3개월: +20
  - 3~6개월: +15
  - 6~12개월: +10
  - 1년 이후: +5
  - 계획없음: +0
- Followup(접촉 의향) 점수:
  - 방문 요청: +20
  - 온라인 미팅: +15
  - 전화 상담: +10
  - 관심 없음: -30 (최소 0으로 clamp)
- ProjectType 점수(예시):
  - 데이터센터 네트워크: +15
  - 네트워크 보안: +12
  - 엔터프라이즈 라우팅/SD-WAN: +10
  - 캠퍼스/브랜치: +8
  - 해당 없음: +0

`leadScore = clamp( timing + followup + projectType, 0, 100 )`

#### 3.3.2 우선순위 티어
- P0: 80~100 (즉시 컨택)
- P1: 60~79
- P2: 40~59
- P3: 20~39
- P4: 0~19 (자동 nurture 또는 제외)

#### 3.3.3 리드 큐(Entry 레벨 저장)
- `lead_queue`: entry_id, survey_no, leadScore, tier, recommendedNextStep, reasons[]
- AI에 보내는 것은 **PII 제외**:
  - name/phone/email 등은 보내지 않음
  - 회사명은 옵션(기본 OFF). ON이면 상위 N개만.

---

## 4) AI 출력 포맷: “Action Pack JSON” (필수) + 서버 렌더링
### 4.1 왜 JSON 먼저인가?
- Markdown 자유서술은 “그럴듯한 문장(예상됩니다)”이 나오기 쉬움
- JSON은
  - 필수 필드 강제(근거/행동/담당/기한)
  - Zod 검증 + 리트라이 가능
  - UI에서 카드/표/체크리스트로 바로 사용 가능

### 4.2 Action Pack JSON Schema (v2)
아래 형태로만 출력하도록 시스템 프롬프트/validation 설정.

```ts
type Lens = 'sales' | 'marketing' | 'general'

interface ActionPackV2 {
  version: '2.0'
  lens: Lens
  campaign: {
    id: string
    title: string
    analyzedAtISO: string
    sampleCount: number
    totalQuestions: number
  }

  executiveSummary: {
    oneLiner: string
    topWins: Array<{
      title: string
      evidence: string  // 반드시 숫자 포함 (예: "1주 이내 34% (17/50)")
      soWhat: string
      action: {
        owner: 'sales' | 'marketing' | 'ops'
        due: 'D+0' | 'D+2' | 'D+7' | 'D+14'
        steps: string[]
      }
    }>
  }

  priorityQueueSummary: {
    tiers: Array<{ tier: 'P0'|'P1'|'P2'|'P3'|'P4'; count: number; pct: number }>
    slaPlan: Array<{
      tier: 'P0'|'P1'|'P2'|'P3'|'P4'
      targetResponseTime: string   // 예: "48시간 이내"
      recommendedChannel: string   // 예: "방문/온라인미팅 우선"
      script: string               // 2~3문장 토크트랙
    }>
  }

  segmentPlaybooks: Array<{
    segmentName: string
    definition: string      // 예: "Timing <= 1개월 AND Followup != '관심 없음'"
    size: { count: number; pct: number }
    keyNeeds: string[]
    talkTrack: string[]
    nextBestOffer: string[] // 제공할 자료/PoC/미팅 제안
    pitfalls: string[]      // 주의사항
    evidence: string[]      // 수치/교차표 기반
  }>

  correlationFindings: Array<{
    title: string
    method: 'crosstab_lift'
    evidence: {
      crosstabId: string
      highlight: string   // 반드시 숫자 포함: "1주 이내 그룹의 방문요청 비중 45% vs 전체 28% (lift 1.6)"
    }
    soWhat: string
    actions: Array<{ owner: 'sales'|'marketing'; due: string; steps: string[] }>
  }>

  marketingPack: Array<{
    theme: string                 // 캠페인 메시지/콘텐츠 방향
    targetSegment: string
    suggestedAssets: string[]     // 예: 1pager, case study, PoC 안내
    distribution: string[]        // 예: 이메일, 문자, 리타겟팅, 세미나 초대
    rationale: string             // 숫자 근거 포함
  }>

  surveyIterationRecommendations: Array<{
    gap: string        // 현재 설문에서 부족한 자격화 요소
    whyItMatters: string
    suggestedQuestion: string
    answerType: 'single'|'multiple'|'text'
  }>

  dataQuality: Array<{
    level: 'info'|'warning'
    message: string
  }>
}
````

### 4.3 품질 게이트(Report Linter)

아래 조건 중 하나라도 불만족이면:

* 최대 2회까지 리프롬프트(“근거 숫자 누락/액션이 모호함”을 이유로) 후 실패 시 에러 반환

검증 규칙(예):

* `executiveSummary.topWins.length >= 3`
* 각 topWin.evidence 는 정규식 `/\d+%|\(\d+\/\d+\)/` 만족
* `correlationFindings.length >= 2` (crosstab가 존재할 때)
* “예상됩니다/가능성이 높습니다/추정” 같은 표현이 action/soWhat에 과다 포함 시 경고(단, dataQuality에는 허용)

---

## 5) 프롬프트 설계(Gemini 2.0 Flash)

### 5.1 모델 파라미터 권장

* temperature: 0.2 ~ 0.4 (일관성)
* maxOutputTokens: 충분히(8192 수준)
* 재시도 2회 (타임아웃 60초)

### 5.2 System Prompt (요지)

* 너는 B2B 세일즈/마케팅 인사이트 분석가
* **반드시 ActionPackV2 JSON만 출력**
* 숫자는 입력으로 제공된 computed 값만 사용
* 결론은 “근거→soWhat→action”으로 작성
* 표본 부족 시 강한 단정 금지, 대신 “추가 데이터/추가 질문”을 제안

### 5.3 User Prompt Template (서버에서 채움)

* 캠페인 메타
* questionStats(상위 선택지, counts, pct)
* computed.crosstabs(이미 계산된 값)
* computed.leadSignals(티어 분포, 채널 선호, timing 분포)
* (옵션) company top accounts summary (회사명은 필요 시만)

---

## 6) DB 변경 (survey_analysis_reports 확장)

기존 v1 table을 유지하면서 v2용 컬럼 추가.

### 6.1 Migration

파일: `supabase/migrations/0XX_extend_survey_analysis_reports_v2.sql`

추가 컬럼:

* `lens text not null default 'general'`
* `action_pack jsonb`               -- ActionPackV2 전체 저장
* `report_md text`                  -- 서버 렌더링된 Markdown
* `report_html text`                -- (선택) PDF 생성용 HTML 캐시
* `pdf_storage_path text`           -- Supabase Storage 경로
* `pdf_generated_at timestamptz`
* `generation_warnings jsonb`       -- linter 경고/품질 로그

인덱스:

* `(campaign_id, analyzed_at desc)`
* `(campaign_id, lens, analyzed_at desc)`

### 6.2 개인정보 정책

* `statistics_snapshot`, `action_pack`에는 **전화/이름 등 PII 금지**
* lead_queue(Entry 레벨)는 별도 테이블로 빼거나, report에는 “요약”만 저장하고 상세는 entries 테이블에서 조회

---

## 7) API 설계(기존 v1 + v2 확장)

기존 엔드포인트는 유지. v2 확장:

### 7.1 보고서 생성

`POST /api/event-survey/campaigns/[campaignId]/analysis/generate`

Request body:

```json
{
  "lens": "sales" | "marketing" | "general",
  "includeCompanyNames": false,
  "forceRegeneratePdf": false
}
```

Response:

```json
{
  "success": true,
  "report": {
    "id": "...",
    "lens": "sales",
    "report_title": "...",
    "summary": "...",
    "action_pack": { ...ActionPackV2 },
    "report_md": "..."
  }
}
```

Error codes:

* `INSUFFICIENT_SAMPLES` (기본 10 미만)
* `NO_QUESTIONS`
* `AI_GENERATION_FAILED`
* `VALIDATION_FAILED` (JSON schema/linter 실패)

### 7.2 보고서 목록/상세

* 목록: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports?lens=sales`
* 상세: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]`
  → action_pack + report_md + statistics_snapshot 포함

### 7.3 다운로드

* MD: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/download` (기존)
* PDF: `GET /api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/download.pdf`

  * pdf가 이미 생성되어 있으면 storage에서 바로 리턴(캐시)
  * 없으면 서버에서 생성 → storage 업로드 → 리턴

---

## 8) PDF 생성(그래프 포함)

### 8.1 구현 전략(권장)

* 서버에서 report 데이터를 가져와 **HTML 템플릿을 생성**
* 도넛 차트는 Recharts 대신, **SVG donut generator**(서버에서 문자열 생성) 사용
* headless chrome(예: puppeteer-core + serverless chromium)을 사용해 HTML→PDF 변환
* 생성한 PDF를 Supabase Storage에 업로드 후 `pdf_storage_path` 저장

### 8.2 PDF 레이아웃(요구사항 반영)

PDF 첫 페이지 상단부터:

1. 신뢰 문구
2. 분석 대상(캠페인/일시/표본/문항수/lens)
3. 관련 레퍼런스 요약
4. 통계 도넛 차트 요약(문항별 1개씩)
5. 그 다음부터 본문 분석 + Action Pack

---

## 9) UI/UX (OverviewTab 내 보고서 섹션 강화)

기존 v1 섹션(생성 버튼/목록/모달)을 유지하면서 상세 모달을 v2 구조로 변경

### 9.1 상세 모달 구조

* 상단 Sticky 헤더: [PDF 다운로드] [MD 다운로드] [닫기]
* 섹션 순서(요구사항):

  1. “분석 대상” 카드
  2. “관련 레퍼런스 요약” 카드(접기/펼치기)
  3. “통계 요약(도넛)” 그리드
  4. “Executive Summary” (topWins)
  5. “Priority Queue & SLA” 표
  6. “Correlation Findings” 카드
  7. “Segment Playbooks”
  8. “Marketing Pack”
  9. “설문 개선 제안”
  10. “전체 Markdown 보기”(하단)

### 9.2 실무자가 바로 쓰게 만드는 UX 포인트

* 각 Action item에 “복사” 버튼(토크트랙/메일 문구)
* SLA 표는 체크박스 형태로 운영 체크리스트화 가능(옵션)
* P0/P1 세그먼트는 “참여자 관리” 화면으로 바로 이동(필터링) 링크 제공(옵션)

---

## 10) 구현 파일 가이드(예시)

* `lib/surveys/analysis/buildComputedMetrics.ts`

  * buildCrosstabs()
  * buildLeadSignals()
  * buildAccountSignals()
* `lib/surveys/analysis/actionPackSchema.ts` (zod)
* `lib/surveys/analysis/gemini.ts`

  * buildPrompt()
  * callGemini()
  * validateAndRetry()
* `lib/surveys/analysis/renderMarkdown.ts`

  * trustStatement + referenceSummary + actionPack → md
* `lib/surveys/analysis/renderHtmlForPdf.ts`

  * donutSvg() + md/sections → HTML
* API routes

  * `app/api/event-survey/campaigns/[campaignId]/analysis/generate/route.ts`
  * `app/api/event-survey/campaigns/[campaignId]/analysis/reports/[reportId]/download.pdf/route.ts`
* UI

  * `app/(client)/client/[clientId]/surveys/[campaignId]/components/tabs/OverviewTab.tsx`
  * `.../analysis/ReportDetailModal.tsx` (v2 섹션 구성)

---

## 11) 테스트/수용 기준(Acceptance Criteria)

### 11.1 기능

* 보고서 생성 시 DB에 저장되고 목록에 표시된다
* 상세에서 “분석 대상 → 레퍼런스 → 도넛 요약 → 분석 본문” 순서로 노출된다
* PDF 다운로드 시 도넛 그래프가 포함된 PDF가 내려받아진다
* MD 다운로드는 텍스트/표 형태로 완결된다(차트는 텍스트 요약으로 대체)

### 11.2 품질

* topWins 최소 3개, 각 항목에 숫자 근거 포함
* correlationFindings는 crosstab이 있을 때 최소 2개
* 모든 action에 owner/due/steps 포함
* “예상됩니다”류 문장만으로 결론을 내리지 않고, lift/교차표 등 숫자 기반으로 서술

---

## 12) (선택) Gemini 결과 안정화 “학습 데이터” 접근(파인튜닝 대신 실무적 대안)

모델 파인튜닝이 어렵거나 비용/시간이 크면 아래로 일관성을 확보:

* (1) ActionPack JSON + linter + retry
* (2) 캠페인 유형별 few-shot 예시(3~5개) prompt에 포함
* (3) 실패 케이스(모호한 문장) 모아 “금지 예시”로 넣기
* (4) 고정 템플릿(신뢰 문구/레퍼런스/레이아웃)은 AI 생성에서 제외

---

## 13) 기본 “문항 역할(role)” 매핑(부스 3문항 예시)

* Q1: Timing(timeframe)
* Q2: ProjectType(scope)
* Q3: FollowupIntent(next_action)
  이 역할 기반으로 leadScore/segment/crosstab을 자동 생성.
  역할이 불명확하면:
* (a) 관리자 UI에서 role 선택(권장)
* (b) 임시로 텍스트 패턴 기반 자동추정(옵션명에 “1주/1개월/방문/온라인/전화/관심없음” 등)

끝.

```

원하면, 위 명세를 기반으로 **(1) 실제 프롬프트 전문(system/user), (2) Zod 스키마 코드, (3) donut SVG 생성 함수 예시, (4) PDF HTML 템플릿 예시**까지 “붙여넣으면 바로 돌아가는 코드 형태”로 더 구체화해서 드릴게요.
```
