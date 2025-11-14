import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; formId: string }> }
) {
  try {
    const { webinarId, formId } = await params
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 폼 조회
    const { data: form, error: formError } = await admin
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('webinar_id', webinarId)
      .single()
    
    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인 (운영자만 - 클라이언트 operator 이상 또는 에이전시 owner/admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    
    let hasPermission = false
    
    if (profile?.is_super_admin) {
      hasPermission = true
    } else {
      // 클라이언트 멤버십 확인
      const { data: clientMember } = await supabase
        .from('client_members')
        .select('role')
        .eq('client_id', form.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator', 'analyst'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인 (owner/admin만 결과 조회 가능)
        if (form.agency_id) {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', form.agency_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agencyMember && ['owner', 'admin'].includes(agencyMember.role)) {
            hasPermission = true
          }
        }
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 제출 수 조회
    const { count: submissionCount } = await admin
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId)
    
    // 문항별 통계
    const { data: questions } = await admin
      .from('form_questions')
      .select('*')
      .eq('form_id', formId)
      .order('order_no', { ascending: true })
    
    const questionStats = []
    
    for (const q of questions || []) {
      const { data: answers } = await admin
        .from('form_answers')
        .select('*')
        .eq('question_id', q.id)
      
      let stats: any = {
        questionId: q.id,
        questionBody: q.body,
        questionType: q.type,
        totalAnswers: answers?.length || 0,
      }
      
      if (form.kind === 'quiz') {
        // 퀴즈 통계
        const correctCount = answers?.filter((a: any) => a.is_correct).length || 0
        stats.correctCount = correctCount
        stats.correctRate = answers?.length ? (correctCount / answers.length) * 100 : 0
        stats.averagePoints = answers?.length
          ? answers.reduce((sum: number, a: any) => sum + (a.points_awarded || 0), 0) / answers.length
          : 0
      } else {
        // 설문 통계 (선택지별 분포)
        if (q.type !== 'text' && q.options) {
          const choiceDistribution: Record<string, number> = {}
          q.options.forEach((opt: any) => {
            choiceDistribution[opt.id] = 0
          })
          
          answers?.forEach((a: any) => {
            if (a.choice_ids && Array.isArray(a.choice_ids)) {
              a.choice_ids.forEach((choiceId: string) => {
                if (choiceDistribution[choiceId] !== undefined) {
                  choiceDistribution[choiceId]++
                }
              })
            }
          })
          
          stats.choiceDistribution = choiceDistribution
        }
      }
      
      questionStats.push(stats)
    }
    
    // 퀴즈인 경우 점수 통계
    let scoreStats = null
    if (form.kind === 'quiz') {
      const { data: attempts } = await admin
        .from('quiz_attempts')
        .select('total_score')
        .eq('form_id', formId)
        .not('total_score', 'is', null)
      
      if (attempts && attempts.length > 0) {
        const scores = attempts.map((a: any) => a.total_score || 0)
        const totalPoints = questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0
        
        scoreStats = {
          averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          maxScore: Math.max(...scores),
          minScore: Math.min(...scores),
          totalPoints,
          attemptCount: scores.length,
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      results: {
        submissionCount: submissionCount || 0,
        questionStats,
        scoreStats,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

