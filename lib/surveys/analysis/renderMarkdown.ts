/**
 * Action Pack를 Markdown으로 렌더링
 */

import type { ActionPackV09, ActionPackV2 } from './actionPackSchema'
import { TRUST_STATEMENT, SURVEY_ANALYSIS_REFERENCES } from '@/lib/references/survey-analysis-references'

export function renderActionPackToMarkdown(
  actionPack: ActionPackV2 | ActionPackV09,
  campaignTitle: string,
  analyzedAtISO: string,
  sampleCount?: number,
  totalQuestions?: number
): string {
  // v0.9인지 확인
  if (actionPack.version === '0.9') {
    return renderActionPackV09ToMarkdown(
      actionPack as ActionPackV09,
      campaignTitle,
      analyzedAtISO,
      sampleCount || 0,
      totalQuestions || 0
    )
  }
  
  // v2 렌더링 (기존 로직)
  return renderActionPackV2ToMarkdown(
    actionPack as ActionPackV2,
    campaignTitle,
    analyzedAtISO
  )
}

/**
 * Action Pack V0.9를 Markdown으로 렌더링
 */
function renderActionPackV09ToMarkdown(
  actionPack: ActionPackV09,
  campaignTitle: string,
  analyzedAtISO: string,
  sampleCount: number,
  totalQuestions: number
): string {
  const analyzedAt = new Date(analyzedAtISO).toLocaleString('ko-KR')

  let md = `${TRUST_STATEMENT}

## 🎯 분석 대상
- 캠페인: ${campaignTitle}
- 분석 시점: ${analyzedAt}
- 총 응답 수: ${sampleCount}명
- 분석 문항 수: ${totalQuestions}개
- 분석 관점: ${actionPack.lens === 'general' ? '일반' : actionPack.lens === 'sales' ? '영업' : '마케팅'}

## 📚 관련 레퍼런스 요약
${SURVEY_ANALYSIS_REFERENCES.map((ref) => `- **${ref.title}**: ${ref.summary}`).join('\n')}

---

${(actionPack as any).decisionCards && (actionPack as any).decisionCards.length > 0 ? `## 🎯 Decision Cards (의사결정 지원)

${(actionPack as any).decisionCards.map((card: any, index: number) => {
  const confidenceBadge = card.confidence === 'Confirmed' ? '✅ 확정' : card.confidence === 'Directional' ? '⚠️ 방향성' : '❓ 가설'
  return `### ${index + 1}. ${card.question}

**추천**: 옵션 ${card.recommendation}
**신뢰도**: ${confidenceBadge}

#### 선택지 비교

${card.options.map((opt: any) => {
  const isRecommended = opt.id === card.recommendation
  return `${isRecommended ? '**👉 추천**' : ''} **옵션 ${opt.id}**: ${opt.title}
- 설명: ${opt.description}
- 기대 효과: ${opt.expectedImpact}
${opt.risks ? `- 리스크: ${opt.risks}` : ''}
`
}).join('\n')}

**추천 이유**: ${card.rationale}
**근거 참조**: ${card.evidenceIds.join(', ')}

---
`
}).join('\n')}

` : ''}## 🎯 Action Board (실행 계획)

${(actionPack as any).actionBoard
    ? `### 24시간 내 실행 (D+0)
${(actionPack as any).actionBoard.d0 && (actionPack as any).actionBoard.d0.length > 0
    ? (actionPack as any).actionBoard.d0.map((action: any) => {
        const ownerText = action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'
        return `- **${ownerText}**: ${action.title}
  - 대상: ${action.targetCount}
  - 목표 KPI: ${action.kpi}
  - 실행 단계:
${action.steps.map((step: string) => `    - ${step}`).join('\n')}
`
      }).join('\n')
    : '24시간 내 실행 계획이 없습니다.'}

### 7일 내 실행 (D+7)
${(actionPack as any).actionBoard.d7 && (actionPack as any).actionBoard.d7.length > 0
    ? (actionPack as any).actionBoard.d7.map((action: any) => {
        const ownerText = action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'
        return `- **${ownerText}**: ${action.title}
  - 대상: ${action.targetCount}
  - 목표 KPI: ${action.kpi}
  - 실행 단계:
${action.steps.map((step: string) => `    - ${step}`).join('\n')}
`
      }).join('\n')
    : '7일 내 실행 계획이 없습니다.'}

### 14일 내 실행 (D+14)
${(actionPack as any).actionBoard.d14 && (actionPack as any).actionBoard.d14.length > 0
    ? (actionPack as any).actionBoard.d14.map((action: any) => {
        const ownerText = action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'
        return `- **${ownerText}**: ${action.title}
  - 대상: ${action.targetCount}
  - 목표 KPI: ${action.kpi}
  - 실행 단계:
${action.steps.map((step: string) => `    - ${step}`).join('\n')}
`
      }).join('\n')
    : '14일 내 실행 계획이 없습니다.'}
`
    : actionPack.insights && actionPack.insights.length > 0 && actionPack.insights[0]
    ? `### 24시간 내 실행 (D+0)
${actionPack.insights[0].nextActions.map((action: any) => {
  const ownerText = action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'
  return `- **${ownerText}** (${action.due}): ${action.steps.join(' ')}`
}).join('\n')}

### 7일 내 실행 (D+7)
${actionPack.insights.length > 1 && actionPack.insights[1].nextActions
    ? actionPack.insights[1].nextActions.map((action: any) => {
        const ownerText = action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'
        return `- **${ownerText}** (${action.due}): ${action.steps.join(' ')}`
      }).join('\n')
    : '추가 실행 계획이 없습니다.'}

### 14일 내 실행 (D+14)
${actionPack.insights.length > 2 && actionPack.insights[2].nextActions
    ? actionPack.insights[2].nextActions.map((action: any) => {
        const ownerText = action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'
        return `- **${ownerText}** (${action.due}): ${action.steps.join(' ')}`
      }).join('\n')
    : '추가 실행 계획이 없습니다.'}
`
    : 'Action Board가 생성되지 않았습니다.'}

---

## 📊 Executive Summary

${actionPack.executiveSummary.oneLiner}

---

## 💡 주요 인사이트

${actionPack.insights && actionPack.insights.length > 0
    ? actionPack.insights.map((insight, index) => `### ${index + 1}. ${insight.title}

**근거**: ${insight.evidence}

**해석**: ${insight.soWhat}

**액션**:
${insight.nextActions.map((action) => `- **${action.owner === 'sales' ? '영업' : action.owner === 'marketing' ? '마케팅' : '운영'}** (${action.due}):
${action.steps.map((step) => `  - ${step}`).join('\n')}
`).join('\n')}
`).join('\n')
    : '인사이트가 생성되지 않았습니다.'}

---

## 🎯 Priority Queue & SLA

${actionPack.priorityQueue && actionPack.priorityQueue.length > 0
    ? actionPack.priorityQueue.map((queue) => `### ${queue.tier}

- **수량**: ${queue.count}명
- **비율**: ${queue.pct}%
- **SLA**: ${queue.sla}
- **토크트랙**: ${queue.script}
`).join('\n')
    : 'Priority Queue가 생성되지 않았습니다.'}

---

${actionPack.segments && actionPack.segments.length > 0 ? `## 📋 세그먼트 플레이북

${actionPack.segments.map((segment, index) => `### ${index + 1}. ${segment.name}

**정의**: ${segment.definition}
**크기**: ${segment.size.count}명 (${segment.size.pct}%)

**플레이북**:
${segment.playbook.map((item) => `- ${item}`).join('\n')}

**근거**:
${segment.evidence.map((ev) => `- ${ev}`).join('\n')}
`).join('\n')}

---

` : ''}${actionPack.marketingPack && actionPack.marketingPack.length > 0 ? `## 📢 Marketing Pack

${actionPack.marketingPack.map((pack, index) => `### ${index + 1}. ${pack.theme}

**타겟 세그먼트**: ${pack.targetSegment}

**제안 자산**:
${pack.suggestedAssets.map((asset) => `- ${asset}`).join('\n')}

**배포 채널**:
${pack.distribution.map((channel) => `- ${channel}`).join('\n')}

**근거**: ${pack.rationale}
`).join('\n')}

---

` : ''}## 🔧 설문 개선 제안

${actionPack.surveyNextQuestions && actionPack.surveyNextQuestions.length > 0
    ? actionPack.surveyNextQuestions
        .map(
          (rec, index) => {
            const answerTypeText = rec.answerType === 'single' ? '단일 선택' : rec.answerType === 'multiple' ? '다중 선택' : '텍스트'
            return `### ${index + 1}. ${rec.question}

**중요성**: ${rec.why}
**답변 유형**: ${answerTypeText}
`
          }
        )
        .join('\n')
    : '설문 개선 제안이 생성되지 않았습니다.'}

---

${actionPack.dataQuality && actionPack.dataQuality.length > 0 ? `## ⚠️ 데이터 품질

${actionPack.dataQuality
  .filter((quality: string) => quality && typeof quality === 'string' && !quality.includes('ℹ️ 정보:') && !quality.includes('ℼ 정보:') && quality.trim().length > 0)
  .map((quality: string) => `- ${quality}
`).join('\n')}

---

` : ''}---

*본 보고서는 Action Pack V0.9 형식으로 생성되었습니다.*
`

  return md
}

