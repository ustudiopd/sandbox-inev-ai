According to a document from \*\*2026-01-06\*\*, 지금 나온 “중간지침(guideline)”은 \*\*방향은 아주 맞는데, ‘실제 구현·운영’ 관점에서 꼭 채워야 할 빈칸이 꽤 있는 상태\*\*예요. 특히 문항/선택지가 유동적으로 바뀌는 환경에서 디시즌카드까지 안정적으로 뽑으려면, 이 “중간지침”을 \*\*사람이 읽는 Markdown 1장\*\*이 아니라 \*\*시스템이 실행 가능한 ‘Guideline Pack(gp-1.0)’\*\*으로 정규화해서 \*\*버전/검증/적용\*\*까지 포함해야 합니다.



아래는 1) 현재 중간지침 평가 + 2) 어떻게 보강할지 + 3) 실제 구현 명세서(DB/API/서버/프론트/검증/운영) 전체입니다.



---



\## 1) 현재 “중간지침” 평가



\### 잘 된 점



\* \*\*분석 목적(의사결정 질문)\*\*이 먼저 잡혀 있음 (이게 디시즌카드의 “질문축”이 됩니다).

\* 5개 문항을 역할로 매핑해 두었고(타임라인/니즈영역/예산/권한/참여의향), “핵심” 중요도로 표시되어 있음

\* 교차표 계획이 명시되어 있고(타임라인×참여의향, 권한×참여의향)

\* 리드 스코어링 티어/컴포넌트 가중치/액션 SLA가 있음



즉 “중간지침을 두고 그 지침으로 분석을 돌린다”는 방향 자체는 매우 좋습니다.



\### 지금 상태에서 구현이 막히는(또는 결과가 흔들리는) 부분



1\. \*\*옵션 그룹 매핑이 비어 있음\*\*

&nbsp;  문항1 타임라인 옵션을 단기/중기/장기/무계획으로 묶어두긴 했지만, 실제 어떤 선택지가 어느 그룹인지가 빠져 있어요(빈칸).

&nbsp;  → 이 상태면 운영자가 “예상한 그룹”과 서버가 “실제 옵션 ID/텍스트”를 연결할 방법이 없습니다.



2\. \*\*스코어링이 ‘활성화됨’인데 가중치 정의가 문항1만 있음\*\*

&nbsp;  문항3/4/5도 스코어링 활성화로 되어있지만, 예/아니오/관심없음 등을 점수로 어떻게 환산하는지 정의가 없어요.



3\. \*\*Role taxonomy(역할 이름)가 시스템과 어긋남\*\*

&nbsp;  현재 시스템/향후 설계에서 권장 role은 `budget\_status`, `authority`, `intent\_followup`, `timeline`, `usecase\_project\_type` 같은 형태인데,

&nbsp;  중간지침은 `authority\_level`, `engagement\_intent`, `need\_area` 등으로 잡혀 있어요.

&nbsp;  → 이름만 다른 게 아니라, \*\*교차표 생성 / 리드스코어 / 카드 템플릿 활성화 조건\*\*이 role 이름에 묶여 있기 때문에 실제론 깨질 수 있습니다.



4\. \*\*다중선택(문항2)에 대한 처리 전략이 없음\*\*

&nbsp;  문항2가 다중선택인데(네트워크 보안/데이터센터/라우팅/캠퍼스… 등)



&nbsp;  \* 교차표에서 다중×단일, 다중×다중을 어떻게 다룰지

&nbsp;  \* 리드 스코어에서 다중선택 점수를 `max`로 볼지 `sum`으로 볼지

&nbsp;    같은 “계산 규칙”이 없습니다.



5\. \*\*지침과 디시즌카드 템플릿의 연결이 없음\*\*

&nbsp;  현재/향후 설계는 카드 템플릿(Registry) + evidence 타입으로 안정화하는 방향이 맞고, role taxonomy도 확장 계획이 있는데

&nbsp;  중간지침에는 “이 지침이면 어떤 카드 템플릿을 우선 활성화할지”가 아직 없습니다.



