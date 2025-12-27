/**
 * Report Linter: Action Pack 품질 검증
 */

import type { ActionPackV2, ActionPackV09 } from './actionPackSchema'

export interface LinterWarning {
  level: 'error' | 'warning'
  field: string
  message: string
}

export interface LinterResult {
  isValid: boolean
  warnings: LinterWarning[]
}

/**
 * Action Pack V0.9 품질 검증
 */
export function lintActionPackV09(
  actionPack: ActionPackV09,
  crosstabHighlights: any[] = []
): LinterResult {
  const warnings: LinterWarning[] = []

  // 1. Executive Summary 검증
  if (!actionPack.executiveSummary?.oneLiner || actionPack.executiveSummary.oneLiner.length < 80) {
    warnings.push({
      level: 'error',
      field: 'executiveSummary.oneLiner',
      message: 'oneLiner는 최소 80자 이상이어야 합니다.',
    })
  }

  // 숫자 근거 검증 (%, n/N 패턴)
  const numberPattern = /\d+%|\(\d+\/\d+\)|\d+명|\d+건/
  const oneLinerNumbers = (actionPack.executiveSummary?.oneLiner || '').match(numberPattern)
  if (!oneLinerNumbers || oneLinerNumbers.length < 1) {
    warnings.push({
      level: 'error',
      field: 'executiveSummary.oneLiner',
      message: 'oneLiner에는 반드시 숫자 근거(%, n/N, n명, n건)가 포함되어야 합니다.',
    })
  }

  // 2. Insights 검증
  if (!actionPack.insights || actionPack.insights.length < 3) {
    warnings.push({
      level: 'error',
      field: 'insights',
      message: `insights는 최소 3개 이상이어야 합니다. 현재: ${actionPack.insights?.length || 0}개`,
    })
  }

  // 첫 번째 insight는 24시간 실행 플랜이어야 함
  if (actionPack.insights && actionPack.insights.length > 0) {
    const firstInsight = actionPack.insights[0]
    const has24h = /24시간|D\+0|D\+1|오늘|당일|내일/.test(
      firstInsight.title + ' ' + firstInsight.evidence + ' ' + firstInsight.soWhat
    )
    if (!has24h) {
      warnings.push({
        level: 'error',
        field: 'insights[0]',
        message: '첫 번째 insight는 반드시 "24시간 실행 플랜"이어야 합니다. (24시간, D+0, D+1, 오늘, 당일, 내일 포함)',
      })
    }

    // 각 insight의 evidence에 숫자 포함 여부
    actionPack.insights.forEach((insight, index) => {
      const evidenceNumbers = insight.evidence.match(numberPattern)
      if (!evidenceNumbers || evidenceNumbers.length < 1) {
        warnings.push({
          level: 'error',
          field: `insights[${index}].evidence`,
          message: 'evidence는 반드시 숫자(퍼센트, 분수, 카운트)를 포함해야 합니다.',
        })
      }

      // action에 대상 수량 또는 목표 수량 포함 여부
      insight.nextActions.forEach((action, actionIndex) => {
        const hasQuantity = /\d+명|\d+건|\d+개/.test(action.steps.join(' '))
        if (!hasQuantity) {
          warnings.push({
            level: 'warning',
            field: `insights[${index}].nextActions[${actionIndex}].steps`,
            message: '각 action에는 반드시 대상 수량(N명) 또는 목표 수량(K건)이 포함되어야 합니다.',
          })
        }
      })
    })
  }

  // 3. CrosstabHighlights 인용 검증
  if (crosstabHighlights.length > 0) {
    const allText = JSON.stringify(actionPack)
    const highlightedCount = crosstabHighlights.filter((h) => allText.includes(h.rowKey) || allText.includes(h.colKey)).length
    if (highlightedCount < 2) {
      warnings.push({
        level: 'warning',
        field: 'insights',
        message: `crosstabHighlights에서 최소 2개 이상을 evidence로 인용해야 합니다. 현재 인용: ${highlightedCount}개`,
      })
    }
  }

  // 4. Priority Queue 검증
  if (!actionPack.priorityQueue || actionPack.priorityQueue.length < 3) {
    warnings.push({
      level: 'error',
      field: 'priorityQueue',
      message: `priorityQueue는 최소 3개 이상이어야 합니다. 현재: ${actionPack.priorityQueue?.length || 0}개`,
    })
  }

  // 5. Marketing Pack 검증
  if (actionPack.marketingPack && actionPack.marketingPack.length > 0) {
    actionPack.marketingPack.forEach((pack, index) => {
      // 이메일 제목, CTA, 랜딩 훅 포함 여부 검증
      const allText = JSON.stringify(pack)
      const hasEmailTitle = /이메일.*제목|메일.*제목|제목.*이메일/.test(allText) || pack.suggestedAssets?.some((a: string) => /제목|title/i.test(a))
      const hasCTA = /CTA|Call to Action|행동.*유도|클릭|신청|문의/.test(allText)
      const hasLandingHook = /랜딩|훅|첫.*문장|시작.*문장/.test(allText)

      if (!hasEmailTitle) {
        warnings.push({
          level: 'warning',
          field: `marketingPack[${index}]`,
          message: 'Marketing Pack에는 이메일 제목 3개가 포함되어야 합니다.',
        })
      }
      if (!hasCTA) {
        warnings.push({
          level: 'warning',
          field: `marketingPack[${index}]`,
          message: 'Marketing Pack에는 CTA 1개가 포함되어야 합니다.',
        })
      }
      if (!hasLandingHook) {
        warnings.push({
          level: 'warning',
          field: `marketingPack[${index}]`,
          message: 'Marketing Pack에는 랜딩 첫 문장(훅) 2개가 포함되어야 합니다.',
        })
      }
    })
  }

  // 6. Data Quality 검증
  if (actionPack.dataQuality && actionPack.dataQuality.length > 0) {
    actionPack.dataQuality.forEach((quality, index) => {
      if (typeof quality === 'string') {
        // 플레이스홀더 검증
        if (quality.includes('ℼ 정보:') || quality.includes('ℹ️ 정보:') || quality.trim().length === 0) {
          warnings.push({
            level: 'error',
            field: `dataQuality[${index}]`,
            message: 'dataQuality에 플레이스홀더("ℼ 정보:", "ℹ️ 정보:") 또는 빈 문자열이 포함되어 있습니다.',
          })
        }
      }
    })
  } else {
    warnings.push({
      level: 'warning',
      field: 'dataQuality',
      message: 'dataQuality는 최소 1개 이상 포함되어야 합니다.',
    })
  }

  // 7. Decision Cards 검증 (Decision-grade v3)
  const extendedPack = actionPack as any
  if (extendedPack.decisionCards && extendedPack.decisionCards.length > 0) {
    if (extendedPack.decisionCards.length < 3) {
      warnings.push({
        level: 'warning',
        field: 'decisionCards',
        message: `decisionCards는 최소 3개 이상 권장됩니다. 현재: ${extendedPack.decisionCards.length}개`,
      })
    }

    extendedPack.decisionCards.forEach((card: any, index: number) => {
      // Evidence IDs 검증
      if (!card.evidenceIds || card.evidenceIds.length < 2) {
        warnings.push({
          level: 'error',
          field: `decisionCards[${index}].evidenceIds`,
          message: '각 Decision Card는 최소 2개 이상의 evidenceIds를 포함해야 합니다.',
        })
      }

      // Recommendation이 options에 포함되는지 검증
      if (card.recommendation && card.options) {
        const optionIds = card.options.map((opt: any) => opt.id)
        if (!optionIds.includes(card.recommendation)) {
          warnings.push({
            level: 'error',
            field: `decisionCards[${index}].recommendation`,
            message: `recommendation "${card.recommendation}"이 options에 포함되어야 합니다.`,
          })
        }
      }

      // Confidence 필수
      if (!card.confidence || !['Confirmed', 'Directional', 'Hypothesis'].includes(card.confidence)) {
        warnings.push({
          level: 'error',
          field: `decisionCards[${index}].confidence`,
          message: 'confidence는 "Confirmed", "Directional", "Hypothesis" 중 하나여야 합니다.',
        })
      }

      // Rationale 길이 검증
      if (!card.rationale || card.rationale.length < 20) {
        warnings.push({
          level: 'warning',
          field: `decisionCards[${index}].rationale`,
          message: `rationale은 최소 20자 이상 권장됩니다. 현재: ${card.rationale?.length || 0}자`,
        })
      }
    })
  }

  // 8. Action Board 검증 (Decision-grade v3)
  if (extendedPack.actionBoard) {
    const actionBoard = extendedPack.actionBoard
    const hasD0 = actionBoard.d0 && actionBoard.d0.length > 0
    const hasD7 = actionBoard.d7 && actionBoard.d7.length > 0
    const hasD14 = actionBoard.d14 && actionBoard.d14.length > 0

    if (!hasD0 && !hasD7 && !hasD14) {
      warnings.push({
        level: 'warning',
        field: 'actionBoard',
        message: 'actionBoard는 d0, d7, d14 중 최소 하나 이상의 항목을 포함해야 합니다.',
      })
    }

    // 각 Action Item 검증
    const allActions = [
      ...(actionBoard.d0 || []),
      ...(actionBoard.d7 || []),
      ...(actionBoard.d14 || []),
    ]

    allActions.forEach((action: any, index: number) => {
      // targetCount 필수
      if (!action.targetCount || !/\d+명|\d+건|\d+개/.test(action.targetCount)) {
        warnings.push({
          level: 'error',
          field: `actionBoard[${index}].targetCount`,
          message: '각 Action Item은 targetCount(예: "17명", "8건")를 포함해야 합니다.',
        })
      }

      // KPI 필수
      if (!action.kpi || action.kpi.length < 5) {
        warnings.push({
          level: 'error',
          field: `actionBoard[${index}].kpi`,
          message: '각 Action Item은 kpi(예: "미팅 전환율 40%", "PoC 신청 5건")를 포함해야 합니다.',
        })
      }

      // "중요합니다/필요합니다" 같은 일반론 문장 금지
      const genericPhrases = ['중요합니다', '필요합니다', '활용하세요', '강화해야']
      const allText = JSON.stringify(action)
      genericPhrases.forEach((phrase) => {
        if (allText.includes(phrase) && !action.steps.some((s: string) => /\d+명|\d+건/.test(s))) {
          warnings.push({
            level: 'warning',
            field: `actionBoard[${index}]`,
            message: `일반론 문장("${phrase}") 사용을 피하세요. 구체적인 행동(동사) + 대상 수량 + 기한을 포함하세요.`,
          })
        }
      })
    })
  }

  // 9. 추정형 문장 검증
  const speculativePhrases = [
    '예상됩니다',
    '가능성이 높습니다',
    '추정',
    '아마도',
    '~일 것으로 보입니다',
    '중요합니다',  // 일반론
    '필요합니다',  // 일반론
    '활용하세요',  // 일반론
  ]

  if (actionPack.executiveSummary?.oneLiner) {
    speculativePhrases.forEach((phrase) => {
      if (actionPack.executiveSummary.oneLiner.includes(phrase)) {
        warnings.push({
          level: 'warning',
          field: 'executiveSummary.oneLiner',
          message: `추정형/일반론 문장("${phrase}") 사용을 피하세요. 행동(동사) + 대상 + 기한 형태로 작성하세요.`,
        })
      }
    })
  }

  if (actionPack.insights) {
    actionPack.insights.forEach((insight, index) => {
      speculativePhrases.forEach((phrase) => {
        if (insight.soWhat.includes(phrase) || insight.nextActions.some((a) => a.steps.some((s) => s.includes(phrase)))) {
          warnings.push({
            level: 'warning',
            field: `insights[${index}]`,
            message: `추정형/일반론 문장("${phrase}") 사용을 피하세요. 숫자 기반 결론과 구체적 행동을 사용하세요.`,
          })
        }
      })
    })
  }

  const errors = warnings.filter((w) => w.level === 'error')
  const isValid = errors.length === 0

  return {
    isValid,
    warnings,
  }
}

