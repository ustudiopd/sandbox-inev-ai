/**
 * Gemini 2.0 Flash API를 사용하여 한국어 제목을 영문 슬러그로 변환
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

/**
 * 한국어 웨비나 제목을 영문 슬러그로 변환
 * @param title - 웨비나 제목 (한국어 가능)
 * @returns 영문 슬러그 (예: "human-intelligence-x-artificial-intelligence-talk-show-2025-ai-year-end")
 */
export async function generateSlugFromTitle(title: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY
  
  if (!apiKey) {
    console.warn('GOOGLE_API_KEY가 설정되지 않았습니다. 기본 slug 생성 로직을 사용합니다.')
    return null
  }

  try {
    const prompt = `다음 한국어 웨비나 제목을 URL-friendly한 영문 슬러그로 변환해주세요. 
규칙:
1. 소문자만 사용
2. 공백은 하이픈(-)으로 변경
3. 특수문자는 제거
4. 의미를 잘 전달하는 영문으로 번역
5. 최대 100자 이내
6. 숫자는 그대로 유지
7. 결과만 반환 (설명 없이)

제목: "${title}"

슬러그:`

    // Gemini 2.0 Flash 모델 사용
    const modelName = 'gemini-2.0-flash-exp'
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
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 50,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API 오류:', response.status, errorText)
      return null
    }

    const data: GeminiResponse = await response.json()
    
    const slug = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    
    if (!slug) {
      console.warn('Gemini API 응답에서 slug를 찾을 수 없습니다.')
      return null
    }

    // 응답 정제 (슬러그 형식으로 변환)
    const cleanedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // 영문, 숫자, 공백, 하이픈만 허용
      .replace(/\s+/g, '-') // 공백을 하이픈으로
      .replace(/-+/g, '-') // 연속된 하이픈을 하나로
      .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
      .substring(0, 100) // 최대 100자

    if (!cleanedSlug) {
      console.warn('정제된 slug가 비어있습니다.')
      return null
    }

    return cleanedSlug
  } catch (error) {
    console.error('Gemini API 호출 실패:', error)
    return null
  }
}
