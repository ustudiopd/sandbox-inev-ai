import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { generateActionPackWithRetry } from '@/lib/surveys/analysis/gemini'
import {
  buildCrosstabs,
  buildLeadSignals,
  buildDataQuality,
  buildCrosstabHighlights,
  buildEvidenceCatalog,
  buildCapacityPlan,
} from '@/lib/surveys/analysis/buildComputedMetrics'
import { lintActionPackV09 } from '@/lib/surveys/analysis/reportLinter'
import { renderActionPackToMarkdown } from '@/lib/surveys/analysis/renderMarkdown'
import {
  TRUST_STATEMENT,
  getReferencesUsed,
  SURVEY_ANALYSIS_REFERENCES,
} from '@/lib/references/survey-analysis-references'

export const runtime = 'nodejs'

/**
 * 설문조사 AI 분석 보고서 생성
 * POST /api/event-survey/campaigns/[campaignId]/analysis/generate
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    const { lens = 'general' } = await req.json().catch(() => ({ lens: 'general' }))

    const admin = createAdminSupabase()

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, title, form_id, client_id, agency_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!campaign.form_id) {
      return NextResponse.json(
        { error: 'Campaign has no form assigned', code: 'NO_FORM' },
        { status: 400 }
      )
    }

    // 권한 확인
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    let hasPermission = false

    if (profile?.is_super_admin) {
      hasPermission = true
    } else {
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', campaign.client_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (
        clientMember &&
        ['owner', 'admin', 'operator', 'analyst'].includes(clientMember.role)
      ) {
        hasPermission = true
      } else {
        const { data: agencyMember } = await supabase
          .from('agency_members')
          .select('role')
          .eq('agency_id', campaign.agency_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
          hasPermission = true
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // 통계 데이터 수집 (기존 question-stats API 로직 재사용)
    const { data: entries } = await admin
      .from('event_survey_entries')
      .select('form_submission_id')
      .eq('campaign_id', campaignId)
      .not('form_submission_id', 'is', null)

    const submissionIds = entries?.map((e: any) => e.form_submission_id).filter(Boolean) || []

    if (submissionIds.length === 0) {
      return NextResponse.json(
        { error: 'No survey responses found', code: 'INSUFFICIENT_SAMPLES' },
        { status: 400 }
      )
    }

    // 문항 조회
    const { data: questions } = await admin
      .from('form_questions')
      .select('*')
      .eq('form_id', campaign.form_id)
      .order('order_no', { ascending: true })

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found', code: 'NO_QUESTIONS' },
        { status: 400 }
      )
    }

    // 모든 답변 조회 (한 번에)
    const { data: allAnswers } = await admin
      .from('form_answers')
      .select('*')
      .in('submission_id', submissionIds)

    // Submission 조회
    const { data: submissions } = await admin
      .from('form_submissions')
      .select('*')
      .in('id', submissionIds)

    // 문항별 통계 집계
    const questionStats: any[] = []
    const questionsWithRole: any[] = []

    for (const question of questions) {
      const parsedOptions = question.options
        ? typeof question.options === 'string'
          ? JSON.parse(question.options)
          : question.options
        : []

      // 문항 역할 자동 추정 (옵션명 기반)
      let role: 'timeframe' | 'project_type' | 'followup_intent' | 'other' = 'other'
      const questionText = (question.body || '').toLowerCase()
      const optionsText = JSON.stringify(parsedOptions).toLowerCase()

      if (questionText.includes('언제') || questionText.includes('계획') || optionsText.includes('1주') || optionsText.includes('1개월')) {
        role = 'timeframe'
      } else if (questionText.includes('프로젝트') || questionText.includes('종류') || optionsText.includes('데이터센터') || optionsText.includes('네트워크')) {
        role = 'project_type'
      } else if (questionText.includes('의향') || questionText.includes('요청') || optionsText.includes('방문') || optionsText.includes('미팅') || optionsText.includes('관심 없음')) {
        role = 'followup_intent'
      }

      // questionsWithRole에 추가 (계산 메트릭용)
      questionsWithRole.push({
        id: question.id,
        order_no: question.order_no,
        body: question.body,
        type: question.type,
        role,
        options: parsedOptions,
      })

      const answers = allAnswers?.filter((a: any) => a.question_id === question.id) || []

      const stats: any = {
        questionId: question.id,
        orderNo: question.order_no,
        questionBody: question.body,
        questionType: question.type,
        totalAnswers: answers.length,
        options: parsedOptions,
        choiceDistribution: {},
        textAnswers: [],
        role,
      }

      if (question.type === 'text') {
        stats.textAnswers = answers.map((a: any) => a.text_answer || a.answer_value || '').filter(Boolean)
      } else if (question.type === 'single' || question.type === 'multiple') {
        const distribution: Record<string, number> = {}
        answers.forEach((answer: any) => {
          const choiceIds = answer.choice_ids || []
          choiceIds.forEach((choiceId: string) => {
            distribution[choiceId] = (distribution[choiceId] || 0) + 1
          })
        })
        stats.choiceDistribution = distribution

        // Top choices 계산
        const topChoices = Object.entries(distribution)
          .map(([choiceId, count]) => {
            const option = parsedOptions.find((opt: any) => (opt.id || opt) === choiceId)
            return {
              text: option ? (option.text || option) : choiceId,
              count,
              percentage: ((count / (answers.length || 1)) * 100).toFixed(1),
            }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        stats.topChoices = topChoices
        stats.analysis = {
          summary_chart: question.order_no <= 6,
        }
      }

      questionStats.push(stats)
    }

    // v2: 계산 메트릭 생성
    const crosstabs = buildCrosstabs(questionsWithRole, allAnswers || [], submissions || [])
    const crosstabHighlights = buildCrosstabHighlights(crosstabs, submissionIds.length)
    const leadSignals = buildLeadSignals(questionsWithRole, allAnswers || [], submissions || [])
    const dataQuality = buildDataQuality(submissionIds.length, questionsWithRole, allAnswers || [])
    
    // Decision-grade v3: Evidence Catalog 및 Capacity Plan 생성
    const evidenceCatalog = buildEvidenceCatalog(
      questionStats || [],
      crosstabs,
      crosstabHighlights,
      leadSignals,
      dataQuality,
      submissionIds.length
    )
    const capacityPlan = buildCapacityPlan(leadSignals, crosstabs, submissionIds.length)

    // statistics_snapshot 구조화 (v2 확장)
    const analyzedAt = new Date().toISOString()
    const statisticsSnapshot = {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        analyzed_at: analyzedAt,
      },
      sample_count: submissionIds.length,
      total_questions: questions.length,
      snapshot_version: '2.0',
      questions: questionStats,
      computed: {
        crosstabs,
        leadSignals: {
          distribution: leadSignals.distribution,
          channelPreference: leadSignals.channelPreference,
          timingDistribution: leadSignals.timingDistribution,
        },
        dataQuality,
      },
    }

    // 레퍼런스 정보 생성
    const referencesUsed = getReferencesUsed()

    // v2: Action Pack 생성
    let actionPack: any
    let generationWarnings: any[] = []

    try {
      actionPack = await generateActionPackWithRetry({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        analyzedAtISO: analyzedAt,
        sampleCount: submissionIds.length,
        totalQuestions: questions.length,
        questionStats: questionStats || [],
        crosstabs: crosstabs || [],
        crosstabHighlights: crosstabHighlights || [],
        leadSignals: leadSignals || {
          distribution: [],
          channelPreference: {},
          timingDistribution: {},
          leadQueue: [],
        },
        dataQuality: dataQuality || [],
        evidenceCatalog: evidenceCatalog || [], // Decision-grade v3 추가
        capacityPlan: capacityPlan || undefined, // Decision-grade v3 추가
        lens: lens as 'sales' | 'marketing' | 'general',
      })

      // 서버 값으로 덮어쓰기 (priorityQueue count/pct, dataQuality)
      if (actionPack.priorityQueue && leadSignals.distribution) {
        // 서버에서 계산한 티어별 분포로 교체
        const serverDistribution = leadSignals.distribution
        actionPack.priorityQueue = actionPack.priorityQueue.map((queue: any) => {
          const serverTier = serverDistribution.find((d: any) => d.tier === queue.tier)
          if (serverTier) {
            return {
              ...queue,
              count: serverTier.count,
              pct: serverTier.pct,
            }
          }
          return queue
        })
      }

      // dataQuality를 서버 계산값으로 무조건 교체 (AI 생성값 완전 무시)
      // 항상 서버 계산값으로 교체 (조건 없이 무조건 실행)
      // buildDataQuality는 { level, message } 객체 배열을 반환하므로 message만 추출
      if (dataQuality && dataQuality.length > 0) {
        actionPack.dataQuality = dataQuality
          .map((q: any) => {
            // 객체인 경우 메시지만 추출
            if (q && typeof q === 'object' && q.message) {
              return q.message
            }
            // 이미 문자열인 경우
            if (typeof q === 'string') {
              // 플레이스홀더 체크
              if (q.includes('ℼ 정보:') || q.includes('ℹ️ 정보:') || q.trim().length === 0) {
                return null // 플레이스홀더는 제거
              }
              return q
            }
            return null
          })
          .filter((q: string | null): q is string => q !== null && q.trim().length > 0)
        
        // 최소 3개 보장 (부족하면 추가)
        if (actionPack.dataQuality.length < 3) {
          const fallbackMessages = [
            `총 응답 수 ${submissionIds.length}명으로 통계적 유의성 평가 필요`,
            `모든 필수 문항에 대한 응답률 확인 필요`,
            `교차표 분석 시 일부 셀의 표본 수가 5 미만인 경우 주의 필요`
          ]
          actionPack.dataQuality.push(...fallbackMessages.slice(0, 3 - actionPack.dataQuality.length))
        }
      } else {
        // dataQuality가 없거나 비어있으면 서버에서 생성
        actionPack.dataQuality = [
          `총 응답 수 ${submissionIds.length}명으로 통계적 유의성 평가 필요`,
          `모든 필수 문항에 대한 응답률 확인 필요`,
          `교차표 분석 시 일부 셀의 표본 수가 5 미만인 경우 주의 필요`
        ]
      }
      
      // 덮어쓰기 후 로그 출력 (디버깅용)
      console.log('✅ dataQuality 서버 값으로 덮어쓰기 완료 (첫 번째):', {
        count: actionPack.dataQuality.length,
        samples: actionPack.dataQuality.slice(0, 3),
        originalDataQualityCount: dataQuality?.length || 0,
        hasPlaceholder: actionPack.dataQuality.some((q: string) => q.includes('ℹ️ 정보:') || q.includes('ℼ 정보:'))
      })

      // Linter 검증 (V0.9용)
      const linterResult = lintActionPackV09(actionPack, crosstabHighlights || [])
      generationWarnings = linterResult.warnings
      if (!linterResult.isValid) {
        console.warn('⚠️ Action Pack 품질 검증 실패:', linterResult.warnings)
        // 재시도는 generateActionPackWithRetry에서 처리
      }
      console.log('Action Pack v0.9 생성 완료:', {
        version: actionPack.version,
        lens: actionPack.lens,
        executiveSummary: actionPack.executiveSummary?.oneLiner?.substring(0, 50) || '없음',
        insightsCount: actionPack.insights?.length || 0,
        priorityQueueCount: actionPack.priorityQueue?.length || 0,
        surveyNextQuestionsCount: actionPack.surveyNextQuestions?.length || 0,
        hasSegments: !!actionPack.segments?.length,
        hasMarketingPack: !!actionPack.marketingPack?.length,
      })
      
      // 필수 필드 누락 확인
      if (!actionPack.insights || actionPack.insights.length === 0) {
        console.warn('⚠️ insights가 생성되지 않았습니다!')
      }
      if (!actionPack.priorityQueue || actionPack.priorityQueue.length === 0) {
        console.warn('⚠️ priorityQueue가 생성되지 않았습니다!')
      }
      if (!actionPack.surveyNextQuestions || actionPack.surveyNextQuestions.length === 0) {
        console.warn('⚠️ surveyNextQuestions가 생성되지 않았습니다!')
      }
    } catch (error: any) {
      console.error('Action Pack 생성 실패:', error)
      console.error('에러 스택:', error.stack)
      return NextResponse.json(
        {
          error: 'AI 분석 생성에 실패했습니다',
          code: 'AI_GENERATION_FAILED',
          details: error.message || '알 수 없는 오류',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        { status: 500 }
      )
    }

    // 렌더링 전 최종 검증: dataQuality 플레이스홀더 제거 및 서버 값으로 강제 교체
    // AI가 생성한 값은 완전히 무시하고 서버 계산값만 사용
    // 무조건 서버 계산값으로 교체 (조건 없이)
    console.log('🔍 렌더링 전 dataQuality 상태 확인:', {
      beforeCount: actionPack.dataQuality?.length || 0,
      beforeSamples: actionPack.dataQuality?.slice(0, 2) || [],
      serverDataQualityCount: dataQuality?.length || 0,
      serverDataQualitySamples: dataQuality?.slice(0, 2) || []
    })
    
    // 무조건 서버 계산값으로 교체
    if (dataQuality && dataQuality.length > 0) {
      // 서버 계산값으로 완전히 교체
      actionPack.dataQuality = dataQuality
        .map((q: any) => {
          if (q && typeof q === 'object' && q.message) {
            return q.message
          }
          if (typeof q === 'string' && !q.includes('ℼ 정보:') && !q.includes('ℹ️ 정보:') && q.trim().length > 0) {
            return q
          }
          return null
        })
        .filter((q: string | null): q is string => q !== null && q.trim().length > 0)
      
      // 최소 3개 보장
      if (actionPack.dataQuality.length < 3) {
        const fallbackMessages = [
          `총 응답 수 ${submissionIds.length}명으로 통계적 유의성 평가 필요`,
          `모든 필수 문항에 대한 응답률 확인 필요`,
          `교차표 분석 시 일부 셀의 표본 수가 5 미만인 경우 주의 필요`
        ]
        actionPack.dataQuality.push(...fallbackMessages.slice(0, 3 - actionPack.dataQuality.length))
      }
    } else {
      // dataQuality가 없으면 서버에서 생성
      actionPack.dataQuality = [
        `총 응답 수 ${submissionIds.length}명으로 통계적 유의성 평가 필요`,
        `모든 필수 문항에 대한 응답률 확인 필요`,
        `교차표 분석 시 일부 셀의 표본 수가 5 미만인 경우 주의 필요`
      ]
    }
    
    console.log('✅ 렌더링 전 dataQuality 최종 확인 (두 번째):', {
      count: actionPack.dataQuality.length,
      samples: actionPack.dataQuality.slice(0, 3),
      hasPlaceholder: actionPack.dataQuality.some((q: string) => q.includes('ℹ️ 정보:') || q.includes('ℼ 정보:'))
    })

    // v2: Markdown 렌더링
    const reportMd = renderActionPackToMarkdown(
      actionPack,
      campaign.title,
      analyzedAt,
      submissionIds.length,
      questions.length
    )

    // v1 호환을 위한 기존 형식도 유지
    const reportContentFullMd = reportMd

    // 보고서 제목 생성
    const reportTitle = `${new Date(analyzedAt).toLocaleDateString('ko-KR')} ${new Date(analyzedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 분석 보고서`

    // DB 저장 (v2 확장)
    const { data: report, error: insertError } = await admin
      .from('survey_analysis_reports')
      .insert({
        campaign_id: campaignId,
        analyzed_at: analyzedAt,
        sample_count: submissionIds.length,
        total_questions: questions.length,
        report_title: reportTitle,
        report_content: reportContentFullMd, // v1 호환
        report_content_md: actionPack.executiveSummary.oneLiner, // 간단 요약
        report_content_full_md: reportContentFullMd, // 완성본
        report_md: reportMd, // v2 Markdown
        summary: actionPack.executiveSummary.oneLiner, // 요약
        statistics_snapshot: statisticsSnapshot,
        references_used: referencesUsed,
        action_pack: actionPack, // v2 Action Pack
        generation_warnings: generationWarnings.length > 0 ? generationWarnings : null,
        lens,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('보고서 저장 오류:', insertError)
      return NextResponse.json(
        { error: '보고서 저장에 실패했습니다', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        campaign_id: report.campaign_id,
        analyzed_at: report.analyzed_at,
        sample_count: report.sample_count,
        total_questions: report.total_questions,
        lens: report.lens,
        report_title: report.report_title,
        summary: report.summary,
        action_pack: report.action_pack,
        created_at: report.created_at,
      },
    })
  } catch (error: any) {
    console.error('보고서 생성 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

