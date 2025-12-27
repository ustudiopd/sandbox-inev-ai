/**
 * 설문조사 AI 분석 보고서에 사용되는 레퍼런스 라이브러리
 * 보고서 생성 시 이 레퍼런스들이 보고서 앞부분에 고정으로 삽입됩니다.
 */

export interface Reference {
  id: string
  version: string
  title: string
  summary: string
  updatedAt: string
}

export const SURVEY_ANALYSIS_REFERENCES: Reference[] = [
  {
    id: 'aapor_transparency',
    version: '1.0',
    title: 'AAPOR Transparency',
    summary: '방법론 공개/투명성 원칙에 따라 표본수, 분석시점, 분모 등을 명시합니다.',
    updatedAt: '2025-01-01',
  },
  {
    id: 'iso_20252',
    version: '1.0',
    title: 'ISO 20252',
    summary: '시장/사회조사 서비스 품질 관리 관점에서 데이터 처리 절차를 문서화합니다.',
    updatedAt: '2025-01-01',
  },
  {
    id: 'icc_esomar',
    version: '1.0',
    title: 'ICC/ESOMAR Code',
    summary: '조사 윤리/전문성 원칙에 따라 개인정보/해석 책임성을 반영합니다.',
    updatedAt: '2025-01-01',
  },
  {
    id: 'bant',
    version: '1.0',
    title: 'BANT',
    summary: 'Budget/Authority/Need/Timing 관점으로 리드 우선순위를 구조화합니다.',
    updatedAt: '2025-01-01',
  },
  {
    id: 'meddic',
    version: '1.0',
    title: 'MEDDIC',
    summary: '복잡한 B2B 세일즈 자격화(의사결정 구조/기준/프로세스/페인 등)를 구조화합니다.',
    updatedAt: '2025-01-01',
  },
]

/**
 * 고정 신뢰 문구 (보고서 맨 앞에 항상 삽입)
 */
export const TRUST_STATEMENT = '본 보고서는 캠페인 설문 응답을 기반으로, 리서치/방법론 공개 원칙(AAPOR Transparency)과 시장조사 품질/윤리 가이드라인(ISO 20252, ICC/ESOMAR Code)을 참고하여 작성되었습니다. 또한 리드 우선순위와 후속 액션 제안은 BANT 및 MEDDIC 프레임워크 관점으로 구조화했습니다.'

/**
 * 레퍼런스 정보를 references_used 형식으로 변환
 */
export function getReferencesUsed(): {
  version: string
  generated_at: string
  references: Reference[]
} {
  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    references: SURVEY_ANALYSIS_REFERENCES,
  }
}