---



\## 2) 보강 방향 요약: “중간지침”을 \*\*실행 가능한 Guideline Pack\*\*으로 만들기



핵심은 이거예요:



\* \*\*(사람용) 지침 문서\*\* + \*\*(시스템용) 실행 스펙(JSON)\*\* 을 분리

\* 지침(JSON)을 기준으로



&nbsp; 1. 문항/선택지 변화에도 깨지지 않게 “매칭/검증/버전관리”

&nbsp; 2. Analysis Pack이 그 지침대로 계산

&nbsp; 3. Decision Pack은 템플릿 기반으로 카드 생성



이미 시스템은 \*\*Analysis Pack(ap-1.0) → Decision Pack(dp-1.0)\*\* 파이프라인이 구현돼 있고, `survey\_analysis\_reports`에 pack을 저장하는 구조도 들어가 있어요.

여기에 \*\*Guideline Pack(gp-1.0)\*\* 을 앞단에 추가하는 설계가 자연스럽습니다.



---



\## 3) 전체 구현 명세서: Guideline Pack 기반 “유동 문항” 대응 분석/디시즌카드 시스템



아래 명세는 “현재 구현(ap-1.0/dp-1.0)”을 깨지 않으면서, 확장 계획(템플릿/role 확장/스냅샷) 방향과도 일치하도록 구성했습니다.



\### 3.1 목표



1\. 설문 문항이 \*\*추가/삭제/수정\*\*되어도



&nbsp;  \* 분석이 멈추지 않고

&nbsp;  \* “디시즌카드(Decision Cards)”가 최소 품질로 안정적으로 생성

2\. 운영자가 “분석 방향(지침)”을 \*\*생성 → 편집 → 검증 → 발행(활성화)\*\* 할 수 있음

3\. 보고서 생성 시 “어떤 지침 버전으로 돌렸는지”가 \*\*재현 가능\*\*하게 저장



---



\## 4) 시스템 아키텍처



\### 4.1 전체 흐름(3단계)



```

\[설문 응답 데이터]

&nbsp;  ↓

\[Guideline Pack 생성/편집/발행]  (gp-1.0)  ← 신규

&nbsp;  ↓

\[Analysis Pack 생성]             (ap-1.0 → ap-1.1 권장)

&nbsp;  ↓

\[Decision Pack 생성]             (dp-1.0 → dp-1.1 권장)

&nbsp;  ↓

\[병합/검증/렌더링]

```



\* 기존 2단계 파이프라인은 이미 구현되어 있음

\* 파일 구조도 `lib/surveys/analysis/\*` 중심으로 정리되어 있음



\### 4.2 권한/멀티테넌시 전제



이벤트라이브는 멀티테넌시 + RLS 기반이고, API는 권한 체크를 선행하는 패턴을 따릅니다.



---



\## 5) Guideline Pack(gp-1.0) 데이터 모델



\### 5.1 Canonical은 JSON, Markdown은 렌더 결과



\* DB에는 \*\*JSONB\*\*로 저장 (검증/적용이 쉬움)

\* 화면에는 “사람이 읽기 좋은 요약(Markdown)”으로 렌더 가능

&nbsp; (현재처럼 Markdown만 저장하면, 옵션 ID 매핑/검증이 어렵습니다)



\### 5.2 gp-1.0 스키마(요약)



