import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 웨비나 질문 목록 조회 (프로필 정보 포함)
 * 같은 웨비나에 등록된 사용자는 모두 조회 가능
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  try {
    const { webinarId } = await params
    const { searchParams } = new URL(req.url)
    const showOnlyMine = searchParams.get('onlyMine') === 'true'
    const filter = searchParams.get('filter') || 'all'
    const isAdminMode = searchParams.get('isAdminMode') === 'true' // 관리자 모드 여부
    
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    // "내 질문" 필터인데 로그인하지 않은 경우
    if (showOnlyMine && !user) {
      return NextResponse.json(
        { error: 'Unauthorized', questions: [] },
        { status: 401 }
      )
    }
    
    const admin = createAdminSupabase()
    
    // 웨비나 존재 확인
    const { data: webinar, error: webinarError } = await admin
      .from('webinars')
      .select('id')
      .eq('id', webinarId)
      .single()
    
    if (webinarError || !webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      )
    }
    
    // 질문 조회 쿼리 구성
    let query = admin
      .from('questions')
      .select(`
        id,
        user_id,
        content,
        status,
        created_at,
        answered_by,
        answered_at,
        answer
      `)
      .eq('webinar_id', webinarId)
    
    if (showOnlyMine && user) {
      query = query.eq('user_id', user.id)
    }
    
    if (filter === 'published') {
      query = query.eq('status', 'published')
    } else if (filter === 'answered') {
      query = query.eq('status', 'answered')
    } else if (filter === 'pinned') {
      query = query.eq('status', 'pinned')
    } else {
      query = query.neq('status', 'hidden')
    }
    
    // 정렬 방식: 모두 DESC로 받고, 클라이언트에서 렌더링 순서 조정
    // 관리자 모드: 최신이 위 (그대로 사용)
    // 일반 사용자: 최신이 아래 (렌더링 시 역순)
    const { data: questions, error: questionsError } = await query
      .order('created_at', { ascending: false }) // 모두 DESC로 받음 (최신이 위)
      .limit(100) // 최대 100개로 제한 (성능 향상)
    
    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      )
    }
    
    // 프로필 정보를 별도로 일괄 조회 (RLS 우회, 성능 최적화)
    const userIds = [...new Set((questions || []).map((q: any) => q.user_id))]
    const profilesMap = new Map()
    
    if (userIds.length > 0) {
      // 일괄 조회로 N+1 문제 방지
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)
      
      if (profiles) {
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, p)
        })
      }
    }
    
    // 질문과 프로필 정보 결합
    const formattedQuestions = (questions || []).map((q: any) => ({
      id: q.id,
      user_id: q.user_id,
      content: q.content,
      status: q.status,
      created_at: q.created_at,
      answered_by: q.answered_by,
      answered_at: q.answered_at,
      answer: q.answer,
      user: profilesMap.get(q.user_id) || null,
    }))
    
    // 관리자 모드일 때만 고정된 질문을 맨 위로 정렬
    // 웨비나 시청 페이지(일반 사용자 모드)에서는 고정 기능 무시하고 시간 순서만 유지
    const sorted = isAdminMode 
      ? formattedQuestions.sort((a, b) => {
          // 관리자 대시보드: 고정된 질문을 맨 위로, 그 다음 시간 순서 (최신이 위)
          if (a.status === 'pinned' && b.status !== 'pinned') return -1
          if (a.status !== 'pinned' && b.status === 'pinned') return 1
          return 0 // 시간 순서는 이미 쿼리에서 정렬됨 (DESC)
        })
      : formattedQuestions // 웨비나 시청 페이지: 시간 순서만 유지 (DESC, 클라이언트에서 역순 처리)
    
    return NextResponse.json({ questions: sorted })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

