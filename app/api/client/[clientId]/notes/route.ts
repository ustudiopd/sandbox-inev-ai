import { NextResponse } from 'next/server'
import { requireClientMember } from '@/lib/auth/guards'
import { createServerSupabase } from '@/lib/supabase/server'
import type { JSONContent } from '@tiptap/core'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { user } = await requireClientMember(clientId)
    const supabase = await createServerSupabase()
    
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
    
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        client_id: clientId,
        author_id: user.id,
        title: title.trim(),
        content: content as JSONContent,
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Notes API] 노트 생성 오류:', error)
      return NextResponse.json(
        { error: error.message || '노트 생성에 실패했습니다.' },
        { status: 500 }
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