```ts

type GuidelinePackV1 = {

&nbsp; version: "gp-1.0"



&nbsp; meta: {

&nbsp;   campaignId: string

&nbsp;   formId: string

&nbsp;   formFingerprint: string

&nbsp;   status: "draft" | "published" | "archived"

&nbsp;   createdAtISO: string

&nbsp;   updatedAtISO: string

&nbsp;   createdBy?: string

&nbsp;   updatedBy?: string

&nbsp; }



&nbsp; purpose: {

&nbsp;   lens: "general" | "b2b" | "b2c" | string

&nbsp;   decisionQuestions: string\[] // 지침이 유도할 "의사결정 질문"

&nbsp; }



&nbsp; // 핵심: 문항 매핑 + 옵션 매핑

&nbsp; questions: Array<{

&nbsp;   questionId: string

&nbsp;   logicalKey: string              // 안정 키 (권장)

&nbsp;   role: QuestionRole              // 표준 role taxonomy

&nbsp;   importance: "core" | "support" | "ignore"

&nbsp;   questionType: "single" | "multiple" | "text"



&nbsp;   // options: questionType이 single/multiple일 때 필수

&nbsp;   optionMap?: {

&nbsp;     // 실제 form\_questions.options의 optionId 또는 optionText를 기준으로 매핑

&nbsp;     // (현실적으로는 optionId 우선 + text fallback)

&nbsp;     byOptionId?: Record<string, { groupKey: string }>

&nbsp;     byOptionText?: Record<string, { groupKey: string }>

&nbsp;   }



&nbsp;   groups?: Record<string, {

&nbsp;     title: string

&nbsp;     description?: string

&nbsp;     score?: number              // 0~100 또는 0~N (정규화 규칙은 leadScoring에서)

&nbsp;   }>



&nbsp;   multiSelectStrategy?: "max" | "sumCap" | "binaryAny" // multiple일 때

&nbsp; }>



&nbsp; // 교차표: "고정(핀)" + "자동 후보" 둘 다 지원

&nbsp; crosstabs: {

&nbsp;   pinned: Array<{ rowRole: QuestionRole; colRole: QuestionRole; minCellCount: number }>

&nbsp;   autoPick: { enabled: boolean; topK: number; minCellCount: number }

&nbsp; }



&nbsp; leadScoring: {

&nbsp;   enabled: boolean

&nbsp;   components: Array<{ role: QuestionRole; weight: number }>

&nbsp;   normalize: "weightedSumTo100"

&nbsp;   tiers: Array<{ tier: "P0"|"P1"|"P2"|"P3"|"P4"; minScore: number }>

&nbsp;   recommendedActions: Record<string, string> // tier -> SLA/action

&nbsp; }



&nbsp; // 디시즌카드 템플릿 선택/우선순위

&nbsp; decisionCards: {

&nbsp;   preferredTemplates: CardTemplateId\[]

&nbsp;   allowTemplates?: CardTemplateId\[] // 제한하고 싶으면 사용

&nbsp; }



&nbsp; // 검증 규칙(발행 게이트)

&nbsp; validation: {

&nbsp;   minSampleCountToUseLeadScoring: number

&nbsp;   requireRolesForLeadScoringAny: QuestionRole\[]

&nbsp;   warnIfFormFingerprintMismatch: boolean

&nbsp; }

}

```



> 여기서 `QuestionRole`, `CardTemplateId`는 \*\*서버 상수(Registry)\*\* 로 강제하는 게 핵심입니다.



---



\## 6) Role taxonomy 표준화(중요)



\### 6.1 권장 Role 세트(최소 10~14개)



시스템 명세에서 이미 방향이 나와 있어요. (디시전카드가 잘 나오는 축 기준)



최소 아래는 표준으로 고정 권장:



\* `timeline`

\* `intent\_followup`

\* `usecase\_project\_type` (또는 need\_area 성격)

\* `budget\_status`

\* `authority`

\* `channel\_preference`

\* `need\_pain`

\* `barrier\_risk`

\* `company\_profile`

\* `free\_text\_voice`

\* `other`



\### 6.2 현재 중간지침 role명 정리(매핑 룰)



\* `engagement\_intent` → `intent\_followup` (권장)

\* `authority\_level` → `authority`

\* `need\_area` → (성격상) `usecase\_project\_type` 또는 `need\_pain` 중 택1



&nbsp; \* “영역(보안/데이터센터/라우팅)”이면 `usecase\_project\_type` 쪽이 더 자연스럽습니다.



이 정리만 해도,



\* 교차표 자동 생성 조건

\* 리드스코어 컴포넌트

\* 카드 템플릿 activation

&nbsp; 이 한 번에 정렬됩니다.



---



\## 7) 문항/선택지 유동성 대응 설계



