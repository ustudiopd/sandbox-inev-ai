import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    const { clientId, noteId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
    const body = await req.json()
    const { is_pinned } = body
    
    // 노트 작성자 확인
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('author_id')
      .eq('id', noteId)
      .eq('client_id', clientId)
      .single()
    
    if (noteError || !note) {
      return NextResponse.json(
        { error: '노트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    if (note.author_id !== user.id) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    const { error } = await supabase
      .from('notes')
      .update({ is_pinned: !!is_pinned })
      .eq('id', noteId)
    
    if (error) {
      console.error('[Notes API] 노트 고정 상태 변경 오류:', error)
      return NextResponse.json(
        { error: error.message || '고정 상태 변경에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Notes API] 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
