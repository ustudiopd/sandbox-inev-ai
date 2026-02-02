import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; noteId: string; commentId: string }> }
) {
  try {
    const { clientId, noteId, commentId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
    // 댓글 작성자 확인
    const { data: comment, error: commentError } = await supabase
      .from('note_comments')
      .select('author_id, note_id')
      .eq('id', commentId)
      .eq('note_id', noteId)
      .single()
    
    if (commentError || !comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    if (comment.author_id !== user.id) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
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
    
    const { error } = await supabase
      .from('note_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
    
    if (error) {
      console.error('[Notes API] 댓글 수정 오류:', error)
      return NextResponse.json(
        { error: error.message || '댓글 수정에 실패했습니다.' },
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ clientId: string; noteId: string; commentId: string }> }
) {
  try {
    const { clientId, noteId, commentId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
    // 댓글 작성자 확인
    const { data: comment, error: commentError } = await supabase
      .from('note_comments')
      .select('author_id')
      .eq('id', commentId)
      .eq('note_id', noteId)
      .single()
    
    if (commentError || !comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    if (comment.author_id !== user.id) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 소프트 삭제
    const { error } = await supabase
      .from('note_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
    
    if (error) {
      console.error('[Notes API] 댓글 삭제 오류:', error)
      return NextResponse.json(
        { error: error.message || '댓글 삭제에 실패했습니다.' },
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
