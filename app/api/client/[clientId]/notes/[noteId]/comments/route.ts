import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    const { clientId, noteId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
    // 노트 존재 확인
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single()
    
    if (noteError || !note) {
      return NextResponse.json(
        { error: '노트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const body = await req.json()
    const { content } = body
    
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '댓글 내용은 필수입니다.' },
        { status: 400 }
      )
    }
    
    const { data: comment, error } = await supabase
      .from('note_comments')
      .insert({
        note_id: noteId,
        author_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        profiles:author_id (
          display_name,
          email
        )
      `)
      .single()
    
    if (error) {
      console.error('[Notes API] 댓글 작성 오류:', error)
      return NextResponse.json(
        { error: error.message || '댓글 작성에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(comment)
  } catch (error: any) {
    console.error('[Notes API] 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
