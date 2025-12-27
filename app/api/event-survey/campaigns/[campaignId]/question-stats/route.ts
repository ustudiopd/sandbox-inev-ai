import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 설문조사 캠페인 문항별 통계 조회
 * GET /api/event-survey/campaigns/[campaignId]/question-stats
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params
    
    const admin = createAdminSupabase()
    
    // 캠페인 조회
    const { data: campaign, error: campaignError } = await admin
      .from('event_survey_campaigns')
      .select('id, form_id, client_id, agency_id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    if (!campaign.form_id) {
      return NextResponse.json({
        success: true,
        questionStats: [],
      })
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
      
      if (clientMember && ['owner', 'admin', 'operator', 'analyst', 'viewer'].includes(clientMember.role)) {
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
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 폼 문항 조회
    const { data: questions, error: questionsError } = await admin
      .from('form_questions')
      .select('*')
      .eq('form_id', campaign.form_id)
      .order('order_no', { ascending: true })
    
    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      )
    }
    
    if (!questions || questions.length === 0) {
      return NextResponse.json({
        success: true,
        questionStats: [],
      })
    }
    
    // 폼 제출 조회 (campaign_id로 연결된 event_survey_entries의 form_submission_id 사용)
    const { data: entries } = await admin
      .from('event_survey_entries')
      .select('form_submission_id')
      .eq('campaign_id', campaignId)
      .not('form_submission_id', 'is', null)
    
    const submissionIds = entries?.map(e => e.form_submission_id).filter(Boolean) || []
    
    if (submissionIds.length === 0) {
      return NextResponse.json({
        success: true,
        questionStats: questions.map((q: any) => ({
          questionId: q.id,
          questionBody: q.body,
          questionType: q.type,
          orderNo: q.order_no,
          totalAnswers: 0,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          choiceDistribution: {},
          textAnswers: [],
        })),
      })
    }
    
    // 문항별 통계 집계
    const questionStats = []
    
    for (const question of questions) {
      const parsedOptions = question.options 
        ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
        : []
      
      // 해당 문항의 답변 조회
      const { data: answers } = await admin
        .from('form_answers')
        .select('*')
        .eq('question_id', question.id)
        .in('submission_id', submissionIds)
      
      const stats: any = {
        questionId: question.id,
        questionBody: question.body,
        questionType: question.type,
        orderNo: question.order_no,
        totalAnswers: answers?.length || 0,
        options: parsedOptions,
        choiceDistribution: {},
        textAnswers: [],
      }
      
      if (question.type === 'text') {
        // 텍스트 문항: 모든 답변 수집
        stats.textAnswers = answers?.map((a: any) => {
          if (a.answer_value && typeof a.answer_value === 'string') {
            return a.answer_value
          } else if (a.answer_value && typeof a.answer_value === 'object') {
            return a.answer_value.text || JSON.stringify(a.answer_value)
          }
          return ''
        }).filter((text: string) => text.trim() !== '') || []
      } else if (question.type === 'single' || question.type === 'multiple') {
        // 선택형 문항: 선택지별 분포 집계
        const choiceDistribution: Record<string, number> = {}
        
        // 선택지 초기화
        parsedOptions.forEach((opt: any) => {
          const optId = typeof opt === 'string' ? opt : opt.id
          choiceDistribution[optId] = 0
        })
        
        // 답변 집계
        answers?.forEach((a: any) => {
          if (a.choice_ids && Array.isArray(a.choice_ids)) {
            a.choice_ids.forEach((choiceId: string) => {
              if (choiceDistribution[choiceId] !== undefined) {
                choiceDistribution[choiceId]++
              }
            })
          } else if (a.answer_value) {
            // answer_value가 문자열인 경우 (단일 선택)
            const choiceId = typeof a.answer_value === 'string' ? a.answer_value : a.answer_value.id || a.answer_value
            if (choiceDistribution[choiceId] !== undefined) {
              choiceDistribution[choiceId]++
            }
          }
        })
        
        stats.choiceDistribution = choiceDistribution
      }
      
      questionStats.push(stats)
    }
    
    return NextResponse.json({
      success: true,
      questionStats,
    })
  } catch (error: any) {
    console.error('문항별 통계 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