\### 7.1 Form Fingerprint는 “경고”가 아니라 “게이트”여야 함



현재 지침에도 fingerprint가 이미 포함되어 있습니다.

구현에서는:



\* 보고서 생성 시 현재 formFingerprint ≠ guideline.formFingerprint 이면:



&nbsp; 1. \*\*자동 reconcile 시도\*\*

&nbsp; 2. confidence 낮으면 \*\*lead scoring 비활성화\*\* + “지침 검토 필요” 경고 evidence 생성

&nbsp; 3. 운영자 화면에서 “새 버전으로 복제 + 수정” 유도



\### 7.2 logical\_key / role\_override / snapshot(강력 권장)



유동 문항에서 가장 강한 안정장치는 “질문 ID가 바뀌어도 같은 질문으로 묶는 키”입니다.

명세서에도 최소 컬럼 추가안이 이미 제시돼 있어요.



\#### DB 최소 추가(권장)



\* `form\_questions.logical\_key`

\* `form\_questions.role\_override`

\* `form\_questions.revision`

\* `form\_submissions.form\_revision`

\* `form\_answers.question\_body\_snapshot`, `options\_snapshot`, `question\_logical\_key\_snapshot`, `question\_role\_snapshot`



이걸 넣으면, “설문 오픈 중 문항 변경” 같은 운영 이슈에도 분석 재현성이 생깁니다.



---



\## 8) Analysis Pack(ap) 확장 포인트(지침 적용)



현재 ap-1.0은 이미 만들어져 있고, “역할이 있으면 교차표/리드스코어 활성화” 구조입니다.



\### 8.1 ap-1.0을 유지하며 최소 변경으로 지침 적용(v1)



\* `buildAnalysisPack.ts`에서



&nbsp; \* 질문 role을 “자동추정” 대신 “guideline.questions 매핑”으로 override

&nbsp; \* 리드 스코어 계산 시 guideline.leadScoring 규칙 사용

&nbsp; \* pinned crosstab을 추가로 생성



\### 8.2 ap-1.1(권장): analysisPlan을 pack에 포함



ap 결과에 아래를 포함시키면 운영이 쉬워집니다.



\* `analysisPlan: { guidelineId, guidelineVersion, appliedAtISO, mismatchWarnings\[] }`

\* `questionClassifications\[]`에 `logicalKey`, `roleConfidence`, `qualityFlags` 포함

&nbsp; (명세서에서 이미 이 방향을 언급합니다)



---



\## 9) Decision Cards 안정화: 템플릿(Registry) + Evidence 타입



현재도 dp-1.0이 구현되어 있으나, 향후 개선 우선순위로



\* Evidence.type + reliability

\* CardTemplateRegistry + templateId 강제

&nbsp; 가 제시되어 있어요.



Guideline Pack은 여기와 연결되어야 합니다:



\* guideline.decisionCards.preferredTemplates 로 “이번 분석은 어떤 카드 세트를 뽑을지”를 제어

\* 서버는 Registry의 activation 조건을 만족하는 템플릿만 LLM에 허용



---



\## 10) 데이터베이스 스키마(신규)



\### 10.1 신규 테이블: `survey\_analysis\_guidelines`



(이름은 프로젝트 컨벤션에 맞춰 조정 가능)



```sql

create table if not exists public.survey\_analysis\_guidelines (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; campaign\_id uuid not null references public.event\_survey\_campaigns(id) on delete cascade,

&nbsp; form\_id uuid not null references public.forms(id) on delete cascade,



&nbsp; form\_fingerprint text not null,

&nbsp; version int not null default 1,

&nbsp; status text not null check (status in ('draft','published','archived')),



&nbsp; guideline\_pack jsonb not null,



&nbsp; created\_at timestamptz not null default now(),

&nbsp; updated\_at timestamptz not null default now(),



&nbsp; agency\_id uuid,

&nbsp; client\_id uuid

);



create index if not exists idx\_survey\_guidelines\_campaign on public.survey\_analysis\_guidelines(campaign\_id);

create index if not exists idx\_survey\_guidelines\_fingerprint on public.survey\_analysis\_guidelines(form\_fingerprint);

create unique index if not exists uniq\_survey\_guidelines\_campaign\_fingerprint\_version

&nbsp; on public.survey\_analysis\_guidelines(campaign\_id, form\_fingerprint, version);

```



