import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string; formId: string }> }
) {
  try {
    const { webinarId, formId } = await params
    const { answers, attemptNo } = await req.json()
    
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'answers array is required' },
        { status: 400 }
      )
    }
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 폼 조회
    const { data: form, error: formError } = await supabase
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
    
    if (form.status !== 'open') {
      return NextResponse.json(
        { error: 'Form is not open' },
        { status: 400 }
      )
    }
    
    // 웨비나 등록 확인
    const { data: registration } = await supabase
      .from('registrations')
      .select('webinar_id, user_id')
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!registration) {
      return NextResponse.json(
        { error: 'Not registered to this webinar' },
        { status: 403 }
      )
    }
    
    // 설문/퀴즈 분기 처리
    if (form.kind === 'quiz') {
      // 퀴즈: 시도 횟수 확인
      const { data: prevAttempts } = await supabase
        .from('quiz_attempts')
        .select('attempt_no')
        .eq('form_id', formId)
        .eq('participant_id', user.id)
      
      const nextAttempt = (prevAttempts?.length || 0) + 1
      
      if (form.max_attempts && nextAttempt > form.max_attempts) {
        return NextResponse.json(
          { error: 'Max attempts reached' },
          { status: 403 }
        )
      }
      
      // 시간 제한 확인
      if (form.time_limit_sec) {
        // 시작 시간은 attempt 생성 시점으로 간주
        // 실제로는 클라이언트에서 시작 시간을 전송해야 함
      }
      
      // 퀴즈 시도 생성
      const { data: attempt, error: attemptError } = await admin
        .from('quiz_attempts')
        .insert({
          form_id: formId,
          participant_id: user.id,
          attempt_no: nextAttempt,
        })
        .select()
        .single()
      
      if (attemptError) {
        return NextResponse.json(
          { error: attemptError.message },
          { status: 500 }
        )
      }
      
      // 제출 생성
      const { data: submission, error: subError } = await admin
        .from('form_submissions')
        .insert({
          form_id: formId,
          participant_id: user.id,
        })
        .select()
        .single()
      
      if (subError) {
        return NextResponse.json(
          { error: subError.message },
          { status: 500 }
        )
      }
      
      // 답안 저장
      const answerRows = answers.map((a: any) => ({
        form_id: formId,
        submission_id: submission.id,
        question_id: a.questionId,
        participant_id: user.id,
        choice_ids: a.choiceIds || null,
        text_answer: a.textAnswer || null,
      }))
      
      const { error: answerError } = await admin
        .from('form_answers')
        .insert(answerRows)
      
      if (answerError) {
        return NextResponse.json(
          { error: answerError.message },
          { status: 500 }
        )
      }
      
      // 서버 채점
      const { data: questions } = await admin
        .from('form_questions')
        .select('id, type, answer_key, points')
        .eq('form_id', formId)
        .order('order_no', { ascending: true })
      
      let totalScore = 0
      const questionResults: any[] = []
      
      for (const q of questions || []) {
        const ans = answerRows.find((r: any) => r.question_id === q.id)
        let awarded = 0
        let isCorrect: boolean | null = null
        
        if (q.type !== 'text' && ans?.choice_ids && q.answer_key?.choiceIds) {
          const expect = new Set<string>(q.answer_key.choiceIds)
          const got = new Set<string>(ans.choice_ids)
          isCorrect = expect.size === got.size && [...expect].every((x: string) => got.has(x))
          awarded = isCorrect ? (q.points || 0) : 0
        }
        
        await admin
          .from('form_answers')
          .update({ is_correct: isCorrect, points_awarded: awarded })
          .eq('submission_id', submission.id)
          .eq('question_id', q.id)
        
        totalScore += awarded
        
        // 정답 정보 저장 (클라이언트에 반환용)
        questionResults.push({
          questionId: q.id,
          isCorrect,
          pointsAwarded: awarded,
          correctAnswer: q.answer_key, // 정답 키
          userAnswer: ans ? {
            choiceIds: ans.choice_ids,
            textAnswer: ans.text_answer,
          } : null,
        })
      }
      
      // 시도 완료 업데이트
      await admin
        .from('quiz_attempts')
        .update({
          total_score: totalScore,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attempt.id)
      
      // 총 점수 계산
      const totalPoints = questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0
      
      return NextResponse.json({
        success: true,
        attemptNo: nextAttempt,
        totalScore,
        totalPoints,
        questionResults, // 각 문항별 정답 여부와 정답 키
      })
    } else {
      // 설문: 1회만 제출 (UNIQUE 인덱스로 보장)
      const { data: submission, error: subError } = await admin
        .from('form_submissions')
        .insert({
          form_id: formId,
          participant_id: user.id,
        })
        .select()
        .single()
      
      if (subError) {
        // 이미 제출한 경우
        if (subError.code === '23505') {
          return NextResponse.json(
            { error: 'Already submitted' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: subError.message },
          { status: 500 }
        )
      }
      
      // 답안 저장
      const answerRows = answers.map((a: any) => ({
        form_id: formId,
        submission_id: submission.id,
        question_id: a.questionId,
        participant_id: user.id,
        choice_ids: a.choiceIds || null,
        text_answer: a.textAnswer || null,
      }))
      
      const { error: answerError } = await admin
        .from('form_answers')
        .insert(answerRows)
      
      if (answerError) {
        return NextResponse.json(
          { error: answerError.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ success: true })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