/**
 * Action Pack V2 품질 검증 (기존)
 */
export function lintActionPack(actionPack: ActionPackV2): LinterResult {
  const warnings: LinterWarning[] = []

  // 1. Executive Summary 검증
  if (actionPack.executiveSummary.topWins.length < 3) {
    warnings.push({
      level: 'error',
      field: 'executiveSummary.topWins',
      message: `topWins는 최소 3개 이상이어야 합니다. 현재: ${actionPack.executiveSummary.topWins.length}개`,
    })
  }

  // 2. 각 topWin의 evidence 검증
  actionPack.executiveSummary.topWins.forEach((win, index) => {
    if (!/\d+%|\(\d+\/\d+\)/.test(win.evidence)) {
      warnings.push({
        level: 'error',
        field: `executiveSummary.topWins[${index}].evidence`,
        message: 'evidence는 반드시 숫자(퍼센트 또는 분수)를 포함해야 합니다.',
      })
    }
  })

  // 3. Correlation Findings 검증 (crosstab이 있을 때)
  // crosstab이 있는지 확인은 호출자가 해야 함
  if (actionPack.correlationFindings.length < 2) {
    warnings.push({
      level: 'warning',
      field: 'correlationFindings',
      message: `correlationFindings는 최소 2개 이상 권장됩니다. 현재: ${actionPack.correlationFindings.length}개`,
    })
  }

  // 4. 추정형 문장 검증
  const speculativePhrases = [
    '예상됩니다',
    '가능성이 높습니다',
    '추정',
    '아마도',
    '~일 것으로 보입니다',
  ]

  actionPack.executiveSummary.topWins.forEach((win, index) => {
    speculativePhrases.forEach((phrase) => {
      if (win.soWhat.includes(phrase) || win.action.steps.some((s) => s.includes(phrase))) {
        warnings.push({
          level: 'warning',
          field: `executiveSummary.topWins[${index}]`,
          message: `추정형 문장("${phrase}") 사용을 피하세요. 숫자 기반 결론을 사용하세요.`,
        })
      }
    })
  })

  actionPack.correlationFindings.forEach((finding, index) => {
    speculativePhrases.forEach((phrase) => {
      if (finding.soWhat.includes(phrase) || finding.actions.some((a) => a.steps.some((s) => s.includes(phrase)))) {
        warnings.push({
          level: 'warning',
          field: `correlationFindings[${index}]`,
          message: `추정형 문장("${phrase}") 사용을 피하세요.`,
        })
      }
    })
  })

  // 5. Action 필드 검증
  actionPack.executiveSummary.topWins.forEach((win, index) => {
    if (!win.action.owner || !win.action.due || win.action.steps.length === 0) {
      warnings.push({
        level: 'error',
        field: `executiveSummary.topWins[${index}].action`,
        message: 'action에는 owner, due, steps가 모두 필요합니다.',
      })
    }
  })

  // 6. Priority Queue Summary 검증
  const totalTiers = actionPack.priorityQueueSummary.tiers.reduce(
    (sum, tier) => sum + tier.count,
    0
  )
  if (totalTiers === 0) {
    warnings.push({
      level: 'warning',
      field: 'priorityQueueSummary.tiers',
      message: '티어별 분포가 없습니다.',
    })
  }

  // 7. Marketing Pack rationale 검증
  actionPack.marketingPack.forEach((pack, index) => {
    if (!/\d+%|\(\d+\/\d+\)/.test(pack.rationale)) {
      warnings.push({
        level: 'warning',
        field: `marketingPack[${index}].rationale`,
        message: 'rationale은 숫자 근거를 포함하는 것이 좋습니다.',
      })
    }
  })

  const errors = warnings.filter((w) => w.level === 'error')
  const isValid = errors.length === 0

  return {
    isValid,
    warnings,
  }
}