\* 멀티테넌시 컬럼(`agency\_id`, `client\_id`)은 기존 패턴대로 `fill\_org\_fields()` 트리거로 채우는 것을 권장합니다.



\### 10.2 reports에 “어떤 지침으로 분석했는지” 기록



`survey\_analysis\_reports`에 아래 컬럼 추가(권장):



\* `guideline\_id uuid null`

\* `guideline\_version int null`

\* `guideline\_snapshot jsonb null` (재현성/감사 목적)



---



\## 11) API 명세(신규 + 기존 확장)



\### 11.1 Guideline 생성(초안)



\* `POST /api/event-survey/campaigns/\[campaignId]/analysis/guidelines/generate`

\* Request:



```json

{ "lens": "general", "mode": "b2b-default" }

```



\* Response:



```json

{ "success": true, "guidelineId": "uuid", "version": 1, "status": "draft" }

```



생성 로직은:



\* form\_questions를 읽어서 role 자동추정(키워드 기반) + 옵션 그룹 추천

\* 필요하면 LLM은 “옵션 그룹/스코어 추천”까지만 사용(결정론적 저장)



\### 11.2 Guideline 조회/수정/발행



\* `GET /api/.../analysis/guidelines?campaignId=...`

\* `GET /api/.../analysis/guidelines/\[guidelineId]`

\* `PATCH /api/.../analysis/guidelines/\[guidelineId]` (JSON patch or full replace)

\* `POST /api/.../analysis/guidelines/\[guidelineId]/publish`



\### 11.3 Guideline 검증(발행 전 필수)



\* `POST /api/.../analysis/guidelines/\[guidelineId]/validate`

\* Response 예:



```json

{

&nbsp; "success": true,

&nbsp; "isValid": false,

&nbsp; "errors": \[

&nbsp;   { "code": "UNMAPPED\_OPTIONS", "message": "문항5 옵션 4개 중 2개가 그룹 매핑되지 않았습니다." }

&nbsp; ],

&nbsp; "warnings": \[

&nbsp;   { "code": "ROLE\_ALIAS", "message": "engagement\_intent는 intent\_followup으로 정규화 권장" }

&nbsp; ]

}

```



\### 11.4 기존 보고서 생성 API 확장



이미 존재:



\* `POST /api/event-survey/campaigns/\[campaignId]/analysis/generate`



확장:



\* Request에 `guidelineId?` 옵션

\* 없으면: 현재 formFingerprint에 대해 최신 `published` 지침 자동 선택

\* mismatch면: reconcile 후 경고 포함 + lead scoring 제한



---



\## 12) 서버 구현 상세(파일/함수)



\### 12.1 신규 파일(권장)



\* `lib/surveys/analysis/guidelines/guidelineSchema.ts` (Zod)

\* `lib/surveys/analysis/guidelines/buildGuidelinePack.ts`

\* `lib/surveys/analysis/guidelines/lintGuideline.ts`

\* `lib/surveys/analysis/guidelines/reconcileGuideline.ts`

\* `lib/surveys/analysis/guidelines/renderGuidelineMD.ts` (사람용)



\### 12.2 기존 코드 수정 포인트



\* `buildAnalysisPack.ts` : guideline 적용해 role/옵션 그룹/스코어 규칙 주입

\* `buildComputedMetrics.ts` : pinned crosstab + autoPick(topK) 반영(확장 계획과 일치)

\* `generateDecisionPack.ts` : 카드 템플릿 허용 목록을 prompt에 주입(향후)



---



\## 13) 프론트(UI) 명세



\### 13.1 운영 콘솔 IA



설문 캠페인 콘솔에 “AI 분석” 탭을 3-Step으로 구성:



1\. \*\*분석 지침(Guide)\*\*



