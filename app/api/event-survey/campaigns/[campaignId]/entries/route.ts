import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 설문조사 캠페인 참여자 목록 조회 (전체)
 * GET /api/event-survey/campaigns/[campaignId]/entries
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
      .select('id, client_id, agency_id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
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
    
    // 캠페인 정보 조회 (form_id 가져오기)
    const { data: campaignWithForm } = await admin
      .from('event_survey_campaigns')
      .select('form_id')
      .eq('id', campaignId)
      .single()
    
    // 모든 참여자 목록 조회 (제한 없음)
    const { data: entries, error: entriesError } = await admin
      .from('event_survey_entries')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('completed_at', { ascending: false })
    
    if (entriesError) {
      return NextResponse.json(
        { error: entriesError.message },
        { status: 500 }
      )
    }
    
    // 폼 문항 조회 (한 번만)
    let questions: any[] = []
    if (campaignWithForm?.form_id) {
      const { data: questionsData } = await admin
        .from('form_questions')
        .select('*')
        .eq('form_id', campaignWithForm.form_id)
        .order('order_no', { ascending: true })
      
      questions = questionsData || []
    }
    
    // 모든 submission_id 수집
    const submissionIds = (entries || [])
      .map((e: any) => e.form_submission_id)
      .filter(Boolean)
    
    // 모든 답변 한 번에 조회
    let allAnswers: any[] = []
    if (submissionIds.length > 0) {
      const { data: answersData } = await admin
        .from('form_answers')
        .select('*')
        .in('submission_id', submissionIds)
      
      allAnswers = answersData || []
    }
    
    // submission_id별로 답변 그룹화
    const answersBySubmission = new Map<string, any[]>()
    allAnswers.forEach((answer: any) => {
      if (!answersBySubmission.has(answer.submission_id)) {
        answersBySubmission.set(answer.submission_id, [])
      }
      answersBySubmission.get(answer.submission_id)!.push(answer)
    })
    
    // 각 참여자의 설문 답변 매핑
    const entriesWithAnswers = (entries || []).map((entry: any) => {
      if (!entry.form_submission_id || questions.length === 0) {
        return { ...entry, answers: [] }
      }
      
      const answers = answersBySubmission.get(entry.form_submission_id) || []
      if (answers.length === 0) {
        return { ...entry, answers: [] }
      }
      
      // 문항별 답변 매핑
      const answersMap = new Map(answers.map((a: any) => [a.question_id, a]))
      
      const detailedAnswers = questions.map((q: any) => {
        const answer = answersMap.get(q.id)
        const parsedOptions = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : []
        
        let displayAnswer = '답변 없음'
        if (answer) {
          if (q.type === 'text') {
            displayAnswer = answer.text_answer || '답변 없음'
          } else if (q.type === 'single' || q.type === 'multiple') {
            if (answer.choice_ids && Array.isArray(answer.choice_ids) && answer.choice_ids.length > 0) {
              displayAnswer = answer.choice_ids.map((choiceId: string) => {
                const option = parsedOptions.find((opt: any) => (opt.id || opt) === choiceId)
                return option ? (option.text || option) : choiceId
              }).join(', ')
            }
          }
        }
        
        return {
          questionId: q.id,
          questionBody: q.body,
          questionType: q.type,
          orderNo: q.order_no,
          answer: displayAnswer,
        }
      })
      
      return {
        ...entry,
        answers: detailedAnswers,
      }
    })
    
    return NextResponse.json({
      success: true,
      entries: entriesWithAnswers || [],
    })
  } catch (error: any) {
    console.error('참여자 목록 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


