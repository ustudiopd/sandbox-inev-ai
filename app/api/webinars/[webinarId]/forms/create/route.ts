import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const { title, description, kind, timeLimitSec, maxAttempts, questions } = await req.json()
    
    if (!title || !kind || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'title, kind, and questions are required' },
        { status: 400 }
      )
    }
    
    if (kind !== 'survey' && kind !== 'quiz') {
      return NextResponse.json(
        { error: 'kind must be "survey" or "quiz"' },
        { status: 400 }
      )
    }
    
    const { user } = await requireAuth()
    const supabase = await createServerSupabase()
    const admin = createAdminSupabase()
    
    // 웨비나 정보 조회
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('agency_id, client_id')
      .eq('id', webinarId)
      .single()
    
    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 권한 확인 (클라이언트 operator 이상 또는 에이전시 owner/admin)
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
        .eq('client_id', webinar.client_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (clientMember && ['owner', 'admin', 'operator'].includes(clientMember.role)) {
        hasPermission = true
      } else {
        // 에이전시 멤버십 확인 (owner/admin만 폼 생성 가능)
        if (webinar.agency_id) {
          const { data: agencyMember } = await supabase
            .from('agency_members')
            .select('role')
            .eq('agency_id', webinar.agency_id)
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
    
    // 폼 생성
    const { data: form, error: formError } = await admin
      .from('forms')
      .insert({
        webinar_id: webinarId,
        agency_id: webinar.agency_id,
        client_id: webinar.client_id,
        title: title.trim(),
        description: description?.trim() || null,
        kind,
        status: 'draft',
        time_limit_sec: timeLimitSec || null,
        max_attempts: maxAttempts || (kind === 'survey' ? 1 : null),
        created_by: user.id,
      })
      .select()
      .single()
    
    if (formError) {
      return NextResponse.json(
        { error: formError.message },
        { status: 500 }
      )
    }
    
    // 문항 생성
    const questionRows = questions.map((q: any, index: number) => ({
      form_id: form.id,
      order_no: index + 1,
      type: q.type,
      body: q.body.trim(),
      options: q.options || null,
      points: q.points || 0,
      answer_key: q.answerKey || null,
    }))
    
    const { data: createdQuestions, error: questionsError } = await admin
      .from('form_questions')
      .insert(questionRows)
      .select()
    
    if (questionsError) {
      // 폼 삭제 (롤백)
      await admin.from('forms').delete().eq('id', form.id)
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      )
    }
    
    // 감사 로그
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        agency_id: webinar.agency_id,
        client_id: webinar.client_id,
        webinar_id: webinarId,
        action: 'FORM_CREATE',
        payload: { form_id: form.id, kind },
      })
    
    return NextResponse.json({
      success: true,
      form: {
        ...form,
        questions: createdQuestions,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