&nbsp;  \* “자동 생성” 버튼

&nbsp;  \* 현재 지침 상태: Draft/Published, fingerprint 표시

&nbsp;  \* 버전 목록/복제/비교(diff)



2\. \*\*지침 편집\*\*



&nbsp;  \* 문항 리스트(드래그 정렬은 불필요, 표시만)

&nbsp;  \* 각 문항:



&nbsp;    \* role 드롭다운(표준 taxonomy)

&nbsp;    \* logicalKey 입력

&nbsp;    \* 옵션 매핑 UI(옵션별 groupKey 선택)

&nbsp;    \* 그룹별 score 입력(0~100)

&nbsp;    \* multiSelectStrategy 선택

&nbsp;  \* 교차표:



&nbsp;    \* pinned 추가/삭제

&nbsp;    \* autoPick on/off, topK 설정

&nbsp;  \* 리드스코어:



&nbsp;    \* 컴포넌트 role 선택 + weight 슬라이더

&nbsp;    \* tier 기준 편집

&nbsp;  \* “검증” 버튼(서버 validate 호출)



3\. \*\*AI 보고서 생성\*\*



&nbsp;  \* 사용할 지침 선택(기본: published 최신)

&nbsp;  \* 실행 → 결과 미리보기/다운로드



\### 13.2 오류/경고 UX



\* fingerprint mismatch면 상단에 \*\*빨간 배너 + “지침 새 버전 만들기” CTA\*\*

\* 옵션 미매핑/role alias는 \*\*노란 경고 + 자동 수정 버튼\*\*



---



\## 14) 지침 보강 예시: 지금 5문항(HPE 네트워크)용 gp-1.0 샘플



아래는 “현재 중간지침의 의도”를 유지하면서, \*\*실행 가능하게 빈칸을 채운 형태\*\*의 예시입니다.

(역할 이름은 표준 taxonomy로 정리했고, 옵션 그룹/스코어/다중선택 전략을 명시)



> 참고: 실제 옵션 ID는 DB의 `form\_questions.options`에서 가져와 채워야 해서, 여기서는 `byOptionText` 중심 예시로 적습니다.