/**
 * Action Pack V2를 Markdown으로 렌더링 (기존 함수)
 */
function renderActionPackV2ToMarkdown(
  actionPack: ActionPackV2,
  campaignTitle: string,
  analyzedAtISO: string
): string {
  const analyzedAt = new Date(analyzedAtISO).toLocaleString('ko-KR')

  let md = `${TRUST_STATEMENT}

## 🎯 분석 대상
- 캠페인: ${campaignTitle}
- 분석 시점: ${analyzedAt}
- 총 응답 수: ${actionPack.campaign.sampleCount}명
- 분석 문항 수: ${actionPack.campaign.totalQuestions}개
- 분석 관점: ${actionPack.lens === 'general' ? '일반' : actionPack.lens === 'sales' ? '영업' : '마케팅'}

## 📚 관련 레퍼런스 요약
${SURVEY_ANALYSIS_REFERENCES.map((ref) => `- **${ref.title}**: ${ref.summary}`).join('\n')}

---

## 📊 Executive Summary

${actionPack.executiveSummary.oneLiner}

### 주요 발견사항

${actionPack.executiveSummary.topWins.map((win, index) => `#### ${index + 1}. ${win.title}

**근거**: ${win.evidence}

**해석**: ${win.soWhat}

**액션**:
- 담당: ${win.action.owner === 'sales' ? '영업' : win.action.owner === 'marketing' ? '마케팅' : '운영'}
- 기한: ${win.action.due}
- 단계:
${win.action.steps.map((step) => `  - ${step}`).join('\n')}
`).join('\n')}

---

## 🎯 Priority Queue & SLA

### 티어별 분포

| 티어 | 수량 | 비율 |
|------|------|------|
${actionPack.priorityQueueSummary.tiers.map((tier) => `| ${tier.tier} | ${tier.count}명 | ${tier.pct}% |`).join('\n')}

### SLA 계획

${actionPack.priorityQueueSummary.slaPlan.map((sla) => `#### ${sla.tier}

- **목표 응답 시간**: ${sla.targetResponseTime}
- **권장 채널**: ${sla.recommendedChannel}
- **토크트랙**: ${sla.script}
`).join('\n')}

---

## 🔍 Correlation Findings

${actionPack.correlationFindings.map((finding, index) => `### ${index + 1}. ${finding.title}

**방법**: ${finding.method}
**근거**: ${finding.evidence.highlight}

**해석**: ${finding.soWhat}

**액션**:
${finding.actions.map((action) => `- **${action.owner === 'sales' ? '영업' : '마케팅'}** (${action.due}):
${action.steps.map((step) => `  - ${step}`).join('\n')}
`).join('\n')}
`).join('\n')}

---

## 📋 Segment Playbooks

${actionPack.segmentPlaybooks.map((playbook, index) => `### ${index + 1}. ${playbook.segmentName}

**정의**: ${playbook.definition}
**크기**: ${playbook.size.count}명 (${playbook.size.pct}%)

**핵심 니즈**:
${playbook.keyNeeds.map((need) => `- ${need}`).join('\n')}

**토크트랙**:
${playbook.talkTrack.map((track) => `- ${track}`).join('\n')}

**제안 자료**:
${playbook.nextBestOffer.map((offer) => `- ${offer}`).join('\n')}

**주의사항**:
${playbook.pitfalls.map((pitfall) => `- ${pitfall}`).join('\n')}

**근거**:
${playbook.evidence.map((ev) => `- ${ev}`).join('\n')}
`).join('\n')}

---

## 📢 Marketing Pack

${actionPack.marketingPack.map((pack, index) => `### ${index + 1}. ${pack.theme}

**타겟 세그먼트**: ${pack.targetSegment}

**제안 자산**:
${pack.suggestedAssets.map((asset) => `- ${asset}`).join('\n')}

**배포 채널**:
${pack.distribution.map((channel) => `- ${channel}`).join('\n')}

**근거**: ${pack.rationale}
`).join('\n')}

---

## 🔧 설문 개선 제안

${actionPack.surveyIterationRecommendations.map((rec, index) => `### ${index + 1}. ${rec.gap}

**중요성**: ${rec.whyItMatters}

**제안 문항**: ${rec.suggestedQuestion}
**답변 유형**: ${rec.answerType === 'single' ? '단일 선택' : rec.answerType === 'multiple' ? '다중 선택' : '텍스트'}
`).join('\n')}

---

## ⚠️ 데이터 품질

${actionPack.dataQuality.map((quality) => `**${quality.level === 'warning' ? '⚠️ 경고' : 'ℹ️ 정보'}**: ${quality.message}
`).join('\n')}

---

*본 보고서는 Action Pack V2 형식으로 생성되었습니다.*
`

  return md
}

