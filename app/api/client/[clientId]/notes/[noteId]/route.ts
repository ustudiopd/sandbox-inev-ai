import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import type { JSONContent } from '@tiptap/core'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    const { clientId, noteId } = await params
    await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single()
    
    if (error || !note) {
      return NextResponse.json(
        { error: '노트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(note)
  } catch (error: any) {
    console.error('[Notes API] 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    const { clientId, noteId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
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
    
    const body = await req.json()
    const { title, content } = body
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: '제목은 필수입니다.' },
        { status: 400 }
      )
    }
    
    if (!content) {
      return NextResponse.json(
        { error: '내용은 필수입니다.' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('notes')
      .update({
        title: title.trim(),
        content: content as JSONContent,
      })
      .eq('id', noteId)
    
    if (error) {
      console.error('[Notes API] 노트 수정 오류:', error)
      return NextResponse.json(
        { error: error.message || '노트 수정에 실패했습니다.' },
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
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    const { clientId, noteId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
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
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 소프트 삭제
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noteId)
    
    if (error) {
      console.error('[Notes API] 노트 삭제 오류:', error)
      return NextResponse.json(
        { error: error.message || '노트 삭제에 실패했습니다.' },
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