```json

{

&nbsp; "version": "gp-1.0",

&nbsp; "meta": {

&nbsp;   "campaignId": "…",

&nbsp;   "formId": "…",

&nbsp;   "formFingerprint": "defb7d356e…",

&nbsp;   "status": "draft",

&nbsp;   "createdAtISO": "2026-01-06T09:10:36.850Z",

&nbsp;   "updatedAtISO": "2026-01-06T09:10:36.850Z"

&nbsp; },

&nbsp; "purpose": {

&nbsp;   "lens": "general",

&nbsp;   "decisionQuestions": \[

&nbsp;     "가장 빠르게 전환될 가능성이 높은 프로젝트는 어떤 것인가?",

&nbsp;     "어떤 고객에게 우선적으로 네트워크 솔루션 제안을 해야 하는가?",

&nbsp;     "예산/권한 상태에 따라 영업 전략을 어떻게 조정해야 하는가?"

&nbsp;   ]

&nbsp; },

&nbsp; "questions": \[

&nbsp;   {

&nbsp;     "questionId": "55c4f2ef-…",

&nbsp;     "logicalKey": "timeline\_project",

&nbsp;     "role": "timeline",

&nbsp;     "importance": "core",

&nbsp;     "questionType": "single",

&nbsp;     "optionMap": {

&nbsp;       "byOptionText": {

&nbsp;         "1주일 이내": { "groupKey": "immediate" },

&nbsp;         "1개월 - 3개월": { "groupKey": "short" },

&nbsp;         "6개월 - 12개월": { "groupKey": "mid" },

&nbsp;         "1년 이후": { "groupKey": "long" },

&nbsp;         "계획없음": { "groupKey": "no\_plan" }

&nbsp;       }

&nbsp;     },

&nbsp;     "groups": {

&nbsp;       "immediate": { "title": "즉시", "score": 100 },

&nbsp;       "short":     { "title": "단기", "score": 80 },

&nbsp;       "mid":       { "title": "중기", "score": 50 },

&nbsp;       "long":      { "title": "장기", "score": 30 },

&nbsp;       "no\_plan":   { "title": "계획없음", "score": 0 }

&nbsp;     }

&nbsp;   },

&nbsp;   {

&nbsp;     "questionId": "ed14ac97-…",

&nbsp;     "logicalKey": "usecase\_network\_area",

&nbsp;     "role": "usecase\_project\_type",

&nbsp;     "importance": "support",

&nbsp;     "questionType": "multiple",

&nbsp;     "multiSelectStrategy": "max",

&nbsp;     "optionMap": {

&nbsp;       "byOptionText": {

&nbsp;         "네트워크 보안": { "groupKey": "security" },

&nbsp;         "데이터 센터 (AI 데이터 ...)": { "groupKey": "data\_center" },

&nbsp;         "엔터프라이즈 라우팅 (SD-...)": { "groupKey": "routing" },

&nbsp;         "유무선 캠퍼스 \& 브랜치 네...": { "groupKey": "campus\_branch" },

&nbsp;         "해당 없음": { "groupKey": "none" }

&nbsp;       }

&nbsp;     },

&nbsp;     "groups": {

&nbsp;       "security":       { "title": "보안", "score": 60 },

&nbsp;       "data\_center":    { "title": "데이터센터", "score": 60 },

&nbsp;       "routing":        { "title": "라우팅", "score": 60 },

&nbsp;       "campus\_branch":  { "title": "캠퍼스/브랜치", "score": 60 },

&nbsp;       "none":           { "title": "해당없음", "score": 0 }

&nbsp;     }

&nbsp;   },

&nbsp;   {

&nbsp;     "questionId": "401d84a5-…",

&nbsp;     "logicalKey": "budget\_status",

&nbsp;     "role": "budget\_status",

&nbsp;     "importance": "core",

&nbsp;     "questionType": "single",

&nbsp;     "optionMap": { "byOptionText": { "예": { "groupKey": "confirmed" }, "아니오": { "groupKey": "not\_confirmed" } } },

&nbsp;     "groups": {

&nbsp;       "confirmed": { "title": "예산 확보", "score": 100 },

&nbsp;       "not\_confirmed": { "title": "미확보", "score": 40 }

&nbsp;     }

&nbsp;   },

&nbsp;   {

&nbsp;     "questionId": "e2871702-…",

&nbsp;     "logicalKey": "authority",

&nbsp;     "role": "authority",

&nbsp;     "importance": "core",

&nbsp;     "questionType": "single",

&nbsp;     "optionMap": { "byOptionText": { "예": { "groupKey": "authorized" }, "아니오": { "groupKey": "not\_authorized" } } },

&nbsp;     "groups": {

&nbsp;       "authorized": { "title": "결정권/구매담당", "score": 100 },

&nbsp;       "not\_authorized": { "title": "비결정권", "score": 50 }

&nbsp;     }

&nbsp;   },

&nbsp;   {

&nbsp;     "questionId": "b0e55598-…",

&nbsp;     "logicalKey": "intent\_followup\_hpe",

&nbsp;     "role": "intent\_followup",

&nbsp;     "importance": "core",

&nbsp;     "questionType": "single",

&nbsp;     "optionMap": {

&nbsp;       "byOptionText": {

&nbsp;         "HPE 네트워크 전문가의 방문 …": { "groupKey": "high\_onsite" },

&nbsp;         "HPE 네트워크 전문가의 온라인 …": { "groupKey": "high\_online" },

&nbsp;         "HPE 네트워크 전문가의 전화 …": { "groupKey": "mid\_call" },

&nbsp;         "관심 없음": { "groupKey": "none" }

&nbsp;       }

&nbsp;     },

&nbsp;     "groups": {

&nbsp;       "high\_onsite": { "title": "방문 미팅 희망", "score": 100 },

&nbsp;       "high\_online": { "title": "온라인 미팅 희망", "score": 90 },

&nbsp;       "mid\_call":    { "title": "전화/자료", "score": 70 },

&nbsp;       "none":        { "title": "관심없음", "score": 0 }

&nbsp;     }

&nbsp;   }

&nbsp; ],

&nbsp; "crosstabs": {

&nbsp;   "pinned": \[

&nbsp;     { "rowRole": "timeline", "colRole": "intent\_followup", "minCellCount": 5 },

&nbsp;     { "rowRole": "authority", "colRole": "intent\_followup", "minCellCount": 5 },

&nbsp;     { "rowRole": "budget\_status", "colRole": "timeline", "minCellCount": 5 }

&nbsp;   ],

&nbsp;   "autoPick": { "enabled": true, "topK": 5, "minCellCount": 5 }

&nbsp; },

&nbsp; "leadScoring": {

&nbsp;   "enabled": true,

&nbsp;   "components": \[

&nbsp;     { "role": "timeline", "weight": 1.0 },

&nbsp;     { "role": "intent\_followup", "weight": 1.0 },

&nbsp;     { "role": "authority", "weight": 1.0 },

&nbsp;     { "role": "budget\_status", "weight": 0.8 }

&nbsp;   ],

&nbsp;   "normalize": "weightedSumTo100",

&nbsp;   "tiers": \[

&nbsp;     { "tier": "P0", "minScore": 80 },

&nbsp;     { "tier": "P1", "minScore": 60 },

&nbsp;     { "tier": "P2", "minScore": 40 },

&nbsp;     { "tier": "P3", "minScore": 20 },

&nbsp;     { "tier": "P4", "minScore": 0 }

&nbsp;   ],

&nbsp;   "recommendedActions": {

&nbsp;     "P0": "즉시 컨택 (48시간 이내)",

&nbsp;     "P1": "우선 컨택 (1주일 이내)",

&nbsp;     "P2": "일반 컨택 (2주일 이내)",

&nbsp;     "P3": "낮은 우선순위 (1개월 이내)",

&nbsp;     "P4": "자동 nurture 또는 제외"

&nbsp;   }

&nbsp; },

&nbsp; "decisionCards": {

&nbsp;   "preferredTemplates": \[

&nbsp;     "lead\_immediate\_contact",

&nbsp;     "timeline\_focus",

&nbsp;     "budget\_authority\_priority",

&nbsp;     "followup\_script"

&nbsp;   ]

&nbsp; },

&nbsp; "validation": {

&nbsp;   "minSampleCountToUseLeadScoring": 10,

&nbsp;   "requireRolesForLeadScoringAny": \["timeline","intent\_followup"],

&nbsp;   "warnIfFormFingerprintMismatch": true

&nbsp; }

}

```



