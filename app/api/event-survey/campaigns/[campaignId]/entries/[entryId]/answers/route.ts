import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 참여자의 설문 답변 조회
 * GET /api/event-survey/campaigns/[campaignId]/entries/[entryId]/answers
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; entryId: string }> }
) {
  try {
    const { campaignId, entryId } = await params
    
    const admin = createAdminSupabase()
    
    // 참여자 정보 조회
    const { data: entry, error: entryError } = await admin
      .from('event_survey_entries')
      .select('id, campaign_id, form_submission_id, name, company, phone_norm')
      .eq('id', entryId)
      .eq('campaign_id', campaignId)
      .single()
    
    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }
    
    if (!entry.form_submission_id) {
      return NextResponse.json({
        success: true,
        entry,
        answers: [],
        questions: [],
      })
    }
    
    // 캠페인 정보 조회
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
    
    // 답변 조회
    const { data: answers, error: answersError } = await admin
      .from('form_answers')
      .select('*')
      .eq('submission_id', entry.form_submission_id)
      .order('answered_at', { ascending: true })
    
    if (answersError) {
      return NextResponse.json(
        { error: answersError.message },
        { status: 500 }
      )
    }
    
    // 문항과 답변 매칭
    const questionsWithAnswers = (questions || []).map((question: any) => {
      const answer = answers?.find((a: any) => a.question_id === question.id)
      
      const parsedOptions = question.options 
        ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
        : []
      
      let answerData: any = null
      
      if (answer) {
        if (question.type === 'text') {
          answerData = {
            text: answer.text_answer || answer.answer_value || '',
          }
        } else if (question.type === 'single' || question.type === 'multiple') {
          const choiceIds = answer.choice_ids || []
          const selectedOptions = parsedOptions.filter((opt: any) => {
            const optId = typeof opt === 'string' ? opt : opt.id
            return choiceIds.includes(optId)
          })
          answerData = {
            choiceIds: choiceIds,
            choices: selectedOptions.map((opt: any) => {
              if (typeof opt === 'string') {
                return { id: opt, text: opt }
              }
              return opt
            }),
          }
        }
      }
      
      return {
        ...question,
        options: parsedOptions,
        answer: answerData,
        answeredAt: answer?.answered_at || null,
      }
    })
    
    return NextResponse.json({
      success: true,
      entry,
      questions: questionsWithAnswers,
    })
  } catch (error: any) {
    console.error('참여자 답변 조회 오류:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

