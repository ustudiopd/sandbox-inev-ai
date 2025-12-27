/**
 * Gemini API를 사용하여 Action Pack JSON 생성
 * v0.9 스키마 사용 (단순화된 구조로 통과율 향상)
 * Structured Output 적용으로 스키마 검증 실패율 감소
 */

import {
  ActionPackV09Schema,
  ActionPackV2Schema,
  type ActionPackV09,
  type ActionPackV2,
} from './actionPackSchema'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
  promptFeedback?: {
    blockReason?: string
  }
}

interface GenerateActionPackInput {
  campaignId: string
  campaignTitle: string
  analyzedAtISO: string
  sampleCount: number
  totalQuestions: number
  questionStats: any[]
  crosstabs: any[]
  crosstabHighlights?: any[]  // 추가
  leadSignals: any
  dataQuality: any[]
  evidenceCatalog?: any[]  // Decision-grade v3 추가
  capacityPlan?: any  // Decision-grade v3 추가
  lens: 'sales' | 'marketing' | 'general'
}

/**
 * Structured Output 없이 일반 JSON 모드로 Action Pack 생성
 * Structured Output이 실패할 때 fallback으로 사용
 */
async function generateActionPackWithoutStructuredOutput(
  input: GenerateActionPackInput,
  retryIssues?: z.ZodIssue[],
  linterWarnings?: any[]
): Promise<ActionPackV09> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.')
  }

  // 재시도인 경우 이전 검증 오류를 포함한 프롬프트 생성
  const retryPrompt =
    retryIssues && retryIssues.length > 0
      ? `\n\n**이전 응답의 스키마 검증 오류 (반드시 수정하세요):**\n${retryIssues
          .slice(0, 10)
          .map((issue) => {
            const path = Array.isArray(issue.path) && issue.path.length ? issue.path.join('.') : 'root'
            return `- ${path}: ${issue.message}`
          })
          .join('\n')}\n\n위 오류를 모두 수정한 올바른 JSON만 반환하세요.`
      : ''

  // 품질 검증 오류가 있는 경우 추가
  const qualityPrompt =
    linterWarnings && linterWarnings.length > 0
      ? `\n\n**이전 응답의 품질 검증 오류 (반드시 수정하세요):**\n${linterWarnings
          .slice(0, 10)
          .map((w: any) => {
            return `- ${w.field}: ${w.message}`
          })
          .join('\n')}\n\n위 품질 요구사항을 모두 충족하는 JSON만 반환하세요.`
      : ''

  const systemPrompt = `당신은 B2B 세일즈/마케팅 인사이트 분석가입니다. 설문조사 데이터를 분석하여 실행 가능한 인사이트와 액션 플랜을 제공합니다.

**핵심 원칙:**
1. **데이터 기반 분석**: 입력으로 제공된 통계 데이터와 computed 값만 사용하세요. 임의로 계산하거나 추정하지 마세요.
2. **구체적 근거 필수**: 모든 인사이트는 반드시 숫자(퍼센트, 분수, 카운트)를 포함한 근거가 있어야 합니다.
3. **실행 가능한 액션**: 각 인사이트마다 구체적인 담당자, 기한, 실행 단계를 제시하세요.
4. **명확한 표현**: "예상됩니다/가능성이 높습니다/추정됩니다" 같은 모호한 표현을 사용하지 마세요. 데이터가 보여주는 사실만 기술하세요.

**출력 품질 기준:**
- **executiveSummary.oneLiner**: 핵심 발견사항을 **최소 80자 이상**으로 상세히 요약하세요. 단순히 숫자만 나열하지 말고, 비즈니스 의미와 다음 액션을 포함하세요.
  - ❌ 나쁜 예: "데이터센터 프로젝트 계획 응답자 중 34%가 1주일 이내 계획, 28%가 방문 요청."
  - ✅ 좋은 예: "데이터센터 프로젝트 계획 응답자 중 34%가 1주일 이내 즉시 계획을 가지고 있어, 이들은 최우선 리드(P0)로 분류하여 24시간 내 방문 미팅을 제안해야 합니다. 또한 전체 응답자의 28%가 방문 요청을 명시적으로 표현했으므로, 영업팀은 이들을 우선적으로 접촉하여 구체적인 니즈를 파악하고 맞춤형 솔루션을 제안해야 합니다."
- **insights**: 각 인사이트는 다음을 포함해야 합니다:
  - title: 명확하고 구체적인 제목 (예: "데이터센터 프로젝트 계획 응답자 34%")
  - evidence: 반드시 숫자 포함 (예: "34% (17/50)", "1주 이내 계획 20명")
  - soWhat: 이 발견이 비즈니스에 미치는 의미와 영향
  - nextActions: 최소 1개 이상의 구체적 액션 (owner, due, steps 포함)
    - **owner 필드 (매우 중요!)**: 반드시 정확히 "sales", "marketing", "ops" 중 하나만 사용하세요. "Sales Team", "Marketing Team", "Solution Architect", "Inside Sales", "Marketing/Inside Sales" 같은 다른 값은 절대 사용하지 마세요!
  - **첫 번째 insight 필수 요구사항**: 첫 번째 insight는 반드시 "24시간 실행 플랜"이어야 합니다. title, evidence, 또는 soWhat 중 하나에 "24시간", "D+0", "D+1", "오늘", "당일", "내일" 중 하나가 포함되어야 합니다.
- **priorityQueue**: 리드 우선순위별로 분류
  - tier: "P0" (최우선), "P1" (높음), "P2" (보통), "P3" (낮음), "P4" (최저)
  - count, pct: 반드시 숫자 타입 (문자열 아님)
  - sla: 구체적인 응답 시간 (예: "24시간 내", "48시간 내")
  - script: 해당 티어 리드에게 사용할 구체적인 토크트랙 (2-3문장)
- **surveyNextQuestions**: 설문 개선을 위한 제안
  - question: 구체적인 질문 문항
  - answerType: "single" (단일 선택), "multiple" (다중 선택), "text" (텍스트)
  - why: 이 질문이 왜 필요한지 명확한 이유

**필수 필드 요구사항:**
- insights: 최소 3개 이상 반드시 포함. **첫 번째 insight는 반드시 "24시간 실행 플랜"이어야 합니다.**
- priorityQueue: 최소 3개 이상 반드시 포함 (P0, P1, P2 등)
- surveyNextQuestions: 최소 1개 이상 반드시 포함

**owner 필드 값 (매우 중요!):**
- nextActions의 owner 필드는 반드시 정확히 다음 중 하나만 사용하세요:
  - "sales" (영업팀)
  - "marketing" (마케팅팀)
  - "ops" (운영팀)
- "Sales Team", "Marketing Team", "Solution Architect", "Inside Sales", "Marketing/Inside Sales" 같은 다른 값은 절대 사용하지 마세요!

**형식 주의사항:**
- executiveSummary는 객체 { oneLiner: "..." } 형식입니다. 배열이 아닙니다!
- insights는 객체 배열 [{ title, evidence, soWhat, nextActions }] 형식입니다.
- priorityQueue는 객체 배열 [{ tier, count, pct, sla, script }] 형식입니다.
- 모든 숫자 필드(count, pct)는 숫자 타입입니다. 문자열이 아닙니다!
- campaign 필드는 만들지 마세요. 서버에서 자동으로 추가됩니다.

${retryPrompt}${qualityPrompt}

위 요구사항을 모두 충족하는 고품질 JSON을 생성하세요. 반드시 유효한 JSON만 출력하고, 코드 블록이나 마크다운 형식은 사용하지 마세요.`

  const userPrompt = buildUserPrompt(input)

  try {
    const modelName = 'gemini-3-flash-preview'
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [
              {
                text: `${userPrompt}\n\n위 데이터를 분석하여 ActionPackV0.9 JSON 형식으로 출력하세요. 반드시 유효한 JSON만 출력하고, 코드 블록이나 마크다운 형식은 사용하지 마세요.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          // Structured Output 없이 일반 JSON 모드
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini API 오류 (일반 모드):', response.status, errorText.substring(0, 200))
      throw new Error(`AI 생성 실패: ${response.status} - ${errorText.substring(0, 200)}`)
    }

    const data: GeminiResponse = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!content) {
      const finishReason = data.candidates?.[0]?.finishReason
      const blockReason = data.promptFeedback?.blockReason
      throw new Error(`AI 응답 없음. finishReason: ${finishReason}, blockReason: ${blockReason}`)
    }

    // JSON 파싱
    let jsonContent: any
    try {
      let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      cleanedContent = cleanedContent.replace(/^[\s\n]*/, '').replace(/[\s\n]*$/, '')
      jsonContent = JSON.parse(cleanedContent)
    } catch (parseError: any) {
      console.error('JSON 파싱 오류:', parseError.message)
      console.error('원본 내용 (처음 1000자):', content.substring(0, 1000))
      throw new Error(`AI 응답이 유효한 JSON 형식이 아닙니다: ${parseError.message}`)
    }

    // Zod 검증
    const result = ActionPackV09Schema.safeParse(jsonContent)
    if (!result.success) {
      const issues = result.error.issues ?? []
      const errorMessages = issues
        .slice(0, 20)
        .map((e: any) => {
          const path = Array.isArray(e.path) && e.path.length ? e.path.join('.') : 'root'
          return `${path}: ${e.message}`
        })
        .join(', ')

      const error = new Error(`스키마 검증 실패: ${errorMessages}`) as any
      error.issues = issues
      throw error
    }

    return result.data
  } catch (error: any) {
    console.error('Gemini API 호출 실패 (일반 모드):', error)
    if (error.message && error.message.includes('스키마 검증')) {
      throw error
    }
    throw new Error(`AI 분석 생성 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

/**
 * Gemini API를 호출하여 Action Pack V0.9 JSON 생성
 * campaign은 서버에서 주입 (LLM이 생성하지 않음)
 */
export async function generateActionPack(
  input: GenerateActionPackInput,
  retryIssues?: z.ZodIssue[],
  linterWarnings?: any[]
): Promise<ActionPackV09> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.')
  }

  // 재시도인 경우 이전 검증 오류를 포함한 프롬프트 생성
  const retryPrompt =
    retryIssues && retryIssues.length > 0
      ? `\n\n**이전 응답의 스키마 검증 오류 (반드시 수정하세요):**\n${retryIssues
          .slice(0, 10)
          .map((issue) => {
            const path = Array.isArray(issue.path) && issue.path.length ? issue.path.join('.') : 'root'
            return `- ${path}: ${issue.message}`
          })
          .join('\n')}\n\n위 오류를 모두 수정한 올바른 JSON만 반환하세요.`
      : ''

  // 품질 검증 오류가 있는 경우 추가
  const qualityPrompt =
    linterWarnings && linterWarnings.length > 0
      ? `\n\n**이전 응답의 품질 검증 오류 (반드시 수정하세요):**\n${linterWarnings
          .slice(0, 10)
          .map((w: any) => {
            return `- ${w.field}: ${w.message}`
          })
          .join('\n')}\n\n위 품질 요구사항을 모두 충족하는 JSON만 반환하세요.`
      : ''

  const systemPrompt = `당신은 B2B 세일즈/마케팅 인사이트 분석가입니다. 설문조사 데이터를 분석하여 실행 가능한 인사이트와 액션 플랜을 제공합니다.

**핵심 원칙:**
1. **데이터 기반 분석**: 입력으로 제공된 통계 데이터와 computed 값만 사용하세요. 임의로 계산하거나 추정하지 마세요.
2. **구체적 근거 필수**: 모든 인사이트는 반드시 숫자(퍼센트, 분수, 카운트)를 포함한 근거가 있어야 합니다.
3. **실행 가능한 액션**: 각 인사이트마다 구체적인 담당자, 기한, 실행 단계를 제시하세요.
4. **명확한 표현**: "예상됩니다/가능성이 높습니다/추정됩니다" 같은 모호한 표현을 사용하지 마세요. 데이터가 보여주는 사실만 기술하세요.

**출력 품질 기준:**
- **executiveSummary.oneLiner**: 핵심 발견사항을 **최소 80자 이상**으로 상세히 요약하세요. 단순히 숫자만 나열하지 말고, 비즈니스 의미와 다음 액션을 포함하세요.
  - ❌ 나쁜 예: "데이터센터 프로젝트 계획 응답자 중 34%가 1주일 이내 계획, 28%가 방문 요청."
  - ✅ 좋은 예: "데이터센터 프로젝트 계획 응답자 중 34%가 1주일 이내 즉시 계획을 가지고 있어, 이들은 최우선 리드(P0)로 분류하여 24시간 내 방문 미팅을 제안해야 합니다. 또한 전체 응답자의 28%가 방문 요청을 명시적으로 표현했으므로, 영업팀은 이들을 우선적으로 접촉하여 구체적인 니즈를 파악하고 맞춤형 솔루션을 제안해야 합니다."
- **insights**: 각 인사이트는 다음을 포함해야 합니다:
  - title: 명확하고 구체적인 제목 (예: "데이터센터 프로젝트 계획 응답자 34%")
  - evidence: 반드시 숫자 포함 (예: "34% (17/50)", "1주 이내 계획 20명")
  - soWhat: 이 발견이 비즈니스에 미치는 의미와 영향
  - nextActions: 최소 1개 이상의 구체적 액션 (owner, due, steps 포함)
    - **owner 필드 (매우 중요!)**: 반드시 정확히 "sales", "marketing", "ops" 중 하나만 사용하세요. "Sales Team", "Marketing Team", "Solution Architect", "Inside Sales", "Marketing/Inside Sales" 같은 다른 값은 절대 사용하지 마세요!
  - **첫 번째 insight 필수 요구사항**: 첫 번째 insight는 반드시 "24시간 실행 플랜"이어야 합니다. title, evidence, 또는 soWhat 중 하나에 "24시간", "D+0", "D+1", "오늘", "당일", "내일" 중 하나가 포함되어야 합니다.
- **priorityQueue**: 리드 우선순위별로 분류
  - tier: "P0" (최우선), "P1" (높음), "P2" (보통), "P3" (낮음), "P4" (최저)
  - count, pct: 반드시 숫자 타입 (문자열 아님)
  - sla: 구체적인 응답 시간 (예: "24시간 내", "48시간 내")
  - script: 해당 티어 리드에게 사용할 구체적인 토크트랙 (2-3문장)
- **surveyNextQuestions**: 설문 개선을 위한 제안
  - question: 구체적인 질문 문항
  - answerType: "single" (단일 선택), "multiple" (다중 선택), "text" (텍스트)
  - why: 이 질문이 왜 필요한지 명확한 이유

**필수 필드 요구사항:**
- insights: 최소 3개 이상 반드시 포함. **첫 번째 insight는 반드시 "24시간 실행 플랜"이어야 합니다.**
- priorityQueue: 최소 3개 이상 반드시 포함 (P0, P1, P2 등)
- surveyNextQuestions: 최소 1개 이상 반드시 포함

**owner 필드 값 (매우 중요!):**
- nextActions의 owner 필드는 반드시 정확히 다음 중 하나만 사용하세요:
  - "sales" (영업팀)
  - "marketing" (마케팅팀)
  - "ops" (운영팀)
- "Sales Team", "Marketing Team", "Solution Architect", "Inside Sales", "Marketing/Inside Sales" 같은 다른 값은 절대 사용하지 마세요!

**형식 주의사항:**
- executiveSummary는 객체 { oneLiner: "..." } 형식입니다. 배열이 아닙니다!
- insights는 객체 배열 [{ title, evidence, soWhat, nextActions }] 형식입니다.
- priorityQueue는 객체 배열 [{ tier, count, pct, sla, script }] 형식입니다.
- 모든 숫자 필드(count, pct)는 숫자 타입입니다. 문자열이 아닙니다!
- campaign 필드는 만들지 마세요. 서버에서 자동으로 추가됩니다.

${retryPrompt}${qualityPrompt}

**JSON 형식 예시 (정확히 이 구조를 따라주세요):**
\`\`\`json
{
  "version": "0.9",
  "lens": "general",
  "executiveSummary": {
    "oneLiner": "데이터센터 프로젝트 계획 응답자 중 34%가 1주일 이내 즉시 계획을 가지고 있어, 이들은 최우선 리드(P0)로 분류하여 24시간 내 방문 미팅을 제안해야 합니다. 또한 전체 응답자의 28%가 방문 요청을 명시적으로 표현했으므로, 영업팀은 이들을 우선적으로 접촉하여 구체적인 니즈를 파악해야 합니다."
  },
  "insights": [
    {
      "title": "데이터센터 프로젝트 계획 응답자 중 34%가 1주일 이내 즉시 계획 보유",
      "evidence": "34% (17/50명)가 1주일 이내 계획을 가지고 있으며, 이는 전체 응답자 중 가장 높은 비율입니다",
      "soWhat": "즉시 계획을 가진 리드는 경쟁사와의 비교 검토 단계에 있으므로, 빠른 응답이 핵심입니다. 24시간 내 방문 미팅을 제안하면 전환율이 높아질 것입니다.",
      "nextActions": [
        {
          "owner": "sales",
          "due": "D+2",
          "steps": [
            "17명의 리드에게 24시간 내 개별 연락하여 방문 미팅 일정 조율",
            "기술 팀과 협업하여 데이터센터 솔루션 제안서 준비",
            "경쟁사 비교 자료 및 ROI 계산서 포함하여 미팅 전 제공"
          ]
        }
      ]
    }
  ],
  "priorityQueue": [
    {
      "tier": "P0",
      "count": 10,
      "pct": 20,
      "sla": "24시간 내",
      "script": "안녕하세요, [회사명]의 [담당자명]님. 설문조사에서 데이터센터 프로젝트에 대한 즉각적인 관심을 표현해주셔서 감사합니다. 귀하의 프로젝트 일정에 맞춰 빠른 시일 내에 방문 미팅을 통해 구체적인 요구사항을 파악하고 맞춤형 솔루션을 제안드리고 싶습니다. 이번 주 중 가능한 시간대를 알려주시면 일정을 조율하겠습니다."
    },
    {
      "tier": "P1",
      "count": 15,
      "pct": 30,
      "sla": "48시간 내",
      "script": "안녕하세요, [회사명]의 [담당자명]님. 설문조사 응답 감사합니다. 귀하의 프로젝트 계획에 맞춰 온라인 미팅을 통해 초기 요구사항을 논의하고, 관련 솔루션 자료를 공유드리고 싶습니다. 다음 주 중 가능한 시간을 알려주시면 일정을 조율하겠습니다."
    },
    {
      "tier": "P2",
      "count": 12,
      "pct": 24,
      "sla": "1주일 내",
      "script": "안녕하세요, [회사명]의 [담당자명]님. 설문조사 응답 감사합니다. 프로젝트 계획 단계에서 도움이 필요하시면 언제든 연락 주세요. 전화 상담을 통해 초기 정보를 제공하고, 필요시 추가 자료를 공유드리겠습니다."
    }
  ],
  "segments": [
    {
      "name": "즉시 계획 그룹",
      "definition": "Timing <= 1주일 AND Followup != '관심 없음'",
      "size": { "count": 17, "pct": 34 },
      "playbook": [
        "24시간 내 개별 연락하여 방문 미팅 또는 온라인 미팅 일정 조율",
        "기술 팀과 협업하여 맞춤형 솔루션 제안서 준비",
        "경쟁사 비교 자료 및 ROI 계산서 포함하여 미팅 전 제공"
      ],
      "evidence": [
        "34% (17/50명)가 1주일 이내 계획 보유",
        "이 중 35.3%가 온라인 미팅, 29.4%가 방문 요청"
      ]
    },
    {
      "name": "정보 수집 단계",
      "definition": "Timing >= 3개월 AND Followup = '전화 상담'",
      "size": { "count": 8, "pct": 16 },
      "playbook": [
        "48시간 내 전화 상담 제공하여 프로젝트 구체화 지원",
        "관련 솔루션 자료 및 케이스 스터디 공유",
        "정기적인 정보 업데이트를 통한 관계 유지"
      ],
      "evidence": [
        "16% (8/50명)가 3개월 이상 계획",
        "이 중 50%가 전화 상담 요청"
      ]
    }
  ],
  "marketingPack": [
    {
      "theme": "데이터센터 네트워크 솔루션 빠른 도입 캠페인",
      "targetSegment": "즉시 도입 고려 그룹 (P0 리드)",
      "suggestedAssets": [
        "[이메일 제목] 데이터센터 네트워크 솔루션, 1주일 내 도입 가능",
        "[이메일 제목] HPE 네트워크 솔루션 PoC 신청 안내",
        "[이메일 제목] 데이터센터 네트워크 성공 사례 공유",
        "[CTA] 지금 PoC 신청하기",
        "[랜딩 훅] 데이터센터 네트워크 프로젝트를 1주일 내에 계획하고 계신가요?",
        "[랜딩 훅] HPE 네트워크 솔루션으로 데이터센터 성능을 30% 향상시킨 고객 사례를 확인하세요",
        "HPE 데이터센터 네트워크 솔루션 소개 자료",
        "성공 사례 연구 (고객 사례)",
        "PoC (Proof of Concept) 제공 안내"
      ],
      "distribution": [
        "이메일 캠페인 (P0 리드 대상)",
        "리타겟팅 광고 (웹사이트 방문자)",
        "데이터센터 네트워크 웨비나 초대"
      ],
      "rationale": "1주일 이내에 데이터센터 네트워크 프로젝트를 계획하고 있는 고객(34%, 17/50명)은 빠른 도입을 고려하고 있으므로, 즉각적인 정보 제공과 PoC 제공을 통해 빠른 의사결정을 지원해야 합니다."
    },
    {
      "theme": "정보 수집 단계 고객 교육 캠페인",
      "targetSegment": "정보 수집 단계 그룹 (3개월 이상 계획)",
      "suggestedAssets": [
        "[이메일 제목] 데이터센터 네트워크 솔루션 가이드북 무료 제공",
        "[이메일 제목] 기술 웨비나 시리즈 초대 - 데이터센터 네트워크 최신 트렌드",
        "[이메일 제목] 무료 기술 컨설팅 신청 안내",
        "[CTA] 가이드북 다운로드하기",
        "[랜딩 훅] 데이터센터 네트워크 프로젝트를 계획 중이신가요?",
        "[랜딩 훅] 무료 기술 컨설팅으로 최적의 솔루션을 찾아보세요",
        "데이터센터 네트워크 솔루션 가이드북",
        "기술 웨비나 시리즈 초대",
        "무료 기술 컨설팅 제공"
      ],
      "distribution": [
        "이메일 뉴스레터 (월간)",
        "소셜 미디어 콘텐츠",
        "온라인 세미나 초대"
      ],
      "rationale": "3개월 이상 계획을 가진 고객(16%, 8/50명)은 정보 수집 단계에 있으므로, 교육 콘텐츠와 기술 컨설팅을 통해 장기적인 관계를 구축하고 향후 프로젝트 시점에 대비해야 합니다."
    }
  ],
  "surveyNextQuestions": [
    {
      "question": "데이터센터 프로젝트의 예상 예산 규모는 어느 정도인가요?",
      "answerType": "single",
      "why": "예산 정보를 통해 리드의 구매 의사와 프로젝트 규모를 파악할 수 있으며, 적절한 솔루션 제안과 우선순위 분류에 필수적인 정보입니다."
    },
    {
      "question": "현재 사용 중인 네트워크 솔루션의 주요 불만사항은 무엇인가요?",
      "answerType": "multiple",
      "why": "Pain Point 파악을 통해 맞춤형 솔루션 제안과 경쟁 우위를 확보할 수 있습니다."
    }
  ],
  "dataQuality": [
    "총 응답 수 50명으로 통계적 유의성 확보. 각 문항별 응답률이 95% 이상으로 높은 신뢰도 확보",
    "모든 필수 문항에 대한 응답률 100%. 선택형 문항의 경우 평균 응답률 98%로 데이터 품질 우수",
    "교차표 분석 시 일부 셀의 표본 수가 5 미만인 경우가 있어, 해당 셀에 대한 해석 시 주의 필요. 특히 '3개월 이상' 그룹과 '관심 없음' 그룹의 교차 분석은 표본 수 부족으로 인해 제한적",
    "온라인 설문 특성상 특정 산업군이나 규모의 기업에 응답이 집중될 수 있으나, 전체적으로 다양한 프로젝트 유형이 포함되어 대표성 확보",
    "예산 규모, 의사결정자 정보 등 BANT 자격화를 위한 추가 질문이 필요함"
  ]
}
\`\`\`

위 JSON 예시 구조를 정확히 따라주세요. 반드시 유효한 JSON만 출력하고, 코드 블록이나 마크다운 형식은 사용하지 마세요.`

  const userPrompt = buildUserPrompt(input)

  // Structured Output은 중첩 깊이 제한으로 인해 완전히 비활성화
  // 대신 강화된 프롬프트로 일반 JSON 모드 사용
  const responseJsonSchema: any = undefined // Structured Output 비활성화

  try {
    const modelName = 'gemini-3-flash-preview'
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [
              {
                text: `${userPrompt}\n\n위 데이터를 분석하여 ActionPackV0.9 JSON 형식으로 출력하세요.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          ...(responseJsonSchema && { responseJsonSchema }),
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini API 오류:', response.status)
      console.error('에러 응답:', errorText.substring(0, 500))
      
      // Structured Output 관련 오류인지 확인
      const isSchemaError =
        errorText.includes('response_json_schema') ||
        errorText.includes('schema') ||
        errorText.includes('nesting depth') ||
        errorText.includes('exceeds the maximum')
      
      if (isSchemaError && responseJsonSchema) {
        console.error('⚠️ Structured Output 스키마 오류 감지 (중첩 깊이 초과 등)')
        console.error('Structured Output을 비활성화하고 일반 JSON 모드로 재시도합니다.')
        
        // Structured Output 없이 재시도
        return await generateActionPackWithoutStructuredOutput(input, retryIssues, linterWarnings)
      }
      
      throw new Error(`AI 생성 실패: ${response.status} - ${errorText.substring(0, 200)}`)
    }

    const data: GeminiResponse = await response.json()

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!content) {
      const finishReason = data.candidates?.[0]?.finishReason
      const blockReason = data.promptFeedback?.blockReason
      console.error('❌ AI 응답 없음:', { finishReason, blockReason })
      console.error('전체 응답 데이터:', JSON.stringify(data, null, 2).substring(0, 500))
      throw new Error(
        `AI 응답 없음. finishReason: ${finishReason}, blockReason: ${blockReason}`
      )
    }

    // Structured Output 사용 시 로깅
    if (responseJsonSchema) {
      console.log('✅ Structured Output 사용됨. 응답 길이:', content.length)
    } else {
      console.log('⚠️ Structured Output 미사용. 일반 JSON 모드')
    }

    // JSON 파싱
    let jsonContent: any
    try {
      // 코드 블록 제거 (혹시 모를 경우 대비)
      let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      // 앞뒤 공백 및 불필요한 문자 제거
      cleanedContent = cleanedContent.replace(/^[\s\n]*/, '').replace(/[\s\n]*$/, '')
      jsonContent = JSON.parse(cleanedContent)
    } catch (parseError: any) {
      console.error('JSON 파싱 오류:', parseError.message)
      console.error('원본 내용 (처음 1000자):', content.substring(0, 1000))
      throw new Error(`AI 응답이 유효한 JSON 형식이 아닙니다: ${parseError.message}`)
    }

    // Zod 검증 (v0.9 스키마 사용)
    const result = ActionPackV09Schema.safeParse(jsonContent)
    if (!result.success) {
      const issues = result.error.issues ?? []

      console.error('=== 스키마 검증 오류 상세 ===')
      console.error('issues:', JSON.stringify(issues, null, 2))
      console.error('받은 JSON 키:', Object.keys(jsonContent || {}))
      console.error('받은 JSON 전체 (처음 2000자):', JSON.stringify(jsonContent, null, 2).substring(0, 2000))

      const errorMessages =
        issues
          .slice(0, 20) // 너무 길어지는 것 방지
          .map((e: any) => {
            const path = Array.isArray(e.path) && e.path.length ? e.path.join('.') : 'root'
            const code = e.code || 'unknown'
            const msg = e.message || 'Invalid value'
            return `${path} (${code}): ${msg}`
          })
          .join(', ') || '알 수 없는 검증 오류'

      // 재시도를 위해 issues를 에러에 포함
      const error = new Error(`스키마 검증 실패: ${errorMessages}`) as any
      error.issues = issues
      throw error
    }

    // campaign 정보를 서버에서 주입
    const validatedData = result.data as any // ActionPackV09Extended를 위해 any로 처리
    
    // owner 필드 정규화 (AI가 잘못된 값을 반환하는 경우 대비)
    if (validatedData.insights) {
      validatedData.insights = validatedData.insights.map((insight: any) => {
        if (insight.nextActions) {
          insight.nextActions = insight.nextActions.map((action: any) => {
            if (action.owner) {
              // owner 필드 정규화
              const ownerLower = action.owner.toLowerCase()
              if (ownerLower.includes('sales') || ownerLower.includes('영업')) {
                action.owner = 'sales'
              } else if (ownerLower.includes('marketing') || ownerLower.includes('마케팅')) {
                action.owner = 'marketing'
              } else if (ownerLower.includes('ops') || ownerLower.includes('운영') || ownerLower.includes('architect') || ownerLower.includes('solution')) {
                action.owner = 'ops'
              } else {
                // 기본값은 sales
                action.owner = 'sales'
              }
            }
            return action
          })
        }
        return insight
      })
    }
    
    // Action Board의 owner 필드도 정규화 (optional 필드이므로 존재 여부 확인)
    if (validatedData.actionBoard) {
      const normalizeActionBoard = (actions: any[]) => {
        return actions.map((action: any) => {
          if (action.owner) {
            const ownerLower = action.owner.toLowerCase()
            if (ownerLower.includes('sales') || ownerLower.includes('영업')) {
              action.owner = 'sales'
            } else if (ownerLower.includes('marketing') || ownerLower.includes('마케팅')) {
              action.owner = 'marketing'
            } else if (ownerLower.includes('ops') || ownerLower.includes('운영') || ownerLower.includes('architect') || ownerLower.includes('solution')) {
              action.owner = 'ops'
            } else {
              action.owner = 'sales'
            }
          }
          return action
        })
      }
      
      if (validatedData.actionBoard.d0) {
        validatedData.actionBoard.d0 = normalizeActionBoard(validatedData.actionBoard.d0)
      }
      if (validatedData.actionBoard.d7) {
        validatedData.actionBoard.d7 = normalizeActionBoard(validatedData.actionBoard.d7)
      }
      if (validatedData.actionBoard.d14) {
        validatedData.actionBoard.d14 = normalizeActionBoard(validatedData.actionBoard.d14)
      }
    }
    
    return validatedData as ActionPackV09 // ActionPackV09로 반환 (actionBoard는 optional이므로 포함 가능)
  } catch (error: any) {
    console.error('Gemini API 호출 실패:', error)
    if (error.message && error.message.includes('스키마 검증')) {
      throw error
    }
    throw new Error(`AI 분석 생성 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

function buildUserPrompt(input: GenerateActionPackInput): string {
  const lensContext = {
    general: '일반적인 관점에서',
    sales: '영업 관점에서 리드 우선순위와 후속 액션에 중점을 두고',
    marketing: '마케팅 관점에서 타겟 세그먼트와 메시징 전략에 중점을 두고',
  }

  return `다음 설문조사 데이터를 ${lensContext[input.lens]} 분석하여 ActionPackV0.9 JSON을 생성하세요.

## 캠페인 정보 (참고용 - JSON에 포함하지 마세요)
- 캠페인 제목: ${input.campaignTitle}
- 총 응답 수: ${input.sampleCount}명
- 분석 문항 수: ${input.totalQuestions}개
- 분석 관점: ${input.lens}

## 🔥 교차표 하이라이트 (반드시 최소 2개 이상을 evidence로 인용하세요)
${input.crosstabHighlights && input.crosstabHighlights.length > 0
    ? input.crosstabHighlights.map((h: any, i: number) => `${i + 1}. ${h.highlight}`).join('\n')
    : '하이라이트가 없습니다. 교차표 분석을 참고하세요.'}

## 문항별 통계 데이터
${JSON.stringify(input.questionStats || [], null, 2)}

## 교차표 분석 (Crosstabs)
${JSON.stringify(input.crosstabs || [], null, 2)}

## 리드 신호 요약
- 티어별 분포: ${JSON.stringify(input.leadSignals?.distribution || [])}
- 채널 선호도: ${JSON.stringify(input.leadSignals?.channelPreference || {})}
- Timing 분포: ${JSON.stringify(input.leadSignals?.timingDistribution || {})}

## 데이터 품질
${JSON.stringify(input.dataQuality || [], null, 2)}

## 📊 Evidence Catalog (근거 카탈로그 - Decision Cards에서 반드시 참조하세요)
${input.evidenceCatalog && input.evidenceCatalog.length > 0
    ? input.evidenceCatalog.map((e: any) => `- **${e.id}**: ${e.title} - ${e.valueText} (N=${e.n}, Source: ${e.source})`).join('\n')
    : 'Evidence Catalog가 제공되지 않았습니다.'}

## 📈 Capacity Plan (리소스 계획 - Action Board 생성 시 참고)
${input.capacityPlan
    ? `- P0 리드 수: ${input.capacityPlan.p0Count}명
- P1 리드 수: ${input.capacityPlan.p1Count}명
- 필요한 온라인 미팅 슬롯: ${input.capacityPlan.meetingSlotsNeeded}개
- 필요한 방문 미팅 슬롯: ${input.capacityPlan.visitSlotsNeeded}개
- 필요한 SE 동행 슬롯: ${input.capacityPlan.seSlotsNeeded}개
- 권장 SLA: ${JSON.stringify(input.capacityPlan.suggestedSLA)}`
    : 'Capacity Plan이 제공되지 않았습니다.'}

---

## 분석 지침 (매우 중요 - 모든 섹션을 반드시 생성하세요)

위 데이터를 **다각도로 깊이 있게** 분석하여 다음을 수행하세요:

### 1. 핵심 발견사항 식별 (insights - 최소 3개 이상)
**매우 중요**: 첫 번째 insight는 반드시 "24시간 실행 플랜"이어야 합니다. title, evidence, 또는 soWhat 중 하나에 "24시간", "D+0", "D+1", "오늘", "당일", "내일" 중 하나가 포함되어야 합니다.

다양한 관점에서 인사이트를 도출하세요:
- **첫 번째 insight (필수)**: 24시간 내 즉시 실행해야 하는 액션 플랜. title에 "24시간" 또는 "즉시 실행"을 포함하고, nextActions의 due는 "D+0" 또는 "24시간 내"로 설정하세요.
- **Timing 관점**: 프로젝트 일정에 따른 발견사항 (예: "1주일 이내 계획 그룹의 특성")
- **Followup 관점**: 접촉 의향에 따른 발견사항 (예: "방문 요청 그룹의 프로젝트 특성")
- **ProjectType 관점**: 프로젝트 유형에 따른 발견사항 (예: "데이터센터 프로젝트의 특징")
- **교차 분석**: 두 가지 이상의 요소를 결합한 발견사항 (예: "1주일 이내 + 방문 요청 그룹")
- 각 인사이트는 반드시 구체적인 숫자 근거 포함 (예: "34% (17/50명)", "lift 1.6배")
- **nextActions의 owner 필드는 반드시 정확히 "sales", "marketing", "ops" 중 하나만 사용하세요. 다른 값은 사용하지 마세요!**

### 2. 리드 우선순위 분류 (priorityQueue - 최소 3개 이상, 모든 티어 포함)
- P0, P1, P2, P3, P4 모든 티어를 포함하세요
- 각 티어별 실제 count와 pct는 제공된 데이터 기반으로 계산
- SLA는 구체적으로 명시 (예: "24시간 내", "48시간 내", "1주일 내")
- script는 실제 사용 가능한 토크트랙 (최소 50자 이상, 3-4문장)

### 3. 세그먼트 플레이북 (segments - 최소 2개 이상, 필수)
명확한 기준으로 응답자를 세그먼트로 분류하세요:
- 예: "즉시 계획 그룹" (Timing <= 1주일 AND Followup != '관심 없음')
- 예: "정보 수집 단계" (Timing >= 3개월 AND Followup = '전화 상담')
- 예: "고관심 리드" (Followup = '방문 요청' OR '온라인 미팅')
- 각 세그먼트는 size(count, pct), playbook(최소 3개), evidence(최소 2개) 포함

### 4. 마케팅 팩 (marketingPack - 최소 2개 이상, 필수)
구체적이고 실행 가능한 마케팅 캠페인을 제안하세요. **반드시 실제 사용 가능한 콘텐츠를 포함**해야 합니다:
- **theme**: 캠페인 주제를 명확히 (예: "데이터센터 네트워크 솔루션 빠른 도입 캠페인")
- **targetSegment**: 타겟 세그먼트를 구체적으로 명시 (예: "즉시 도입 고려 그룹 (P0 리드)", "정보 수집 단계 그룹")
- **suggestedAssets**: 제안 자산을 구체화 (최소 6개 이상, 반드시 포함):
  - 이메일 제목 3개 (예: "[이메일 제목] 데이터센터 네트워크 솔루션, 1주일 내 도입 가능", "[이메일 제목] HPE 네트워크 솔루션 PoC 신청 안내", "[이메일 제목] 데이터센터 네트워크 성공 사례 공유")
  - CTA 1개 (예: "[CTA] 지금 PoC 신청하기", "[CTA] 무료 기술 컨설팅 받기")
  - 랜딩 첫 문장(훅) 2개 (예: "[랜딩 훅] 데이터센터 네트워크 프로젝트를 1주일 내에 계획하고 계신가요?", "[랜딩 훅] HPE 네트워크 솔루션으로 데이터센터 성능을 30% 향상시킨 고객 사례를 확인하세요")
  - 기타 자산 (예: "HPE 데이터센터 네트워크 솔루션 소개 자료", "성공 사례 연구", "PoC 제공 안내")
- **distribution**: 배포 채널을 구체적으로 명시 (최소 3개 이상, 예: "이메일 캠페인 (P0 리드 대상)", "리타겟팅 광고 (웹사이트 방문자)", "데이터센터 네트워크 웨비나 초대")
- **rationale**: 숫자 근거를 포함한 명확한 이유 (최소 50자 이상, 예: "1주일 이내에 데이터센터 네트워크 프로젝트를 계획하고 있는 고객(34%, 17/50명)은 빠른 도입을 고려하고 있으므로, 즉각적인 정보 제공과 PoC 제공을 통해 빠른 의사결정을 지원해야 합니다.")

### 5. 설문 개선 제안 (surveyNextQuestions - 최소 2개 이상)
BANT/MEDDIC 관점에서 부족한 질문을 제안하세요:
- Budget: 예산 관련 질문
- Authority: 의사결정자 관련 질문
- Need: 니즈/페인 포인트 관련 질문
- Timeline: 일정 관련 질문 (이미 있으면 다른 관점)
- 각 제안은 why 필드에 명확한 이유 포함

### 5. Decision Cards 생성 (decisionCards - 선택, 권장)
**의사결정 지원을 위한 구조화된 카드를 생성하세요.** 최소 3개 이상 권장:
- 각 카드는 하나의 핵심 의사결정 질문에 대한 답변을 제공합니다
- 예시 질문:
  - "지금 바로 컨택해야 하는 리드가 몇 명인가?"
  - "영업 리소스가 제한될 때, 어느 채널에 몇 슬롯을 배정해야 하나?"
  - "마케팅은 어떤 메시지/오퍼로 어떤 세그먼트를 먼저 치면 되나?"
- 각 카드는 반드시:
  - options (A/B/C) 최소 2개 포함
  - recommendation (A/B/C 중 하나) 명시
  - evidenceIds (Evidence Catalog 참조, 예: ["E1", "E2"]) 최소 2개 포함
  - confidence ("Confirmed" | "Directional" | "Hypothesis") 명시
  - rationale (추천 이유) 최소 20자

### 6. Action Board 생성 (actionBoard - 선택, 권장)
**시간대별 실행 계획을 구조화하세요:**
- **d0**: 24시간 내 실행 항목 (즉시 실행, P0 리드 우선)
- **d7**: 7일 내 실행 항목 (단기 실행, P1 리드 포함)
- **d14**: 14일 내 실행 항목 (중기 실행, P2 리드 포함)
- 각 Action Item은 반드시:
  - owner, title, targetCount (예: "17명", "8건"), kpi (예: "미팅 전환율 40%"), steps 포함
- Capacity Plan을 참고하여 현실적인 수량과 KPI를 설정하세요

### 7. 데이터 품질 평가 (dataQuality - 최소 3개 이상, 필수)
데이터의 품질과 한계를 **구체적으로** 평가하세요. "ℹ️ 정보:" 같은 플레이스홀더는 절대 사용하지 마세요:
- 표본 수 평가 (예: "총 응답 수 50명으로 통계적 유의성 확보. 각 문항별 응답률이 95% 이상으로 높은 신뢰도 확보")
- 응답률 평가 (예: "모든 필수 문항에 대한 응답률 100%. 선택형 문항의 경우 평균 응답률 98%로 데이터 품질 우수")
- 교차표 분석 품질 (예: "교차표 분석 시 일부 셀의 표본 수가 5 미만인 경우가 있어, 해당 셀에 대한 해석 시 주의 필요. 특히 '3개월 이상' 그룹과 '관심 없음' 그룹의 교차 분석은 표본 수 부족으로 인해 제한적")
- 데이터 편향 가능성 (예: "온라인 설문 특성상 특정 산업군이나 규모의 기업에 응답이 집중될 수 있으나, 전체적으로 다양한 프로젝트 유형이 포함되어 대표성 확보")
- 추가 데이터 필요성 (예: "예산 규모, 의사결정자 정보 등 BANT 자격화를 위한 추가 질문이 필요함")

**품질 기준 (반드시 지켜주세요):**
- insights의 evidence는 반드시 숫자 포함 (예: "34% (17/50)", "1주 이내 계획 20명")
- priorityQueue의 count와 pct는 숫자 타입 (문자열 아님)
- 각 인사이트는 최소 1개 이상의 구체적 액션 포함
- segments는 최소 2개 이상 반드시 포함
- marketingPack은 최소 1개 이상 반드시 포함
- surveyNextQuestions는 최소 2개 이상 반드시 포함
- dataQuality는 최소 1개 이상 반드시 포함
- 토크트랙은 2-3문장으로 구체적이고 실행 가능해야 함

위 데이터를 기반으로 **모든 섹션을 포함한** 고품질 ActionPackV0.9 JSON을 생성하세요.`
}

/**
 * 재시도 로직이 포함된 Action Pack 생성
 * 스키마 검증 실패 또는 품질 검증 실패 시 재시도
 */
export async function generateActionPackWithRetry(
  input: GenerateActionPackInput,
  maxRetries = 2
): Promise<ActionPackV09> {
  let lastError: Error | null = null
  let retryIssues: z.ZodIssue[] | undefined = undefined
  let linterWarnings: any[] | undefined = undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateActionPack(input, retryIssues, linterWarnings)
      
      // 품질 검증 (linter)
      const { lintActionPackV09 } = await import('./reportLinter')
      const linterResult = lintActionPackV09(result, input.crosstabHighlights || [])
      
      if (!linterResult.isValid && attempt < maxRetries) {
        // 품질 검증 실패 시 재시도
        linterWarnings = linterResult.warnings
        console.log(`품질 검증 실패. 다음 재시도에서 ${linterResult.warnings.length}개 오류 수정 요청`)
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
        console.log(`Action Pack 생성 재시도 ${attempt + 1}/${maxRetries} (품질 검증 실패)...`)
        continue
      }
      
      return result
    } catch (error: any) {
      lastError = error
      
      // 스키마 검증 실패인 경우 issues를 추출하여 다음 재시도에 사용
      if (error.issues && Array.isArray(error.issues) && error.issues.length > 0) {
        const issues = error.issues as z.ZodIssue[]
        retryIssues = issues
        console.log(`스키마 검증 실패. 다음 재시도에서 ${issues.length}개 오류 수정 요청`)
      } else {
        retryIssues = undefined
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
        console.log(`Action Pack 생성 재시도 ${attempt + 1}/${maxRetries}...`)
      }
    }
  }

  throw lastError || new Error('Action Pack 생성 실패: 최대 재시도 횟수 초과')
}

