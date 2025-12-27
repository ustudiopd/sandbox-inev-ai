/**
 * Gemini API를 사용하여 설문조사 분석 보고서 생성
 */

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

interface AnalysisInput {
  campaignTitle: string
  analyzedAt: string
  sampleCount: number
  totalQuestions: number
  questionStatsJSON: string
  lens?: 'general' | 'sales' | 'marketing'
}

/**
 * Gemini API를 호출하여 설문조사 분석 보고서 생성
 */
export async function generateSurveyAnalysis(input: AnalysisInput): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다.')
  }

  const lensContext = {
    general: '일반적인 관점에서',
    sales: '영업 관점에서 리드 우선순위와 후속 액션에 중점을 두고',
    marketing: '마케팅 관점에서 타겟 세그먼트와 메시징 전략에 중점을 두고',
  }

  const prompt = `당신은 설문조사 데이터 분석 전문가입니다. 다음 설문조사 통계 데이터를 ${lensContext[input.lens || 'general']} 분석하여 심층적인 인사이트를 제공해주세요.

## 분석 요청 사항
1. **전체적인 응답 패턴 분석**: 각 문항의 응답 분포를 분석하고 주요 트렌드를 파악하세요.
2. **문항 간 상관관계 분석**: 문항들 간의 연관성을 찾아 인사이트를 도출하세요.
3. **핵심 발견사항**: 가장 주목할 만한 발견사항 3-5개를 요약하세요.
4. **행동 권장사항**: 분석 결과를 바탕으로 실무에 활용할 수 있는 구체적인 권장사항을 제시하세요.
5. **향후 예측**: 현재 데이터 패턴을 바탕으로 향후 예상되는 트렌드를 예측하세요.

## 설문조사 정보
- 캠페인 제목: ${input.campaignTitle}
- 분석 시점: ${input.analyzedAt}
- 총 응답 수: ${input.sampleCount}명
- 분석 문항 수: ${input.totalQuestions}개

## 문항별 통계 데이터
${input.questionStatsJSON}

## 출력 형식
다음 Markdown 형식으로 작성해주세요. 상단의 "분석대상/레퍼런스/도넛 요약"은 별도로 제공되므로 포함하지 마세요.

## 🔍 주요 발견사항

### 1. 전체 응답 패턴
[각 문항의 응답 분포를 분석한 내용]

### 2. 문항 간 상관관계
[문항들 간의 연관성 분석]

### 3. 핵심 발견사항
[가장 주목할 만한 발견사항 3-5개]

## 🧩 세그먼트/리드 신호 해석
[응답자 세그먼트 분석 및 리드 품질 평가]

## 💡 실행 권장사항(영업/마케팅)
[구체적인 실행 가능한 권장사항]

## ⚠️ 데이터 품질/주의사항
[데이터 품질 평가 및 주의사항]

## 📋 문항별 상세 분석
[각 문항에 대한 상세 분석]

중요: 위 섹션 구조를 정확히 따라주세요. 각 섹션은 반드시 포함되어야 합니다.`

  try {
    const modelName = 'gemini-2.0-flash'
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API 오류:', response.status, errorText)
      throw new Error(`AI 생성 실패: ${response.status}`)
    }

    const data: GeminiResponse = await response.json()

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!content) {
      throw new Error('AI 응답에서 내용을 찾을 수 없습니다.')
    }

    return content
  } catch (error: any) {
    console.error('Gemini API 호출 실패:', error)
    throw new Error(`AI 분석 생성 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

/**
 * 재시도 로직이 포함된 분석 생성
 */
export async function generateSurveyAnalysisWithRetry(
  input: AnalysisInput,
  maxRetries = 2
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateSurveyAnalysis(input)
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        // 지수 백오프: 1초 → 2초
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
        console.log(`AI 생성 재시도 ${attempt + 1}/${maxRetries}...`)
      }
    }
  }

  throw lastError || new Error('AI 생성 실패: 최대 재시도 횟수 초과')
}