\* 이 구조는 현재 중간지침이 가진 “의도(의사결정 질문/교차표/티어)”를 그대로 살리면서

\* 실제 서버가 “옵션 → 그룹 → 점수”로 계산 가능하게 만듭니다.



---



\## 15) 결론: “중간과정 추가”는 정답이고, 다음 보강이 핵심



정리하면:



\* 지금 지침은 \*\*뼈대는 합격\*\*(목적/역할/교차표/티어)

\* 하지만 구현 가능한 설계로 만들려면:



&nbsp; 1. \*\*옵션 매핑/그룹/스코어\*\*를 채우고

&nbsp; 2. \*\*role taxonomy를 표준화\*\*하고

&nbsp; 3. \*\*fingerprint mismatch + reconcile + 버전관리\*\*를 넣고

&nbsp; 4. 디시즌카드는 \*\*템플릿 registry + evidence 타입\*\*과 연결해야 합니다.



원하시면, 위 명세를 바탕으로 \*\*(1) Supabase 마이그레이션 SQL 파일 형태로 분리\*\*, \*\*(2) Zod 스키마 파일(guidelineSchema.ts) 완성본\*\*, \*\*(3) buildGuidelinePack / lintGuideline / reconcileGuideline 의 TypeScript 의사코드(거의 구현급)\*\*까지 한 번에 내려드릴게요.



